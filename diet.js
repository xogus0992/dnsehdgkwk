// diet.js - ORS Advanced Algorithm Version

// 🔥 1. API 키 설정
const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk3NTU2OTk1ODQ1NjQ0YWE5NzA3ZTM1OWExMGE3NTU4IiwiaCI6Im11cm11cjY0In0="; 
const ORS_ENDPOINT = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";

// 🔥 2. 글로벌 설정 및 상태
const DEFAULT_SEARCH_RADIUS = 5000; // 5km
let loopVariant = 0; // 코스 변형 시드 (누를 때마다 증가)

let map;
let kakaoPlaces = null;

let myLat = null;
let myLng = null;

let startPoint = null; // {lat,lng,name}
let endPoint = null;

let startMarker = null;
let endMarker = null;
let routeLayer = null;

let STATIONS_DATA = []; // 필요 시 사용
let CAMPUSES_DATA = []; // 필요 시 사용

export function initApp({ STATIONS = [], CAMPUSES = [] } = {}) {
  STATIONS_DATA = STATIONS;
  CAMPUSES_DATA = CAMPUSES;

  initMap();
  initKakaoPlaces();
  initGeolocation();
  setupAutocomplete();
  setupMyLocationButton();
  setupCourseButton();
}

// ---------------------------------------------------------
// 초기화 함수들
// ---------------------------------------------------------
function initMap() {
  map = L.map("map").setView([37.5665, 126.978], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);
}

function initKakaoPlaces() {
  if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
    kakaoPlaces = new kakao.maps.services.Places();
  } else {
    console.warn("Kakao Maps SDK Not Found");
  }
}

function initGeolocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      myLat = pos.coords.latitude;
      myLng = pos.coords.longitude;
      const btn = document.getElementById("btn-my-location");
      if (btn) btn.innerText = "내 위치 확보됨";
      
      // 앱 시작 시, 출발지가 없으면 내 위치를 자동으로 출발지로 설정 (UX 개선)
      if (!startPoint) {
        setStartPoint({ lat: myLat, lng: myLng, name: "내 위치" });
        map.setView([myLat, myLng], 14);
      }
    },
    (err) => {
      console.error(err);
    },
    { enableHighAccuracy: true }
  );
}

// ---------------------------------------------------------
// 🔥 핵심: ORS API 통신 (옵션 강화)
// ---------------------------------------------------------
async function requestOrsRoute(points) {
  if (!points || points.length < 2) return null;
  if (!ORS_API_KEY || ORS_API_KEY.includes("여기에")) {
    alert("API 키를 설정해주세요.");
    throw new Error("API Key Missing");
  }

  // Leaflet(lat,lng) -> GeoJSON(lng,lat)
  const coordinates = points.map(p => [p.lng, p.lat]);

  const body = {
    coordinates: coordinates,
    instructions: false,
    elevation: false,
    // 🔥 도보 최적화 옵션 추가
    preference: "recommended", // shortest, recommended
    options: {
      avoid_features: ["steps"] // 계단 피하기 (러닝에 유리)
    }
  };

  try {
    const res = await fetch(ORS_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) return null; // 실패 시 조용히 null 반환 (후보군 탈락 처리용)

    const json = await res.json();
    if (!json.features || json.features.length === 0) return null;

    const feature = json.features[0];
    const geometry = feature.geometry;
    const props = feature.properties;

    // 결과 파싱
    const routeCoords = geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const distanceMeters = props.summary.distance;

    return { coords: routeCoords, distance: distanceMeters };

  } catch (err) {
    console.error("ORS Fetch Error:", err);
    return null;
  }
}


// ---------------------------------------------------------
// 🧠 알고리즘 1: 스마트 루프 (오차 최소화 & 모양 변형)
// ---------------------------------------------------------
async function buildSmartLoopRoute(targetKm) {
  if (!startPoint) {
    // 출발지 없으면 내 위치 강제 사용
    if (myLat && myLng) {
      setStartPoint({ lat: myLat, lng: myLng, name: "내 위치" });
    } else {
      alert("출발지를 설정하거나 GPS를 켜주세요.");
      return null;
    }
  }

  updateStatus("최적의 코스를 계산 중입니다... (3개 후보 분석)");

  // 변형 인자: 버튼 누를 때마다 모양/각도가 달라짐
  const baseAngle = (loopVariant * 45) % 360; 
  
  // 후보군 생성 (Candidates)
  // 목표 거리 맞추기 위해 3가지 스케일/모양을 시도
  const candidatesParams = [
    { type: 'square', scale: 1.0, angle: baseAngle },       // 기본
    { type: 'diamond', scale: 0.9, angle: baseAngle + 15 }, // 조금 작게, 회전
    { type: 'triangle', scale: 1.1, angle: baseAngle - 15 } // 조금 크게, 삼각형
  ];

  const promises = candidatesParams.map(param => {
    // 1. 도형 좌표 계산
    const waypoints = createPolygonWaypoints(startPoint, targetKm, param.type, param.scale, param.angle);
    // 2. ORS 경로 요청 (병렬)
    return requestOrsRoute(waypoints).then(result => ({ ...result, param })); 
  });

  // 모든 후보 경로를 받아옴
  const results = await Promise.all(promises);
  
  // 유효한 결과만 필터링
  const validResults = results.filter(r => r && r.coords);

  if (validResults.length === 0) {
    throw new Error("경로 생성에 실패했습니다. (도로가 없는 지역일 수 있습니다)");
  }

  // 🔥 오차(Error)가 가장 적은 코스 선택
  const targetMeters = targetKm * 1000;
  validResults.sort((a, b) => {
    const diffA = Math.abs(a.distance - targetMeters);
    const diffB = Math.abs(b.distance - targetMeters);
    return diffA - diffB;
  });

  const bestRoute = validResults[0]; // 1등 선택
  
  console.log(`선택된 코스: ${bestRoute.param.type}, 오차: ${Math.abs(bestRoute.distance - targetMeters).toFixed(0)}m`);
  
  return bestRoute;
}

// 다각형 웨이포인트 계산 엔진 (Math)
function createPolygonWaypoints(center, targetKm, type, scale, rotationDeg) {
  // 러프하게 계산: 한 변의 길이 ≈ 전체거리 / 변의 개수
  // 위도 1도 ≈ 111km
  
  let sides = 4;
  if (type === 'triangle') sides = 3;
  
  // 반지름(km) 추정: 둘레 공식 역산 (보정계수 포함)
  // 대략적으로 r = (km / sides) / 1.5 정도가 적당 (직선거리 < 실제도로거리)
  const radiusKm = (targetKm / sides) / 1.4 * scale; 
  const radiusDeg = radiusKm / 111; 

  const points = [];
  
  // 시작점 추가
  points.push({ lat: center.lat, lng: center.lng });

  const angleStep = 360 / sides;
  const startAngle = rotationDeg; // 회전 적용

  for (let i = 1; i < sides; i++) { // 마지막 점은 다시 시작점으로 돌아오므로 i=1부터
    const deg = startAngle + (angleStep * i);
    const rad = deg * (Math.PI / 180);
    
    // 단순 원형 좌표계 사용 (작은 반경에서는 오차 무시 가능)
    const lat = center.lat + (radiusDeg * Math.cos(rad));
    
    // 경도는 위도에 따라 거리 비율이 다름 (cos(lat) 보정)
    const lng = center.lng + (radiusDeg * Math.sin(rad) / Math.cos(center.lat * (Math.PI/180)));
    
    points.push({ lat, lng });
  }

  // 다시 시작점으로 닫기
  points.push({ lat: center.lat, lng: center.lng });

  return points;
}


// ---------------------------------------------------------
// 🧠 알고리즘 2: 추천 코스 (거리 기반 최적 목적지 선정)
// ---------------------------------------------------------
async function buildRecommendRoute(targetKm) {
  if (!myLat || !myLng) {
    alert("위치 정보를 가져와야 합니다.");
    return null;
  }
  
  // 내 위치를 출발지로 강제
  setStartPoint({ lat: myLat, lng: myLng, name: "현재 위치" });

  if (!kakaoPlaces) return null;

  updateStatus("거리(@ " + targetKm + "km)에 맞는 랜드마크 검색 중...");

  // 검색 카테고리: 지하철(SW8), 학교(SC4), 관광명소(AT4), 공원(keyword)
  const categories = ["SW8", "SC4", "AT4"]; 
  const keyword = "공원";

  // 후보지 수집
  let candidates = [];

  // 1. 카테고리 검색 (병렬 처리)
  const searchPromises = categories.map(code => 
    new Promise(resolve => {
      kakaoPlaces.categorySearch(code, (data, status) => {
        if (status === kakao.maps.services.Status.OK) resolve(data);
        else resolve([]);
      }, { location: new kakao.maps.LatLng(myLat, myLng), radius: DEFAULT_SEARCH_RADIUS });
    })
  );
  
  // 2. 키워드 검색 (공원)
  searchPromises.push(new Promise(resolve => {
    kakaoPlaces.keywordSearch(keyword, (data, status) => {
        if (status === kakao.maps.services.Status.OK) resolve(data);
        else resolve([]);
    }, { location: new kakao.maps.LatLng(myLat, myLng), radius: DEFAULT_SEARCH_RADIUS });
  }));

  const results = await Promise.all(searchPromises);
  results.forEach(list => candidates.push(...list));

  // 중복 제거 (ID 기준)
  const uniqueCandidates = Array.from(new Map(candidates.map(item => [item.id, item])).values());

  if (uniqueCandidates.length === 0) {
    alert("근처(5km)에 적절한 목적지가 없습니다.");
    return null;
  }

  // 🔥 거리 점수 매기기 (Scoring)
  // 목표: 왕복 거리(직선거리 * 2.5)가 targetKm와 비슷한 곳 찾기
  let bestPlace = null;
  let minDiff = Infinity;

  // 직선거리 계산 계수 (Road Factor): 직선거리 대비 실제 거리는 약 1.3~1.5배
  // 왕복이므로: 직선거리 * 2 * 1.3 ≈ 직선거리 * 2.6
  const ROUND_TRIP_FACTOR = 2.6; 

  uniqueCandidates.forEach(p => {
    const distStraightKm = haversine(myLat, myLng, parseFloat(p.y), parseFloat(p.x)) / 1000;
    const estimatedRoundKm = distStraightKm * ROUND_TRIP_FACTOR;
    
    // 너무 짧은 거리(500m 미만) 제외
    if (distStraightKm < 0.5) return;

    const diff = Math.abs(estimatedRoundKm - targetKm);

    if (diff < minDiff) {
      minDiff = diff;
      bestPlace = p;
    }
  });

  if (!bestPlace) {
    // 적절한 곳이 없으면 그냥 가장 먼 곳 추천
    bestPlace = uniqueCandidates[0]; 
  }

  // 목적지 설정
  setEndPoint({ 
    lat: parseFloat(bestPlace.y), 
    lng: parseFloat(bestPlace.x), 
    name: bestPlace.place_name 
  });

  updateStatus(`추천 목적지: ${bestPlace.place_name} (왕복 예상)`);

  // 왕복 경로 요청 (Start -> End -> Start)
  return await requestOrsRoute([startPoint, endPoint, startPoint]);
}

// ---------------------------------------------------------
// UI 및 이벤트 핸들러
// ---------------------------------------------------------
function setupCourseButton() {
  const btn = document.getElementById("btn-generate-course");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    // 1. 모드 확인
    const modeEls = document.getElementsByName("course-mode");
    let mode = "loop";
    for (const el of modeEls) { if (el.checked) mode = el.value; }

    // 2. 거리 확인
    const distInput = document.getElementById("distance-input");
    const targetKm = parseFloat(distInput.value) || 3;

    // 3. 변형 시드 증가 (누를 때마다 다른 모양 나오도록)
    loopVariant++; 

    // 4. 기존 경로 삭제
    if (routeLayer) {
      map.removeLayer(routeLayer);
      routeLayer = null;
    }

    try {
      let result = null;

      if (mode === "one-way") {
        if (!startPoint || !endPoint) {
            alert("편도 모드는 출발지와 도착지가 필요합니다.");
            return;
        }
        updateStatus("편도 경로 최적화 중...");
        result = await requestOrsRoute([startPoint, endPoint]);

      } else if (mode === "loop") {
        // 스마트 루프 실행
        result = await buildSmartLoopRoute(targetKm);

      } else if (mode === "recommend") {
        // 추천 코스 실행
        result = await buildRecommendRoute(targetKm);
      }

      // 결과 그리기
      if (result) {
        drawRoute(result.coords);
        const km = (result.distance / 1000).toFixed(2);
        updateStatus(`생성 완료! 총 거리: ${km}km (오차보정됨)`);
      } else {
        updateStatus("경로를 생성하지 못했습니다.");
      }

    } catch (e) {
      console.error(e);
      updateStatus("오류: " + e.message);
    }
  });
}

// 지도 및 마커 유틸
function setStartPoint(p) {
  startPoint = p;
  const input = document.getElementById("start-input");
  if (input) input.value = p.name;
  updateMarkersOnly();
}

function setEndPoint(p) {
  endPoint = p;
  const input = document.getElementById("end-input");
  if (input) input.value = p.name;
  updateMarkersOnly();
}

function updateMarkersOnly() {
  if (!map) return;
  if (startMarker) map.removeLayer(startMarker);
  if (endMarker) map.removeLayer(endMarker);

  if (startPoint) {
    startMarker = L.marker([startPoint.lat, startPoint.lng])
      .addTo(map).bindPopup("출발").openPopup();
  }
  if (endPoint) {
    endMarker = L.marker([endPoint.lat, endPoint.lng], {
        icon: L.icon({ // 도착지는 빨간색 느낌 (기본 아이콘 필터 등 활용 가능하나 여기선 기본)
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(map).bindPopup("도착");
  }
}

function drawRoute(coords) {
  if (!map) return;
  routeLayer = L.polyline(coords, {
    color: "#2563eb", weight: 6, opacity: 0.8, lineJoin: 'round'
  }).addTo(map);
  map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
}

function updateStatus(msg) {
  const el = document.getElementById("status-summary");
  if (el) el.innerText = msg;
}

// ---------------------------------------------------------
// 기타 유틸 (자동완성, 내위치 버튼, 거리계산)
// ---------------------------------------------------------
function setupMyLocationButton() {
  const btn = document.getElementById("btn-my-location");
  if(!btn) return;
  btn.addEventListener("click", () => {
    if(myLat) {
      setStartPoint({ lat: myLat, lng: myLng, name: "내 위치" });
      map.setView([myLat, myLng], 15);
    } else {
      alert("GPS 신호를 기다리는 중입니다.");
    }
  });
}

function setupAutocomplete() {
  setupInput("start-input", "start-suggestions", (p) => {
    setStartPoint({ lat: parseFloat(p.y), lng: parseFloat(p.x), name: p.place_name });
    map.setView([p.y, p.x], 15);
  });
  setupInput("end-input", "end-suggestions", (p) => {
    setEndPoint({ lat: parseFloat(p.y), lng: parseFloat(p.x), name: p.place_name });
    map.fitBounds(L.latLngBounds([startPoint, endPoint]), { padding: [50,50] });
  });
}

function setupInput(inputId, listId, onSelect) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list) return;
  let timer;
  input.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    if (val.length < 2) { list.style.display = "none"; return; }
    clearTimeout(timer);
    timer = setTimeout(() => {
      if(!kakaoPlaces) return;
      kakaoPlaces.keywordSearch(val, (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
          list.innerHTML = "";
          data.forEach(p => {
            const li = document.createElement("li");
            li.className = "suggest-item";
            li.innerText = p.place_name;
            li.onclick = () => {
                input.value = p.place_name;
                list.style.display = "none";
                onSelect(p);
            };
            list.appendChild(li);
          });
          list.style.display = "block";
        }
      });
    }, 300);
  });
  document.addEventListener("click", e => {
    if(e.target !== input && e.target !== list) list.style.display = "none";
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3; 
  const q1 = lat1 * Math.PI/180;
  const q2 = lat2 * Math.PI/180;
  const dq = (lat2-lat1)*Math.PI/180;
  const dl = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dq/2)*Math.sin(dq/2) + Math.cos(q1)*Math.cos(q2)*Math.sin(dl/2)*Math.sin(dl/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}