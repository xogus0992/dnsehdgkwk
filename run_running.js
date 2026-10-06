import { db, auth } from './firebase-service.js';
import { ref, push } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ============================================================
   POKERUN RUNNING LOGIC (FINAL v2.4 - OpenStreetMap & Navigation)
   - Map: OpenStreetMap (회색 화면 방지 및 완벽 호환)
   - Target Course: LocalStorage (Gray Dashed Line)
   - User Track: Realtime GPS (Red Solid Line & Moving Marker)
   - Database: Firebase Realtime Database ('users/{uid}/history')
   ============================================================ */

// Leaflet & Tracking Variables
let map, userMarker;
let coursePolyline = null;    // 불러온 목표 코스 (회색 점선)
let userPathLines = [];     // 내가 실제 걸어간 경로들 (빨간선 배열)
let currentSegment = [];     // 현재 이동 중인 구간 좌표 배열

let watchId = null;
let timerId = null;
let isRunning = false;
let isPaused = false;
let isFirstGpsLock = false;  // 첫 GPS 수신 여부
let currentUser = null;       // 로그인 사용자 정보

// Data Variables
let elapsedTime = 0; 
let totalDistance = 0; 
let targetDistance = 0; 
let startTargetKm = 0;  
let lastPos = null;

// DOM Elements
const els = {
    dist: document.getElementById('displayDist'),
    time: document.getElementById('valTime'),
    pace: document.getElementById('valPace'),
    cal: document.getElementById('valCal'),
    speed: document.getElementById('valSpeed'),
    avgSpeed: document.getElementById('valAvgSpeed'),
    cadence: document.getElementById('valCadence'),
    gpsStatus: document.getElementById('gpsStatus'),
    
    ready: document.getElementById('controlReady'),
    running: document.getElementById('controlRunning'),
    paused: document.getElementById('controlPaused'),
    
    btnStart: document.getElementById('btnStart'),
    btnPause: document.getElementById('btnPause'),
    btnResume: document.getElementById('btnResume'),
    btnStopRun: document.getElementById('btnStopRun'),
    btnStopPaused: document.getElementById('btnStopPaused'),
    btnLoad: document.getElementById('btnLoad')
};

// [1. 초기화 실행]
window.addEventListener('load', () => {
    initMap();
    checkLocalStorage();
    setupGeolocation();

    // 로그인 체크
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("Runner Logged in:", user.email);
        } else {
            alert("로그인이 필요합니다. 로그인 페이지로 이동해주세요.");
        }
    });
});

// [2. 지도 생성 및 OpenStreetMap 타일 적용]
function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView([37.5665, 126.9780], 17);
    
    // ★ OpenStreetMap 타일 레이어 적용 (도메인 승인 없이 즉시 지도 표시 가능)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    // 내 위치 표시용 파란색 원형 마커
    const icon = L.divIcon({
        className: 'user-marker',
        html: '<div style="width:20px;height:20px;background:#3586ff;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.4);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    
    userMarker = L.marker([37.5665, 126.9780], { icon: icon, zIndexOffset: 1000 }).addTo(map);

    // Flex 레이아웃 타일 깨짐 방지
    setTimeout(() => { if (map) map.invalidateSize(); }, 300);
}

// [3. LocalStorage에서 가이드 코스 불러오기 (회색 점선)]
function checkLocalStorage() {
    const savedRoute = localStorage.getItem('currentRunRoute');
    const savedDist = localStorage.getItem('currentRunDist');

    if (savedRoute && savedDist) {
        startTargetKm = parseFloat(savedDist); 
        targetDistance = startTargetKm * 1000; 
        
        const latlngs = JSON.parse(savedRoute);
        if (latlngs && latlngs.length > 0) {
            // 코스 가이드선 (회색 점선)
            coursePolyline = L.polyline(latlngs, {
                color: '#717171', 
                weight: 6, 
                dashArray: '8, 8', 
                opacity: 0.7, 
                lineCap: 'round'
            }).addTo(map);

            // 전체 코스가 보이도록 카메라 맞춤
            map.fitBounds(coursePolyline.getBounds(), { padding: [40, 40] });
        }
        els.dist.innerText = startTargetKm.toFixed(2);
    } else {
        startTargetKm = 0; 
        targetDistance = 0;
        els.dist.innerText = "0.00";
    }
}

// [4. GPS 실시간 추적 바인딩]
function setupGeolocation() {
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                updatePosition(pos);
                if (isRunning && !isPaused) {
                    processRunningData(pos);
                }
            }, 
            handleError, 
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
        );
    } else {
        els.gpsStatus.innerText = "GPS 미지원";
        els.gpsStatus.style.background = "rgba(255,50,50,0.8)";
    }
}

// [5. 내 위치 반영 & 지도가 나를 따라오기]
function updatePosition(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const latlng = [lat, lng];

    // 마커 위치 갱신
    userMarker.setLatLng(latlng);

    // 첫 GPS 수신 시, 불러온 코스가 없으면 내 위치 중심으로 이동
    if (!isFirstGpsLock) {
        isFirstGpsLock = true;
        if (!coursePolyline) map.setView(latlng, 17);
    }

    // 러닝 중일 때는 지도가 계속 내 위치를 부드럽게 중심에 둠
    if (isRunning) {
        map.panTo(latlng, { animate: true, duration: 0.5 }); 
    }

    els.gpsStatus.innerText = "GPS 수신중";
    els.gpsStatus.style.background = "rgba(0,200,100,0.8)";
}

function handleError(err) {
    console.warn('GPS Error:', err);
    els.gpsStatus.innerText = "GPS 신호 약함";
    els.gpsStatus.style.background = "rgba(255,180,0,0.8)";
}

// [6. 러닝 데이터 실시간 계산 & 이동 경로(빨간선) 그리기]
function processRunningData(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const currentLatLng = [lat, lng];
    
    if (lastPos) {
        const dist = map.distance(lastPos, currentLatLng); 
        
        // 최소 0.8m 이상 움직였을 때만 궤적 추가 (오차로 인한 튐 방지)
        if (dist > 0.8) { 
            totalDistance += dist;
            currentSegment.push(currentLatLng);
            updatePolyline(); 
            lastPos = currentLatLng;
        }
    } else {
        lastPos = currentLatLng;
        currentSegment.push(currentLatLng);
    }

    updateUI(pos.coords.speed);
}

// 현재 러닝 구간에 좌표 이어서 그리기
function updatePolyline() {
    if (userPathLines.length > 0 && currentSegment.length > 0) {
        const activePolyline = userPathLines[userPathLines.length - 1];
        activePolyline.setLatLngs(currentSegment);
    }
}

// [7. UI 실시간 지표 수치 업데이트]
function updateUI(currentSpeedMs) {
    // 남은 거리 또는 누적 거리
    if (targetDistance > 0) {
        let remainM = targetDistance - totalDistance;
        if (remainM < 0) remainM = 0; 
        els.dist.innerText = (remainM / 1000).toFixed(2);
    } else {
        els.dist.innerText = (totalDistance / 1000).toFixed(2);
    }

    // 경과 시간
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    els.time.innerText = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    // 속도 (km/h)
    const speedKmh = (currentSpeedMs || 0) * 3.6;
    els.speed.innerText = speedKmh.toFixed(1);
    
    // 평균 속도
    const hours = totalSeconds / 3600;
    const avgSpeed = hours > 0 ? (totalDistance / 1000) / hours : 0;
    els.avgSpeed.innerText = isNaN(avgSpeed) ? "0.0" : avgSpeed.toFixed(1);

    // 페이스 (분'초")
    if (totalDistance > 5) {
        const paceMin = (elapsedTime / 1000 / 60) / (totalDistance / 1000);
        if (paceMin > 30 || isNaN(paceMin)) {
             els.pace.innerText = "-'--\"";
        } else {
            const pm = Math.floor(paceMin);
            const ps = Math.floor((paceMin - pm) * 60);
            els.pace.innerText = `${pm}'${String(ps).padStart(2,'0')}"`;
        }
    } else {
        els.pace.innerText = "-'--\"";
    }

    // 칼로리 (단순 추정치)
    const cal = (totalDistance / 1000) * 60; 
    els.cal.innerText = Math.floor(cal);

    // 케이던스 (속도 기반 추정치)
    let estCadence = 0;
    if (speedKmh > 2) estCadence = 120 + (speedKmh * 6);
    if (estCadence > 200) estCadence = 200;
    els.cadence.innerText = speedKmh < 1 ? 0 : Math.floor(estCadence);
}

// ==========================================
// 컨트롤 버튼 이벤트 (START / PAUSE / RESUME / STOP)
// ==========================================

// [RUN 시작]
els.btnStart.addEventListener('click', () => {
    isRunning = true; 
    isPaused = false; 
    
    // 현재 위치를 출발점으로 세팅
    const currentLatLng = userMarker.getLatLng();
    lastPos = [currentLatLng.lat, currentLatLng.lng];
    currentSegment = [lastPos]; 
    
    // 새로운 빨간색 실선 레이어 생성
    const newPoly = L.polyline(currentSegment, { 
        color: '#ff4d4d', 
        weight: 6, 
        lineCap: 'round',
        lineJoin: 'round',
        opacity: 0.9 
    }).addTo(map);
    
    userPathLines.push(newPoly);
    
    // UI 전환
    els.ready.classList.add('hidden'); 
    els.running.classList.remove('hidden');
    
    // 타이머 가동 (1초 간격)
    timerId = setInterval(() => { 
        if (!isPaused) { 
            elapsedTime += 1000; 
            updateUI(0); 
        } 
    }, 1000);
});

// [일시정지]
els.btnPause.addEventListener('click', () => {
    isPaused = true;
    els.running.classList.add('hidden'); 
    els.paused.classList.remove('hidden');
});

// [재개 (RESUME)]
els.btnResume.addEventListener('click', () => {
    isPaused = false;
    els.paused.classList.add('hidden'); 
    els.running.classList.remove('hidden');
    
    // 일시정지 해제 시 새로운 이동 구간(Segment) 생성
    const currentLatLng = userMarker.getLatLng();
    lastPos = [currentLatLng.lat, currentLatLng.lng];
    currentSegment = [lastPos];
    
    const newPoly = L.polyline(currentSegment, { 
        color: '#ff4d4d', 
        weight: 6, 
        lineCap: 'round',
        lineJoin: 'round',
        opacity: 0.9 
    }).addTo(map);
    
    userPathLines.push(newPoly);
});

// [종료 및 Firebase 클라우드 저장]
function stopRun() {
    if (!currentUser) {
        alert("로그인 정보가 없습니다. 저장할 수 없습니다.");
        return;
    }

    if (confirm("러닝을 종료하고 기록을 저장하시겠습니까?")) {
        isRunning = false; 
        isPaused = false;
        clearInterval(timerId);
        
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
        }
        
        const finalDist = (totalDistance / 1000).toFixed(2);
        
        // Leaflet 경로 객체들을 순수 위도/경도 좌표 배열로 추출
        const pathData = userPathLines.map(line => {
            return line.getLatLngs().map(ll => [ll.lat, ll.lng]);
        });

        const record = {
            id: Date.now(),
            date: new Date().toLocaleString('ko-KR'),
            timestamp: Date.now(),
            dist: finalDist,
            time: els.time.innerText,
            pace: els.pace.innerText,
            cal: els.cal.innerText,
            path: pathData 
        };

        // Firebase Realtime Database 저장 ('users/{uid}/history')
        const historyRef = ref(db, `users/${currentUser.uid}/history`);
        push(historyRef, record)
            .then(() => {
                alert(`러닝 기록이 성공적으로 저장되었습니다! (${finalDist} km)`);
                window.location.href = 'run_record.html'; 
            })
            .catch((err) => {
                alert("기록 저장 중 오류가 발생했습니다: " + err.message);
            });
    }
}

els.btnStopRun.addEventListener('click', stopRun);
els.btnStopPaused.addEventListener('click', stopRun);

// ==========================================
// 코스 불러오기 모달 (Modal)
// ==========================================
const loadModal = document.getElementById('loadModal');

els.btnLoad.addEventListener('click', () => {
    const list = JSON.parse(localStorage.getItem('myCourses') || "[]");
    const listEl = document.getElementById('savedList');
    listEl.innerHTML = ''; 

    if (list.length === 0) {
        listEl.innerHTML = '<li style="padding:20px;text-align:center;color:#999;">저장된 코스가 없습니다.<br>(코스 생성 화면에서 먼저 코스를 만들어보세요)</li>';
    }

    list.forEach(c => {
        const li = document.createElement('li'); 
        li.className = 'saved-item';
        let d = "";
        try {
            const lats = c.path.map(p => p[0]), lngs = c.path.map(p => p[1]);
            const minLat = Math.min(...lats), maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
            const latRange = maxLat - minLat || 0.001, lngRange = maxLng - minLng || 0.001;
            
            c.path.forEach((p, i) => { 
                const y = 50 - ((p[0] - minLat) / latRange) * 50; 
                const x = ((p[1] - minLng) / lngRange) * 50; 
                d += `${i===0?'M':'L'} ${x} ${y} `; 
            });
        } catch(e) { d = "M 25 25 L 25 25"; }

        li.innerHTML = `
            <div>
                <div style="font-weight:bold; font-size:16px;">${c.name}</div>
                <div style="font-size:13px;color:#888;">${c.dist}</div>
            </div>
            <svg class="mini-map" viewBox="-5 -5 60 60">
                <path d="${d}" fill="none" stroke="#3586ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        
        li.onclick = () => {
            localStorage.setItem('currentRunRoute', JSON.stringify(c.path));
            localStorage.setItem('currentRunDist', c.dist.replace(' km',''));
            checkLocalStorage();
            loadModal.classList.add('hidden');
        };
        listEl.appendChild(li);
    });
    
    loadModal.classList.remove('hidden');
});

document.getElementById('closeLoadBtn').addEventListener('click', () => {
    loadModal.classList.add('hidden');
});
