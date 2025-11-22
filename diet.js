// ORS API 키 (실제 키로 교체)
const ORS_API_KEY = "YOUR_ORS_API_KEY";

let map;
let routeLayer;
let gpsPolyline;
let gpsAccuracyCircle;

let gpsPoints = [];
let gpsDistanceM = 0;
let gpsStartTime = null;

let kakaoPlaces = null;
let startCoord = null;
let endCoord = null;
let loopVariant = 0;
let isGeneratingRoute = false;

let currentRouteGeo = null;
let currentRouteMeta = null;

const STORAGE_KEY = "dietRunningRoutesV1";

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversine(a, b) {
  const R = 6371e3;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const v = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v));
  return R * c;
}

function formatKm(m) {
  return (m / 1000).toFixed(2);
}

function offsetKm(lat, lng, dyKm, dxKm) {
  const dLat = dyKm / 111;
  const dLng = dxKm / (111 * Math.cos(toRad(lat)) || 1e-6);
  return { lat: lat + dLat, lng: lng + dLng };
}

function formatTime(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (v) => (v < 10 ? "0" + v : String(v));
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

function formatPace(seconds, km) {
  if (!km || km <= 0 || !isFinite(seconds)) return "-";
  const paceSec = seconds / km;
  const m = Math.floor(paceSec / 60);
  const s = Math.round(paceSec % 60);
  const pad = (v) => (v < 10 ? "0" + v : String(v));
  return `${m}:${pad(s)} /km`;
}

function formatSpeed(meters, seconds) {
  if (!seconds || seconds <= 0 || !meters) return "-";
  const km = meters / 1000;
  const hours = seconds / 3600;
  if (hours <= 0) return "-";
  const spd = km / hours;
  return `${spd.toFixed(1)} km/h`;
}

function initMap() {
  map = L.map("map", { zoomControl: true }).setView(
    [37.5665, 126.978],
    14
  );

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);

  routeLayer = L.geoJSON(null, {
    style: { color: "#2563eb", weight: 5 }
  }).addTo(map);

  gpsPolyline = L.polyline([], {
    color: "#22c55e",
    weight: 4,
    opacity: 0.85
  }).addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 16);
        document.getElementById(
          "info-location"
        ).textContent = `lat ${latitude.toFixed(
          5
        )}, lng ${longitude.toFixed(5)}`;
        if (!startCoord) startCoord = { lat: latitude, lng: longitude };
      },
      () => {}
    );

    navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const now = Date.now();
        const p = { lat: latitude, lng: longitude, t: now };

        gpsPoints.push(p);
        gpsPolyline.addLatLng([p.lat, p.lng]);

        if (!gpsStartTime) {
          gpsStartTime = now;
        }

        if (gpsPoints.length > 1) {
          const prev = gpsPoints[gpsPoints.length - 2];
          const dist = haversine(prev, p);
          gpsDistanceM += dist;
        }

        const seconds =
          gpsStartTime != null ? (now - gpsStartTime) / 1000 : 0;

        document.getElementById("info-gps-km").textContent =
          `${formatKm(gpsDistanceM)} km`;
        document.getElementById("info-gps-time").textContent =
          formatTime(seconds);

        if (gpsDistanceM > 20) {
          document.getElementById("info-gps-pace").textContent =
            formatPace(seconds, gpsDistanceM / 1000);
          document.getElementById("info-gps-speed").textContent =
            formatSpeed(gpsDistanceM, seconds);
        } else {
          document.getElementById("info-gps-pace").textContent = "-";
          document.getElementById("info-gps-speed").textContent = "-";
        }

        document.getElementById(
          "info-location"
        ).textContent = `lat ${latitude.toFixed(
          5
        )}, lng ${longitude.toFixed(5)}`;

        if (!gpsAccuracyCircle) {
          gpsAccuracyCircle = L.circle([latitude, longitude], {
            radius: accuracy || 30,
            color: "#60a5fa",
            weight: 1,
            fillColor: "#bfdbfe",
            fillOpacity: 0.3
          }).addTo(map);
        } else {
          gpsAccuracyCircle.setLatLng([latitude, longitude]);
          gpsAccuracyCircle.setRadius(accuracy || 30);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }
}

function initKakaoAutocomplete() {
  kakaoPlaces = new kakao.maps.services.Places();
  setupAutocomplete("start-input", "start-suggestions", (coord) => {
    startCoord = coord;
    map.setView([coord.lat, coord.lng], 16);
  });
  setupAutocomplete("end-input", "end-suggestions", (coord) => {
    endCoord = coord;
    map.setView([coord.lat, coord.lng], 16);
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
        if (
          status !== kakao.maps.services.Status.OK ||
          !results.length
        ) {
          list.classList.remove("visible");
          list.innerHTML = "";
          return;
        }
        list.innerHTML = "";
        results.slice(0, 8).forEach((r) => {
          const li = document.createElement("li");
          li.className = "suggest-item";
          li.textContent =
            r.place_name +
            (r.road_address_name
              ? ` · ${r.road_address_name}`
              : "");
          li.addEventListener("click", () => {
            input.value = r.place_name;
            list.classList.remove("visible");
            list.innerHTML = "";
            onSelect({ lat: Number(r.y), lng: Number(r.x) });
          });
          list.appendChild(li);
        });
        list.classList.add("visible");
      });
    }, 220);
  });

  document.addEventListener("click", (e) => {
    if (!list.contains(e.target) && e.target !== input) {
      list.classList.remove("visible");
    }
  });
}

async function fetchORSRoute(points) {
  const coords = points.map((p) => [p.lng, p.lat]);
  const body = { coordinates: coords };
  const res = await fetch(
    "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: ORS_API_KEY
      },
      body: JSON.stringify(body)
    }
  );
  if (!res.ok) throw new Error("ORS 요청 실패");
  return res.json();
}

function randomFactor() {
  loopVariant += 1;
  const v = Math.abs(Math.sin(loopVariant * 12.345));
  return 0.8 + v * 0.4; // 0.8 ~ 1.2
}

function buildRectangleOneway(start, end, targetKm) {
  // path: 1 -> 3 -> 4 -> 2
  const d = end ? haversine(start, end) / 1000 : targetKm / 3;
  const factor = randomFactor();
  const diagKm = (targetKm / 2) * factor;

  if (!end) {
    // 출발지만 있을 때: 가상의 2를 동쪽에 생성
    const p2 = offsetKm(start.lat, start.lng, 0, d);
    const p3 = offsetKm(p2.lat, p2.lng, diagKm, diagKm);
    const p4 = offsetKm(start.lat, start.lng, diagKm, diagKm);
    return [start, p3, p4, p2];
  } else {
    // start=1, end=2 고정, 3·4는 수직 방향으로 생성
    const latA = start.lat;
    const lngA = start.lng;
    const latB = end.lat;
    const lngB = end.lng;
    const dLat = latB - latA;
    const dLng = lngB - lngA;
    const len = Math.sqrt(dLat * dLat + dLng * dLng) || 1e-6;
    const ux = -dLng / len;
    const uy = dLat / len;
    const offsetLenKm = diagKm;
    const offNorth = offsetLenKm * uy;
    const offEast = offsetLenKm * ux;

    const p3 = offsetKm(end.lat, end.lng, offNorth, offEast);
    const p4 = offsetKm(start.lat, start.lng, offNorth, offEast);
    return [start, p3, p4, end];
  }
}

function setLoading(loading) {
  const el = document.getElementById("route-loading");
  if (!el) return;
  if (loading) el.classList.add("visible");
  else el.classList.remove("visible");
}

function updateProgressBar(targetKm, routeKm) {
  const fill = document.getElementById("progress-fill");
  const label = document.getElementById("progress-label");
  if (!fill || !label || !targetKm || targetKm <= 0) {
    if (label) label.textContent = "0%";
    if (fill) fill.style.width = "0%";
    return;
  }

  const ratio = routeKm / targetKm;
  const percent = Math.max(0, Math.min(ratio * 100, 150));
  fill.style.width = `${percent}%`;
  label.textContent = `${Math.round(ratio * 100)}%`;
}

function updateDiffStyle(diffKm, targetKm) {
  const el = document.getElementById("info-diff");
  if (!el) return;
  el.classList.remove("diff-ok", "diff-positive", "diff-negative");
  const abs = Math.abs(diffKm);
  if (targetKm && abs / targetKm < 0.03) {
    el.classList.add("diff-ok");
  } else if (diffKm > 0) {
    el.classList.add("diff-positive"); // 길다
  } else if (diffKm < 0) {
    el.classList.add("diff-negative"); // 짧다
  }
}

async function generateRoute() {
  if (!startCoord) {
    alert("출발지를 먼저 지정해 주세요.");
    return;
  }

  const targetKm = Number(
    document.getElementById("target-km").value || "0"
  );
  if (!targetKm || targetKm <= 0) {
    alert("목표 거리를 1km 이상으로 입력해 주세요.");
    return;
  }

  if (isGeneratingRoute) {
    return;
  }
  isGeneratingRoute = true;
  setLoading(true);

  const mode = document.querySelector(".pill-active").dataset.type; // loop | oneway
  const hasEnd = !!endCoord;

  document.getElementById(
    "info-target-km"
  ).textContent = `${targetKm.toFixed(2)} km`;

  let bestGeo = null;
  let bestDiff = Infinity;

  try {
    for (let i = 0; i < 7; i++) {
      const ptsBase = buildRectangleOneway(
        startCoord,
        hasEnd ? endCoord : null,
        targetKm
      );
      const ptsPath =
        mode === "loop" ? [...ptsBase, startCoord] : ptsBase;

      try {
        const data = await fetchORSRoute(ptsPath);
        const feature = data.features[0];
        const distM = feature.properties.summary.distance;
        const km = distM / 1000;
        const diff = Math.abs(km - targetKm);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestGeo = data;
        }
        // 3% 이내면 바로 종료
        if (diff / targetKm < 0.03) break;
      } catch (err) {
        console.error(err);
      }
    }

    if (!bestGeo) {
      alert(
        "코스를 만들지 못했습니다. 거리를 조금 바꿔 다시 시도해 주세요."
      );
      return;
    }

    currentRouteGeo = bestGeo;
    currentRouteMeta = { targetKm, mode };

    routeLayer.clearLayers();
    routeLayer.addData(bestGeo);

    const feature = bestGeo.features[0];
    const coords = feature.geometry.coordinates;
    const latlngs = coords.map((c) => [c[1], c[0]]);
    map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });

    const distanceM = feature.properties.summary.distance;
    const km = distanceM / 1000;
    const diffKm = km - targetKm;

    document.getElementById(
      "info-route-km"
    ).textContent = `${formatKm(distanceM)} km`;
    document.getElementById(
      "info-diff"
    ).textContent = `${diffKm.toFixed(2)} km`;
    document.getElementById("info-points").textContent =
      coords.length.toString();
    document.getElementById("info-pattern").textContent =
      mode === "loop"
        ? "1 → 3 → 4 → 2 → 1 (왕복)"
        : "1 → 3 → 4 → 2 (직선)";

    updateProgressBar(targetKm, km);
    updateDiffStyle(diffKm, targetKm);
  } finally {
    isGeneratingRoute = false;
    setLoading(false);
  }
}

/* 로컬 스토리지 유틸 */

function loadSavedRoutesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

function saveRoutesToStorage(routes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
  } catch (e) {
    console.error(e);
  }
}

function renderSavedRoutes() {
  const listEl = document.getElementById("saved-routes-list");
  if (!listEl) return;

  const routes = loadSavedRoutesFromStorage();
  listEl.innerHTML = "";

  if (!routes.length) {
    const li = document.createElement("li");
    li.className = "saved-empty";
    li.textContent = "저장된 코스가 없습니다.";
    listEl.appendChild(li);
    return;
  }

  // 최근 저장된 것부터
  routes
    .slice()
    .reverse()
    .forEach((r) => {
      const li = document.createElement("li");
      li.className = "saved-item";
      li.dataset.id = r.id;

      const title = document.createElement("div");
      title.className = "saved-title";
      title.textContent = r.name;

      const meta = document.createElement("div");
      meta.className = "saved-meta";
      const dateStr = new Date(r.createdAt).toLocaleString();
      meta.textContent = `${r.distanceKm.toFixed(
        2
      )} km · ${r.pattern || "-"} · ${dateStr}`;

      li.appendChild(title);
      li.appendChild(meta);
      listEl.appendChild(li);
    });
}

function saveCurrentRoute() {
  if (!currentRouteGeo) {
    alert("먼저 코스를 생성해 주세요.");
    return;
  }

  const feature = currentRouteGeo.features[0];
  const distanceM = feature.properties.summary.distance;
  const distanceKm = distanceM / 1000;
  const pattern =
    document.getElementById("info-pattern").textContent || "-";
  const targetKm =
    currentRouteMeta?.targetKm || distanceKm || distanceKm;

  const defaultName = `코스 ${distanceKm.toFixed(1)}km`;
  const name = window.prompt("코스 이름을 입력하세요.", defaultName);
  if (name === null) return;

  const routes = loadSavedRoutesFromStorage();
  const route = {
    id: Date.now().toString(),
    name: name.trim() || defaultName,
    distanceKm,
    targetKm,
    pattern,
    createdAt: Date.now(),
    geo: currentRouteGeo
  };
  routes.push(route);
  saveRoutesToStorage(routes);
  renderSavedRoutes();
}

function loadRouteById(id) {
  const routes = loadSavedRoutesFromStorage();
  const route = routes.find((r) => r.id === id);
  if (!route) return;

  currentRouteGeo = route.geo;
  currentRouteMeta = { targetKm: route.targetKm, mode: null };

  routeLayer.clearLayers();
  routeLayer.addData(route.geo);

  const feature = route.geo.features[0];
  const coords = feature.geometry.coordinates;
  const latlngs = coords.map((c) => [c[1], c[0]]);
  map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });

  const distanceM = feature.properties.summary.distance;
  const km = distanceM / 1000;
  const diffKm = km - route.targetKm;

  document.getElementById(
    "info-route-km"
  ).textContent = `${formatKm(distanceM)} km`;
  document.getElementById(
    "info-target-km"
  ).textContent = `${route.targetKm.toFixed(2)} km`;
  document.getElementById(
    "info-diff"
  ).textContent = `${diffKm.toFixed(2)} km`;
  document.getElementById("info-points").textContent =
    coords.length.toString();
  document.getElementById("info-pattern").textContent =
    route.pattern || "-";

  updateProgressBar(route.targetKm, km);
  updateDiffStyle(diffKm, route.targetKm);
}

/* UI 바인딩 */

function bindUI() {
  document.getElementById("btn-generate").addEventListener("click", () => {
    loopVariant = 0;
    generateRoute();
  });

  document.getElementById("btn-regenerate").addEventListener("click", () => {
    loopVariant++;
    generateRoute();
  });

  document.querySelectorAll(".pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".pill")
        .forEach((b) => b.classList.remove("pill-active"));
      btn.classList.add("pill-active");
    });
  });

  document
    .getElementById("btn-my-location")
    .addEventListener("click", () => {
      if (gpsPoints.length) {
        const last = gpsPoints[gpsPoints.length - 1];
        map.setView([last.lat, last.lng], 16);
      } else if (startCoord) {
        map.setView([startCoord.lat, startCoord.lng], 16);
      }
    });

  document
    .getElementById("btn-save-route")
    .addEventListener("click", saveCurrentRoute);

  const savedList = document.getElementById("saved-routes-list");
  savedList.addEventListener("click", (e) => {
    const item = e.target.closest(".saved-item");
    if (!item) return;
    const id = item.dataset.id;
    if (id) loadRouteById(id);
  });

  const panelToggle = document.getElementById("panel-toggle");
  const sidePanel = document.querySelector(".side-panel");
  if (panelToggle && sidePanel) {
    panelToggle.addEventListener("click", () => {
      sidePanel.classList.toggle("is-open");
    });
  }
}

/* 초기화 */

window.addEventListener("DOMContentLoaded", () => {
  initMap();
  bindUI();
  renderSavedRoutes();
  kakao.maps.load(initKakaoAutocomplete);
});
