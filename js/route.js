/* ============================================================
   PokéRun PRO - route.js
   코스 생성 탭 엔진
   - 목표거리 조절
   - 출발지/도착지 검색 준비
   - polyline 표시
   - 실제 거리 계산
   - 코스 저장 / 불러오기 팝업
============================================================ */

const RouteManager = {
    goalDistance: 5.0, // 기본 5km
    mode: "oneway",    // 편도/왕복/추천
    startPoint: null,
    endPoint: null,
    searchDistance: 0,
    realDistance: 0,
    routeCoords: [],

    savedRoutes: [] // localStorage 기반 저장 목록
};

/* ------------------------------------------------------------
   UI 업데이트
------------------------------------------------------------ */
function updateRouteUI() {
    const goalDom = document.querySelector("#goalDistanceInput");
    const searchDistDom = document.querySelector("#searchDistance");
    const realDistDom = document.querySelector("#realDistance");

    if (goalDom) goalDom.value = RouteManager.goalDistance.toFixed(2);
    if (searchDistDom) searchDistDom.textContent = RouteManager.searchDistance.toFixed(2);
    if (realDistDom) realDistDom.textContent = RouteManager.realDistance.toFixed(2);
}

/* ------------------------------------------------------------
   목표 거리 ± 버튼
------------------------------------------------------------ */
function increaseGoal() {
    RouteManager.goalDistance += 1;
    updateRouteUI();
}

function decreaseGoal() {
    if (RouteManager.goalDistance > 1) {
        RouteManager.goalDistance -= 1;
        updateRouteUI();
    }
}

/* ------------------------------------------------------------
   출발/도착지 검색 (카카오 준비만, 로직은 추후 구현)
------------------------------------------------------------ */
function searchStartPoint(keyword) {
    if (!window.KakaoService.geocoder) return;

    window.KakaoService.geocoder.addressSearch(keyword, function (result, status) {
        if (status === kakao.maps.services.Status.OK) {
            const lat = Number(result[0].y);
            const lng = Number(result[0].x);

            RouteManager.startPoint = [lat, lng];
            MapManager.map.setView([lat, lng], 15);
        }
    });
}

function searchEndPoint(keyword) {
    if (!window.KakaoService.geocoder) return;

    window.KakaoService.geocoder.addressSearch(keyword, function (result, status) {
        if (status === kakao.maps.services.Status.OK) {
            const lat = Number(result[0].y);
            const lng = Number(result[0].x);

            RouteManager.endPoint = [lat, lng];
            MapManager.map.setView([lat, lng], 15);

            // 검색 거리 계산
            if (RouteManager.startPoint) {
                RouteManager.searchDistance =
                    calcDistance(
                        RouteManager.startPoint[0],
                        RouteManager.startPoint[1],
                        lat,
                        lng
                    ) / 1000;
            }

            updateRouteUI();
        }
    });
}

/* ------------------------------------------------------------
   거리 계산(Haversine) — run.js와 동일
------------------------------------------------------------ */
function calcDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const toRad = (v) => (v * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lng2 - lng1);

    const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/* ------------------------------------------------------------
   코스 생성하기(Polyline 표시)
   실제 길찾기 로직은 추후 ORS API로 대체
------------------------------------------------------------ */
function generateCourse() {
    if (!RouteManager.startPoint || !RouteManager.endPoint) return;

    // 현재는 단순히 두 점을 직선으로 연결
    RouteManager.routeCoords = [
        RouteManager.startPoint,
        RouteManager.endPoint
    ];

    MapAPI.setRoutePolyline(RouteManager.routeCoords);

    // 실제 거리 계산
    RouteManager.realDistance =
        calcDistance(
            RouteManager.startPoint[0],
            RouteManager.startPoint[1],
            RouteManager.endPoint[0],
            RouteManager.endPoint[1]
        ) / 1000;

    updateRouteUI();
}

/* ------------------------------------------------------------
   플로팅 버튼 START → 러닝 탭으로 코스 넘겨서 시작
------------------------------------------------------------ */
function sendCourseToRunning() {
    if (!RouteManager.routeCoords.length) return;

    // 러닝 탭 시작 시 polyline을 그대로 넣기 위해 저장
    window.SelectedCourse = [...RouteManager.routeCoords];

    App.goToTab(0); // 러닝 탭으로 이동
}

/* ------------------------------------------------------------
   코스 저장 / 불러오기
------------------------------------------------------------ */
function saveCourse(name) {
    if (!RouteManager.routeCoords.length) return;

    const data = {
        name,
        distance: RouteManager.realDistance,
        coords: [...RouteManager.routeCoords]
    };

    RouteManager.savedRoutes.push(data);
    localStorage.setItem("savedRoutes", JSON.stringify(RouteManager.savedRoutes));
}

function loadSavedRoutes() {
    const saved = localStorage.getItem("savedRoutes");
    if (saved) RouteManager.savedRoutes = JSON.parse(saved);
}

function loadCourse(index) {
    const course = RouteManager.savedRoutes[index];
    if (!course) return;

    RouteManager.routeCoords = [...course.coords];
    MapAPI.setRoutePolyline(course.coords);
    RouteManager.realDistance = course.distance;

    updateRouteUI();
}

/* ------------------------------------------------------------
   이벤트 연결
------------------------------------------------------------ */
window.addEventListener("load", () => {
    // 로컬 저장 코스 불러오기
    loadSavedRoutes();

    const plusBtn = document.querySelector("#goalPlusBtn");
    const minusBtn = document.querySelector("#goalMinusBtn");
    const startInput = document.querySelector("#startInput");
    const endInput = document.querySelector("#endInput");
    const generateBtn = document.querySelector("#generateBtn");
    const moveBtn = document.querySelector("#routeToRunBtn");
    const downloadBtn = document.querySelector("#routeDownloadBtn");
    const uploadBtn = document.querySelector("#routeUploadBtn");

    if (plusBtn) plusBtn.addEventListener("click", increaseGoal);
    if (minusBtn) minusBtn.addEventListener("click", decreaseGoal);

    if (startInput)
        startInput.addEventListener("change", (e) => {
            searchStartPoint(e.target.value);
        });

    if (endInput)
        endInput.addEventListener("change", (e) => {
            searchEndPoint(e.target.value);
        });

    if (generateBtn) generateBtn.addEventListener("click", generateCourse);
    if (moveBtn) moveBtn.addEventListener("click", sendCourseToRunning);

    // 다운로드 → 입력 팝업에서 저장
    if (downloadBtn)
        downloadBtn.addEventListener("click", () => {
            const name = prompt("코스 이름을 입력하세요");
            if (name) saveCourse(name);
        });

    // 업로드 → 리스트 선택
    if (uploadBtn)
        uploadBtn.addEventListener("click", () => {
            if (!RouteManager.savedRoutes.length) {
                alert("저장된 코스가 없습니다.");
                return;
            }

            let list = "불러올 코스를 선택하세요:\n";
            RouteManager.savedRoutes.forEach((c, i) => {
                list += `${i + 1}. ${c.name} (${c.distance.toFixed(2)}km)\n`;
            });

            const pick = Number(prompt(list)) - 1;
            if (pick >= 0) loadCourse(pick);
        });

    updateRouteUI();
});
