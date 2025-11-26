/* =========================================================
   RUN APP — Full JS for New Layout (2025)
   기능 전체 포함:
   - 자동 내 위치 / 지도 초기화
   - 거리 입력 모달
   - GPS 러닝 기록 (거리/시간/페이스)
   - 지도 실시간 위치 업데이트
   - 코스 생성(직선/왕복)
   - 최단거리 < 목표거리 → 안내 + 자동 보정
   - 카카오 검색 자동완성
   - 관리자 시뮬레이션(두 지점 → 실제 도보 코스)
   ========================================================= */

/* ---------------------------
   API KEY (반드시 넣어야 작동)
---------------------------- */
const RUN_ORS_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk3NTU2OTk1ODQ1NjQ0YWE5NzA3ZTM1OWExMGE3NTU4IiwiaCI6Im11cm11cjY0In0=";           // ORS
const RUN_KAKAO_REST_KEY = "71b46fcb7202af130ab7c6c18bf5163a";  // Kakao REST API

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
let setTargetMeters = 0;     // 홈에서 설정한 목표거리
let routeTargetMeters = 0;   // 코스생성에서 실제 사용되는 목표거리

// 마커들
let startMarker = null;
let endMarker = null;

// 코스 생성 라인
let plannedRoute = null;

// 최단거리 저장
let shortestDistanceMeters = 0;

// 관리자 모드용
let adminMode = false;
let adminPoints = [];

/* =========================================================
   유틸 함수
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

  // 페이지 진입 시 자동으로 현재 위치 잡기
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        currentLocation = { lat, lng };

        runMap.setView([lat, lng], 17);
        autoSetStart(lat, lng);
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }

  // 관리자 모드일 때 지도 클릭 → 포인트 추가
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

  input.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  input.dataset.lat = lat;
  input.dataset.lng = lng;

  setStartMarker(lat, lng);
}

function setStartMarker(lat, lng) {
  if (startMarker) runMap.removeLayer(startMarker);
  startMarker = L.marker([lat, lng], { title: "출발지" }).addTo(runMap);
}

function setEndMarker(lat, lng) {
  if (endMarker) runMap.removeLayer(endMarker);
  endMarker = L.marker([lat, lng], { title: "도착지" }).addTo(runMap);
}

function updateAdminMarkers() {
  if (adminPoints[0]) setStartMarker(...adminPoints[0]);
  if (adminPoints[1]) setEndMarker(...adminPoints[1]);
}

/* =========================================================
   내 위치 버튼 → 출발지 지정
========================================================= */
function initMyLocationButton() {
  const btn = document.getElementById("runUseMyLocation");
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

        openRoutePanel();
      },
      () => alert("내 위치를 가져올 수 없습니다."),
      { enableHighAccuracy: true }
    );
  });
}

/* =========================================================
   거리 입력 모달
========================================================= */
function initDistanceModal() {
  const distanceText = document.getElementById("runDistance");
  const modal = createDistanceModal(); // 생성 함수 추가
  document.body.appendChild(modal);

  const input = modal.querySelector("input");
  const btnOk = modal.querySelector(".modal-ok");
  const btnCancel = modal.querySelector(".modal-cancel");

  distanceText.addEventListener("click", () => {
    modal.classList.remove("hidden");
    input.value = setTargetMeters ? (setTargetMeters / 1000).toFixed(1) : "";
  });

  btnCancel.addEventListener("click", () => modal.classList.add("hidden"));

  btnOk.addEventListener("click", () => {
    const km = parseFloat(input.value);
    if (!isNaN(km) && km > 0) {
      setTargetMeters = km * 1000;
      distanceText.textContent = km.toFixed(2);
    } else {
      setTargetMeters = 0;
      distanceText.textContent = "0.00";
    }
    modal.classList.add("hidden");
  });
}

function createDistanceModal() {
  const div = document.createElement("div");
  div.id = "distanceModal";
  div.className =
    "hidden fixed inset-0 bg-black/40 flex items-center justify-center z-[999] backdrop-blur-sm";

  div.innerHTML = `
    <div class="bg-white w-72 rounded-2xl p-5 shadow-xl">
      <h2 class="text-lg font-semibold text-sky-700 mb-3">목표 거리 입력</h2>
      <input type="number" id="distanceInput" class="w-full border rounded-xl px-3 py-2 mb-4 text-center" placeholder="예: 5.0" />
      <div class="flex justify-end gap-3">
        <button class="modal-cancel text-sm px-3 py-1 bg-gray-100 rounded-xl">취소</button>
        <button class="modal-ok text-sm px-4 py-1 bg-sky-600 text-white rounded-xl">확인</button>
      </div>
    </div>
  `;
  return div;
}

/* =========================================================
   러닝 기능 (거리/시간 기록)
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

  document.getElementById("runStartBtn").textContent = "정지";

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
      else
        runLiveMarker.setLatLng([lat, lng]);

      if (!runTrackLine)
        runTrackLine = L.polyline(runTrackCoords, { color: "red" }).addTo(runMap);
      else
        runTrackLine.setLatLngs(runTrackCoords);

      runMap.panTo([lat, lng]);

      // UI 업데이트
      const elapsed = (Date.now() - runStartTime) / 1000;

      let displayMeters = runDistanceMeters;

      if (setTargetMeters > 0) {
        displayMeters = Math.max(setTargetMeters - runDistanceMeters, 0);
      }

      document.getElementById("runDistance").textContent = (displayMeters / 1000).toFixed(2);
      document.getElementById("runTime").textContent = formatTime(elapsed);
      document.getElementById("runPace").textContent = formatPace(runDistanceMeters, elapsed);
    },
    () => alert("GPS 수신 실패"),
    { enableHighAccuracy: true }
  );
}

function stopRun() {
  isRunning = false;
  document.getElementById("runStartBtn").textContent = "시작";
  if (runWatchId !== null) {
    navigator.geolocation.clearWatch(runWatchId);
    runWatchId = null;
  }
}

/* =========================================================
   하단 네비게이션
========================================================= */
function initNavigation() {
  const items = document.querySelectorAll(".run-nav-item");

  items.forEach((btn) => {
    btn.addEventListener("click", () => {
      items.forEach((item) => item.classList.remove("run-nav-active"));
      btn.classList.add("run-nav-active");

      const tab = btn.dataset.tab;

      if (tab === "home") {
        closeRoutePanel();
      } else if (tab === "search") {
        openRoutePanel();
      } else {
        alert("이 페이지는 아직 준비중입니다!");
      }
    });
  });
}

/* =========================================================
   코스 생성 패널 열기/닫기
========================================================= */
function openRoutePanel() {
  document.getElementById("runRoutePanel").style.bottom = "0px";
  document.getElementById("runButtonRow").style.bottom = "120px";
}

function closeRoutePanel() {
  document.getElementById("runRoutePanel").style.bottom = "-420px";
  document.getElementById("runButtonRow").style.bottom = "64px";
}

/* =========================================================
   카카오 장소 검색
========================================================= */
async function kakaoSearch(query) {
  if (!RUN_KAKAO_REST_KEY || RUN_KAKAO_REST_KEY.startsWith("YOUR_")) return [];

  const res = await fetch(
    "https://dapi.kakao.com/v2/local/search/keyword.json?query=" + encodeURIComponent(query),
    {
      headers: { Authorization: "KakaoAK " + RUN_KAKAO_REST_KEY },
    }
  );

  if (!res.ok) return [];
  const data = await res.json();

  return data.documents.map((d) => ({
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    lat: parseFloat(d.y),
    lng: parseFloat(d.x),
    dist: currentLocation ? haversine(currentLocation.lat, currentLocation.lng, d.y, d.x) : null,
  })).sort((a, b) => (a.dist ?? 999999) - (b.dist ?? 999999));
}

/* =========================================================
   ORS 최단거리 계산
========================================================= */
async function orsPath(coords) {
  if (!RUN_ORS_KEY || RUN_ORS_KEY.startsWith("YOUR_")) {
    throw new Error("ORS 키가 설정되지 않았습니다.");
  }

  const body = {
    coordinates: coords.map(([lat, lng]) => [lng, lat]),
  };

  const res = await fetch("https://api.openrouteservice.org/v2/directions/foot-walking/geojson", {
    method: "POST",
    headers: {
      Authorization: RUN_ORS_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("ORS 경로 생성 실패");

  const data = await res.json();
  const feature = data.features[0];
  const coordsOut = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

  let dist = feature.properties.summary.distance || 0;
  if (!dist) {
    // 백업 계산
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

/* =========================================================
   코스 생성
========================================================= */
async function generateCourse() {
  const sInput = document.getElementById("runRouteStart");
  const eInput = document.getElementById("runRouteEnd");
  const status = document.getElementById("runRouteStatus");
  const shortInfo = document.getElementById("runShortestInfo");

  const sLat = parseFloat(sInput.dataset.lat);
  const sLng = parseFloat(sInput.dataset.lng);
  const eLat = parseFloat(eInput.dataset.lat);
  const eLng = parseFloat(eInput.dataset.lng);

  if (isNaN(sLat)) {
    status.textContent = "출발 위치를 설정하세요.";
    return;
  }

  // 목표 거리 가져오기
  routeTargetMeters = setTargetMeters;

  // 타입
  const isLinear = document.getElementById("courseLinear").classList.contains("run-course-active");

  status.textContent = "경로 계산 중...";

  /* 1. 최단거리 계산 */
  let shortest;
  try {
    if (!isNaN(eLat)) {
      shortest = await orsPath([[sLat, sLng], [eLat, eLng]]);
    } else {
      shortest = { path: [], distanceMeters: 0 };
    }
  } catch {
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

  /* 2. 목표거리 < 최단거리 → 자동 조정 */
  if (routeTargetMeters && routeTargetMeters < shortestDistanceMeters) {
    alert(
      `입력한 목표 거리(${(routeTargetMeters / 1000).toFixed(
        2
      )}km)가 최단거리(${shortestKm}km)보다 짧습니다.\n최단거리로 자동 조정합니다.`
    );
    routeTargetMeters = shortestDistanceMeters;
  }

  /* 3. 코스 생성 */
  let controlPoints = [];

  if (isLinear) {
    if (isNaN(eLat)) {
      status.textContent = "직선 코스는 도착 위치가 필요합니다.";
      return;
    }

    const diff = routeTargetMeters - shortestDistanceMeters;

    if (diff < 50) {
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

  /* 4. ORS 최종 경로 */
  let finalRoute;
  try {
    finalRoute = await orsPath(controlPoints);
  } catch {
    status.textContent = "코스 생성 실패";
    return;
  }

  if (plannedRoute) runMap.removeLayer(plannedRoute);
  plannedRoute = L.polyline(finalRoute.path, { color: "green", weight: 4 }).addTo(runMap);

  runMap.fitBounds(plannedRoute.getBounds());
  status.textContent = `완료: ${(finalRoute.distanceMeters / 1000).toFixed(2)}km`;
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
  plannedRoute = L.polyline(path, { color: "orange", weight: 5 }).addTo(runMap);
  runMap.fitBounds(plannedRoute.getBounds());

  const durationSec = distanceMeters * 0.36; // 10 km/h
  alert(
    `관리자 시뮬 완료!\n거리: ${(distanceMeters / 1000).toFixed(2)}km\n시간: ${formatTime(
      durationSec
    )}`
  );

  adminMode = false;
  adminPoints = [];
}

/* =========================================================
   초기화
========================================================= */
window.addEventListener("load", () => {
  initMap();
  initDistanceModal();
  initNavigation();
  initMyLocationButton();

  document.getElementById("runStartBtn").addEventListener("click", startRun);
  document.getElementById("runRouteGenerateBtn").addEventListener("click", generateCourse);
  document.getElementById("runAdminBtn").addEventListener("click", adminSim);
});
