import { db, auth } from './firebase-service.js';
import { ref, push } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ============================================================
   POKERUN RUNNING LOGIC (FINAL v2.2 Firebase Connected)
   - Map: V-World
   - Storage: Firebase 'users/{uid}/history'
   - Connection: Course(LocalStorage) -> Running -> Record(Firebase)
   ============================================================ */

const KEY_VWORLD = '0E603DDF-E18F-371F-96E8-ECD87D4CA088';

let map, userMarker;
let coursePolyline = null; 
let userPathLines = []; 
let currentSegment = []; 

let watchId = null;
let timerId = null;
let isRunning = false;
let isPaused = false;
let currentUser = null; // 로그인 유저 정보

// Data Variables
let startTime = 0;
let elapsedTime = 0; 
let totalDistance = 0; 
let targetDistance = 0; 
let startTargetKm = 0;  

// Elements
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

// [초기화] window.onload 대신 이벤트 리스너 사용 (충돌 방지)
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
            alert("로그인이 필요합니다.");
            // 필요하면 로그인 페이지로 이동
        }
    });
});

function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView([37.5665, 126.9780], 16);
    L.tileLayer(`https://api.vworld.kr/req/wmts/1.0.0/${KEY_VWORLD}/Base/{z}/{y}/{x}.png`, {
        maxZoom: 19
    }).addTo(map);
    
    const icon = L.divIcon({
        className: 'user-marker',
        html: '<div style="width:18px;height:18px;background:#3586ff;border:3px solid white;border-radius:50%;box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>',
        iconSize: [24, 24]
    });
    userMarker = L.marker([37.5665, 126.9780], {icon: icon}).addTo(map);
}

function checkLocalStorage() {
    // 코스 탭에서 넘겨준 데이터 받기 (이건 LocalStorage가 가장 빠르고 적합함)
    const savedRoute = localStorage.getItem('currentRunRoute');
    const savedDist = localStorage.getItem('currentRunDist');

    if (savedRoute && savedDist) {
        startTargetKm = parseFloat(savedDist); 
        targetDistance = startTargetKm * 1000; 
        
        const latlngs = JSON.parse(savedRoute);
        if (latlngs && latlngs.length > 0) {
            coursePolyline = L.polyline(latlngs, {
                color: '#888', weight: 6, dashArray: '10, 10', opacity: 0.5, lineCap: 'round'
            }).addTo(map);
            map.fitBounds(coursePolyline.getBounds(), { padding: [50, 50] });
        }
        els.dist.innerText = startTargetKm.toFixed(2);
    } else {
        startTargetKm = 0; targetDistance = 0;
        els.dist.innerText = "0.00";
    }
}

function setupGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(updatePosition, handleError, { enableHighAccuracy: true });
        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                updatePosition(pos);
                if (isRunning && !isPaused) processRunningData(pos);
            }, 
            handleError, 
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );
    } else {
        els.gpsStatus.innerText = "GPS 미지원";
    }
}

let lastPos = null;
function updatePosition(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const latlng = [lat, lng];
    userMarker.setLatLng(latlng);
    if (isRunning) map.panTo(latlng); 
    els.gpsStatus.innerText = "GPS 수신중";
    els.gpsStatus.style.background = "rgba(0,200,100,0.8)";
}

function handleError(err) {
    console.warn('GPS Error:', err);
    els.gpsStatus.innerText = "GPS 신호 약함";
    els.gpsStatus.style.background = "rgba(255,50,50,0.8)";
}

function processRunningData(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    
    if (lastPos) {
        const dist = map.distance(lastPos, [lat, lng]); 
        if (dist > 0.5) { 
            totalDistance += dist;
            currentSegment.push([lat, lng]);
            updatePolyline(); 
        }
    }
    lastPos = [lat, lng];
    updateUI(pos.coords.speed);
}

function updateUI(currentSpeedMs) {
    if (targetDistance > 0) {
        let remainM = targetDistance - totalDistance;
        if (remainM < 0) remainM = 0; 
        els.dist.innerText = (remainM / 1000).toFixed(2);
    } else {
        els.dist.innerText = (totalDistance / 1000).toFixed(2);
    }

    const totalSeconds = Math.floor(elapsedTime / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    els.time.innerText = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    const speedKmh = (currentSpeedMs || 0) * 3.6;
    els.speed.innerText = speedKmh.toFixed(1);
    
    const avgSpeed = (totalDistance / 1000) / (totalSeconds / 3600 || 1);
    els.avgSpeed.innerText = isNaN(avgSpeed) ? "0.0" : avgSpeed.toFixed(1);

    if (totalDistance > 0) {
        const paceMin = (elapsedTime / 1000 / 60) / (totalDistance / 1000);
        if (paceMin > 30) {
             els.pace.innerText = "-'--\"";
        } else {
            const pm = Math.floor(paceMin);
            const ps = Math.floor((paceMin - pm) * 60);
            els.pace.innerText = `${pm}'${String(ps).padStart(2,'0')}"`;
        }
    }

    const cal = (totalDistance / 1000) * 70; 
    els.cal.innerText = Math.floor(cal);

    let estCadence = 0;
    if (speedKmh > 2) estCadence = 130 + (speedKmh * 5);
    if (estCadence > 200) estCadence = 200;
    els.cadence.innerText = speedKmh < 1 ? 0 : Math.floor(estCadence);
}

function updatePolyline() {
    if (userPathLines.length > 0) {
        const activePolyline = userPathLines[userPathLines.length - 1];
        activePolyline.addLatLng(currentSegment[currentSegment.length - 1]);
    }
}

// --- CONTROLS ---
els.btnStart.addEventListener('click', () => {
    isRunning = true; isPaused = false; startTime = Date.now();
    currentSegment = []; 
    const newPoly = L.polyline([], { color: '#ff4d4d', weight: 6, lineCap: 'round' }).addTo(map);
    userPathLines.push(newPoly);
    
    els.ready.classList.add('hidden'); els.running.classList.remove('hidden');
    
    timerId = setInterval(() => { 
        if (!isPaused) { 
            elapsedTime += 1000; 
            updateUI(0); 
        } 
    }, 1000);
});

els.btnPause.addEventListener('click', () => {
    isPaused = true;
    els.running.classList.add('hidden'); els.paused.classList.remove('hidden');
});

els.btnResume.addEventListener('click', () => {
    isPaused = false;
    els.paused.classList.add('hidden'); els.running.classList.remove('hidden');
    navigator.geolocation.getCurrentPosition(pos => { lastPos = [pos.coords.latitude, pos.coords.longitude]; });
});

// [★ 핵심] Firebase에 기록 저장
function stopRun() {
    if (!currentUser) {
        alert("로그인 정보가 없어 저장할 수 없습니다.");
        return;
    }

    isRunning = false; isPaused = false;
    clearInterval(timerId);
    navigator.geolocation.clearWatch(watchId);
    
    if(confirm("러닝을 종료하고 기록을 저장하시겠습니까?")) {
        const finalDist = (totalDistance/1000).toFixed(2);
        
        // Leaflet 객체 -> 순수 좌표 배열 변환
        const pathData = userPathLines.map(line => line.getLatLngs());

        const record = {
            id: Date.now(),
            date: new Date().toLocaleString(), // 날짜 포맷은 취향껏
            timestamp: Date.now(), // 정렬용 타임스탬프
            dist: finalDist,
            time: els.time.innerText,
            pace: els.pace.innerText,
            cal: els.cal.innerText,
            path: pathData 
        };

        // Firebase Realtime Database에 저장 (users/uid/history)
        const historyRef = ref(db, `users/${currentUser.uid}/history`);
        push(historyRef, record)
            .then(() => {
                alert(`클라우드 저장 완료! (${finalDist}km)`);
                // 기록 페이지로 이동
                window.location.href = 'run_record.html'; 
            })
            .catch((err) => {
                alert("저장 실패: " + err.message);
            });
    }
}

els.btnStopRun.addEventListener('click', stopRun);
els.btnStopPaused.addEventListener('click', stopRun);

// --- LOAD COURSE MODAL ---
// (이 부분은 코스 불러오기용이라 LocalStorage 유지)
const loadModal = document.getElementById('loadModal');

els.btnLoad.addEventListener('click', () => {
    // 코스는 Firebase에서 가져오는 게 좋지만, Course 탭에서 이미 저장해둔 걸 쓸 수도 있음.
    // 여기서는 간단히 '내가 만든 코스' 목록을 보여준다고 가정 (기존 코드 유지)
    // 만약 여기서도 Firebase 코스를 불러오려면 run_course.js의 불러오기 로직을 가져와야 함.
    // 일단은 UI 확인용으로 둡니다.
    const list = JSON.parse(localStorage.getItem('myCourses') || "[]");
    const listEl = document.getElementById('savedList');
    listEl.innerHTML = ''; 

    if (list.length === 0) {
        listEl.innerHTML = '<li style="padding:20px;text-align:center;color:#999;">로컬에 저장된 코스가 없습니다.<br>(코스 탭에서 생성한 코스)</li>';
    }

    list.forEach(c => {
        const li = document.createElement('li'); li.className = 'saved-item';
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

document.getElementById('closeLoadBtn').addEventListener('click', () => loadModal.classList.add('hidden'));