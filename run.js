// run.js - SPA + 공유 지도 + 기본 러닝/코스/기록 로직
// ⚠️ Leaflet(leaflet.css/js)이 HTML 쪽에 포함돼 있어야 한다.

// ---------------------------------------------------------
// 전역 상태
// ---------------------------------------------------------
let currentPageId = "page-home";

// 공유 지도 관련
let map = null;
let mapInitialized = false;
let currentMapContainer = null; // "run" 또는 "route"
let mapClickMode = null; // "set-start" | "set-end" | null

// RUN 상태
let runActive = false;
let runStartTime = null;
let runTimerId = null;
let runDistanceKm = 0;

// ROUTE 상태
let startMarker = null;
let endMarker = null;
let routeLine = null;
let targetDistanceKm = 5.0;

// RECORDS / 로컬스토리지
const STORAGE_KEYS = {
  ROUTES: "pokerun_routes",
  RUNS: "pokerun_runs",
};

// 유틸
const $ = (sel) => document.querySelector(sel);
const $all = (sel) => Array.from(document.querySelectorAll(sel));

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error("loadJSON error", key, e);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("saveJSON error", key, e);
  }
}

// ---------------------------------------------------------
// SPA 탭 전환
// ---------------------------------------------------------
function showPage(pageId) {
  const pages = [
    "page-home",
    "page-run",
    "page-route",
    "page-records",
    "page-profile",
  ];
  pages.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === pageId) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
  currentPageId = pageId;

  // 하단 탭 active 표시
  const tabItems = $all(".bottombar .tab-item");
  tabItems.forEach((el) => el.classList.remove("active"));
  const center = document.querySelector(".bottombar .tab-center");
  center?.classList.remove("active");

  if (pageId === "page-run") {
    tabItems[0]?.classList.add("active");
    moveMapToContainer("run");
  } else if (pageId === "page-route") {
    tabItems[1]?.classList.add("active");
    moveMapToContainer("route");
  } else if (pageId === "page-records") {
    tabItems[2]?.classList.add("active");
  } else if (pageId === "page-profile") {
    tabItems[3]?.classList.add("active");
  } else if (pageId === "page-home") {
    center?.classList.add("active");
  }

  if (pageId === "page-records") {
    renderRecordList();
  }
}

// ---------------------------------------------------------
// 지도 초기화 및 공유 컨테이너 이동
// ---------------------------------------------------------
function initMapIfNeeded() {
  if (mapInitialized) return;
  const mapEl = document.getElementById("shared-map");
  if (!mapEl) {
    console.error("#shared-map element not found");
    return;
  }
  map = L.map(mapEl, {
    center: [37.5665, 126.9780], // 서울 기본
    zoom: 14,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  map.on("click", onMapClick);

  mapInitialized = true;

  // 최초에는 RUN 탭 컨테이너로
  moveMapToContainer("run");

  // 위치 가져오기 시도
  tryGeolocate();
}

function moveMapToContainer(target) {
  const runContainer = document.getElementById("map-container-run");
  const routeContainer = document.getElementById("map-container-route");
  const shared = document.getElementById("shared-map");
  if (!runContainer || !routeContainer || !shared) return;

  if (target === currentMapContainer) return;
  currentMapContainer = target;

  if (target === "run") {
    runContainer.appendChild(shared);
  } else if (target === "route") {
    routeContainer.appendChild(shared);
  }
  if (map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 50);
  }
}

function tryGeolocate() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      if (!map) return;
      map.setView([lat, lng], 15);
      L.circleMarker([lat, lng], {
        radius: 6,
      }).addTo(map);
    },
    (err) => {
      console.warn("geolocation error", err);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
    }
  );
}

function onMapClick(e) {
  if (currentPageId !== "page-route") return;

  const latlng = e.latlng;
  if (mapClickMode === "set-start") {
    setStartMarker(latlng);
  } else if (mapClickMode === "set-end") {
    setEndMarker(latlng);
  }
}

// ---------------------------------------------------------
// RUN 탭 로직
// ---------------------------------------------------------
function updateRunDistanceDisplay() {
  const el = document.getElementById("run-distance");
  if (!el) return;
  el.textContent = runDistanceKm.toFixed(2);
}

function startRun() {
  if (runActive) return;
  runActive = true;
  runStartTime = Date.now();
  runDistanceKm = 0;
  updateRunDistanceDisplay();

  const btnStart = document.getElementById("btn-run-start");
  const btnPause = document.getElementById("btn-run-pause");
  const btnStop = document.getElementById("btn-run-stop");
  if (btnStart && btnPause && btnStop) {
    btnStart.classList.add("hidden");
    btnPause.classList.remove("hidden");
    btnStop.classList.remove("hidden");
  }

  // 데모용: 2초마다 0.01km 증가
  runTimerId = setInterval(() => {
    if (!runActive) return;
    runDistanceKm += 0.01;
    updateRunDistanceDisplay();
  }, 2000);
}

function pauseRun() {
  runActive = false;
}

function stopRun() {
  if (!runStartTime) {
    resetRunButtons();
    return;
  }
  const elapsedSec = Math.floor((Date.now() - runStartTime) / 1000);
  runActive = false;
  clearInterval(runTimerId);

  // 기록 저장
  const runs = loadJSON(STORAGE_KEYS.RUNS, []);
  const now = new Date();
  runs.unshift({
    id: "run_" + now.getTime(),
    date: now.toISOString(),
    distanceKm: runDistanceKm,
    elapsedSec,
    pace: runDistanceKm > 0 ? elapsedSec / 60 / runDistanceKm : 0, // 분/km
  });
  saveJSON(STORAGE_KEYS.RUNS, runs);

  resetRunButtons();
}

function resetRunButtons() {
  const btnStart = document.getElementById("btn-run-start");
  const btnPause = document.getElementById("btn-run-pause");
  const btnStop = document.getElementById("btn-run-stop");
  if (btnStart && btnPause && btnStop) {
    btnStart.classList.remove("hidden");
    btnPause.classList.add("hidden");
    btnStop.classList.add("hidden");
  }
  clearInterval(runTimerId);
  runTimerId = null;
  runActive = false;
}

// ---------------------------------------------------------
// ROUTE 탭: 시작/종료 마커 & 거리 계산
// ---------------------------------------------------------
function setStartMarker(latlng) {
  if (!map) return;
  if (startMarker) map.removeLayer(startMarker);
  startMarker = L.marker(latlng, { draggable: true }).addTo(map);
  startMarker.on("dragend", updateRouteLine);
  updateRouteLine();
}

function setEndMarker(latlng) {
  if (!map) return;
  if (endMarker) map.removeLayer(endMarker);
  endMarker = L.marker(latlng, { draggable: true, opacity: 0.9 }).addTo(map);
  endMarker.on("dragend", updateRouteLine);
  updateRouteLine();
}

function updateRouteLine() {
  const searchDist = document.getElementById("route-search-distance");
  const realDist = document.getElementById("route-real-distance");
  if (routeLine && map) {
    map.removeLayer(routeLine);
    routeLine = null;
  }
  if (!(startMarker && endMarker && map)) {
    if (searchDist) searchDist.textContent = "0.00 km";
    if (realDist) realDist.textContent = "0.00 km";
    return;
  }

  const latlngs = [startMarker.getLatLng(), endMarker.getLatLng()];
  routeLine = L.polyline(latlngs, { weight: 4 }).addTo(map);
  map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });

  const meters = map.distance(latlngs[0], latlngs[1]);
  const km = meters / 1000;
  if (searchDist) searchDist.textContent = km.toFixed(2) + " km";
  if (realDist) realDist.textContent = km.toFixed(2) + " km";
}

function changeTargetDistance(delta) {
  targetDistanceKm = Math.max(1, targetDistanceKm + delta);
  const el = document.getElementById("route-distance-display");
  if (el) {
    el.textContent = targetDistanceKm.toFixed(2);
  }
}

function handleGenerateCourse() {
  // 데모 버전: 마커 없으면 지도 중앙 기준으로 짧은 선 하나
  if (!map) return;
  const center = map.getCenter();

  if (!startMarker && !endMarker) {
    const offsetLng = center.lng + 0.01;
    setStartMarker(center);
    setEndMarker({ lat: center.lat, lng: offsetLng });
  }
  updateRouteLine();
  const status = document.getElementById("status-summary");
  if (status) {
    status.textContent = "간단 코스를 생성했습니다. (데모)";
  }
}

// ---------------------------------------------------------
// ROUTE 저장/불러오기 (localStorage)
// ---------------------------------------------------------
function openRouteSaveModal() {
  const modal = document.getElementById("modal-route-save");
  if (!modal) return;
  if (!(startMarker && endMarker)) {
    alert("시작/도착 지점을 먼저 지정하세요.");
    return;
  }
  modal.classList.remove("hidden");
}

function closeRouteSaveModal() {
  const modal = document.getElementById("modal-route-save");
  if (!modal) return;
  modal.classList.add("hidden");
}

function openRouteListModal() {
  const modal = document.getElementById("modal-route-list");
  if (!modal) return;
  renderRouteList();
  modal.classList.remove("hidden");
}

function closeRouteListModal() {
  const modal = document.getElementById("modal-route-list");
  if (!modal) return;
  modal.classList.add("hidden");
}

function renderRouteList() {
  const listEl = document.getElementById("route-list");
  if (!listEl) return;
  const routes = loadJSON(STORAGE_KEYS.ROUTES, []);
  listEl.innerHTML = "";
  if (routes.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "저장된 코스가 없습니다.";
    listEl.appendChild(empty);
    return;
  }
  routes.forEach((route) => {
    const item = document.createElement("div");
    item.className = "border border-black rounded-[12px] p-2 flex justify-between items-center";
    const left = document.createElement("div");
    left.className = "text-xs";
    left.innerHTML = `
      <div class="font-semibold">${route.name}</div>
      <div>${(route.distanceKm || 0).toFixed(2)} km</div>
    `;
    const btn = document.createElement("button");
    btn.className =
      "ml-2 px-3 py-1 rounded-[10px] border border-black text-xs bg-black text-white";
    btn.textContent = "불러오기";
    btn.addEventListener("click", () => {
      loadRouteToMap(route);
      closeRouteListModal();
      showPage("page-route");
    });
    item.appendChild(left);
    item.appendChild(btn);
    listEl.appendChild(item);
  });
}

function saveCurrentRoute() {
  const input = document.getElementById("route-save-name");
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    alert("코스 이름을 입력하세요.");
    return;
  }
  if (!(startMarker && endMarker && map)) {
    alert("시작/도착 지점을 먼저 지정하세요.");
    return;
  }
  const a = startMarker.getLatLng();
  const b = endMarker.getLatLng();
  const distKm = map.distance(a, b) / 1000;

  const routes = loadJSON(STORAGE_KEYS.ROUTES, []);
  routes.unshift({
    id: "route_" + Date.now(),
    name,
    start: { lat: a.lat, lng: a.lng },
    end: { lat: b.lat, lng: b.lng },
    distanceKm: distKm,
  });
  saveJSON(STORAGE_KEYS.ROUTES, routes);
  input.value = "";
  closeRouteSaveModal();
}

function loadRouteToMap(route) {
  if (!map) return;
  if (startMarker) map.removeLayer(startMarker);
  if (endMarker) map.removeLayer(endMarker);
  if (routeLine) map.removeLayer(routeLine);

  startMarker = L.marker([route.start.lat, route.start.lng], { draggable: true }).addTo(map);
  endMarker = L.marker([route.end.lat, route.end.lng], {
    draggable: true,
    opacity: 0.9,
  }).addTo(map);
  startMarker.on("dragend", updateRouteLine);
  endMarker.on("dragend", updateRouteLine);

  updateRouteLine();
}

// ---------------------------------------------------------
// RECORDS 탭 표시
// ---------------------------------------------------------
function renderRecordList() {
  const list = document.getElementById("record-list");
  if (!list) return;
  const runs = loadJSON(STORAGE_KEYS.RUNS, []);
  list.innerHTML = "";
  if (runs.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "기록이 없습니다. 러닝을 시작해보세요!";
    empty.className = "text-xs text-gray-600";
    list.appendChild(empty);
    return;
  }
  runs.forEach((run) => {
    const item = document.createElement("article");
    item.className =
      "record-item rounded-[12px] border border-black p-3 flex items-center justify-between";
    const when = new Date(run.date);
    const dateStr = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(when.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(when.getHours()).padStart(2, "0")}:${String(
      when.getMinutes()
    ).padStart(2, "0")}`;

    const left = document.createElement("div");
    left.className = "flex flex-col text-xs";
    left.innerHTML = `
      <span class="font-semibold">${dateStr}</span>
      <span>${timeStr}</span>
      <span class="mt-1 text-gray-600 text-[11px]">${runDistanceText(run)}</span>
    `;

    const mid = document.createElement("div");
    mid.className = "flex-1 mx-3 text-right";
    mid.innerHTML = `
      <div class="font-semibold text-base">${(run.distanceKm || 0).toFixed(2)}km</div>
      <div class="text-[11px] text-gray-600">평균 페이스 ${paceText(run)}</div>
    `;

    const right = document.createElement("div");
    right.className =
      "w-12 h-12 rounded-[10px] border border-black bg-black/5 flex items-center justify-center";
    right.innerHTML = `<span class="text-[9px] text-gray-500">경로</span>`;

    item.appendChild(left);
    item.appendChild(mid);
    item.appendChild(right);

    // 클릭하면 상세 모달 열기
    item.addEventListener("click", () => {
      openRecordDetailModal(run);
    });

    list.appendChild(item);
  });
}

function runDistanceText(run) {
  const km = (run.distanceKm || 0).toFixed(2);
  const pace = paceText(run);
  return `${pace} / ${km}km`;
}

function paceText(run) {
  if (!run.distanceKm || run.distanceKm <= 0) return "-'--";
  const paceMin = run.pace || 0; // 분/킬로
  const m = Math.floor(paceMin);
  const s = Math.round((paceMin - m) * 60);
  return `${m}'${String(s).padStart(2, "0")}"`;
}

// ---------------------------------------------------------
// 기록 상세 모달
// ---------------------------------------------------------
function openRecordDetailModal(run) {
  const modal = document.getElementById("modal-record-detail");
  if (!modal) return;
  modal.classList.remove("hidden");

  const when = new Date(run.date);
  const dateStr = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(when.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(when.getHours()).padStart(2, "0")}:${String(
    when.getMinutes()
  ).padStart(2, "0")}`;

  const detailDistance = document.getElementById("detail-distance");
  const detailPace = document.getElementById("detail-pace");
  const detailAvgSpeed = document.getElementById("detail-avg-speed");
  const detailCadence = document.getElementById("detail-cadence");
  const detailTime = document.getElementById("detail-time");
  const detailCurrentSpeed = document.getElementById("detail-current-speed");
  const detailCalories = document.getElementById("detail-calories");

  if (detailDistance) detailDistance.textContent = (run.distanceKm || 0).toFixed(2);
  if (detailPace) detailPace.textContent = paceText(run);
  if (detailTime) detailTime.textContent = formatTime(run.elapsedSec || 0);

  // 데모용: 평균 속도/현재 속도/케이던스/칼로리 간단 계산(추측입니다)
  const hours = (run.elapsedSec || 0) / 3600;
  const avgSpeed = hours > 0 ? (run.distanceKm || 0) / hours : 0;
  if (detailAvgSpeed) detailAvgSpeed.textContent = avgSpeed.toFixed(1);
  if (detailCurrentSpeed) detailCurrentSpeed.textContent = avgSpeed.toFixed(1);
  if (detailCadence) detailCadence.textContent = "180";
  if (detailCalories) detailCalories.textContent = Math.round(
    (run.distanceKm || 0) * 60
  ).toString();
}

function closeRecordDetailModal() {
  const modal = document.getElementById("modal-record-detail");
  if (!modal) return;
  modal.classList.add("hidden");
}

// ---------------------------------------------------------
// PROFILE 탭 - 초기화 버튼
// ---------------------------------------------------------
function resetAllData() {
  if (!confirm("모든 저장 데이터를 삭제하시겠습니까?")) return;
  localStorage.removeItem(STORAGE_KEYS.RUNS);
  localStorage.removeItem(STORAGE_KEYS.ROUTES);
  alert("데이터를 모두 삭제했습니다.");
  if (currentPageId === "page-records") {
    renderRecordList();
  }
}

// ---------------------------------------------------------
// 이벤트 바인딩
// ---------------------------------------------------------
function bindEvents() {
  // 상단 로고/번개 클릭 -> HOME
  const logoText = document.querySelector(".logo-text");
  const boltIcon = document.querySelector(".icon-bolt");
  [logoText, boltIcon].forEach((el) => {
    if (!el) return;
    el.addEventListener("click", () => {
      showPage("page-home");
    });
  });

  // 하단 탭
  const tabItems = $all(".bottombar .tab-item");
  const centerTab = document.querySelector(".bottombar .tab-center");

  // 0: RUN, 1: ROUTE, 2: RECORDS, 3: PROFILE
  if (tabItems[0]) tabItems[0].addEventListener("click", () => showPage("page-run"));
  if (tabItems[1]) tabItems[1].addEventListener("click", () => showPage("page-route"));
  if (tabItems[2]) tabItems[2].addEventListener("click", () => showPage("page-records"));
  if (tabItems[3]) tabItems[3].addEventListener("click", () => showPage("page-profile"));
  if (centerTab) centerTab.addEventListener("click", () => showPage("page-home"));

  // RUN 버튼
  const btnRunStart = document.getElementById("btn-run-start");
  const btnRunPause = document.getElementById("btn-run-pause");
  const btnRunStop = document.getElementById("btn-run-stop");
  btnRunStart?.addEventListener("click", startRun);
  btnRunPause?.addEventListener("click", pauseRun);
  btnRunStop?.addEventListener("click", stopRun);

  // ROUTE 거리 조절
  document
    .getElementById("btn-route-distance-minus")
    ?.addEventListener("click", () => changeTargetDistance(-0.5));
  document
    .getElementById("btn-route-distance-plus")
    ?.addEventListener("click", () => changeTargetDistance(0.5));

  // ROUTE GPS 버튼
  document.getElementById("btn-my-location")?.addEventListener("click", () => {
    tryGeolocate();
  });

  // ROUTE 코스 생성
  document
    .getElementById("btn-generate-course")
    ?.addEventListener("click", handleGenerateCourse);

  // ROUTE START: RUN 탭으로 이동 + 러닝 시작
  document.getElementById("btn-route-start")?.addEventListener("click", () => {
    showPage("page-run");
    startRun();
  });

  // ROUTE 저장/불러오기 모달
  document.getElementById("btn-route-save")?.addEventListener("click", openRouteSaveModal);
  document
    .getElementById("btn-route-load")
    ?.addEventListener("click", openRouteListModal);
  document
    .getElementById("btn-modal-route-save-close")
    ?.addEventListener("click", closeRouteSaveModal);
  document
    .getElementById("btn-modal-route-list-close")
    ?.addEventListener("click", closeRouteListModal);
  document
    .getElementById("btn-route-save-confirm")
    ?.addEventListener("click", saveCurrentRoute);

  // PROFILE 초기화
  document.getElementById("btn-reset-all")?.addEventListener("click", resetAllData);

  // 맵에서 시작/도착을 찍기 위한 간단 모드 (입력창 포커스에 따라)
  const startInput = document.getElementById("start-input");
  const endInput = document.getElementById("end-input");
  startInput?.addEventListener("focus", () => {
    mapClickMode = "set-start";
  });
  endInput?.addEventListener("focus", () => {
    mapClickMode = "set-end";
  });
  startInput?.addEventListener("blur", () => {
    mapClickMode = null;
  });
  endInput?.addEventListener("blur", () => {
    mapClickMode = null;
  });

  // 기록 상세 모달 닫기
  document
    .getElementById("btn-modal-record-close")
    ?.addEventListener("click", closeRecordDetailModal);
}

// ---------------------------------------------------------
// 초기화
// ---------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  // 기본 HOME 페이지 표시
  showPage("page-home");
  changeTargetDistance(0); // 5.00 초기 표시
  bindEvents();
  initMapIfNeeded();
  renderRecordList();
});
