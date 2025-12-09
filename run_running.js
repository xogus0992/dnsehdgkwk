/* ============================================================
   POKERUN RUNNING LOGIC (FINAL v2)
   - Map: V-World (Same as Course Tab)
   - Save Logic: Saves to 'myRunningRecords' -> Redirects to record.html
   ============================================================ */

// [중요] 코스 탭과 동일한 브이월드 키
const KEY_VWORLD = '0E603DDF-E18F-371F-96E8-ECD87D4CA088';

let map, userMarker;
let coursePolyline = null; 
let userPathLines = []; 
let currentSegment = []; 

let watchId = null;
let timerId = null;
let isRunning = false;
let isPaused = false;

// 데이터
let startTime = 0;
let elapsedTime = 0; 
let totalDistance = 0; 
let targetDistance = 0; 
let startTargetKm = 0;  

// UI Elements
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

window.onload = function() {
    initMap();
    checkLocalStorage();
    setupGeolocation();
};

function initMap() {
    // [수정] 브이월드 타일 적용 (코스 탭과 통일)
    map = L.map('map', { zoomControl: false }).setView([37.5665, 126.9780], 16);
    L.tileLayer(`https://api.vworld.kr/req/wmts/1.0.0/${KEY_VWORLD}/Base/{z}/{y}/{x}.png`, {
        maxZoom: 19, attribution: 'V-WORLD'
    }).addTo(map);
    
    const icon = L.divIcon({
        className: 'user-marker',
        html: '<div style="width:16px;height:16px;background:#3586ff;border:3px solid white;border-radius:50%;box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>',
        iconSize: [20, 20]
    });
    userMarker = L.marker([37.5665, 126.9780], {icon: icon}).addTo(map);
}

function checkLocalStorage() {
    const savedRoute = localStorage.getItem('currentRunRoute');
    const savedDist = localStorage.getItem('currentRunDist');

    if (savedRoute && savedDist) {
        startTargetKm = parseFloat(savedDist); 
        targetDistance = startTargetKm * 1000; 
        
        const latlngs = JSON.parse(savedRoute);
        if (latlngs.length > 0) {
            coursePolyline = L.polyline(latlngs, {
                color: '#aaa', weight: 5, dashArray: '5, 10', opacity: 0.7
            }).addTo(map);
            map.fitBounds(coursePolyline.getBounds());
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
            { enableHighAccuracy: true, maximumAge: 0 }
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
    map.panTo(latlng);
    els.gpsStatus.innerText = "GPS 수신 양호";
    els.gpsStatus.style.background = "rgba(0,200,0,0.6)";
}

function handleError(err) {
    console.warn('GPS Error:', err);
    els.gpsStatus.innerText = "GPS 신호 약함";
    els.gpsStatus.style.background = "rgba(255,0,0,0.6)";
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
        const pm = Math.floor(paceMin);
        const ps = Math.floor((paceMin - pm) * 60);
        els.pace.innerText = `${pm}'${String(ps).padStart(2,'0')}"`;
    }

    const cal = (totalDistance / 1000) * 70; 
    els.cal.innerText = Math.floor(cal);

    let estCadence = 0;
    if (speedKmh > 1) estCadence = 80 + (speedKmh * 8); 
    if (estCadence > 200) estCadence = 200;
    els.cadence.innerText = Math.floor(estCadence);
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
    const newPoly = L.polyline([], { color: 'red', weight: 5 }).addTo(map);
    userPathLines.push(newPoly);
    els.ready.classList.add('hidden'); els.running.classList.remove('hidden');
    timerId = setInterval(() => { if (!isPaused) { elapsedTime += 1000; updateUI(0); } }, 1000);
});

els.btnPause.addEventListener('click', () => {
    isPaused = true;
    els.running.classList.add('hidden'); els.paused.classList.remove('hidden');
});

els.btnResume.addEventListener('click', () => {
    isPaused = false;
    els.paused.classList.add('hidden'); els.running.classList.remove('hidden');
    currentSegment = [];
    const newPoly = L.polyline([], { color: 'red', weight: 5 }).addTo(map);
    userPathLines.push(newPoly);
    navigator.geolocation.getCurrentPosition(pos => { lastPos = [pos.coords.latitude, pos.coords.longitude]; });
});

// [핵심] 러닝 종료 및 저장 로직
function stopRun() {
    isRunning = false; isPaused = false;
    clearInterval(timerId);
    navigator.geolocation.clearWatch(watchId);
    
    if(confirm("러닝을 종료하고 기록을 저장하시겠습니까?")) {
        const finalDist = (totalDistance/1000).toFixed(2);
        
        // 1. 저장할 데이터 객체 생성
        // 폴리라인은 Leaflet 객체가 아닌 순수 좌표 배열로 저장해야 함 (중요)
        const pathData = userPathLines.map(line => line.getLatLngs());

        const record = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            dist: finalDist,
            time: els.time.innerText,
            pace: els.pace.innerText,
            cal: els.cal.innerText,
            path: pathData // 내가 뛴 경로 좌표들 (Array of Arrays)
        };

        // 2. LocalStorage에 'myRunningRecords'로 저장
        let records = JSON.parse(localStorage.getItem('myRunningRecords') || "[]");
        records.push(record);
        localStorage.setItem('myRunningRecords', JSON.stringify(records));

        alert(`기록 저장 완료! (${finalDist}km)`);
        
        // 3. 기록 탭으로 이동
        window.location.href = 'record.html';
    }
}
els.btnStopRun.addEventListener('click', stopRun);
els.btnStopPaused.addEventListener('click', stopRun);

// --- LOAD COURSE ---
const loadModal = document.getElementById('loadModal');
els.btnLoad.addEventListener('click', () => {
    const list = JSON.parse(localStorage.getItem('myCourses') || "[]");
    const listEl = document.getElementById('savedList');
    listEl.innerHTML = list.length ? '' : '<li style="padding:15px;text-align:center;">저장된 코스 없음</li>';
    list.forEach(c => {
        const li = document.createElement('li'); li.className = 'saved-item';
        const lats=c.path.map(p=>p[0]), lngs=c.path.map(p=>p[1]);
        const minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
        let d=""; c.path.forEach((p,i)=>{ const y=50-((p[0]-minLat)/(maxLat-minLat||1))*50, x=((p[1]-minLng)/(maxLng-minLng||1))*50; d+=`${i===0?'M':'L'} ${x} ${y} `; });
        li.innerHTML = `<div><div style="font-weight:bold;">${c.name}</div><div style="font-size:12px;color:#888;">${c.dist}</div></div><svg class="mini-map" viewBox="0 0 50 50"><path d="${d}" fill="none" stroke="#3586ff" stroke-width="2"/></svg>`;
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