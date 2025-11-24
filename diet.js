// diet.js (ES Module)

let map;
let kakaoPlaces;
let myLat = null;
let myLng = null;

// 외부에서 주입되는 데이터
let STATIONS_DATA = [];
let CAMPUSES_DATA = [];

// 출발/도착 포인트 및 마커/라인
let startPoint = null;
let endPoint = null;
let startMarker = null;
let endMarker = null;
let routeLine = null;

// 5km 반경 제한 (m)
const RADIUS_LIMIT = 5000;

// ==============================
// 초기 진입점
// ==============================
export function initApp({ STATIONS = [], CAMPUSES = [] } = {}) {
  STATIONS_DATA = STATIONS;
  CAMPUSES_DATA = CAMPUSES;

  initMap();
  initMyLocation();
  initKakaoPlaces();
  setupAutocomplete();
  setupMyLocationBtn();
  setupCourseButton();
}

// ==============================
// 지도 초기화 (Leaflet)
// ==============================
function initMap() {
  map = L.map("map").setView([37.5665, 126.978], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);
}

// ==============================
// GPS 초기화
// ==============================
function initMyLocation() {
  const statusEl = document.getElementById("status-gps");
  if (!navigator.geolocation) {
    if (statusEl) statusEl.textContent = "GPS: 지원되지 않는 기기입니다.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      myLat = pos.coords.latitude;
      myLng = pos.coords.longitude;

      if (statusEl) {
        statusEl.textContent = `GPS: ${myLat.toFixed(5)}, ${myLng.toFixed(5)}`;
      }

      if (map) {
        map.setView([myLat, myLng], 15);
      }
    },
    (err) => {
      console.warn("초기 위치 가져오기 실패:", err);
      if (statusEl) statusEl.textContent = "GPS: 위치 정보를 가져올 수 없습니다.";
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

// ==============================
// Kakao Places 초기화
// ==============================
function initKakaoPlaces() {
  if (!window.kakao || !kakao.maps || !kakao.maps.load) {
    console.error("Kakao Maps SDK 로드 안됨");
    return;
  }

  kakao.maps.load(() => {
    kakaoPlaces = new kakao.maps.services.Places();
  });
}

// ==============================
// Haversine 거리 계산 (m)
// ==============================
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==============================
// 로컬 데이터(STATIONS + CAMPUSES)에서 키워드 + 거리 매칭
// ==============================
function getLocalMatches(keyword) {
  const key = keyword.trim().toLowerCase();
  if (!key) return [];

  const hasLocation = myLat != null && myLng != null;
  const results = [];

  // 1) 지하철역
  STATIONS_DATA.forEach((st) => {
    if (!st || !st.name) return;
    const name = String(st.name).toLowerCase();
    const lines = Array.isArray(st.lines) ? st.lines.join(",") : st.lines || "";
    const lineStr = String(lines).toLowerCase();

    if (!name.includes(key) && !lineStr.includes(key)) return;

    let distance = null;
    if (hasLocation && st.lat != null && st.lng != null) {
      distance = haversine(myLat, myLng, Number(st.lat), Number(st.lng));
      if (distance > RADIUS_LIMIT) return; // 5km 밖이면 제외
    }

    results.push({
      place_name: st.name,
      x: st.lng,
      y: st.lat,
      distance,
      __source: "station"
    });
  });

  // 2) 대학
  CAMPUSES_DATA.forEach((cp) => {
    if (!cp || !cp.name) return;
    const name = String(cp.name).toLowerCase();
    const city = cp.city ? String(cp.city).toLowerCase() : "";

    if (!name.includes(key) && !city.includes(key)) return;

    let distance = null;
    if (hasLocation && cp.lat != null && cp.lng != null) {
      distance = haversine(myLat, myLng, Number(cp.lat), Number(cp.lng));
      if (distance > RADIUS_LIMIT) return;
    }

    results.push({
      place_name: cp.name,
      x: cp.lng,
      y: cp.lat,
      distance,
      __source: "campus"
    });
  });

  // 거리순 정렬 (거리 있는 애 우선)
  results.sort((a, b) => {
    if (a.distance == null && b.distance == null) return 0;
    if (a.distance == null) return 1;
    if (b.distance == null) return -1;
    return a.distance - b.distance;
  });

  return results;
}

// ==============================
// Kakao Places 검색
// ==============================
function searchKakaoPlaces(keyword, callback) {
  if (!kakaoPlaces) {
    callback([]);
    return;
  }

  const hasLocation = myLat != null && myLng != null;
  const options = hasLocation
    ? { location: new kakao.maps.LatLng(myLat, myLng) }
    : {};

  kakaoPlaces.keywordSearch(
    keyword,
    (result, status) => {
      if (status !== kakao.maps.services.Status.OK || !Array.isArray(result)) {
        callback([]);
        return;
      }

      const list = result.map((p) => {
        let distance = null;
        if (hasLocation) {
          const lat = Number(p.y);
          const lng = Number(p.x);
          distance = haversine(myLat, myLng, lat, lng);
        } else if (p.distance != null && p.distance !== "") {
          distance = Number(p.distance);
        }

        return {
          place_name: p.place_name,
          x: p.x,
          y: p.y,
          distance,
          __source: "kakao"
        };
      });

      // 5km 반경 필터 (있으면)
      const filtered = hasLocation
        ? list.filter((p) => p.distance == null || p.distance <= RADIUS_LIMIT)
        : list;

      // 거리순 정렬
      filtered.sort((a, b) => {
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });

      callback(filtered);
    },
    options
  );
}

// ==============================
// 로컬 + Kakao 결합 검색
// ==============================
function searchCombined(keyword, callback) {
  const local = getLocalMatches(keyword);
  searchKakaoPlaces(keyword, (kakaoList) => {
    const usedNames = new Set(local.map((p) => p.place_name));
    const merged = [
      ...local,
      ...kakaoList.filter((p) => !usedNames.has(p.place_name))
    ];
    callback(merged);
  });
}

// ==============================
// 출발/도착 마커 & 라인 업데이트
// ==============================
function updateMarkersAndRoute() {
  // 기존 마커/라인 제거
  if (startMarker) {
    map.removeLayer(startMarker);
    startMarker = null;
  }
  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }
  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }

  const points = [];

  if (startPoint) {
    startMarker = L.marker([startPoint.lat, startPoint.lng]).addTo(map);
    points.push([startPoint.lat, startPoint.lng]);
  }

  if (endPoint) {
    endMarker = L.marker([endPoint.lat, endPoint.lng]).addTo(map);
    points.push([endPoint.lat, endPoint.lng]);
  }

  // 둘 다 있으면 일단 직선으로만 연결
  if (points.length === 2) {
    routeLine = L.polyline(points, { weight: 4 }).addTo(map);
    const bounds = L.latLngBounds(points[0], points[1]).pad(0.2);
    map.fitBounds(bounds);
  } else if (points.length === 1) {
    map.setView(points[0], 15);
  }
}

// ==============================
// 자동완성 UI
// ==============================
function showSuggestions(wrapper, items, targetInput, onSelect) {
  wrapper.innerHTML = "";
  if (!items.length) {
    wrapper.style.display = "none";
    return;
  }
  wrapper.style.display = "block";

  items.slice(0, 8).forEach((place) => {
    const li = document.createElement("li");
    li.className = "suggest-item";

    let kind = "";
    if (place.__source === "station") {
      kind = " (지하철역)";
    } else if (place.__source === "campus") {
      kind = " (대학교)";
    }

    // 거리 텍스트
    let dText = "";
    if (place.distance != null && !Number.isNaN(place.distance)) {
      const d = place.distance;
      dText = d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
    }

    li.textContent = dText
      ? `${place.place_name}${kind} · ${dText}`
      : `${place.place_name}${kind}`;

    li.addEventListener("click", () => {
      targetInput.value = place.place_name;
      wrapper.style.display = "none";
      if (onSelect) onSelect(place);
    });

    wrapper.appendChild(li);
  });
}

// ==============================
// 입력창 자동완성 설정
// ==============================
function setupAutocomplete() {
  const startInput = document.getElementById("start-input");
  const endInput = document.getElementById("end-input");
  const startSug = document.getElementById("start-suggestions");
  const endSug = document.getElementById("end-suggestions");

  if (!startInput || !endInput) return;

  // 출발지 선택 콜백
  const handleSelectStart = (place) => {
    const lat = place.y != null ? Number(place.y) : null;
    const lng = place.x != null ? Number(place.x) : null;
    if (lat != null && lng != null) {
      startPoint = { lat, lng, name: place.place_name };
      updateMarkersAndRoute();
    }
  };

  // 도착지 선택 콜백
  const handleSelectEnd = (place) => {
    const lat = place.y != null ? Number(place.y) : null;
    const lng = place.x != null ? Number(place.x) : null;
    if (lat != null && lng != null) {
      endPoint = { lat, lng, name: place.place_name };
      updateMarkersAndRoute();
    }
  };

  startInput.addEventListener("input", () => {
    const key = startInput.value.trim();
    if (!key) {
      startSug.style.display = "none";
      return;
    }
    searchCombined(key, (list) =>
      showSuggestions(startSug, list, startInput, handleSelectStart)
    );
  });

  endInput.addEventListener("input", () => {
    const key = endInput.value.trim();
    if (!key) {
      endSug.style.display = "none";
      return;
    }
    searchCombined(key, (list) =>
      showSuggestions(endSug, list, endInput, handleSelectEnd)
    );
  });

  // 바깥 클릭 시 자동완성 닫기
  document.addEventListener("click", (e) => {
    if (startSug && e.target !== startInput && !startSug.contains(e.target)) {
      startSug.style.display = "none";
    }
    if (endSug && e.target !== endInput && !endSug.contains(e.target)) {
      endSug.style.display = "none";
    }
  });
}

// ==============================
// 내 위치 버튼
// ==============================
function setupMyLocationBtn() {
  const btn = document.getElementById("btn-my-location");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("GPS를 지원하지 않는 기기입니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        myLat = pos.coords.latitude;
        myLng = pos.coords.longitude;

        const statusEl = document.getElementById("status-gps");
        if (statusEl) {
          statusEl.textContent = `GPS: ${myLat.toFixed(5)}, ${myLng.toFixed(
            5
          )}`;
        }

        // 내 위치를 출발지로 사용
        const startInput = document.getElementById("start-input");
        if (startInput) startInput.value = "현재 위치";

        startPoint = { lat: myLat, lng: myLng, name: "현재 위치" };
        updateMarkersAndRoute();
      },
      () => {
        alert("현재 위치를 가져올 수 없습니다.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

// ==============================
// 코스 생성 버튼 (지금은 요약만 표시)
// ==============================
function setupCourseButton() {
  const btn = document.getElementById("btn-generate-course");
  const startInput = document.getElementById("start-input");
  const endInput = document.getElementById("end-input");
  const distInput = document.getElementById("distance-input");
  const summaryEl = document.getElementById("status-summary");

  if (!btn || !startInput || !endInput || !summaryEl) return;

  btn.addEventListener("click", () => {
    const s = startInput.value.trim() || "출발지 미지정";
    const e = endInput.value.trim() || "도착지 미지정";
    const d = distInput.value.trim();

    const distText = d ? `${d}km` : "거리 미지정";

    summaryEl.textContent = `코스: ${s} → ${e} / 목표 거리: ${distText}`;
  });
}
