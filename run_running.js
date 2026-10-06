import { db, auth } from './firebase-service.js';
import { ref, push } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ============================================================
   POKERUN RUNNING LOGIC (FINAL v3.0 - Target Course Path Saving)
   ============================================================ */

let map, userMarker;
let coursePolyline = null;    
let userPathLines = [];     
let currentSegment = [];     

let watchId = null;
let timerId = null;
let isRunning = false;
let isPaused = false;
let isFirstGpsLock = false;  
let currentUser = null;       

let elapsedTime = 0; 
let totalDistance = 0; 
let targetDistance = 0; 
let startTargetKm = 0;  
let lastPos = null;

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

window.addEventListener('load', () => {
    initMap();
    setupGeolocation();

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("Runner Logged in:", user.email);
        } else {
            alert("로그인이 필요합니다. 로그인 페이지로 이동해주세요.");
        }
    });
});

function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView([37.5665, 126.9780], 17);
    
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    const icon = L.divIcon({
        className: 'user-marker',
        html: '<div style="width:20px;height:20px;background:#3586ff;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.4);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    
    userMarker = L.marker([37.5665, 126.9780], { icon: icon, zIndexOffset: 1000 }).addTo(map);

    setTimeout(() => { 
        if (map) {
            map.invalidateSize(); 
            checkLocalStorage();
        }
    }, 250);
}

function checkLocalStorage() {
    const savedRoute = localStorage.getItem('currentRunRoute');
    const savedDist = localStorage.getItem('currentRunDist');

    if (savedRoute && savedDist) {
        startTargetKm = parseFloat(savedDist); 
        targetDistance = startTargetKm * 1000; 
        
        const latlngs = JSON.parse(savedRoute);
        if (latlngs && latlngs.length > 0) {
            if (coursePolyline) map.removeLayer(coursePolyline);

            coursePolyline = L.polyline(latlngs, {
                color: '#3586ff', 
                weight: 7, 
                dashArray: '8, 8', 
                opacity: 0.9, 
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(map);

            map.fitBounds(coursePolyline.getBounds(), { padding: [40, 40] });
        }
        if (els.dist) els.dist.innerText = startTargetKm.toFixed(2);
    } else {
        startTargetKm = 0; 
        targetDistance = 0;
        if (els.dist) els.dist.innerText = "0.00";
    }
}

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
        if (els.gpsStatus) {
            els.gpsStatus.innerText = "GPS 미지원";
            els.gpsStatus.style.background = "rgba(255,50,50,0.8)";
        }
    }
}

function updatePosition(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const latlng = [lat, lng];

    userMarker.setLatLng(latlng);

    if (!isFirstGpsLock) {
        isFirstGpsLock = true;
        if (!coursePolyline) map.setView(latlng, 17);
    }

    if (isRunning) {
        map.panTo(latlng, { animate: true, duration: 0.5 }); 
    }

    if (els.gpsStatus) {
        els.gpsStatus.innerText = "GPS 수신중";
        els.gpsStatus.style.background = "rgba(0,200,100,0.8)";
    }
}

function handleError(err) {
    console.warn('GPS Error:', err);
    if (els.gpsStatus) {
        els.gpsStatus.innerText = "GPS 신호 약함";
        els.gpsStatus.style.background = "rgba(255,180,0,0.8)";
    }
}

function processRunningData(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const currentLatLng = [lat, lng];
    
    if (lastPos) {
        const dist = map.distance(lastPos, currentLatLng); 
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

function updatePolyline() {
    if (userPathLines.length > 0 && currentSegment.length > 0) {
        const activePolyline = userPathLines[userPathLines.length - 1];
        activePolyline.setLatLngs(currentSegment);
    }
}

function updateUI(currentSpeedMs) {
    if (targetDistance > 0) {
        let remainM = targetDistance - totalDistance;
        if (remainM < 0) remainM = 0; 
        if (els.dist) els.dist.innerText = (remainM / 1000).toFixed(2);
    } else {
        if (els.dist) els.dist.innerText = (totalDistance / 1000).toFixed(2);
    }

    const totalSeconds = Math.floor(elapsedTime / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (els.time) els.time.innerText = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    const speedKmh = (currentSpeedMs || 0) * 3.6;
    if (els.speed) els.speed.innerText = speedKmh.toFixed(1);
    
    const hours = totalSeconds / 3600;
    const avgSpeed = hours > 0 ? (totalDistance / 1000) / hours : 0;
    if (els.avgSpeed) els.avgSpeed.innerText = isNaN(avgSpeed) ? "0.0" : avgSpeed.toFixed(1);

    if (els.pace) {
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
    }

    const cal = (totalDistance / 1000) * 60; 
    if (els.cal) els.cal.innerText = Math.floor(cal);

    let estCadence = 0;
    if (speedKmh > 2) estCadence = 120 + (speedKmh * 6);
    if (estCadence > 200) estCadence = 200;
    if (els.cadence) els.cadence.innerText = speedKmh < 1 ? 0 : Math.floor(estCadence);
}

els.btnStart?.addEventListener('click', () => {
    isRunning = true; 
    isPaused = false; 
    
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
    
    els.ready.classList.add('hidden'); 
    els.running.classList.remove('hidden');
    
    timerId = setInterval(() => { 
        if (!isPaused) { 
            elapsedTime += 1000; 
            updateUI(0); 
        } 
    }, 1000);
});

els.btnPause?.addEventListener('click', () => {
    isPaused = true;
    els.running.classList.add('hidden'); 
    els.paused.classList.remove('hidden');
});

els.btnResume?.addEventListener('click', () => {
    isPaused = false;
    els.paused.classList.add('hidden'); 
    els.running.classList.remove('hidden');
    
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
        
        const pathData = userPathLines.map(line => {
            return line.getLatLngs().map(ll => [ll.lat, ll.lng]);
        });

        const targetRouteRaw = localStorage.getItem('currentRunRoute');
        const targetPathData = targetRouteRaw ? JSON.parse(targetRouteRaw) : null;

        const record = {
            id: Date.now(),
            date: new Date().toLocaleString('ko-KR'),
            timestamp: Date.now(),
            dist: finalDist,
            time: els.time ? els.time.innerText : "00:00",
            pace: els.pace ? els.pace.innerText : "-'--\"",
            cal: els.cal ? els.cal.innerText : "0",
            path: pathData,
            targetPath: targetPathData // 선택했던 목표 코스 저장
        };

        const historyRef = ref(db, `users/${currentUser.uid}/history`);
        push(historyRef, record)
            .then(() => {
                alert(`러닝 기록이 저장되었습니다! (${finalDist} km)`);
                window.location.href = 'run_record.html'; 
            })
            .catch((err) => {
                alert("기록 저장 중 오류 발생: " + err.message);
            });
    }
}

els.btnStopRun?.addEventListener('click', stopRun);
els.btnStopPaused?.addEventListener('click', stopRun);

const loadModal = document.getElementById('loadModal');

els.btnLoad?.addEventListener('click', () => {
    const list = JSON.parse(localStorage.getItem('myCourses') || "[]");
    const listEl = document.getElementById('savedList');
    if (!listEl) return;
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
            if (loadModal) loadModal.classList.add('hidden');
        };
        listEl.appendChild(li);
    });
    
    if (loadModal) loadModal.classList.remove('hidden');
});

document.getElementById('closeLoadBtn')?.addEventListener('click', () => {
    if (loadModal) loadModal.classList.add('hidden');
});
