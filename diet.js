const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk3NTU2OTk1ODQ1NjQ0YWE5NzA3ZTM1OWExMGE3NTU4IiwiaCI6Im11cm11cjY0In0=";

const INITIAL_CENTER = [37.5665, 126.978];
const INITIAL_ZOOM = 14;

let map;
let startMarker = null;
let endMarker = null;
let clickCount = 0;
let routeLayer = null;
let currentRouteGeoJSON = null;
let currentRouteDistanceMeters = 0;

let gpsWatchId = null;
let gpsTrackLayer = null;
let gpsTrackCoords = [];
let gpsDistanceMeters = 0;
let lastGpsPoint = null;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function setGpsStatus(text) {
  const el = document.getElementById("gpsStatus");
  if (el) el.textContent = text;
}

function updateGpsDistanceLabel() {
  const el = document.getElementById("gpsDistance");
  if (!el) return;
  const km = (gpsDistanceMeters / 1000).toFixed(2);
  el.textContent = km;
}

function updateRouteDistanceLabel(meters) {
  const el = document.getElementById("routeDistance");
  if (!el) return;
  const km = (meters / 1000).toFixed(2);
  el.textContent = `${km} km`;
}

function initMap() {
  map = L.map("map").setView(INITIAL_CENTER, INITIAL_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  }).addTo(map);

  map.on("click", onMapClick);

  document
    .getElementById("myLocationBtn")
    .addEventListener("click", () => {
      if (lastGpsPoint) {
        map.panTo(lastGpsPoint, { animate: true, duration: 0.4 });
      } else {
        alert("아직 GPS 위치를 가져오지 못했습니다.");
      }
    });

  document
    .getElementById("clearRouteBtn")
    .addEventListener("click", clearRouteAndMarkers);

  document
    .getElementById("startSearchBtn")
    .addEventListener("click", () => searchPlace("start"));
  document
    .getElementById("endSearchBtn")
    .addEventListener("click", () => searchPlace("end"));

  document
    .getElementById("generateTargetRouteBtn")
    .addEventListener("click", generateTargetRoute);

  startGpsTracking();
}

function onMapClick(e) {
  clickCount++;

  if (clickCount === 1) {
    setStartPoint(e.latlng);
  } else if (clickCount === 2) {
    setEndPoint(e.latlng);
    requestRoute(startMarker.getLatLng(), endMarker.getLatLng());
  } else {
    alert("출발/도착을 다시 지정하려면 '경로 초기화'를 눌러주세요.");
  }
}

function setStartPoint(latlng) {
  if (startMarker) {
    map.removeLayer(startMarker);
  }
  startMarker = L.marker(latlng, { draggable: true }).addTo(map);
  startMarker.on("dragend", () => {
    if (endMarker && currentRouteGeoJSON) {
      requestRoute(startMarker.getLatLng(), endMarker.getLatLng());
    }
  });
}

function setEndPoint(latlng) {
  if (endMarker) {
    map.removeLayer(endMarker);
  }
  endMarker = L.marker(latlng, { draggable: true }).addTo(map);
  endMarker.on("dragend", () => {
    if (startMarker && currentRouteGeoJSON) {
      requestRoute(startMarker.getLatLng(), endMarker.getLatLng());
    }
  });
}

async function searchPlace(type) {
  const inputId = type === "start" ? "startInput" : "endInput";
  const value = document.getElementById(inputId).value.trim();
  if (!value) return;

  if (!ORS_API_KEY || ORS_API_KEY === "PASTE_YOUR_ORS_KEY_HERE") {
    alert("diet.js 상단 ORS_API_KEY 자리에 실제 ORS 키를 넣어야 합니다.");
    return;
  }

  const url =
    "https://api.openrouteservice.org/geocode/search?" +
    new URLSearchParams({
      api_key: ORS_API_KEY,
      text: value,
      size: 1,
    }).toString();

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Geocode error", await res.text());
      alert("위치를 찾는 중 오류가 발생했습니다.");
      return;
    }
    const data = await res.json();
    const feat = data.features && data.features[0];
    if (!feat) {
      alert("검색 결과가 없습니다.");
      return;
    }

    const [lng, lat] = feat.geometry.coordinates;
    const latlng = L.latLng(lat, lng);
    map.panTo(latlng, { animate: true, duration: 0.4 });

    if (type === "start") {
      setStartPoint(latlng);
      clickCount = Math.max(clickCount, 1);
    } else {
      setEndPoint(latlng);
      clickCount = Math.max(clickCount, 2);
    }
  } catch (e) {
    console.error(e);
    alert("네트워크 오류로 검색에 실패했습니다.");
  }
}

async function requestRoute(startLatLng, endLatLng) {
  if (!ORS_API_KEY || ORS_API_KEY === "PASTE_YOUR_ORS_KEY_HERE") {
    alert("diet.js 상단 ORS_API_KEY 자리에 실제 ORS 키를 넣어야 합니다.");
    return;
  }

  const url =
    "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";

  const body = {
    coordinates: [
      [startLatLng.lng, startLatLng.lat],
      [endLatLng.lng, endLatLng.lat],
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: ORS_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("ORS error", await res.text());
      alert("경로를 가져오는 중 오류가 발생했습니다.");
      return;
    }

    const data = await res.json();
    drawRouteFromGeoJSON(data);
  } catch (e) {
    console.error(e);
    alert("네트워크 오류로 경로를 가져오지 못했습니다.");
  }
}

function drawRouteFromGeoJSON(geojson) {
  if (routeLayer) {
    map.removeLayer(routeLayer);
  }

  currentRouteGeoJSON = geojson;
  const feature = geojson.features[0];
  const dist = feature.properties.summary.distance;
  currentRouteDistanceMeters = dist;

  routeLayer = L.geoJSON(geojson, {
    style: {
      color: "#38bdf8",
      weight: 5,
    },
  }).addTo(map);

  const bounds = routeLayer.getBounds();
  map.fitBounds(bounds, { padding: [24, 24] });
  updateRouteDistanceLabel(dist);
}

function clearRouteAndMarkers() {
  if (startMarker) {
    map.removeLayer(startMarker);
    startMarker = null;
  }
  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }
  clickCount = 0;

  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  currentRouteGeoJSON = null;
  currentRouteDistanceMeters = 0;
  updateRouteDistanceLabel(0);
}

function offsetPoint(lat, lng, bearingDeg, distanceKm) {
  const R = 6371.0;
  const bearing = (bearingDeg * Math.PI) / 180;

  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lng * Math.PI) / 180;

  const dOverR = distanceKm / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dOverR) +
      Math.cos(lat1) * Math.sin(dOverR) * Math.cos(bearing)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(dOverR) * Math.cos(lat1),
      Math.cos(dOverR) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lon2 * 180) / Math.PI,
  };
}

async function generateTargetRoute() {
  const targetKm = parseFloat(
    document.getElementById("targetKmInput").value.trim()
  );
  if (!targetKm || targetKm <= 0) {
    alert("목표 거리를 km 단위로 입력해 주세요 (예: 4).");
    return;
  }

  if (!startMarker) {
    alert("먼저 출발지를 지정해 주세요 (검색 또는 지도 클릭).");
    return;
  }

  const start = startMarker.getLatLng();

  if (endMarker) {
    await generateLoopWithEnd(start, endMarker.getLatLng(), targetKm);
  } else {
    await generateSquareLoop(start, targetKm);
  }
}

async function generateSquareLoop(startLatLng, targetKm) {
  const sideKm = targetKm / 4.0;
  if (sideKm <= 0) {
    alert("목표 거리가 너무 짧습니다.");
    return;
  }

  const p1 = offsetPoint(startLatLng.lat, startLatLng.lng, 0, sideKm);
  const p2 = offsetPoint(startLatLng.lat, startLatLng.lng, 90, sideKm);
  const p3 = offsetPoint(startLatLng.lat, startLatLng.lng, 180, sideKm);

  const coords = [
    [startLatLng.lng, startLatLng.lat],
    [p1.lng, p1.lat],
    [p2.lng, p2.lat],
    [p3.lng, p3.lat],
    [startLatLng.lng, startLatLng.lat],
  ];

  await requestMultiPointRoute(coords);
}

async function generateLoopWithEnd(startLatLng, endLatLng, targetKm) {
  const directDistKm =
    haversineDistance(
      startLatLng.lat,
      startLatLng.lng,
      endLatLng.lat,
      endLatLng.lng
    ) / 1000;

  if (directDistKm > targetKm) {
    alert(
      "목표 거리보다 출발지-목적지 직선 거리가 더 깁니다. 목표 거리를 늘려 주세요."
    );
    return;
  }

  const extraKm = Math.max(targetKm - directDistKm, targetKm * 0.3);
  const halfExtra = extraKm / 2.0;

  const midLat = (startLatLng.lat + endLatLng.lat) / 2;
  const midLng = (startLatLng.lng + endLatLng.lng) / 2;

  const bearing = Math.atan2(
    endLatLng.lng - startLatLng.lng,
    endLatLng.lat - startLatLng.lat
  );
  const bearingDeg = (bearing * 180) / Math.PI;

  const leftBearing = bearingDeg - 90;
  const rightBearing = bearingDeg + 90;

  const via1 = offsetPoint(midLat, midLng, leftBearing, halfExtra / 2);
  const via2 = offsetPoint(midLat, midLng, rightBearing, halfExtra / 2);

  const coords = [
    [startLatLng.lng, startLatLng.lat],
    [via1.lng, via1.lat],
    [endLatLng.lng, endLatLng.lat],
    [via2.lng, via2.lat],
    [startLatLng.lng, startLatLng.lat],
  ];

  await requestMultiPointRoute(coords);
}

async function requestMultiPointRoute(coords) {
  if (!ORS_API_KEY || ORS_API_KEY === "PASTE_YOUR_ORS_KEY_HERE") {
    alert("diet.js 상단 ORS_API_KEY 자리에 실제 ORS 키를 넣어야 합니다.");
    return;
  }

  const url =
    "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";

  const body = {
    coordinates: coords,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: ORS_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("ORS multi error", await res.text());
      alert("목표 거리 코스를 생성하는 중 오류가 발생했습니다.");
      return;
    }

    const data = await res.json();
    drawRouteFromGeoJSON(data);
  } catch (e) {
    console.error(e);
    alert("네트워크 오류로 목표 거리 코스를 생성하지 못했습니다.");
  }
}

function startGpsTracking() {
  if (!("geolocation" in navigator)) {
    setGpsStatus("이 브라우저는 위치 기능을 지원하지 않습니다.");
    return;
  }

  if (gpsWatchId !== null) {
    return;
  }

  gpsTrackCoords = [];
  gpsDistanceMeters = 0;
  updateGpsDistanceLabel();
  setGpsStatus("위치 수신 중...");

  gpsWatchId = navigator.geolocation.watchPosition(
    onGpsPosition,
    onGpsError,
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    }
  );
}

function onGpsPosition(pos) {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const point = [lat, lng];
  lastGpsPoint = point;

  setGpsStatus(`lat: ${lat.toFixed(5)}, lng: ${lng.toFixed(5)}`);

  if (gpsTrackCoords.length > 0) {
    const [prevLat, prevLng] = gpsTrackCoords[gpsTrackCoords.length - 1];
    const d = haversineDistance(prevLat, prevLng, lat, lng);
    gpsDistanceMeters += d;
    updateGpsDistanceLabel();
  }

  gpsTrackCoords.push(point);

  if (gpsTrackLayer) {
    map.removeLayer(gpsTrackLayer);
  }
  gpsTrackLayer = L.polyline(gpsTrackCoords, {
    color: "#22c55e",
    weight: 4,
  }).addTo(map);

  if (gpsTrackCoords.length === 1 && !startMarker) {
    setStartPoint(L.latLng(lat, lng));
    clickCount = 1;
  }
}

function onGpsError(err) {
  console.error(err);
  setGpsStatus("위치 오류: " + err.message);
}

window.addEventListener("DOMContentLoaded", initMap);
