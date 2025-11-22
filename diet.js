let map;
let kakaoPlaces;
let startCoord = null;
let endCoord = null;
let lastGps = null;

window.addEventListener("DOMContentLoaded", () => {
  initMap();
  initGps(); // 초기 한 번 위치 확인해서 텍스트 갱신
  kakao.maps.load(() => initKakaoAutocomplete());
  bindUI();
});

/* 지도 초기화 */
function initMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  map = L.map("map").setView([37.5665, 126.978], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);
}

/* GPS 초기화 - 현재 위치 한 번 가져와서 표시 */
function initGps() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, altitude } = pos.coords;
      lastGps = { lat: latitude, lng: longitude, alt: altitude };
      updateGpsDisplay(latitude, longitude, altitude);

      // 시작 시 출발지 없으면 현재 위치로 지도 세팅
      if (!startCoord && map) {
        map.setView([latitude, longitude], 15);
      }
    },
    () => {
      // 실패 시 굳이 알람은 안 띄움
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );
}

/* GPS 텍스트 박스 갱신 */
function updateGpsDisplay(lat, lng, alt) {
  const latEl = document.getElementById("gps-lat");
  const lngEl = document.getElementById("gps-lng");
  const altEl = document.getElementById("gps-alt");

  if (latEl) latEl.textContent = lat != null ? lat.toFixed(5) : "-";
  if (lngEl) lngEl.textContent = lng != null ? lng.toFixed(5) : "-";
  if (altEl) altEl.textContent =
    alt != null && !Number.isNaN(alt) ? `${alt.toFixed(1)} m` : "-";
}

/* 카카오 자동완성 초기화 */
function initKakaoAutocomplete() {
  kakaoPlaces = new kakao.maps.services.Places();

  setupAutocomplete("start-input", "start-suggestions", (coord) => {
    startCoord = coord;
    if (map) {
      map.setView([coord.lat, coord.lng], 16);
    }
  });

  setupAutocomplete("end-input", "end-suggestions", (coord) => {
    endCoord = coord;
    if (map) {
      map.setView([coord.lat, coord.lng], 16);
    }
  });
}

/* 자동완성 공통 로직 */
function setupAutocomplete(inputId, listId, onSelect) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list) return;

  let timer = null;

  input.addEventListener("input", () => {
    const keyword = input.value.trim();
    if (timer) clearTimeout(timer);

    if (!keyword) {
      list.innerHTML = "";
      list.style.display = "none";
      return;
    }

    timer = setTimeout(() => {
      kakaoPlaces.keywordSearch(keyword, (results, status) => {
        if (
          status !== kakao.maps.services.Status.OK ||
          !results.length
        ) {
          list.innerHTML = "";
          list.style.display = "none";
          return;
        }

        list.innerHTML = "";
        results.slice(0, 8).forEach((r) => {
          const li = document.createElement("li");
          li.className = "suggest-item";
          li.textContent =
            r.place_name +
            (r.road_address_name ? ` · ${r.road_address_name}` : "");

          li.addEventListener("click", () => {
            input.value = r.place_name;
            list.innerHTML = "";
            list.style.display = "none";

            const coord = { lat: Number(r.y), lng: Number(r.x) };
            onSelect(coord);
          });

          list.appendChild(li);
        });

        list.style.display = "block";
      });
    }, 220);
  });

  /* 입력창 바깥 클릭 시 자동완성 닫기 */
  document.addEventListener("click", (e) => {
    if (!list.contains(e.target) && e.target !== input) {
      list.style.display = "none";
    }
  });
}

/* UI 이벤트 바인딩 */
function bindUI() {
  const myLocationBtn = document.getElementById("btn-my-location");
  if (myLocationBtn) {
    myLocationBtn.addEventListener("click", handleMyLocationClick);
  }

  // 코스 생성 버튼은 나중에 로직 붙일 예정
  const generateBtn = document.getElementById("btn-generate");
  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      // TODO: 나중에 ORS 기반 코스 생성 로직 연결
      alert("코스 생성 로직은 나중에 붙일 예정입니다.");
    });
  }
}

/* 내 위치 버튼 클릭: 현재 GPS 기준으로 지도 이동(B 선택) */
function handleMyLocationClick() {
  if (!navigator.geolocation) {
    alert("이 브라우저에서는 위치 정보를 사용할 수 없습니다.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, altitude } = pos.coords;
      lastGps = { lat: latitude, lng: longitude, alt: altitude };
      updateGpsDisplay(latitude, longitude, altitude);

      if (map) {
        map.setView([latitude, longitude], 16);
      }
    },
    () => {
      // 실패 시 출발지 좌표라도 있으면 그쪽으로 이동
      if (startCoord && map) {
        map.setView([startCoord.lat, startCoord.lng], 16);
      } else if (map) {
        alert("현재 위치를 가져오지 못했습니다.");
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );
}
