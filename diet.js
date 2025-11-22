/* =====================================================
   전역 설정
===================================================== */
let map;
let kakaoPlaces;
let myLat = null;
let myLng = null;

// 반경 제한 5km
const RADIUS_LIMIT = 5000;

/* =====================================================
   지도 초기화
===================================================== */
function initMap() {
  map = L.map("map").setView([37.5665, 126.9780], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);
}

/* =====================================================
   GPS 초기화
===================================================== */
function initMyLocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      myLat = pos.coords.latitude;
      myLng = pos.coords.longitude;
    },
    (err) => {
      console.log("GPS 실패:", err);
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

/* =====================================================
   Kakao Places 초기화
===================================================== */
function initKakaoPlaces() {
  kakao.maps.load(() => {
    kakaoPlaces = new kakao.maps.services.Places();
  });
}

/* =====================================================
   Haversine 거리 계산
===================================================== */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* =====================================================
   랜드마크 우선 정렬
===================================================== */
function getMatchedLandmarks(keyword) {
  if (typeof LANDMARKS === "undefined") {
    console.error("LANDMARKS 없음: landmarks.js 확인 필요");
    return [];
  }

  const key = keyword.trim().toLowerCase();
  if (!key) return [];

  const hasLoc = myLat != null && myLng != null;

  const matched = LANDMARKS.filter((lm) => {
    const matchName = lm.name.toLowerCase().includes(key);
    const matchKeyword =
      Array.isArray(lm.keywords) &&
      lm.keywords.some((k) => k.toLowerCase().includes(key));

    return matchName || matchKeyword;
  })
    .map((lm) => {
      let dist = null;
      if (hasLoc) dist = haversine(myLat, myLng, lm.lat, lm.lng);
      return {
        place_name: lm.name,
        x: lm.lng,
        y: lm.lat,
        distance: dist,
        __isLandmark: true
      };
    })
    .filter((e) => {
      if (!hasLoc) return true;
      if (e.distance == null) return true;
      return e.distance <= RADIUS_LIMIT;
    });

  // 거리순 정렬
  matched.sort((a, b) => {
    if (a.distance == null && b.distance == null) return 0;
    if (a.distance == null) return 1;
    if (b.distance == null) return -1;
    return a.distance - b.distance;
  });

  return matched;
}

/* =====================================================
   카카오 검색 + 거리 필터 + 랜드마크 병합
===================================================== */
function searchPlace(keyword, callback) {
  if (!kakaoPlaces) {
    callback(getMatchedLandmarks(keyword));
    return;
  }

  const hasLoc = myLat != null && myLng != null;
  const options = hasLoc
    ? { location: new kakao.maps.LatLng(myLat, myLng) }
    : {};

  kakaoPlaces.keywordSearch(
    keyword,
    (result, status) => {
      let kakaoList = [];

      if (status === kakao.maps.services.Status.OK)
        kakaoList = result || [];

      // 거리 계산
      kakaoList.forEach((p) => {
        const lat = Number(p.y);
        const lng = Number(p.x);

        if (hasLoc && !p.distance) {
          p.distance = haversine(myLat, myLng, lat, lng);
        } else if (typeof p.distance === "string") {
          p.distance = Number(p.distance);
        }
      });

      // 반경 필터
      let filtered = kakaoList.filter((p) => {
        if (!hasLoc) return true;
        if (p.distance == null) return true;
        return p.distance <= RADIUS_LIMIT;
      });

      if (filtered.length === 0) filtered = kakaoList;

      // 거리순 정렬
      filtered.sort((a, b) => {
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });

      // 랜드마크 우선
      const landmarkList = getMatchedLandmarks(keyword);
      const used = new Set(landmarkList.map((e) => e.place_name));

      const merged = [
        ...landmarkList,
        ...filtered.filter((e) => !used.has(e.place_name))
      ];

      callback(merged);
    },
    options
  );
}

/* =====================================================
   자동완성 UI 출력
===================================================== */
function showSuggestions(wrapper, items, targetInput) {
  wrapper.innerHTML = "";
  wrapper.style.display = items.length ? "block" : "none";

  items.slice(0, 8).forEach((place) => {
    const li = document.createElement("li");
    li.className = "suggest-item";

    let dText = "";
    if (place.distance != null && !Number.isNaN(place.distance)) {
      const d = place.distance;
      dText = d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
    }

    li.textContent = dText
      ? `${place.place_name} · ${dText}`
      : place.place_name;

    li.onclick = () => {
      targetInput.value = place.place_name;
      wrapper.style.display = "none";
    };

    wrapper.appendChild(li);
  });
}

/* =====================================================
   입력창 자동완성 연결
===================================================== */
function setupAutocomplete() {
  const startInput = document.getElementById("start-input");
  const endInput = document.getElementById("end-input");
  const startSug = document.getElementById("start-suggestions");
  const endSug = document.getElementById("end-suggestions");

  // 출발지
  startInput.addEventListener("input", () => {
    const key = startInput.value.trim();
    if (!key) return (startSug.style.display = "none");

    searchPlace(key, (list) => {
      showSuggestions(startSug, list, startInput);
    });
  });

  // 도착지
  endInput.addEventListener("input", () => {
    const key = endInput.value.trim();
    if (!key) return (endSug.style.display = "none");

    searchPlace(key, (list) => {
      showSuggestions(endSug, list, endInput);
    });
  });

  // 외부 클릭 시 숨김
  document.addEventListener("click", (e) => {
    if (e.target !== startInput && !startSug.contains(e.target))
      startSug.style.display = "none";

    if (e.target !== endInput && !endSug.contains(e.target))
      endSug.style.display = "none";
  });
}

/* =====================================================
   내 위치 버튼
===================================================== */
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

        map.setView([myLat, myLng], 16);
        L.marker([myLat, myLng])
          .addTo(map)
          .bindPopup("현재 위치")
          .openPopup();
      },
      () => alert("현재 위치를 가져올 수 없습니다."),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

/* =====================================================
   초기 실행
===================================================== */
window.onload = () => {
  initMap();
  initMyLocation();
  initKakaoPlaces();
  setupAutocomplete();
  setupMyLocationBtn();
};
