// js/map.js
(() => {
  const VWORLD_KEY = "0E603DDF-E18F-371F-96E8-ECD87D4CA088";

  let map = null;
  let baseLayer = null;

  // 공통 지도 생성
  function createGlobalMap() {
    const container = document.getElementById("globalMap");
    if (!container) {
      console.warn("globalMap 컨테이너를 찾을 수 없습니다.");
      return;
    }
    if (map) return; // 이미 생성됨

    // 기본 위치: 서울 시청
    map = L.map(container, {
      zoomControl: false,
    }).setView([37.5665, 126.9780], 15);

    // VWorld 타일 (배경)
    baseLayer = L.tileLayer(
      `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png`,
      {
        attribution: "VWorld",
        maxZoom: 19,
      }
    ).addTo(map);

    // 한 번 위치 시도 (실제 GPS 버전)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 17);
        },
        (err) => {
          console.warn("GPS ERROR:", err);
          // 실패해도 앱은 계속 동작해야 하니까 여기서 끝.
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }

    // 전역 참조 (기존 run.js 호환용)
    window.globalMap = map;
    window.runningMap = map;
    window.courseMap = map;
    window.historyDetailMap = map;
  }

  // 지도 DOM 위치 옮기기
  function moveMapTo(slotName) {
    if (!map) return;
    const placeholder = document.querySelector(
      `.map-placeholder[data-map-slot="${slotName}"]`
    );
    const container = document.getElementById("globalMap");
    if (!placeholder || !container) return;

    // placeholder 안으로 지도 div 옮기기
    if (container.parentElement !== placeholder) {
      placeholder.appendChild(container);
    }

    // 레이아웃 변경 후 Leaflet 리사이즈
    setTimeout(() => {
      map.invalidateSize();
    }, 30);
  }

  document.addEventListener("DOMContentLoaded", () => {
    createGlobalMap();
    moveMapTo("running"); // 처음엔 러닝 탭 위치
  });

  // 다른 파일에서 쓸 수 있게 공개
  window.mapManager = {
    getMap: () => map,
    moveTo: moveMapTo,
  };
})();
