/* ============================================================
   POKERUN RUN APP – JS 전체 업데이트
   (RUN / ROUTE / HOME / RECORD / PROFILE 완전 통합)
============================================================ */

/* ---------------------------
   API Keys
---------------------------- */
const ORS_API_KEY = "YOUR_ORS_KEY";
const KAKAO_REST_KEY = "YOUR_KAKAO_REST_KEY";
const VWORLD_KEY = "0E603DDF-E18F-371F-96E8-ECD87D4CA088";

/* ---------------------------
   전역 상태
---------------------------- */

let activeTab = "run";

// 지도
let runMap, routeMap;

// RUN 상태
let isRunning = false;
let runWatchId = null;
let runStartTime = null;
let runDistanceMeters = 0;
let runKcal = 0;
let runCoords = [];
let lastPos = null;

// ROUTE 상태
let targetDistanceMeters = 0;
let plannedRouteLine = null;
let routeShortestMeters = 0;

// ROUTE 검색 입력 / 자동완성
let startMarker = null;
let endMarker = null;

// 코스 생성 패널
let routePanel;
let routePanelState = 0; 
let routePanelHeight = 0;
let dragging = false;
let dragStartY = 0;
let dragStartTranslate = 0;

// 기록
let runHistory = [];

// UI 요소
let elRunDistance, elRunTime, elRunPace, elRunKcal;

/* ============================================================
   기본 유틸 함수
============================================================ */

function $(id) { return document.getElementById(id); }

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = v => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPace(dist, time) {
  if (dist < 1 || time === 0) return "-";
  const secPerKm = time / (dist / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}'${s.toString().padStart(2, "0")}"`;
}

/* ============================================================
   탭 전환
============================================================ */
function initTabs() {
  const btns = document.querySelectorAll("#main-nav [data-tab-target]");
  const pages = document.querySelectorAll(".tab-page");

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tgt = btn.getAttribute("data-tab-target");
      activeTab = tgt;

      pages.forEach(p => {
        if (p.dataset.tab === tgt) {
          p.classList.add("active");
          p.classList.remove("hidden");
        } else {
          p.classList.add("hidden");
          p.classList.remove("active");
        }
      });

      btns.forEach(b => {
        if (b === btn) b.classList.add("nav-active");
        else b.classList.remove("nav-active");
      });

      // ROUTE 탭 → 패널 표시 / 그 외 숨김
      if (routePanel) {
        if (tgt === "route") routePanel.style.display = "block";
        else routePanel.style.display = "none";
      }

      if (tgt === "run" && runMap) setTimeout(() => runMap.invalidateSize(), 200);
      if (tgt === "route" && routeMap) setTimeout(() => routeMap.invalidateSize(), 200);
    });
  });
}

/* ============================================================
   Leaflet + 브이월드 타일
============================================================ */
function createVWorldTileLayer() {
  return L.tileLayer(
    "https://api.vworld.kr/req/wmts/1.0.0/" +
      VWORLD_KEY +
      "/Base/{z}/{y}/{x}.png",
    { minZoom: 6, maxZoom: 19 }
  );
}

function initRunMap() {
  runMap = L.map("runMap", {
    zoomControl: false,
    attributionControl: false
  }).setView([37.5665, 126.9780], 15);

  createVWorldTileLayer().addTo(runMap);
}

function initRouteMap() {
  routeMap = L.map("routeMap", {
    zoomControl: false,
    attributionControl: false
  }).setView([37.5665, 126.9780], 15);

  createVWorldTileLayer().addTo(routeMap);
}

/* ============================================================
   RUN UI + 러닝 기능
============================================================ */
function initRunUI() {
  elRunDistance = $("runDistance");
  elRunTime = $("runTime");
  elRunPace = $("runPace");
  elRunKcal = $("runKcal");

  $("runStartBtn").addEventListener("click", () => {
    if (isRunning) stopRun();
    else startRun();
  });
}

function startRun() {
  if (!navigator.geolocation) {
    alert("GPS를 지원하지 않습니다.");
    return;
  }

  isRunning = true;
  runStartTime = Date.now();
  runDistanceMeters = 0;
  runKcal = 0;
  runCoords = [];
  lastPos = null;

  $("runStartBtn").textContent = "정지";

  runWatchId = navigator.geolocation.watchPosition(
    handleRunGPS,
    (err) => { console.error(err); stopRun(); },
    { enableHighAccuracy: true }
  );

  requestAnimationFrame(runTimerLoop);
}

function stopRun() {
  isRunning = false;

  if (runWatchId) {
    navigator.geolocation.clearWatch(runWatchId);
    runWatchId = null;
  }

  $("runStartBtn").textContent = "시작";

  if (runDistanceMeters > 5) saveRunHistory(); // 5m 이상 저장
}

function handleRunGPS(pos) {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const now = [lat, lng];

  if (!lastPos) {
    lastPos = now;
    runCoords.push(now);

    if (!window._runLine)
      window._runLine = L.polyline([now], { color: "#ff623d", weight: 5 }).addTo(runMap);

    runMap.setView(now, 16);
    return;
  }

  const d = haversine(lastPos[0], lastPos[1], lat, lng);

  // GPS 점프 제거 (추측 기반)
  if (d > 40) {
    lastPos = now;
    return;
  }

  runDistanceMeters += d;
  runKcal = Math.floor(runDistanceMeters * 0.06); // 대략 kcal 추정값 (추측입니다)

  lastPos = now;
  runCoords.push(now);

  window._runLine.addLatLng(now);
  runMap.panTo(now);

  updateRunUI();
}

function runTimerLoop() {
  if (!isRunning) return;
  updateRunUI();
  requestAnimationFrame(runTimerLoop);
}

function updateRunUI() {
  const elapsedSec = Math.floor((Date.now() - runStartTime) / 1000);

  elRunDistance.textContent = (runDistanceMeters / 1000).toFixed(2);
  elRunTime.textContent = formatTime(elapsedSec);
  elRunPace.textContent = formatPace(runDistanceMeters, elapsedSec);
  elRunKcal.textContent = runKcal;
}
/* ============================================================
   ROUTE UI (목표거리, 패널, +버튼)
============================================================ */

function initRouteUI() {
  const elRouteDistance = $("routeDistance");
  if (elRouteDistance) {
    elRouteDistance.addEventListener("click", () => {
      const cur = targetDistanceMeters ? (targetDistanceMeters / 1000).toFixed(1) : "0.0";
      const v = prompt("목표 거리를 km 단위로 입력하세요.", cur);
      if (v === null) return;
      const km = parseFloat(v);
      if (!isNaN(km) && km > 0) {
        targetDistanceMeters = km * 1000;
        elRouteDistance.textContent = km.toFixed(1);
      }
    });
  }

  const fab = $("routeFloatingBtn");
  if (fab) {
    fab.addEventListener("click", () => {
      openRoutePanel(1); // 중간 단계
    });
  }

  routePanel = $("runRoutePanel");
  if (routePanel) {
    initRoutePanelDrag(routePanel);
  }

  const btnMyLoc = $("runUseMyLocation");
  if (btnMyLoc) {
    btnMyLoc.addEventListener("click", () => {
      if (!navigator.geolocation) {
        alert("GPS를 지원하지 않습니다.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          const input = $("runRouteStart");
          if (input) {
            input.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            input.dataset.lat = lat;
            input.dataset.lng = lng;
          }
          if (routeMap) {
            if (startMarker) routeMap.removeLayer(startMarker);
            startMarker = L.marker([lat, lng]).addTo(routeMap);
            routeMap.setView([lat, lng], 16);
          }
          openRoutePanel(1);
        },
        () => alert("내 위치를 가져오지 못했습니다."),
        { enableHighAccuracy: true }
      );
    });
  }

  const linearBtn = $("courseLinear");
  const loopBtn = $("courseLoop");

  if (linearBtn && loopBtn) {
    linearBtn.addEventListener("click", () => {
      linearBtn.classList.add("run-course-active");
      loopBtn.classList.remove("run-course-active");
    });
    loopBtn.addEventListener("click", () => {
      loopBtn.classList.add("run-course-active");
      linearBtn.classList.remove("run-course-active");
    });
  }

  const genBtn = $("runRouteGenerateBtn");
  if (genBtn) genBtn.addEventListener("click", generateCourse);
}

/* ---------------------------
   ROUTE 패널 드래그
---------------------------- */
function initRoutePanelDrag(panel) {
  panel.style.transform = "translateY(100%)";
  routePanelHeight = panel.offsetHeight || 120;

  const handle = panel.querySelector(".w-full.h-6") || panel.firstElementChild;
  if (!handle) return;

  const startDrag = (y) => {
    dragging = true;
    dragStartY = y;
    const style = window.getComputedStyle(panel);
    const m = new DOMMatrixReadOnly(style.transform);
    dragStartTranslate = m.m42;
  };

  const moveDrag = (y) => {
    if (!dragging) return;
    const diff = y - dragStartY;
    let next = dragStartTranslate + diff;

    const max = routePanelHeight;
    if (next < 0) next = 0;
    if (next > max) next = max;

    panel.style.transition = "none";
    panel.style.transform = `translateY(${next}px)`;
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;

    const style = window.getComputedStyle(panel);
    const m = new DOMMatrixReadOnly(style.transform);
    const cur = m.m42;
    const max = routePanelHeight;
    const midVisible = 240;
    const mid = Math.max(max - midVisible, max * 0.4);

    const dClose = Math.abs(cur - max);
    const dMid = Math.abs(cur - mid);
    const dFull = Math.abs(cur - 0);

    let state = 0;
    if (dFull <= dMid && dFull <= dClose) state = 2;
    else if (dMid <= dClose) state = 1;
    else state = 0;

    openRoutePanel(state);
  };

  // mouse
  handle.addEventListener("mousedown", (e) => startDrag(e.clientY));
  window.addEventListener("mousemove", (e) => moveDrag(e.clientY));
  window.addEventListener("mouseup", endDrag);

  // touch
  handle.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length) startDrag(e.touches[0].clientY);
    },
    { passive: true }
  );
  window.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length) moveDrag(e.touches[0].clientY);
    },
    { passive: true }
  );
  window.addEventListener("touchend", endDrag);
}

function openRoutePanel(state) {
  if (!routePanel) return;

  if (!routePanelHeight) routePanelHeight = routePanel.offsetHeight || 120;

  const max = routePanelHeight;
  const midVisible = 240;
  const mid = Math.max(max - midVisible, max * 0.4);

  let ty = max;
  if (state === 0) ty = max;
  else if (state === 1) ty = mid;
  else if (state === 2) ty = 0;

  routePanel.style.display = "block";
  routePanel.style.transition = "transform 0.25s ease";
  routePanel.style.transform = `translateY(${ty}px)`;
  routePanelState = state;
}

/* ============================================================
   카카오 장소 검색 + 자동완성
============================================================ */

async function kakaoSearch(query) {
  if (!KAKAO_REST_KEY || KAKAO_REST_KEY.startsWith("YOUR_")) return [];

  const res = await fetch(
    "https://dapi.kakao.com/v2/local/search/keyword.json?query=" +
      encodeURIComponent(query),
    {
      headers: { Authorization: "KakaoAK " + KAKAO_REST_KEY },
    }
  );

  if (!res.ok) return [];
  const data = await res.json();

  return data.documents.map((d) => ({
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    lat: parseFloat(d.y),
    lng: parseFloat(d.x),
  }));
}

function initSearchInputs() {
  const sInput = $("runRouteStart");
  const eInput = $("runRouteEnd");
  const sList = $("runStartSuggest");
  const eList = $("runEndSuggest");
  if (!sInput || !eInput || !sList || !eList) return;

  const bind = (input, list, isStart) => {
    let timer = null;

    input.addEventListener("input", () => {
      const q = input.value.trim();
      list.innerHTML = "";
      if (!q) {
        list.classList.add("hidden");
        return;
      }

      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const results = await kakaoSearch(q);
        list.innerHTML = "";
        if (!results.length) {
          list.classList.add("hidden");
          return;
        }

        results.slice(0, 8).forEach((r) => {
          const li = document.createElement("li");
          li.textContent = `${r.name} (${r.address})`;
          li.addEventListener("click", () => {
            input.value = r.name;
            input.dataset.lat = r.lat;
            input.dataset.lng = r.lng;

            if (isStart && routeMap) {
              if (startMarker) routeMap.removeLayer(startMarker);
              startMarker = L.marker([r.lat, r.lng]).addTo(routeMap);
              routeMap.setView([r.lat, r.lng], 16);
            } else if (!isStart && routeMap) {
              if (endMarker) routeMap.removeLayer(endMarker);
              endMarker = L.marker([r.lat, r.lng]).addTo(routeMap);
              routeMap.setView([r.lat, r.lng], 16);
            }

            list.classList.add("hidden");
          });
          list.appendChild(li);
        });

        list.classList.remove("hidden");
      }, 250);
    });
  };

  bind(sInput, sList, true);
  bind(eInput, eList, false);
}

/* ============================================================
   ORS Directions
============================================================ */

async function orsDirections(coords) {
  if (!ORS_API_KEY || ORS_API_KEY.startsWith("YOUR_")) {
    alert("ORS API 키를 설정하세요.");
    throw new Error("ORS key missing");
  }

  const body = {
    coordinates: coords.map(([lat, lng]) => [lng, lat]),
  };

  const res = await fetch(
    "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
    {
      method: "POST",
      headers: {
        Authorization: ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) throw new Error("ORS 요청 실패");

  const data = await res.json();
  const feature = data.features[0];
  const path = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const distanceMeters = feature.properties.summary.distance;

  return { path, distanceMeters };
}
/* ============================================================
   코스 생성 메인
============================================================ */

async function generateCourse() {
  const sInput = $("runRouteStart");
  const eInput = $("runRouteEnd");
  const statusEl = $("runRouteStatus");
  const shortestEl = $("runShortestInfo");
  const linearBtn = $("courseLinear");
  const loopBtn = $("courseLoop");

  if (!sInput || !statusEl || !shortestEl || !linearBtn || !loopBtn) return;

  const sLat = parseFloat(sInput.dataset.lat);
  const sLng = parseFloat(sInput.dataset.lng);
  const eLat = parseFloat(eInput.dataset.lat);
  const eLng = parseFloat(eInput.dataset.lng);

  if (isNaN(sLat) || isNaN(sLng)) {
    statusEl.textContent = "출발 위치를 설정하세요.";
    return;
  }

  const isLinear = linearBtn.classList.contains("run-course-active");
  statusEl.textContent = "최단거리 계산 중...";

  // 최단거리
  try {
    if (!isNaN(eLat) && !isNaN(eLng)) {
      const shortest = await orsDirections([
        [sLat, sLng],
        [eLat, eLng],
      ]);
      routeShortestMeters = shortest.distanceMeters;
      shortestEl.textContent =
        "최단거리: " + (routeShortestMeters / 1000).toFixed(2) + " km";
    } else {
      routeShortestMeters = 0;
      shortestEl.textContent = "";
    }
  } catch (e) {
    console.error(e);
    routeShortestMeters = 0;
    shortestEl.textContent = "최단거리 계산 실패";
  }

  let useTarget = targetDistanceMeters;
  if (routeShortestMeters && useTarget && useTarget < routeShortestMeters) {
    alert(
      `목표거리(${(useTarget / 1000).toFixed(
        2
      )} km)가 최단거리(${(routeShortestMeters / 1000).toFixed(
        2
      )} km)보다 짧아 최단거리로 조정합니다.`
    );
    useTarget = routeShortestMeters;
  }

  statusEl.textContent = "코스 생성 중...";

  let control = [];
  if (isLinear) {
    // 직선 모드
    if (isNaN(eLat) || isNaN(eLng)) {
      statusEl.textContent = "직선 코스는 도착 위치가 필요합니다.";
      return;
    }

    if (!useTarget || !routeShortestMeters || useTarget - routeShortestMeters < 50) {
      control = [
        [sLat, sLng],
        [eLat, eLng],
      ];
    } else {
      const midLat = (sLat + eLat) / 2;
      const midLng = (sLng + eLng) / 2;
      const dx = eLng - sLng;
      const dy = eLat - sLat;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = -dy / len;
      const uy = dx / len;
      const extra = Math.min(useTarget - routeShortestMeters, 3000);
      const offset = extra / 111000;
      const viaLat = midLat + uy * offset;
      const viaLng = midLng + ux * offset;

      control = [
        [sLat, sLng],
        [viaLat, viaLng],
        [eLat, eLng],
      ];
    }
  } else {
    // 왕복 모드 (단순 사각 루프) – 추측입니다
    if (!useTarget) {
      statusEl.textContent = "왕복 코스는 목표 거리가 필요합니다.";
      return;
    }

    const side = useTarget / 4;
    const dLat = side / 111000;
    const dLng = side / (111000 * Math.cos((sLat * Math.PI) / 180));

    if (!isNaN(eLat) && !isNaN(eLng)) {
      const c1 = [sLat + dLat, sLng];
      const c2 = [sLat, sLng + dLng];
      control = [
        [sLat, sLng],
        c1,
        [eLat, eLng],
        c2,
        [sLat, sLng],
      ];
    } else {
      const p2 = [sLat + dLat, sLng];
      const p3 = [sLat + dLat, sLng + dLng];
      const p4 = [sLat, sLng + dLng];
      control = [[sLat, sLng], p2, p3, p4, [sLat, sLng]];
    }
  }

  try {
    const result = await orsDirections(control);

    if (plannedRouteLine && routeMap) {
      routeMap.removeLayer(plannedRouteLine);
    }
    if (routeMap) {
      plannedRouteLine = L.polyline(result.path, {
        color: "#22c55e",
        weight: 5,
      }).addTo(routeMap);
      routeMap.fitBounds(plannedRouteLine.getBounds());
    }

    statusEl.textContent =
      "완료: " + (result.distanceMeters / 1000).toFixed(2) + " km";
  } catch (e) {
    console.error(e);
    statusEl.textContent = "코스 생성 실패";
  }
}

/* ============================================================
   러닝 기록 (localStorage)
============================================================ */

function loadRunHistory() {
  try {
    const raw = localStorage.getItem("runHistory");
    if (!raw) runHistory = [];
    else runHistory = JSON.parse(raw) || [];
  } catch (e) {
    console.error(e);
    runHistory = [];
  }
}

function saveRunHistory() {
  const elapsedSec = runStartTime
    ? Math.floor((Date.now() - runStartTime) / 1000)
    : 0;

  const rec = {
    date: new Date().toLocaleString(),
    distanceKm: (runDistanceMeters / 1000).toFixed(2),
    time: formatTime(elapsedSec),
    pace: formatPace(runDistanceMeters, elapsedSec),
    kcal: runKcal,
  };

  runHistory.push(rec);
  localStorage.setItem("runHistory", JSON.stringify(runHistory));

  renderRunHistory();
  renderHomeLastRun();
}

function renderRunHistory() {
  const list = $("recordList");
  const empty = $("recordEmpty");
  if (!list || !empty) return;

  list.innerHTML = "";
  if (!runHistory.length) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  runHistory
    .slice()
    .reverse()
    .forEach((rec) => {
      const card = document.createElement("div");
      card.className = "record-card";
      card.innerHTML = `
        <div class="record-distance">${rec.distanceKm}</div>
        <div class="record-meta">
          ${rec.time} · ${rec.pace} · ${rec.kcal} kcal<br/>
          ${rec.date}
        </div>
      `;
      list.appendChild(card);
    });
}

/* ============================================================
   HOME 탭 – 최근 기록
============================================================ */

function renderHomeLastRun() {
  const distEl = $("homeLastRunDistance");
  if (!distEl) return;

  if (!runHistory.length) {
    distEl.textContent = "0.00";
    return;
  }

  const last = runHistory[runHistory.length - 1];
  distEl.textContent = last.distanceKm;
}

function initHomeQuickButtons() {
  const qRun = $("homeQuickRun");
  const qRoute = $("homeQuickRoute");

  if (qRun) {
    qRun.addEventListener("click", () => {
      const btn = document.querySelector('#main-nav [data-tab-target="run"]');
      if (btn) btn.click();
    });
  }

  if (qRoute) {
    qRoute.addEventListener("click", () => {
      const btn = document.querySelector('#main-nav [data-tab-target="route"]');
      if (btn) btn.click();
    });
  }
}

/* ============================================================
   초기화
============================================================ */

window.addEventListener("DOMContentLoaded", () => {
  // 지도
  initRunMap();
  initRouteMap();

  // 탭
  initTabs();

  // RUN
  initRunUI();

  // ROUTE
  initRouteUI();
  initSearchInputs();

  // 기록
  loadRunHistory();
  renderRunHistory();
  renderHomeLastRun();

  // HOME
  initHomeQuickButtons();

  // 기록 삭제 버튼
  const clearBtn = $("clearRunHistoryBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!confirm("모든 러닝 기록을 삭제할까요?")) return;
      runHistory = [];
      localStorage.setItem("runHistory", JSON.stringify(runHistory));
      renderRunHistory();
      renderHomeLastRun();
    });
  }
});
