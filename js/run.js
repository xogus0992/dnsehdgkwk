/* ============================================================
   PokéRun PRO - run.js
   러닝(GPS) 기록 전용 엔진
   - START / PAUSE / RESUME / STOP
   - 거리 계산
   - 페이스/속도 계산
   - 칼로리 계산
   - polyline 기록(MapAPI와 연동)
============================================================ */

const RunManager = {
    isRunning: false,
    isPaused: false,

    timer: null,
    elapsedSeconds: 0,

    totalDistance: 0,
    lastPoint: null,

    pace: "0'00",
    avgSpeed: 0,
    curSpeed: 0,
    cadence: 0,       // 추후 센서 연동
    calories: 0,

    routePoints: [],

    watchId: null
};

/* ------------------------------------------------------------
   거리 계산 (Haversine)
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

    return R * c; // meters
}

/* ------------------------------------------------------------
   타이머 시작
------------------------------------------------------------ */
function startTimer() {
    RunManager.timer = setInterval(() => {
        RunManager.elapsedSeconds++;

        // 평균 속도 (km/h)
        RunManager.avgSpeed =
            RunManager.totalDistance > 0
                ? (RunManager.totalDistance / 1000) /
                  (RunManager.elapsedSeconds / 3600)
                : 0;

        // 페이스 (분/초)
        if (RunManager.avgSpeed > 0) {
            const paceSec = 3600 / RunManager.avgSpeed;
            const m = Math.floor(paceSec / 60);
            const s = Math.floor(paceSec % 60);
            RunManager.pace = `${m}'${s.toString().padStart(2, "0")}"`;
        }

        // 칼로리 (단순 계산식: MET 9.8 기준)
        RunManager.calories = Math.floor(RunManager.elapsedSeconds * 0.13);

        updateUI();
    }, 1000);
}

function stopTimer() {
    clearInterval(RunManager.timer);
    RunManager.timer = null;
}

/* ------------------------------------------------------------
   GPS 수신
------------------------------------------------------------ */
function startGPSRunning() {
    if (!navigator.geolocation) return;

    RunManager.watchId = navigator.geolocation.watchPosition(
        (pos) => {
            if (!RunManager.isRunning || RunManager.isPaused) return;

            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            // 현재 속도 (m/s → km/h 변환)
            if (RunManager.lastPoint) {
                const d = calcDistance(
                    RunManager.lastPoint[0],
                    RunManager.lastPoint[1],
                    lat,
                    lng
                );
                RunManager.totalDistance += d;

                RunManager.curSpeed = (d / 1) * 3.6; // 약 1초 단위

                MapAPI.addRunningPoint(lat, lng);
            } else {
                // 첫 포인트
                MapAPI.resetRunningPolyline();
            }

            RunManager.lastPoint = [lat, lng];
            RunManager.routePoints.push([lat, lng]);

            updateUI();
        },
        (err) => console.warn("GPS ERROR:", err),
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );
}

function stopGPSRunning() {
    if (RunManager.watchId !== null) {
        navigator.geolocation.clearWatch(RunManager.watchId);
        RunManager.watchId = null;
    }
}

/* ------------------------------------------------------------
   START / PAUSE / RESUME / STOP
------------------------------------------------------------ */
function startRun() {
    if (RunManager.isRunning && !RunManager.isPaused) return;

    RunManager.isRunning = true;
    RunManager.isPaused = false;

    RunManager.elapsedSeconds = 0;
    RunManager.totalDistance = 0;
    RunManager.lastPoint = null;
    RunManager.routePoints = [];

    MapAPI.resetRunningPolyline();
    startTimer();
    startGPSRunning();

    showPauseStopUI();
}

function pauseRun() {
    if (!RunManager.isRunning || RunManager.isPaused) return;

    RunManager.isPaused = true;
    stopTimer();
}

function resumeRun() {
    if (!RunManager.isRunning || !RunManager.isPaused) return;

    RunManager.isPaused = false;
    startTimer();
}

function stopRun() {
    RunManager.isRunning = false;
    RunManager.isPaused = false;

    stopTimer();
    stopGPSRunning();

    const record = {
        date: new Date().toISOString(),
        distance: RunManager.totalDistance,
        pace: RunManager.pace,
        avgSpeed: RunManager.avgSpeed,
        curSpeed: RunManager.curSpeed,
        calories: RunManager.calories,
        time: RunManager.elapsedSeconds,
        polyline: [...RunManager.routePoints]
    };

    // 저장 (storage.js에서 구현 예정)
    if (window.StorageAPI) {
        StorageAPI.saveRun(record);
    }

    showStartUI();
}

/* ------------------------------------------------------------
   UI 업데이트
------------------------------------------------------------ */
function updateUI() {
    const distKm = (RunManager.totalDistance / 1000).toFixed(2);

    const kmDom = document.querySelector("#run-km");
    const paceDom = document.querySelector("#run-pace");
    const avgDom = document.querySelector("#run-avg");
    const curDom = document.querySelector("#run-cur");
    const calDom = document.querySelector("#run-cal");
    const timeDom = document.querySelector("#run-time");

    if (kmDom) kmDom.textContent = distKm;
    if (paceDom) paceDom.textContent = RunManager.pace;
    if (avgDom) avgDom.textContent = RunManager.avgSpeed.toFixed(1);
    if (curDom) curDom.textContent = RunManager.curSpeed.toFixed(1);
    if (calDom) calDom.textContent = RunManager.calories;
    if (timeDom) timeDom.textContent = formatTime(RunManager.elapsedSeconds);
}

/* ------------------------------------------------------------
   시간 포맷
------------------------------------------------------------ */
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------
   버튼 + UI 전환
------------------------------------------------------------ */
function showPauseStopUI() {
    document.querySelector("#startRunBtn").style.display = "none";
    document.querySelector("#pauseRunBtn").style.display = "inline-block";
    document.querySelector("#stopRunBtn").style.display = "inline-block";
}

function showStartUI() {
    document.querySelector("#startRunBtn").style.display = "inline-block";
    document.querySelector("#pauseRunBtn").style.display = "none";
    document.querySelector("#stopRunBtn").style.display = "none";
}

/* ------------------------------------------------------------
   버튼 이벤트 연결
------------------------------------------------------------ */
window.addEventListener("load", () => {
    const startBtn = document.querySelector("#startRunBtn");
    const pauseBtn = document.querySelector("#pauseRunBtn");
    const stopBtn = document.querySelector("#stopRunBtn");

    if (startBtn) startBtn.addEventListener("click", startRun);
    if (pauseBtn) pauseBtn.addEventListener("click", () => {
        if (RunManager.isPaused) resumeRun();
        else pauseRun();
    });
    if (stopBtn) stopBtn.addEventListener("click", stopRun);
});
