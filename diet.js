const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk3NTU2OTk1ODQ1NjQ0YWE5NzA3ZTM1OWExMGE3NTU4IiwiaCI6Im11cm11cjY0In0="; // OpenRouteService Directions API 키

// Kakao JS SDK는 script 태그에서 appkey=YOUR_KAKAO_JS_KEY 로 로딩됨

let map;
let baseLayers = {};
let currentBase = "light";
let routeLayer;
let gpsLayer;
let gpsPositions = [];
let orsSeed = 0;

let kakaoPlaces = null;
let startCoord = null;
let endCoord = null;

// === 유틸 함수 ===
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistance(a, b) {
  const R = 6371e3; // m
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLng = toRad(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c; // meters
}

function formatKm(meters) {
  return (meters / 1000).toFixed(2);
}

function approxLatLngOffset(lat, lng, deltaKmNorth, deltaKmEast) {
  const dLat = deltaKmNorth / 111;
  const dLng = deltaKmEast / (111 * Math.cos(toRad(lat)) || 1e-6);
  return { lat: lat + dLat, lng: lng + dLng };
}

// === 지도 초기화 ===
function initMap() {
  map = L.map("map", {
    zoomControl: false,
  }).setView([37.5665, 126.978], 14);

  const light = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        "&copy; <a href='https://www.openstreetmap.org/copyright'>OSM</a> &copy; <a href='https://carto.com/'>CARTO</a>",
      maxZoom: 19,
    }
  );

  const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  });

  baseLayers = { light, osm };
  light.addTo(map);

  L.control
    .zoom({
      position: "topleft",
    })
    .addTo(map);

  routeLayer = L.geoJSON(null, {
    style: {
      color: "#1d4ed8",
      weight: 5,
    },
  }).addTo(map);

  gpsLayer = L.polyline([], {
    color: "#22c55e",
    weight: 4,
    opacity: 0.85,
  }).addTo(map);

  tryLocateUser();
}

// === 위치 및 GPS 추적 ===
function tryLocateUser() {
  if (!navigator.geolocation) {
    document.getElementById("info-location").textContent = "브라우저에서 위치를 지원하지 않습니다.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 15);
      document.getElementById("info-location").textContent = `lat ${latitude.toFixed(
        5
      )}, lng ${longitude.toFixed(5)}`;
      if (!startCoord) {
        startCoord = { lat: latitude, lng: longitude };
      }
    },
    () => {
      document.getElementById("info-location").textContent = "위치 정보를 가져올 수 없습니다.";
    }
  );

  navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const point = { lat: latitude, lng: longitude };
      gpsPositions.push(point);
      gpsLayer.addLatLng([point.lat, point.lng]);

      if (gpsPositions.length > 1) {
        const last = gpsPositions[gpsPositions.length - 2];
        const dist = haversineDistance(last, point);
        const prev = Number(document.getElementById("liveDistance").textContent || "0");
        const newMeters = prev * 1000 + dist;
        const km = formatKm(newMeters);
        document.getElementById("liveDistance").textContent = km;
        document.getElementById("info-live-distance").textContent = `${km} km`;
      }
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );
}

// === Kakao 자동완성 ===
function initKakaoAutocomplete() {
  if (!window.kakao || !window.kakao.maps) return;
  kakaoPlaces = new kakao.maps.services.Places();

  setupAutocomplete("start-input", "start-suggestions", (coord) => {
    startCoord = coord;
    map.setView([coord.lat, coord.lng], 15);
  });

  setupAutocomplete("end-input", "end-suggestions", (coord) => {
    endCoord = coord;
    map.setView([coord.lat, coord.lng], 15);
  });
}

function setupAutocomplete(inputId, listId, onSelect) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  let timer = null;

  input.addEventListener("input", () => {
    const keyword = input.value.trim();
    if (timer) clearTimeout(timer);
    if (!keyword) {
      list.classList.remove("visible");
      list.innerHTML = "";
      return;
    }

    timer = setTimeout(() => {
      kakaoPlaces.keywordSearch(keyword, (results, status) => {
        if (status !== kakao.maps.services.Status.OK || !results.length) {
          list.classList.remove("visible");
          list.innerHTML = "";
          return;
        }

        list.innerHTML = "";
        results.slice(0, 8).forEach((item) => {
          const li = document.createElement("li");
          li.className = "suggest-item";
          li.textContent = item.place_name + (item.road_address_name ? ` · ${item.road_address_name}` : "");
          li.addEventListener("click", () => {
            input.value = item.place_name;
            list.classList.remove("visible");
            list.innerHTML = "";
            const coord = { lat: Number(item.y), lng: Number(item.x) };
            onSelect(coord);
          });
          list.appendChild(li);
        });
        list.classList.add("visible");
      });
    }, 250);
  });

  document.addEventListener("click", (e) => {
    if (!list.contains(e.target) && e.target !== input) {
      list.classList.remove("visible");
    }
  });
}

// === ORS Directions 호출 ===
async function fetchORSRoute(points) {
  const coords = points.map((p) => [p.lng, p.lat]);
  const body = {
    coordinates: coords,
  };

  const res = await fetch("https://api.openrouteservice.org/v2/directions/foot-walking/geojson", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: ORS_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("ORS 요청 실패");
  }

  const data = await res.json();
  return data;
}

// === 루트 생성 로직 ===
function getMode() {
  const active = document.querySelector(".pill-option-active");
  return active ? active.dataset.mode : "auto";
}

function randomOffsetFactor() {
  orsSeed += 1;
  const base = (Math.sin(orsSeed * 12.9898) * 43758.5453) % 1;
  return 0.85 + base * 0.3; // 0.85 ~ 1.15
}

async function generateRoute(regenerate = false) {
  if (!startCoord) {
    alert("출발지를 입력하거나 내 위치 허용 후 사용해 주세요.");
    return;
  }

  const targetKm = Number(document.getElementById("target-distance").value || "0");
  if (!targetKm || targetKm <= 0) {
    alert("목표 거리를 1km 이상으로 입력해 주세요.");
    return;
  }

  const mode = getMode();

  try {
    let points;
    let routeTypeLabel;

    if (!endCoord) {
      // 출발지만 존재 → 항상 사각 루프
      const result = buildLoopRectangle(startCoord, targetKm, regenerate);
      points = result.points;
      routeTypeLabel = "사각 루프 (출발=도착)";
    } else {
      if (mode === "oneway") {
        points = [startCoord, endCoord];
        routeTypeLabel = "일자 루트";
      } else {
        const result = buildRectWithStartEnd(startCoord, endCoord, targetKm, regenerate);
        points = result.points;
        routeTypeLabel = "사각 루트 (출발·도착 포함)";
      }
    }

    const data = await fetchORSRoute(points);
    updateRouteOnMap(data, routeTypeLabel);
  } catch (err) {
    console.error(err);
    alert("루트 생성에 실패했습니다. 거리나 위치를 조금 바꿔 다시 시도해 주세요.");
  }
}

function buildLoopRectangle(start, targetKm, regenerate) {
  const basePerimeter = targetKm;
  const sideKm = basePerimeter / 4;
  const factor = randomOffsetFactor();
  const north = sideKm * factor;
  const east = sideKm * (2 - factor); // 서로 길이 약간 다르게

  const p1 = start;
  const p2 = approxLatLngOffset(p1.lat, p1.lng, north, 0);
  const p3 = approxLatLngOffset(p2.lat, p2.lng, 0, east);
  const p4 = approxLatLngOffset(p1.lat, p1.lng, 0, east);

  return {
    points: [p1, p2, p3, p4, p1],
  };
}

function buildRectWithStartEnd(start, end, targetKm, regenerate) {
  const d = haversineDistance(start, end) / 1000; // km

  if (d === 0 || targetKm <= d * 1.1) {
    // 거리가 너무 짧으면 그냥 일자 루트
    return { points: [start, end] };
  }

  // 사각형 둘레 = 2(d + h) 이므로 h = target/2 - d
  const h = targetKm / 2 - d;
  const factor = randomOffsetFactor();
  const hAdj = Math.max(h * factor, d * 0.4); // 너무 얇은 직사각형 방지

  // AB 벡터
  const latA = start.lat;
  const lngA = start.lng;
  const latB = end.lat;
  const lngB = end.lng;

  const dLat = latB - latA;
  const dLng = lngB - lngA;

  // 단위 수직벡터(북동 기준 근사)
  const len = Math.sqrt(dLat * dLat + dLng * dLng) || 1e-6;
  const ux = -dLng / len;
  const uy = dLat / len;

  const meters = hAdj * 1000;
  const north = (meters / 1000) * uy;
  const east = (meters / 1000) * ux;

  const p1 = start;
  const p2 = end;
  const p3 = approxLatLngOffset(p2.lat, p2.lng, north, east);
  const p4 = approxLatLngOffset(p1.lat, p1.lng, north, east);

  return {
    points: [p1, p4, p3, p2],
  };
}

function updateRouteOnMap(geojson, typeLabel) {
  routeLayer.clearLayers();
  routeLayer.addData(geojson);

  const feature = geojson.features[0];
  const coords = feature.geometry.coordinates;

  const latlngs = coords.map((c) => [c[1], c[0]]);
  const bounds = L.latLngBounds(latlngs);
  map.fitBounds(bounds, { padding: [40, 40] });

  const summary = feature.properties.summary;
  const distanceM = summary.distance;
  const km = formatKm(distanceM);

  document.getElementById("routeDistance").textContent = km;
  document.getElementById("info-distance").textContent = `${km} km`;
  document.getElementById("info-type").textContent = typeLabel;
  document.getElementById("info-points").textContent = coords.length.toString();
}

// === 이벤트 바인딩 ===
function bindUI() {
  document.getElementById("btnLocate").addEventListener("click", tryLocateUser);

  document.getElementById("btnGenerate").addEventListener("click", () => {
    generateRoute(false);
  });

  document.getElementById("btnRegenerate").addEventListener("click", () => {
    generateRoute(true);
  });

  document.querySelectorAll(".pill-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill-option").forEach((b) => b.classList.remove("pill-option-active"));
      btn.classList.add("pill-option-active");
    });
  });

  document.querySelectorAll(".style-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const style = chip.dataset.style;
      if (style === currentBase) return;

      Object.values(baseLayers).forEach((layer) => {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      });

      baseLayers[style].addTo(map);
      currentBase = style;

      document.querySelectorAll(".style-chip").forEach((c) => c.classList.remove("style-chip-active"));
      chip.classList.add("style-chip-active");
    });
  });
}

// === 초기화 ===
window.addEventListener("DOMContentLoaded", () => {
  initMap();
  bindUI();

  // Kakao SDK가 비동기로 로드되므로 ready 후 자동완성 초기화
  if (window.kakao && window.kakao.maps) {
    kakao.maps.load(initKakaoAutocomplete);
  } else {
    window.kakaoInit = () => kakao.maps.load(initKakaoAutocomplete);
  }
});
