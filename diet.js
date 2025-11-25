// diet.js
// OSRM foot profile 기반 도로 경로 + 3가지 코스 모드
// - 편도(최단경로)
// - 사각/왕복 루프
// - 추천 코스(근처 공원)

const OSRM_ENDPOINT = "http://129.146.134.15:5000";
const RADIUS_METERS = 5000;

let map;
let kakaoPlaces = null;

let myLat = null;
let myLng = null;

let startPoint = null; // {lat,lng,name}
let endPoint = null;

let startMarker = null;
let endMarker = null;
let routeLayer = null;

let STATIONS_DATA = [];
let CAMPUSES_DATA = [];

export function initApp({ STATIONS = [], CAMPUSES = [] } = {}) {
  STATIONS_DATA = STATIONS || [];
  CAMPUSES_DATA = CAMPUSES || [];

  initMap();
  initKakaoPlaces();
  initGeolocation();
  setupAutocomplete();
  setupMyLocationButton();
  setupCourseButton();
}

// 지도 초기화
function initMap() {
  map = L.map("map").setView([37.5665, 126.978], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);
}

// 카카오 장소 검색 초기화
function initKakaoPlaces() {
  if (!window.kakao || !kakao.maps || !kakao.maps.load) return;

  kakao.maps.load(() => {
    kakaoPlaces = new kakao.maps.services.Places();
  });
}

// GPS 초기화
function initGeolocation() {
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
    () => {
      if (statusEl) statusEl.textContent = "GPS: 위치 정보를 가져올 수 없습니다.";
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

// haversine 거리(m)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
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

// 로컬(STATIONS, CAMPUSES) 검색
function getLocalMatches(keyword) {
  const key = keyword.trim().toLowerCase();
  if (!key) return [];

  const hasLoc = myLat != null && myLng != null;
  const results = [];

  STATIONS_DATA.forEach((st) => {
    if (!st || !st.name) return;
    const name = String(st.name).toLowerCase();
    if (!name.includes(key)) return;
    let distance = null;
    if (hasLoc && st.lat && st.lng) {
      distance = haversine(myLat, myLng, Number(st.lat), Number(st.lng));
      if (distance > RADIUS_METERS) return;
    }
    results.push({
      place_name: st.name,
      x: st.lng,
      y: st.lat,
      distance,
      _kind: "station"
    });
  });

  CAMPUSES_DATA.forEach((cp) => {
    if (!cp || !cp.name) return;
    const name = String(cp.name).toLowerCase();
    if (!name.includes(key)) return;
    let distance = null;
    if (hasLoc && cp.lat && cp.lng) {
      distance = haversine(myLat, myLng, Number(cp.lat), Number(cp.lng));
      if (distance > RADIUS_METERS) return;
    }
    results.push({
      place_name: cp.name,
      x: cp.lng,
      y: cp.lat,
      distance,
      _kind: "campus"
    });
  });

  results.sort((a, b) => {
    if (a.distance == null && b.distance == null) return 0;
    if (a.distance == null) return 1;
    if (b.distance == null) return -1;
    return a.distance - b.distance;
  });

  return results;
}

// 카카오 검색
function searchKakao(keyword, cb) {
  if (!kakaoPlaces) {
    cb([]);
    return;
  }
  const hasLoc = myLat != null && myLng != null;
  const opts = hasLoc
    ? { location: new kakao.maps.LatLng(myLat, myLng) }
    : {};

  kakaoPlaces.keywordSearch(
    keyword,
    (data, status) => {
      if (status !== kakao.maps.services.Status.OK) {
        cb([]);
        return;
      }
      const list = data.map((p) => {
        let distance = null;
        if (hasLoc) {
          distance = haversine(myLat, myLng, Number(p.y), Number(p.x));
        } else if (p.distance) {
          distance = Number(p.distance);
        }
        return {
          place_name: p.place_name,
          x: p.x,
          y: p.y,
          distance,
          _kind: "kakao"
        };
      });
      const filtered = hasLoc
        ? list.filter((p) => p.distance == null || p.distance <= RADIUS_METERS)
        : list;
      filtered.sort((a, b) => {
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
      cb(filtered);
    },
    opts
  );
}

// 로컬 + 카카오 결합 검색
function searchCombined(keyword, cb) {
  const local = getLocalMatches(keyword);
  searchKakao(keyword, (remote) => {
    const used = new Set(local.map((p) => p.place_name));
    const merged = [
      ...local,
      ...remote.filter((p) => !used.has(p.place_name))
    ];
    cb(merged);
  });
}

// 자동완성 UI
function setupAutocomplete() {
  const startInput = document.getElementById("start-input");
  const endInput = document.getElementById("end-input");
  const startSug = document.getElementById("start-suggestions");
  const endSug = document.getElementById("end-suggestions");

  if (!startInput || !endInput) return;

  const makeDistanceText = (d) => {
    if (d == null || Number.isNaN(d)) return "";
    if (d < 1000) return `${Math.round(d)}m`;
    return `${(d / 1000).toFixed(1)}km`;
  };

  function renderList(wrapper, items, targetInput, type) {
    wrapper.innerHTML = "";
    if (!items.length) {
      wrapper.style.display = "none";
      return;
    }
    wrapper.style.display = "block";

    items.slice(0, 8).forEach((p) => {
      const li = document.createElement("li");
      li.className = "suggest-item";

      let kindText = "";
      if (p._kind === "station") kindText = "지하철역";
      else if (p._kind === "campus") kindText = "대학교";

      const distText = makeDistanceText(p.distance);
      let text = p.place_name;
      if (kindText) text += ` (${kindText})`;
      if (distText) text += ` · ${distText}`;

      li.textContent = text;
      li.addEventListener("click", () => {
        targetInput.value = p.place_name;
        wrapper.style.display = "none";
        const lat = Number(p.y);
        const lng = Number(p.x);
        if (type === "start") {
          startPoint = { lat, lng, name: p.place_name };
        } else {
          endPoint = { lat, lng, name: p.place_name };
        }
        updateMarkersOnly();
      });

      wrapper.appendChild(li);
    });
  }

  startInput.addEventListener("input", () => {
    const key = startInput.value.trim();
    if (!key) {
      startSug.style.display = "none";
      return;
    }
    searchCombined(key, (list) => renderList(startSug, list, startInput, "start"));
  });

  endInput.addEventListener("input", () => {
    const key = endInput.value.trim();
    if (!key) {
      endSug.style.display = "none";
      return;
    }
    searchCombined(key, (list) => renderList(endSug, list, endInput, "end"));
  });

  document.addEventListener("click", (e) => {
    if (e.target !== startInput && !startSug.contains(e.target)) {
      startSug.style.display = "none";
    }
    if (e.target !== endInput && !endSug.contains(e.target)) {
      endSug.style.display = "none";
    }
  });
}

// 마커만 갱신 (경로는 코스 생성 버튼 눌렀을 때)
function updateMarkersOnly() {
  if (!map) return;

  if (startMarker) {
    map.removeLayer(startMarker);
    startMarker = null;
  }
  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }

  const pts = [];
  if (startPoint) {
    startMarker = L.marker([startPoint.lat, startPoint.lng]).addTo(map);
    pts.push([startPoint.lat, startPoint.lng]);
  }
  if (endPoint) {
    endMarker = L.marker([endPoint.lat, endPoint.lng]).addTo(map);
    pts.push([endPoint.lat, endPoint.lng]);
  }

  if (pts.length === 1) {
    map.setView(pts[0], 15);
  } else if (pts.length === 2) {
    const bounds = L.latLngBounds(pts[0], pts[1]).pad(0.25);
    map.fitBounds(bounds);
  }
}

// 내 위치 버튼
function setupMyLocationButton() {
  const btn = document.getElementById("btn-my-location");
  const startInput = document.getElementById("start-input");
  if (!btn || !startInput) return;

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
          statusEl.textContent = `GPS: ${myLat.toFixed(5)}, ${myLng.toFixed(5)}`;
        }

        startInput.value = "현재 위치";
        startPoint = { lat: myLat, lng: myLng, name: "현재 위치" };
        updateMarkersOnly();
      },
      () => {
        alert("현재 위치를 가져올 수 없습니다.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

// 코스 생성 버튼
function setupCourseButton() {
  const btn = document.getElementById("btn-generate-course");
  const summaryEl = document.getElementById("status-summary");
  const distInput = document.getElementById("distance-input");

  if (!btn || !summaryEl) return;

  btn.addEventListener("click", async () => {
    if (!map) return;

    const mode = getSelectedMode();
    const targetKm = parseFloat(distInput.value) || null;

    if (!startPoint && myLat != null && myLng != null) {
      startPoint = { lat: myLat, lng: myLng, name: "현재 위치" };
    }

    if (!startPoint) {
      alert("출발지를 먼저 선택해주세요.");
      return;
    }

    try {
      if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
      }

      let routeInfo = null;

      if (mode === "oneway") {
        if (!endPoint) {
          alert("편도 코스는 도착지가 필요합니다.");
          return;
        }
        routeInfo = await buildOneWayRoute(startPoint, endPoint);
      } else if (mode === "loop") {
        routeInfo = await buildLoopRoute(startPoint, endPoint, targetKm);
      } else if (mode === "recommend") {
        routeInfo = await buildRecommendRoute(targetKm);
      }

      if (!routeInfo) return;

      const { coords, distance } = routeInfo;
      routeLayer = L.polyline(coords, { color: "#2563eb", weight: 4 }).addTo(
        map
      );
      const bounds = L.latLngBounds(coords).pad(0.25);
      map.fitBounds(bounds);

      const km = (distance / 1000).toFixed(2);
      let text = `총 거리: ${km}km`;
      if (targetKm) {
        text += ` / 목표 거리: ${targetKm.toFixed(1)}km`;
      }
      summaryEl.textContent = text;
    } catch (e) {
      console.error(e);
      alert("코스 생성 중 오류가 발생했습니다.");
    }
  });
}

function getSelectedMode() {
  const radios = document.querySelectorAll('input[name="courseMode"]');
  for (const r of radios) {
    if (r.checked) return r.value;
  }
  return "oneway";
}

// OSRM 요청 공통
async function requestOsrmRoute(points) {
  if (!points || points.length < 2) return null;

  const coordsStr = points
    .map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`)
    .join(";");

  const url = `${OSRM_ENDPOINT}/route/v1/foot/${coordsStr}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("OSRM 요청 실패");
  }
  const json = await res.json();
  if (!json.routes || !json.routes.length) {
    throw new Error("경로를 찾을 수 없습니다.");
  }
  const route = json.routes[0];
  const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return { coords, distance: route.distance };
}

// ① 편도 코스 - 최단경로
async function buildOneWayRoute(from, to) {
  const points = [from, to];
  return await requestOsrmRoute(points);
}

// ② 사각/왕복 코스
async function buildLoopRoute(from, to, targetKm) {
  const base = { lat: from.lat, lng: from.lng };
  let waypoints = [];

  if (!to) {
    // 출발지만 있는 경우: 출발지를 기준으로 사각형
    const total = targetKm && targetKm > 0 ? targetKm : 4; // 기본 4km
    const sideKm = total / 4;
    const latRad = (base.lat * Math.PI) / 180;
    const dLat = (sideKm * 1000) / 111000;
    const dLng = (sideKm * 1000) / (111000 * Math.cos(latRad));

    const p1 = base;
    const p2 = { lat: base.lat, lng: base.lng + dLng };
    const p3 = { lat: base.lat - dLat, lng: base.lng + dLng };
    const p4 = { lat: base.lat - dLat, lng: base.lng };

    waypoints = [p1, p2, p3, p4, p1];
  } else {
    // 출발지 + 목적지 둘 다 있을 때: 대략적인 사다리꼴 루프
    const vLat = to.lat - from.lat;
    const vLng = to.lng - from.lng;
    const distDeg = Math.sqrt(vLat * vLat + vLng * vLng) || 0.001;
    const offset = distDeg * 0.5;

    // 출발-도착 벡터에 수직인 방향
    const nLat = (-vLng / distDeg) * offset;
    const nLng = (vLat / distDeg) * offset;

    const p2 = { lat: from.lat + nLat, lng: from.lng + nLng };
    const p3 = { lat: to.lat + nLat, lng: to.lng + nLng };

    // 순서: 출발(1) -> p2(2) -> 목적지(4) -> p3(3) -> 출발
    waypoints = [from, p2, to, p3, from];
  }

  return await requestOsrmRoute(waypoints);
}

// ③ 추천 코스 (간단 버전: 근처 공원까지 편도)
async function buildRecommendRoute(targetKm) {
  if (myLat == null || myLng == null) {
    alert("추천 코스를 사용하려면 위치 정보가 필요합니다.");
    return null;
  }
  const base = { lat: myLat, lng: myLng, name: "현재 위치" };
  startPoint = base;
  const startInput = document.getElementById("start-input");
  if (startInput) startInput.value = "현재 위치";
  updateMarkersOnly();

  if (!kakaoPlaces) {
    alert("카카오 장소 검색을 사용할 수 없습니다.");
    return null;
  }

  // 근처 공원 검색
  const keyword = "공원";
  const center = new kakao.maps.LatLng(myLat, myLng);

  const places = await new Promise((resolve) => {
    kakaoPlaces.keywordSearch(
      keyword,
      (data, status) => {
        if (status !== kakao.maps.services.Status.OK) {
          resolve([]);
          return;
        }
        resolve(data);
      },
      { location: center, radius: 3000 }
    );
  });

  if (!places.length) {
    alert("근처에서 추천할 공원을 찾지 못했습니다.");
    return null;
  }

  // 가장 가까운 공원 선택
  let best = null;
  let bestDist = Infinity;
  for (const p of places) {
    const d = haversine(myLat, myLng, Number(p.y), Number(p.x));
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }

  const dest = {
    lat: Number(best.y),
    lng: Number(best.x),
    name: best.place_name
  };
  endPoint = dest;
  const endInput = document.getElementById("end-input");
  if (endInput) endInput.value = best.place_name;
  updateMarkersOnly();

  return await buildOneWayRoute(base, dest);
}
