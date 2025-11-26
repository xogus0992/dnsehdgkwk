/* =========================================================
   RUN APP — JS (2025 최종)
   - Leaflet 지도 초기화 + 현재 위치
   - 목표 거리 입력 (모달)
   - 러닝(거리/시간/페이스 기록)
   - 코스 생성 (직선/왕복, ORS)
   - 카카오 장소 검색 자동완성
   - 관리자 시뮬레이션
   - 하단바 5개 + 서브메뉴 5개 (홈 제외)
   - 코스 생성 bottom sheet 3단계(닫힘/중간/전체) + 드래그
========================================================= */

/* ---------------------------
   API 키
---------------------------- */
const RUN_ORS_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk3NTU2OTk1ODQ1NjQ0YWE5NzA3ZTM1OWExMGE3NTU4IiwiaCI6Im11cm11cjY0In0=";
const RUN_KAKAO_REST_KEY = "71b46fcb7202af130ab7c6c18bf5163a";

/* ---------------------------
   전역 상태
---------------------------- */
let runMap;
let currentLocation = null;

let runLiveMarker = null;
let runTrackLine = null;
let runTrackCoords = [];
let runWatchId = null;

let isRunning = false;
let runStartTime = null;
let runDistanceMeters = 0;

// 목표 거리
let setTargetMeters = 0;
let routeTargetMeters = 0;

// 마커
let startMarker = null;
let endMarker = null;

// 코스 라인
let plannedRoute = null;
let shortestDistanceMeters = 0;

// 관리자 모드
let adminMode = false;
let adminPoints = [];

// bottom sheet 3단계
// 0 = 닫힘, 1 = 중간, 2 = 전체
let routePanelState = 0;
let routePanelHeight = 0;

// 드래그 상태
let dragging = false;
let dragStartY = 0;
let dragStartTranslate = 0;

// 서브메뉴
let navSubInited = false;

/* =========================================================
   유틸
========================================================= */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPace(distanceMeters, timeSec) {
  if (distanceMeters < 1) return "-";
  const pace = timeSec / (distanceMeters / 1000);
  const m = Math.floor(pace / 60);
  const s = Math.floor(pace % 60);
  return `${m}'${s.toString().padStart(2, "0")}"`;
}

/* =========================================================
   지도 초기화
========================================================= */
function initMap() {
  runMap = L.map("runMap").setView([37.5665, 126.9780], 16);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(runMap);

  // 페이지 진입 시 자동 현재 위치
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        currentLocation = { lat, lng };

        runMap.setView([lat, lng], 17);
        autoSetStart(lat, lng);
      },
      (error) => {
        console.error("GPS 초기 로딩 실패:", error);
        alert(
          "GPS 초기 로딩에 실패했습니다. (오류 코드: " + error.code + ")"
        );
      },
      { enableHighAccuracy: true }
    );
  }

  // 관리자 모드 클릭
  runMap.on("click", (e) => {
    if (!adminMode) return;

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    if (adminPoints.length < 2) {
      adminPoints.push([lat, lng]);
    } else {
      adminPoints = [adminPoints[1], [lat, lng]];
    }
    updateAdminMarkers();
  });
}

/* =========================================================
   출발지 자동 설정
========================================================= */
function autoSetStart(lat, lng) {
  const input = document.getElementById("runRouteStart");
  if (!input) return;

  input.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  input.dataset.lat = lat;
  input.dataset.lng = lng;

  setStartMarker(lat, lng);
}

function setStartMarker(lat, lng) {
  if (!runMap) return;
  if (startMarker) runMap.removeLayer(startMarker);
  startMarker = L.marker([lat, lng], { title: "출발지" }).addTo(runMap);
}

function setEndMarker(lat, lng) {
  if (!runMap) return;
  if (endMarker) runMap.removeLayer(endMarker);
  endMarker = L.marker([lat, lng], { title: "도착지" }).addTo(runMap);
}

function updateAdminMarkers() {
  if (adminPoints[0]) setStartMarker(...adminPoints[0]);
  if (adminPoints[1]) setEndMarker(...adminPoints[1]);
}

/* =========================================================
   내 위치 버튼
========================================================= */
function initMyLocationButton() {
  const btn = document.getElementById("runUseMyLocation");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("GPS를 사용할 수 없습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        currentLocation = { lat, lng };
        autoSetStart(lat, lng);
        runMap.setView([lat, lng], 17);

        openRoutePanel(1); // 중간단계로
      },
      () => alert("내 위치를 가져올 수 없습니다."),
      { enableHighAccuracy: true }
    );
  });
}

/* =========================================================
   목표 거리 입력(간단 모달)
========================================================= */
function initDistanceModal() {
  const distanceText = document.getElementById("runDistance");
  if (!distanceText) return;

  distanceText.addEventListener("click", () => {
    const currentKm = setTargetMeters ? setTargetMeters / 1000 : 0;
    const v = prompt("목표 거리를 km 단위로 입력하세요.", currentKm || "");
    if (v === null) return;
    const km = parseFloat(v);
    if (!isNaN(km) && km > 0) {
      setTargetMeters = km * 1000;
      distanceText.textContent = km.toFixed(2);
    } else {
      setTargetMeters = 0;
      distanceText.textContent = "0.00";
    }
  });
}

/* =========================================================
   러닝 기능
========================================================= */
function startRun() {
  if (!navigator.geolocation) {
    alert("GPS를 지원하지 않습니다.");
    return;
  }

  if (isRunning) {
    stopRun();
    return;
  }

  isRunning = true;
  runStartTime = Date.now();
  runDistanceMeters = 0;
  runTrackCoords = [];

  const startBtn = document.getElementById("runStartBtn");
  if (startBtn) startBtn.textContent = "정지";

  runWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (runTrackCoords.length > 0) {
        const prev = runTrackCoords[runTrackCoords.length - 1];
        runDistanceMeters += haversine(prev[0], prev[1], lat, lng);
      }
      runTrackCoords.push([lat, lng]);

      if (!runLiveMarker)
        runLiveMarker = L.marker([lat, lng]).addTo(runMap);
      else runLiveMarker.setLatLng([lat, lng]);

      if (!runTrackLine)
        runTrackLine = L.polyline(runTrackCoords, { color: "red" }).addTo(
          runMap
        );
      else runTrackLine.setLatLngs(runTrackCoords);

      runMap.panTo([lat, lng]);

      const elapsed = (Date.now() - runStartTime) / 1000;

      let displayMeters = runDistanceMeters;
      if (setTargetMeters > 0) {
        displayMeters = Math.max(setTargetMeters - runDistanceMeters, 0);
      }

      const distEl = document.getElementById("runDistance");
      const timeEl = document.getElementById("runTime");
      const paceEl = document.getElementById("runPace");

      if (distEl) distEl.textContent = (displayMeters / 1000).toFixed(2);
      if (timeEl) timeEl.textContent = formatTime(elapsed);
      if (paceEl) paceEl.textContent = formatPace(runDistanceMeters, elapsed);
    },
    () => alert("GPS 수신 실패"),
    { enableHighAccuracy: true }
  );
}

function stopRun() {
  isRunning = false;
  const startBtn = document.getElementById("runStartBtn");
  if (startBtn) startBtn.textContent = "시작";
  if (runWatchId !== null) {
    navigator.geolocation.clearWatch(runWatchId);
    runWatchId = null;
  }
}

/* =========================================================
   Bottom Sheet (코스 생성) 3단계 + 드래그
========================================================= */
function initRoutePanel() {
  const panel = document.getElementById("runRoutePanel");
  if (!panel) return;

  // bottom 대신 transform으로만 제어
  panel.style.bottom = "0px";
  panel.style.transform = "translateY(100%)";
  panel.style.transition = "transform 0.25s ease";

  routePanelHeight = panel.offsetHeight || window.innerHeight * 0.65;

  const handleArea = panel.firstElementChild; // 상단 핸들 포함 div
  if (!handleArea) return;

  const startDrag = (clientY) => {
    dragging = true;
    dragStartY = clientY;
    // 현재 translateY 추출
    const style = window.getComputedStyle(panel);
    const matrix = new DOMMatrixReadOnly(style.transform);
    dragStartTranslate = matrix.m42; // y
  };

  const onMove = (clientY) => {
    if (!dragging) return;
    const diff = clientY - dragStartY;
    let next = dragStartTranslate + diff;
    const max = routePanelHeight; // 완전 아래
    if (next < 0) next = 0;
    if (next > max) next = max;
    panel.style.transition = "none";
    panel.style.transform = `translateY(${next}px)`;
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;

    const style = window.getComputedStyle(panel);
    const matrix = new DOMMatrixReadOnly(style.transform);
    const cur = matrix.m42;
    const max = routePanelHeight;

    // 3단계 위치 결정 (0, mid, max)
    const midVisibleHeight = 260; // 중간단계에서 보이는 높이 (지도 안 겹치도록)
    const midTranslate = Math.max(max - midVisibleHeight, max * 0.4);

    let targetState = 0;
    const distToClosed = Math.abs(cur - max);
    const distToMid = Math.abs(cur - midTranslate);
    const distToFull = Math.abs(cur - 0);

    if (distToFull <= distToMid && distToFull <= distToClosed) {
      targetState = 2;
    } else if (distToMid <= distToClosed) {
      targetState = 1;
    } else {
      targetState = 0;
    }

    openRoutePanel(targetState);
  };

  // 마우스
  handleArea.addEventListener("mousedown", (e) => {
    startDrag(e.clientY);
  });
  window.addEventListener("mousemove", (e) => onMove(e.clientY));
  window.addEventListener("mouseup", endDrag);

  // 터치
  handleArea.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 0) startDrag(e.touches[0].clientY);
    },
    { passive: true }
  );
  window.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 0) onMove(e.touches[0].clientY);
    },
    { passive: true }
  );
  window.addEventListener("touchend", endDrag);
}

// state: 0=닫힘, 1=중간, 2=전체
function openRoutePanel(state = 1) {
  const panel = document.getElementById("runRoutePanel");
  if (!panel) return;

  if (!routePanelHeight) {
    routePanelHeight = panel.offsetHeight || window.innerHeight * 0.65;
  }
  const max = routePanelHeight;
  const midVisibleHeight = 260;
  const midTranslate = Math.max(max - midVisibleHeight, max * 0.4);

  let translateY = max;
  if (state === 0) translateY = max;
  else if (state === 1) translateY = midTranslate;
  else if (state === 2) translateY = 0;

  panel.style.transition = "transform 0.25s ease";
  panel.style.transform = `translateY(${translateY}px)`;
  routePanelState = state;
}

function closeRoutePanel() {
  openRoutePanel(0);
}

/* =========================================================
   하단 네비게이션 + 서브메뉴 5개
========================================================= */
function initBottomNav() {
  const navItems = document.querySelectorAll("#bottomNav .nav-item");
  const subLayer = document.getElementById("navSubMenu");
  if (!navItems.length || !subLayer) return;

  // 서브메뉴 5개 생성 (1~5)
  if (!navSubInited) {
    subLayer.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      const c = document.createElement("div");
      c.className = "sub-circle";
      c.textContent = String(i + 1);
      subLayer.appendChild(c);
    }
    navSubInited = true;
  }

  const subCircles = subLayer.querySelectorAll(".sub-circle");

  const showSubMenu = (activeIndex) => {
    // 홈(index 2)에는 서브메뉴 없음
    if (activeIndex === 2) {
      hideSubMenu();
      return;
    }

    subLayer.classList.remove("hidden");
    subLayer.style.pointerEvents = "none";

    subCircles.forEach((c, i) => {
      c.classList.remove("show");
      // 작은 딜레이로 순차 애니메이션
      setTimeout(() => {
        c.classList.add("show");
      }, i * 40);
    });
  };

  const hideSubMenu = () => {
    subCircles.forEach((c) => c.classList.remove("show"));
    setTimeout(() => {
      subLayer.classList.add("hidden");
    }, 220);
  };

  // 전역에서 사용할 수 있도록
  window.hideSubMenu = hideSubMenu;

  navItems.forEach((item, index) => {
    item.dataset.index = index;

    item.addEventListener("click", () => {
      navItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      const tab = item.dataset.tab;

      if (tab === "home") {
        hideSubMenu();
        closeRoutePanel();
      } else if (tab === "search") {
        showSubMenu(index);
        openRoutePanel(1); // 중간단계
      } else if (tab === "course") {
        showSubMenu(index);
        openRoutePanel(1);
      } else {
        showSubMenu(index);
        closeRoutePanel();
      }
    });
  });
}

/* =========================================================
   카카오 장소 검색
========================================================= */
async function kakaoSearch(query) {
  if (!RUN_KAKAO_REST_KEY || RUN_KAKAO_REST_KEY.startsWith("YOUR_"))
    return [];

  const res = await fetch(
    "https://dapi.kakao.com/v2/local/search/keyword.json?query=" +
      encodeURIComponent(query),
    {
      headers: { Authorization: "KakaoAK " + RUN_KAKAO_REST_KEY },
    }
  );

  if (!res.ok) return [];
  const data = await res.json();

  return data.documents
    .map((d) => ({
      name: d.place_name,
      address: d.road_address_name || d.address_name,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      dist: currentLocation
        ? haversine(
            currentLocation.lat,
            currentLocation.lng,
            parseFloat(d.y),
            parseFloat(d.x)
          )
        : null,
    }))
    .sort((a, b) => (a.dist ?? 999999) - (b.dist ?? 999999));
}

function initSearchInputs() {
  const sInput = document.getElementById("runRouteStart");
  const eInput = document.getElementById("runRouteEnd");
  const sList = document.getElementById("runStartSuggest");
  const eList = document.getElementById("runEndSuggest");
  if (!sInput || !eInput || !sList || !eList) return;

  const bindSearch = (inputEl, listEl, setMarkerFn) => {
    let timer = null;

    inputEl.addEventListener("input", () => {
      const q = inputEl.value.trim();
      listEl.innerHTML = "";
      if (!q) {
        listEl.classList.add("hidden");
        return;
      }

      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const results = await kakaoSearch(q);
        listEl.innerHTML = "";
        if (!results.length) {
          listEl.classList.add("hidden");
          return;
        }

        results.slice(0, 8).forEach((r) => {
          const li = document.createElement("li");
          li.textContent = `${r.name} (${r.address})`;
          li.addEventListener("click", () => {
            inputEl.value = r.name;
            inputEl.dataset.lat = r.lat;
            inputEl.dataset.lng = r.lng;
            setMarkerFn(r.lat, r.lng);
            runMap.setView([r.lat, r.lng], 16);
            listEl.classList.add("hidden");
          });
          listEl.appendChild(li);
        });

        listEl.classList.remove("hidden");
      }, 250);
    });

    // 인풋 포커스 때 검색창 위로 띄우기(중간단계 이상)
    inputEl.addEventListener("focus", () => {
      if (routePanelState < 1) openRoutePanel(1);
    });
  };

  bindSearch(sInput, sList, setStartMarker);
  bindSearch(eInput, eList, setEndMarker);
}

/* =========================================================
   ORS 최단거리 + 코스 생성
========================================================= */
async function orsPath(coords) {
  if (!RUN_ORS_KEY || RUN_ORS_KEY.startsWith("YOUR_")) {
    throw new Error("ORS 키가 설정되지 않았습니다.");
  }

  const body = {
    coordinates: coords.map(([lat, lng]) => [lng, lat]),
  };

  const res = await fetch(
    "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
    {
      method: "POST",
      headers: {
        Authorization: RUN_ORS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) throw new Error("ORS 경로 생성 실패");

  const data = await res.json();
  const feature = data.features[0];
  const coordsOut = feature.geometry.coordinates.map(([lng, lat]) => [
    lat,
    lng,
  ]);

  let dist = feature.properties.summary.distance || 0;
  if (!dist) {
    for (let i = 1; i < coordsOut.length; i++) {
      dist += haversine(
        coordsOut[i - 1][0],
        coordsOut[i - 1][1],
        coordsOut[i][0],
        coordsOut[i][1]
      );
    }
  }

  return { path: coordsOut, distanceMeters: dist };
}

async function generateCourse() {
  const sInput = document.getElementById("runRouteStart");
  const eInput = document.getElementById("runRouteEnd");
  const status = document.getElementById("runRouteStatus");
  const shortInfo = document.getElementById("runShortestInfo");
  if (!sInput || !status || !shortInfo) return;

  const sLat = parseFloat(sInput.dataset.lat);
  const sLng = parseFloat(sInput.dataset.lng);
  const eLat = parseFloat(eInput.dataset.lat);
  const eLng = parseFloat(eInput.dataset.lng);

  if (isNaN(sLat)) {
    status.textContent = "출발 위치를 설정하세요.";
    return;
  }

  // 목표 거리
  routeTargetMeters = setTargetMeters;

  const linearBtn = document.getElementById("courseLinear");
  const isLinear =
    linearBtn && linearBtn.classList.contains("run-course-active");

  status.textContent = "경로 계산 중...";

  // 1. 최단거리
  let shortest;
  try {
    if (!isNaN(eLat)) {
      shortest = await orsPath([[sLat, sLng], [eLat, eLng]]);
    } else {
      shortest = { path: [], distanceMeters: 0 };
    }
  } catch (e) {
    console.error(e);
    status.textContent = "최단거리 계산 실패";
    return;
  }

  shortestDistanceMeters = shortest.distanceMeters;
  const shortestKm = (shortestDistanceMeters / 1000).toFixed(2);

  if (!isNaN(eLat)) {
    shortInfo.textContent = `최단거리: ${shortestKm}km`;
  } else {
    shortInfo.textContent = "";
  }

  // 2. 목표거리 < 최단거리 → 자동 조정
  if (routeTargetMeters && routeTargetMeters < shortestDistanceMeters) {
    alert(
      `입력한 목표 거리(${(routeTargetMeters / 1000).toFixed(
        2
      )}km)가 최단거리(${shortestKm}km)보다 짧습니다.\n최단거리로 자동 조정합니다.`
    );
    routeTargetMeters = shortestDistanceMeters;
  }

  // 3. 코스 생성
  let controlPoints = [];

  if (isLinear) {
    if (isNaN(eLat)) {
      status.textContent = "직선 코스는 도착 위치가 필요합니다.";
      return;
    }

    const diff = routeTargetMeters - shortestDistanceMeters;

    if (!routeTargetMeters || diff < 50) {
      controlPoints = [[sLat, sLng], [eLat, eLng]];
    } else {
      const midLat = (sLat + eLat) / 2;
      const midLng = (sLng + eLng) / 2;
      const dx = eLng - sLng;
      const dy = eLat - sLat;
      const len = Math.sqrt(dx * dx + dy * dy);

      const ux = -dy / len;
      const uy = dx / len;
      const offset = Math.min(diff, 3000) / 111000;

      const viaLat = midLat + uy * offset;
      const viaLng = midLng + ux * offset;

      controlPoints = [
        [sLat, sLng],
        [viaLat, viaLng],
        [eLat, eLng],
      ];
    }
  } else {
    if (!routeTargetMeters) {
      status.textContent = "왕복 코스는 목표 거리가 필요합니다.";
      return;
    }

    const side = routeTargetMeters / 4;
    const dLat = side / 111000;
    const dLng = side / (111000 * Math.cos((sLat * Math.PI) / 180));

    if (!isNaN(eLat)) {
      const c1 = [sLat + dLat, sLng];
      const c2 = [sLat, sLng + dLng];
      controlPoints = [
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
      controlPoints = [[sLat, sLng], p2, p3, p4, [sLat, sLng]];
    }
  }

  // 4. ORS 최종 경로
  let finalRoute;
  try {
    finalRoute = await orsPath(controlPoints);
  } catch (e) {
    console.error(e);
    status.textContent = "코스 생성 실패";
    return;
  }

  if (plannedRoute) runMap.removeLayer(plannedRoute);
  plannedRoute = L.polyline(finalRoute.path, {
    color: "green",
    weight: 4,
  }).addTo(runMap);

  runMap.fitBounds(plannedRoute.getBounds());
  status.textContent = `완료: ${(finalRoute.distanceMeters / 1000).toFixed(
    2
  )}km`;
}

/* =========================================================
   관리자 시뮬레이션
========================================================= */
async function adminSim() {
  if (!adminMode) {
    adminMode = true;
    alert("관리자 모드 ON — 지도에서 두 지점을 선택하세요.");
    return;
  }

  if (adminPoints.length < 2) {
    alert("두 지점을 선택해야 합니다.");
    return;
  }

  const [s, e] = adminPoints;

  const { path, distanceMeters } = await orsPath([s, e]);

  if (plannedRoute) runMap.removeLayer(plannedRoute);
  plannedRoute = L.polyline(path, { color: "orange", weight: 5 }).addTo(
    runMap
  );
  runMap.fitBounds(plannedRoute.getBounds());

  const durationSec = distanceMeters * 0.36; // 10km/h 기준
  alert(
    `관리자 시뮬 완료!\n거리: ${(distanceMeters / 1000).toFixed(
      2
    )}km\n시간: ${formatTime(durationSec)}`
  );

  adminMode = false;
  adminPoints = [];
}

/* =========================================================
   초기화
========================================================= */
window.addEventListener("DOMContentLoaded", () => {
  initMap();
  initDistanceModal();
  initMyLocationButton();
  initRoutePanel();
  initBottomNav();
  initSearchInputs();

  const startBtn = document.getElementById("runStartBtn");
  if (startBtn) startBtn.addEventListener("click", startRun);

  const genBtn = document.getElementById("runRouteGenerateBtn");
  if (genBtn) genBtn.addEventListener("click", generateCourse);

  const adminBtn = document.getElementById("runAdminBtn");
  if (adminBtn) adminBtn.addEventListener("click", adminSim);

  // 코스 타입 토글
  const linearBtn = document.getElementById("courseLinear");
  const loopBtn = document.getElementById("courseLoop");
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
});
