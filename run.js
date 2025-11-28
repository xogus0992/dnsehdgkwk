// POKERUN PRO - run.js (통합본)

// ===== API 키 설정 =====
const VWORLD_API_KEY = "0E603DDF-E18F-371F-96E8-ECD87D4CA088"; // VWorld
const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk3NTU2OTk1ODQ1NjQ0YWE5NzA3ZTM1OWExMGE3NTU4IiwiaCI6Im11cm11cjY0In0="; // 여기에 ORS Directions API 키를 직접 입력하세요 (없으면 코스 자동생성 비활성)

// ===== 전역 상태 =====
const defaultLat = 37.5665;
const defaultLon = 126.9780;

let runMap = null;
let routeMap = null;

let runMarker = null;
let runPolyline = null;
let runPath = [];
let runWatchId = null;
let isRunning = false;
let runStartTime = null;
let totalDistance = 0;
let totalCalories = 0;

let routePolyline = null;

let runRecords = []; // localStorage에서 로드

// ===== 공통 유틸 =====
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    0.5 - Math.cos(dLat) / 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    (1 - Math.cos(dLon)) / 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ===== Leaflet + VWorld =====
function createLeafletMap(targetId, lat, lon, zoom = 16) {
  const map = L.map(targetId, {
    zoomControl: false,
    attributionControl: false
  }).setView([lat, lon], zoom);

  L.tileLayer(
    `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_API_KEY}/Base/{z}/{y}/{x}.png`,
    {
      minZoom: 6,
      maxZoom: 19
    }
  ).addTo(map);

  return map;
}

// ===== 러닝 기록 저장/로드 =====
function loadRunRecords() {
  try {
    const raw = localStorage.getItem("runRecords");
    if (!raw) {
      runRecords = [];
      return;
    }
    runRecords = JSON.parse(raw);
    if (!Array.isArray(runRecords)) runRecords = [];
  } catch {
    runRecords = [];
  }
}

function saveRunRecord(distanceKm, timeSec, calories, path) {
  const rec = {
    distanceKm,
    timeSec,
    calories,
    path,
    createdAt: new Date().toISOString()
  };
  runRecords.push(rec);
  localStorage.setItem("runRecords", JSON.stringify(runRecords));
  updateHomeSummary();
  updateRecordList();
}

// ===== HOME / RECORD UI =====
function updateHomeSummary() {
  const box = document.getElementById("home-latest");
  if (!box) return;

  if (!runRecords.length) {
    box.innerHTML = `<p class="text-gray-500 text-sm">최근 러닝 기록이 없습니다.</p>`;
    return;
  }

  const last = runRecords[runRecords.length - 1];
  box.innerHTML = `
    <div class="font-bold text-lg mb-1">${last.distanceKm.toFixed(2)} km</div>
    <div class="text-gray-600 text-sm">${formatTime(last.timeSec)}</div>
    <div class="text-gray-500 text-xs mt-1">${new Date(last.createdAt).toLocaleString()}</div>
  `;
}

function updateRecordList() {
  const box = document.getElementById("record-list");
  if (!box) return;

  box.innerHTML = "";
  if (!runRecords.length) {
    box.innerHTML = `<p class="text-gray-500 text-sm">저장된 러닝 기록이 없습니다.</p>`;
    return;
  }

  runRecords
    .slice()
    .reverse()
    .forEach((rec, idx) => {
      const div = document.createElement("div");
      div.className = "record-item";
      div.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <div class="font-bold">${rec.distanceKm.toFixed(2)} km</div>
            <div class="text-gray-600 text-sm">${formatTime(rec.timeSec)}</div>
            <div class="text-gray-500 text-[11px] mt-1">${new Date(rec.createdAt).toLocaleString()}</div>
          </div>
        </div>
      `;
      box.appendChild(div);
    });
}

// ===== RUN: 지도 + GPS 러닝 =====
function initRunMap(lat, lon) {
  if (runMap) return;
  runMap = createLeafletMap("run-map", lat, lon, 16);

  runMarker = L.circleMarker([lat, lon], {
    radius: 7,
    color: "#1A82FF",
    fillColor: "#1A82FF",
    fillOpacity: 1
  }).addTo(runMap);
}

function ensureRunMap() {
  if (runMap) return;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        initRunMap(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        initRunMap(defaultLat, defaultLon);
      },
      { enableHighAccuracy: true }
    );
  } else {
    initRunMap(defaultLat, defaultLon);
  }
}

function startRun() {
  if (isRunning) return;

  ensureRunMap();

  isRunning = true;
  runStartTime = Date.now();
  totalDistance = 0;
  totalCalories = 0;
  runPath = [];
  if (runPolyline && runMap) {
    runMap.removeLayer(runPolyline);
    runPolyline = null;
  }

  const btn = document.getElementById("run-start-btn");
  if (btn) btn.innerText = "정지";

  if (!navigator.geolocation) {
    alert("이 기기에서 GPS를 사용할 수 없습니다.");
    return;
  }

  runWatchId = navigator.geolocation.watchPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      // 위치 기록
      runPath.push([lat, lon]);

      // 거리 계산
      if (runPath.length >= 2) {
        const a = runPath[runPath.length - 2];
        const b = runPath[runPath.length - 1];
        totalDistance += haversineDistance(a[0], a[1], b[0], b[1]);
      }

      // 지도/마커 갱신
      if (runMarker) runMarker.setLatLng([lat, lon]);
      if (runMap) runMap.setView([lat, lon]);

      // 폴리라인
      if (runMap && runPath.length >= 2) {
        if (runPolyline) runMap.removeLayer(runPolyline);
        runPolyline = L.polyline(runPath, {
          color: "#1A82FF",
          weight: 5
        }).addTo(runMap);
      }

      updateRunUI();
    },
    err => {
      console.error(err);
      alert("GPS 위치를 가져오지 못했습니다.");
      stopRun(false);
    },
    { enableHighAccuracy: true, maximumAge: 1000 }
  );
}

function stopRun(save = true) {
  if (!isRunning) return;
  isRunning = false;

  if (runWatchId != null) {
    navigator.geolocation.clearWatch(runWatchId);
    runWatchId = null;
  }

  const btn = document.getElementById("run-start-btn");
  if (btn) btn.innerText = "시작";

  const elapsedSec = Math.floor((Date.now() - runStartTime) / 1000);

  if (save && totalDistance > 0.01) {
    // kcal: 대략 60kcal/km 기준 (추정값)
    totalCalories = Math.round(totalDistance * 60);
    saveRunRecord(totalDistance, elapsedSec, totalCalories, runPath);
    alert("러닝 기록이 저장되었습니다.");
  }

  updateRunUI();
}

function updateRunUI() {
  const distEl = document.getElementById("run-distance");
  const timeEl = document.getElementById("run-time");
  const paceEl = document.getElementById("run-pace");
  const calEl = document.getElementById("run-cal");

  const elapsedSec = isRunning && runStartTime
    ? Math.floor((Date.now() - runStartTime) / 1000)
    : 0;

  if (distEl) distEl.innerText = totalDistance.toFixed(2);
  if (timeEl) timeEl.innerText = formatTime(elapsedSec);

  if (paceEl) {
    if (totalDistance > 0.01 && elapsedSec > 0) {
      const pace = (elapsedSec / 60) / totalDistance; // 분/ km
      paceEl.innerText = pace.toFixed(1) + " /km";
    } else {
      paceEl.innerText = "-";
    }
  }

  if (calEl) calEl.innerText = Math.round(totalDistance * 60);
}

// ===== ROUTE: 지도 + 목표 거리 UI 기본 =====
function ensureRouteMap() {
  if (routeMap) return;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        routeMap = createLeafletMap("route-map", pos.coords.latitude, pos.coords.longitude, 16);
      },
      () => {
        routeMap = createLeafletMap("route-map", defaultLat, defaultLon, 16);
      },
      { enableHighAccuracy: true }
    );
  } else {
    routeMap = createLeafletMap("route-map", defaultLat, defaultLon, 16);
  }
}

// navSwitch()에서 route로 들어올 때 호출할 함수
function openRoutePage() {
  ensureRouteMap();
}

function handleOpenCourseGenerator() {
  // ⚠ 코스 상세 생성/ORS 연동 부분
  // 현재 run.js 원본(너가 쓰던 버전)을 이 채팅에서 볼 수 없어서
  // 기존 코스 생성 알고리즘을 1:1로 복원할 수 없는 상태라
  // 여기서는 "자리만 잡아둔" 상태다. (추측 구현 방지)
  alert("코스 상세 생성 UI/코스 자동 생성 로직은 나중에 원본 run.js 기준으로 다시 붙이는 게 안전함.");
}

// ===== 이벤트 바인딩 =====
function bindEvents() {
  const runBtn = document.getElementById("run-start-btn");
  if (runBtn) {
    runBtn.addEventListener("click", () => {
      if (isRunning) stopRun(true);
      else startRun();
    });
  }

  const openCourseBtn = document.getElementById("open-course-gen");
  if (openCourseBtn) {
    openCourseBtn.addEventListener("click", handleOpenCourseGenerator);
  }
}

// ===== 초기 진입 =====
window.addEventListener("load", () => {
  loadRunRecords();
  updateHomeSummary();
  updateRecordList();
  ensureRunMap();
  bindEvents();
});
