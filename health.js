/* ============================================================
   HEALTH APP — JS PART 1
   기본 설정 / 페이지 전환 / 저장소 / 네비게이션
============================================================ */

/* -------------------------------
   전역 상태
--------------------------------*/
let appState = {
    currentPage: "home",
    routines: [],
    logs: {},          // 날짜별 기록
    stats: {},         // 볼륨 계산
};

/* -------------------------------
   저장소 로드
--------------------------------*/
function loadStorage() {
    try {
        const data = JSON.parse(localStorage.getItem("health-app"));
        if (data) {
            appState = data;
        }
    } catch (e) {
        console.warn("Storage load error", e);
    }
}

/* -------------------------------
   저장소 저장
--------------------------------*/
function saveStorage() {
    localStorage.setItem("health-app", JSON.stringify(appState));
}

/* -------------------------------
   네비게이션 active 표시
--------------------------------*/
function setActiveNav(page) {
    const navs = {
        calendar: document.getElementById("nav-cal"),
        routines: document.getElementById("nav-routines"),
        stats: document.getElementById("nav-stats"),
        profile: document.getElementById("nav-profile"),
    };

    Object.values(navs).forEach(el => el?.classList.remove("nav-active"));

    if (navs[page]) {
        navs[page].classList.add("nav-active");
    }
}

/* -------------------------------
   페이지 전환
--------------------------------*/
function switchPage(page) {
    appState.currentPage = page;
    saveStorage();

    // 모든 페이지 숨김
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

    // 해당 페이지만 표시
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add("active");

    // 네비게이션 active 업데이트
    setActiveNav(page);

    // 각 페이지 렌더링
    if (page === "calendar") renderCalendar();
    if (page === "routines") renderRoutineList();
    if (page === "home") renderHome();
    if (page === "stats") renderStats();
}

/* -------------------------------
   초기 실행
--------------------------------*/
window.onload = function () {
    loadStorage();

    // 첫 화면 = home
    if (!appState.currentPage) appState.currentPage = "home";

    switchPage(appState.currentPage);
};
/* ============================================================
   HEALTH APP — JS PART 2
   📅 달력(Calendar) 전체 로직
============================================================ */

const calendarGrid = document.getElementById("calendar-month-grid");
const calendarHeaderText = document.getElementById("calendar-title");
let calendarCurrent = new Date();

/* -------------------------------
   달력 렌더링
--------------------------------*/
function renderCalendar() {
    const year = calendarCurrent.getFullYear();
    const month = calendarCurrent.getMonth();

    calendarHeaderText.textContent = `${year}.${String(month + 1).padStart(2, "0")}`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    calendarGrid.innerHTML = "";

    // 공백 채우기
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        calendarGrid.appendChild(empty);
    }

    // 날짜 채우기
    for (let d = 1; d <= lastDate; d++) {
        const btn = document.createElement("button");
        btn.textContent = d;

        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        // 오늘 날짜 강조
        const today = new Date();
        const isToday =
            d === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

        if (isToday) {
            btn.classList.add("today");
        }

        // 기록 있는 날짜 강조
        if (appState.logs[dateKey]) {
            btn.style.borderColor = "#2d8cff";
        }

        btn.onclick = () => {
            openDayLog(dateKey);
        };

        calendarGrid.appendChild(btn);
    }
}

/* -------------------------------
   이전/다음 달 이동
--------------------------------*/
function prevMonth() {
    calendarCurrent.setMonth(calendarCurrent.getMonth() - 1);
    renderCalendar();
}
function nextMonth() {
    calendarCurrent.setMonth(calendarCurrent.getMonth() + 1);
    renderCalendar();
}

/* -------------------------------
   특정 날짜 기록 모달 열기
--------------------------------*/
function openDayLog(dateKey) {
    const modal = document.getElementById("daily-log-modal");
    const listWrap = document.getElementById("daily-log-list");
    const title = document.getElementById("daily-log-title");

    title.textContent = dateKey;
    listWrap.innerHTML = "";

    const logs = appState.logs[dateKey] || [];

    if (logs.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "이 날은 운동 기록이 없습니다.";
        empty.style.padding = "10px";
        listWrap.appendChild(empty);
    } else {
        logs.forEach((item) => {
            const row = document.createElement("div");
            row.className = "log-item";
            row.textContent = `${item.part} - ${item.name} | ${item.weight}kg × ${item.reps} (${item.sets}set)`;
            listWrap.appendChild(row);
        });
    }

    modal.classList.remove("hidden");
}

/* -------------------------------
   모달 닫기
--------------------------------*/
function closeDayLog() {
    document.getElementById("daily-log-modal").classList.add("hidden");
}

/* -------------------------------
   날짜에 기록 추가
--------------------------------*/
function addLogToDate(dateKey, logData) {
    if (!appState.logs[dateKey]) {
        appState.logs[dateKey] = [];
    }
    appState.logs[dateKey].push(logData);
    saveStorage();
    renderCalendar();
}
/* ============================================================
   HEALTH APP — JS PART 3
   🧩 루틴 관리 + 🏠 홈 화면 (주간 달력 + 루틴 시작)
============================================================ */

/* -------------------------------
   날짜 유틸
--------------------------------*/
function getTodayKey() {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function getWeekRange(dateObj) {
    // 일요일 시작 주간
    const d = new Date(dateObj);
    const day = d.getDay(); // 0~6
    const start = new Date(d);
    start.setDate(d.getDate() - day); // 일요일

    const days = [];
    for (let i = 0; i < 7; i++) {
        const cur = new Date(start);
        cur.setDate(start.getDate() + i);
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        days.push({ date: cur, key });
    }
    return days;
}

/* -------------------------------
   루틴 관련 DOM
--------------------------------*/
const routineListEl = document.getElementById("routine-list");
const openRoutineCreateBtn = document.getElementById("open-routine-create-modal");

const routineEditorModal = document.getElementById("routine-editor-modal");
const routineEditorTitleEl = document.getElementById("routine-editor-title");
const routineNameInput = document.getElementById("routine-name-input");
const routinePartTabsEl = document.getElementById("routine-part-tabs");
const routineExerciseListEl = document.getElementById("routine-exercise-list");
const routineSelectedCountEl = document.getElementById("routine-selected-count");
const routineSelectedListEl = document.getElementById("routine-selected-list");
const routineDeleteBtn = document.getElementById("routine-delete-btn");
const routineSaveBtn = document.getElementById("routine-save-btn");
const routineEditorCloseBtn = document.getElementById("close-routine-editor");

const routineDetailModal = document.getElementById("routine-detail-modal");
const routineDetailTitleEl = document.getElementById("routine-detail-title");
const routineDetailListEl = document.getElementById("routine-detail-list");
const routineDetailEditBtn = document.getElementById("routine-detail-edit");
const routineDetailStartBtn = document.getElementById("routine-detail-start");
const routineDetailCloseBtn = document.getElementById("close-routine-detail");

/* -------------------------------
   홈 관련 DOM
--------------------------------*/
const homeWeeklyCalendarEl = document.getElementById("home-weekly-calendar");
const homeSessionDateEl = document.getElementById("home-session-date");
const homeRoutineSelect = document.getElementById("home-routine-select");
const homeStartFromRoutineBtn = document.getElementById("home-start-from-routine");
const homeSessionListEl = document.getElementById("home-session-list");

/* -------------------------------
   루틴 편집 상태
--------------------------------*/
let currentEditingRoutineId = null;
let editorSelectedExercises = [];   // { part, name, weight, reps, sets }
let editorActivePart = null;
let homeSelectedDateKey = getTodayKey();

// appState에 currentSession 없으면 추가
if (!appState.currentSession) {
    appState.currentSession = null;
}

/* ============================================================
   루틴 리스트 렌더링
============================================================ */

function renderRoutineList() {
    if (!routineListEl) return;
    routineListEl.innerHTML = "";

    if (!appState.routines || appState.routines.length === 0) {
        const empty = document.createElement("div");
        empty.className = "text-sm text-gray-500";
        empty.textContent = "등록된 루틴이 없습니다. 오른쪽 아래 + 버튼으로 새 루틴을 만들어보세요.";
        routineListEl.appendChild(empty);
        return;
    }

    appState.routines.forEach(routine => {
        const item = document.createElement("div");
        item.className = "routine-item flex justify-between items-center";

        const left = document.createElement("div");
        const title = document.createElement("div");
        title.className = "font-bold text-sm";
        title.textContent = routine.name;

        const sub = document.createElement("div");
        sub.className = "text-xs text-gray-500";
        sub.textContent = `${routine.exercises.length}개 종목`;

        left.appendChild(title);
        left.appendChild(sub);

        const right = document.createElement("div");
        right.className = "text-xs text-blue-500";
        right.textContent = "보기";

        item.appendChild(left);
        item.appendChild(right);

        item.onclick = () => openRoutineDetailModal(routine.id);

        routineListEl.appendChild(item);
    });
}

/* ============================================================
   루틴 상세 모달
============================================================ */

let routineDetailTargetId = null;

function openRoutineDetailModal(routineId) {
    const routine = appState.routines.find(r => r.id === routineId);
    if (!routine) return;

    routineDetailTargetId = routineId;
    routineDetailTitleEl.textContent = routine.name;
    routineDetailListEl.innerHTML = "";

    if (!routine.exercises.length) {
        const empty = document.createElement("div");
        empty.className = "text-sm text-gray-500";
        empty.textContent = "등록된 종목이 없습니다.";
        routineDetailListEl.appendChild(empty);
    } else {
        routine.exercises.forEach(ex => {
            const row = document.createElement("div");
            row.className = "flex justify-between items-center text-sm border-b py-1";

            const left = document.createElement("div");
            left.textContent = `${ex.part} - ${ex.name}`;

            const right = document.createElement("div");
            right.className = "text-xs text-gray-500";
            right.textContent = `${ex.weight}kg × ${ex.reps} (${ex.sets}세트)`;

            row.appendChild(left);
            row.appendChild(right);
            routineDetailListEl.appendChild(row);
        });
    }

    routineDetailModal.classList.remove("hidden");
}

function closeRoutineDetailModal() {
    routineDetailModal.classList.add("hidden");
    routineDetailTargetId = null;
}

/* ============================================================
   루틴 편집 모달 — 파트 탭 & 종목 리스트
============================================================ */

function buildPartTabs() {
    routinePartTabsEl.innerHTML = "";
    const parts = Object.keys(exercisesData || {});

    if (!parts.length) return;

    if (!editorActivePart) editorActivePart = parts[0];

    parts.forEach(part => {
        const btn = document.createElement("button");
        btn.className = "part-tab" + (part === editorActivePart ? " active" : "");
        btn.textContent = part;
        btn.onclick = () => {
            editorActivePart = part;
            buildPartTabs();
            buildExerciseList();
        };
        routinePartTabsEl.appendChild(btn);
    });
}

function buildExerciseList() {
    routineExerciseListEl.innerHTML = "";
    const list = (exercisesData && exercisesData[editorActivePart]) || [];

    if (!list.length) {
        const empty = document.createElement("div");
        empty.className = "text-xs text-gray-500";
        empty.textContent = "해당 부위에 등록된 종목이 없습니다.";
        routineExerciseListEl.appendChild(empty);
        return;
    }

    list.forEach(ex => {
        const row = document.createElement("div");
        row.className = "flex justify-between items-center text-sm py-1 border-b";

        const left = document.createElement("div");
        left.textContent = ex.name;

        const btn = document.createElement("button");
        btn.className = "text-xs text-blue-500";
        btn.textContent = "추가";
        btn.onclick = () => addExerciseToEditor(editorActivePart, ex.name);

        row.appendChild(left);
        row.appendChild(btn);
        routineExerciseListEl.appendChild(row);
    });
}

/* -------------------------------
   루틴 편집 선택 목록
--------------------------------*/
function renderEditorSelectedList() {
    routineSelectedListEl.innerHTML = "";

    if (!editorSelectedExercises.length) {
        const empty = document.createElement("div");
        empty.className = "text-xs text-gray-500";
        empty.textContent = "추가된 운동이 없습니다. 위에서 종목을 선택해 추가하세요.";
        routineSelectedListEl.appendChild(empty);
    } else {
        editorSelectedExercises.forEach((ex, idx) => {
            const row = document.createElement("div");
            row.className = "flex items-center justify-between text-xs border-b py-1";

            const info = document.createElement("div");
            info.textContent = `${ex.part} - ${ex.name}`;

            const controls = document.createElement("div");
            controls.className = "flex items-center gap-1";

            const wInput = document.createElement("input");
            wInput.type = "number";
            wInput.min = "0";
            wInput.className = "w-14 border rounded px-1 py-0.5";
            wInput.value = ex.weight ?? 0;
            wInput.oninput = (e) => {
                editorSelectedExercises[idx].weight = Number(e.target.value) || 0;
            };

            const rInput = document.createElement("input");
            rInput.type = "number";
            rInput.min = "0";
            rInput.className = "w-12 border rounded px-1 py-0.5";
            rInput.value = ex.reps ?? 0;
            rInput.oninput = (e) => {
                editorSelectedExercises[idx].reps = Number(e.target.value) || 0;
            };

            const sInput = document.createElement("input");
            sInput.type = "number";
            sInput.min = "1";
            sInput.className = "w-10 border rounded px-1 py-0.5";
            sInput.value = ex.sets ?? 3;
            sInput.oninput = (e) => {
                editorSelectedExercises[idx].sets = Number(e.target.value) || 1;
            };

            const delBtn = document.createElement("button");
            delBtn.className = "text-red-500";
            delBtn.textContent = "X";
            delBtn.onclick = () => {
                editorSelectedExercises.splice(idx, 1);
                routineSelectedCountEl.textContent = editorSelectedExercises.length;
                renderEditorSelectedList();
            };

            controls.appendChild(wInput);
            controls.appendChild(document.createTextNode("kg"));
            controls.appendChild(rInput);
            controls.appendChild(document.createTextNode("회"));
            controls.appendChild(sInput);
            controls.appendChild(document.createTextNode("세트"));
            controls.appendChild(delBtn);

            row.appendChild(info);
            row.appendChild(controls);
            routineSelectedListEl.appendChild(row);
        });
    }

    routineSelectedCountEl.textContent = editorSelectedExercises.length;
}

/* -------------------------------
   루틴 편집 — 운동 추가
--------------------------------*/
function addExerciseToEditor(part, name) {
    editorSelectedExercises.push({
        part,
        name,
        weight: 0,
        reps: 0,
        sets: 3,
    });
    renderEditorSelectedList();
}

/* ============================================================
   루틴 편집 모달 열기/닫기
============================================================ */

function openRoutineEditor(routineId = null) {
    currentEditingRoutineId = routineId;

    if (routineId) {
        // 수정 모드
        const target = appState.routines.find(r => r.id === routineId);
        if (!target) return;

        routineEditorTitleEl.textContent = "루틴 수정";
        routineNameInput.value = target.name;
        editorSelectedExercises = JSON.parse(JSON.stringify(target.exercises || []));
        routineDeleteBtn.classList.remove("hidden");
    } else {
        // 새로 만들기
        routineEditorTitleEl.textContent = "루틴 만들기";
        routineNameInput.value = "";
        editorSelectedExercises = [];
        routineDeleteBtn.classList.add("hidden");
    }

    // 파트/종목 리스트 렌더
    editorActivePart = null;
    buildPartTabs();
    buildExerciseList();
    renderEditorSelectedList();

    routineEditorModal.classList.remove("hidden");
}

function closeRoutineEditor() {
    routineEditorModal.classList.add("hidden");
    currentEditingRoutineId = null;
}

/* ============================================================
   루틴 저장/삭제
============================================================ */

function saveRoutineFromEditor() {
    const name = routineNameInput.value.trim();
    if (!name) {
        alert("루틴 이름을 입력해 주세요.");
        return;
    }
    if (!editorSelectedExercises.length) {
        alert("최소 1개 이상의 운동을 추가해 주세요.");
        return;
    }

    if (!appState.routines) appState.routines = [];

    if (currentEditingRoutineId) {
        // 수정
        const idx = appState.routines.findIndex(r => r.id === currentEditingRoutineId);
        if (idx !== -1) {
            appState.routines[idx] = {
                ...appState.routines[idx],
                name,
                exercises: editorSelectedExercises.map(ex => ({ ...ex })),
            };
        }
    } else {
        // 새로 추가
        const newId = `r_${Date.now()}`;
        appState.routines.push({
            id: newId,
            name,
            exercises: editorSelectedExercises.map(ex => ({ ...ex })),
        });
    }

    saveStorage();
    renderRoutineList();
    renderHome();
    closeRoutineEditor();
}

function deleteRoutineFromEditor() {
    if (!currentEditingRoutineId) return;
    if (!confirm("정말 이 루틴을 삭제할까요?")) return;

    appState.routines = appState.routines.filter(r => r.id !== currentEditingRoutineId);
    saveStorage();
    renderRoutineList();
    renderHome();
    closeRoutineEditor();
}

/* ============================================================
   홈 화면 렌더링 (주간 달력 + 루틴 선택 + 세션 표시)
============================================================ */

function renderHomeWeek() {
    if (!homeWeeklyCalendarEl) return;

    const baseDate = new Date();
    const days = getWeekRange(baseDate);

    homeWeeklyCalendarEl.innerHTML = "";

    days.forEach(({ date, key }) => {
        const div = document.createElement("div");
        div.className = "text-xs";
        const dayNum = date.getDate();
        div.textContent = dayNum;

        if (key === homeSelectedDateKey) {
            div.classList.add("active");
        }

        div.onclick = () => {
            homeSelectedDateKey = key;
            renderHome();
        };

        homeWeeklyCalendarEl.appendChild(div);
    });
}

function renderHomeRoutineSelect() {
    if (!homeRoutineSelect) return;

    homeRoutineSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "루틴 선택";
    homeRoutineSelect.appendChild(placeholder);

    (appState.routines || []).forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = r.name;
        homeRoutineSelect.appendChild(opt);
    });
}

function renderHomeSession() {
    if (!homeSessionListEl) return;

    homeSessionListEl.innerHTML = "";

    const session = appState.currentSession;
    if (!session || session.dateKey !== homeSelectedDateKey) {
        const empty = document.createElement("div");
        empty.className = "text-xs text-gray-500";
        empty.textContent = "선택된 날짜에 진행 중인 운동 세션이 없습니다. 루틴을 선택해 시작해 보세요.";
        homeSessionListEl.appendChild(empty);
        return;
    }

    const title = document.createElement("div");
    title.className = "font-semibold text-sm mb-1";
    title.textContent = `진행 중 루틴: ${session.routineName}`;
    homeSessionListEl.appendChild(title);

    session.exercises.forEach(ex => {
        const row = document.createElement("div");
        row.className = "flex justify-between items-center text-xs border-b py-1";

        const left = document.createElement("div");
        left.textContent = `${ex.part} - ${ex.name}`;

        const right = document.createElement("div");
        right.className = "text-[11px] text-gray-500";
        right.textContent = `${ex.weight}kg × ${ex.reps} (${ex.sets}세트)`;

        row.appendChild(left);
        row.appendChild(right);
        homeSessionListEl.appendChild(row);
    });
}

function renderHome() {
    if (homeSessionDateEl) {
        homeSessionDateEl.textContent = `선택 날짜: ${homeSelectedDateKey}`;
    }
    renderHomeWeek();
    renderHomeRoutineSelect();
    renderHomeSession();
}

/* ============================================================
   홈 — 루틴으로 운동 시작
============================================================ */

function startRoutineFromHome() {
    const routineId = homeRoutineSelect.value;
    if (!routineId) {
        alert("먼저 루틴을 선택해 주세요.");
        return;
    }

    const routine = (appState.routines || []).find(r => r.id === routineId);
    if (!routine) {
        alert("루틴 정보를 찾을 수 없습니다.");
        return;
    }

    const dateKey = homeSelectedDateKey || getTodayKey();

    // 현재 세션 갱신
    appState.currentSession = {
        dateKey,
        routineId,
        routineName: routine.name,
        exercises: routine.exercises.map(ex => ({ ...ex })),
    };

    // 달력 기록에도 반영 (볼륨/통계를 위해)
    (routine.exercises || []).forEach(ex => {
        addLogToDate(dateKey, {
            part: ex.part,
            name: ex.name,
            weight: ex.weight || 0,
            reps: ex.reps || 0,
            sets: ex.sets || 1,
        });
    });

    saveStorage();
    renderHome();
}

/* ============================================================
   이벤트 바인딩
============================================================ */

// 루틴 편집 관련
if (openRoutineCreateBtn) openRoutineCreateBtn.addEventListener("click", () => openRoutineEditor(null));
if (routineEditorCloseBtn) routineEditorCloseBtn.addEventListener("click", closeRoutineEditor);
if (routineSaveBtn) routineSaveBtn.addEventListener("click", saveRoutineFromEditor);
if (routineDeleteBtn) routineDeleteBtn.addEventListener("click", deleteRoutineFromEditor);

// 루틴 상세 모달
if (routineDetailCloseBtn) routineDetailCloseBtn.addEventListener("click", closeRoutineDetailModal);
if (routineDetailEditBtn) routineDetailEditBtn.addEventListener("click", () => {
    if (!routineDetailTargetId) return;
    closeRoutineDetailModal();
    openRoutineEditor(routineDetailTargetId);
});
if (routineDetailStartBtn) routineDetailStartBtn.addEventListener("click", () => {
    if (!routineDetailTargetId) return;
    const r = appState.routines.find(x => x.id === routineDetailTargetId);
    if (!r) return;

    // 선택된 루틴으로 홈에서 시작
    homeSelectedDateKey = getTodayKey();
    if (homeRoutineSelect) homeRoutineSelect.value = r.id;
    startRoutineFromHome();
    closeRoutineDetailModal();
    switchPage("home");
});

// 홈 - 루틴으로 운동 시작 버튼
if (homeStartFromRoutineBtn) homeStartFromRoutineBtn.addEventListener("click", startRoutineFromHome);

// 달력 모달 닫기
const closeDailyLogBtn = document.getElementById("close-daily-log-modal");
if (closeDailyLogBtn) closeDailyLogBtn.addEventListener("click", closeDayLog);

// 달력 이전/다음 달
const prevBtn = document.getElementById("calendar-prev-month");
const nextBtn = document.getElementById("calendar-next-month");
if (prevBtn) prevBtn.addEventListener("click", prevMonth);
if (nextBtn) nextBtn.addEventListener("click", nextMonth);
/* ============================================================
   HEALTH APP — JS PART 4
   📊 통계(Stats) + 🏅 PR + 🔁 데이터 초기화
============================================================ */

let statsRange = "7";   // "7" | "30" | "all"
let statsChart = null;

const statsRange7Btn   = document.getElementById("stats-range-7");
const statsRange30Btn  = document.getElementById("stats-range-30");
const statsRangeAllBtn = document.getElementById("stats-range-all");
const statsPeriodLabel = document.getElementById("stats-period-label");
const statsBodypartListEl = document.getElementById("stats-bodypart-list");
const prListEl = document.getElementById("pr-list");

/* -------------------------------
   날짜 유틸 (범위 계산)
--------------------------------*/
function parseDateKey(key) {
    const [y, m, d] = key.split("-").map(n => Number(n));
    return new Date(y, m - 1, d);
}

function getRangeInfo(range) {
    const today = new Date();
    let startDate = null;

    if (range === "7") {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6);
    } else if (range === "30") {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 29);
    } else {
        // all
        startDate = null; // 전체
    }

    return { today, startDate };
}

/* -------------------------------
   통계 데이터 계산
--------------------------------*/
function buildStatsData(range) {
    const { today, startDate } = getRangeInfo(range);

    const bodyVolume = {};   // {part: volume}
    const prs = {};          // {exerciseName: {part, name, maxWeight}}

    let minDate = null;
    let maxDate = null;

    const logEntries = Object.entries(appState.logs || {});

    logEntries.forEach(([dateKey, list]) => {
        const d = parseDateKey(dateKey);

        if (startDate && d < startDate) return;
        if (d > today) return;

        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;

        list.forEach(item => {
            const part = item.part || "기타";
            const w = Number(item.weight) || 0;
            const reps = Number(item.reps) || 0;
            const sets = Number(item.sets) || 1;
            const vol = w * reps * sets;

            // 부위별 볼륨
            if (!bodyVolume[part]) bodyVolume[part] = 0;
            bodyVolume[part] += vol;

            // PR: 종목별 최고 중량
            const exKey = item.name || "Unknown";
            if (!prs[exKey] || (w > prs[exKey].maxWeight)) {
                prs[exKey] = {
                    part,
                    name: item.name,
                    maxWeight: w
                };
            }
        });
    });

    const labels = Object.keys(bodyVolume);
    const data = labels.map(k => bodyVolume[k]);

    // 날짜 범위 텍스트
    let periodText = "";
    if (!logEntries.length || !minDate || !maxDate) {
        periodText = "기록된 운동 데이터가 없습니다.";
    } else {
        const fd = `${minDate.getFullYear()}.${String(minDate.getMonth()+1).padStart(2,"0")}.${String(minDate.getDate()).padStart(2,"0")}`;
        const ld = `${maxDate.getFullYear()}.${String(maxDate.getMonth()+1).padStart(2,"0")}.${String(maxDate.getDate()).padStart(2,"0")}`;
        periodText = `${fd} ~ ${ld}`;
    }

    return {
        labels,
        data,
        bodyVolume,
        prs,
        periodText
    };
}

/* -------------------------------
   Chart 렌더링
--------------------------------*/
function renderStatsChart(labels, data) {
    const ctx = document.getElementById("stats-bodypart-chart");
    if (!ctx) return;

    if (statsChart) {
        statsChart.destroy();
    }

    statsChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "부위별 볼륨",
                data,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

/* -------------------------------
   통계 화면 렌더링
--------------------------------*/
function renderStats() {
    if (!statsBodypartListEl || !prListEl) return;

    const { labels, data, bodyVolume, prs, periodText } = buildStatsData(statsRange);

    // 기간 라벨
    if (statsPeriodLabel) {
        let rangeText = "";
        if (statsRange === "7") rangeText = "최근 7일";
        else if (statsRange === "30") rangeText = "최근 30일";
        else rangeText = "전체 기간";

        statsPeriodLabel.textContent = `${rangeText} · ${periodText}`;
    }

    // 바 차트
    renderStatsChart(labels, data);

    // 부위별 리스트
    statsBodypartListEl.innerHTML = "";
    if (!labels.length) {
        const empty = document.createElement("div");
        empty.className = "text-xs text-gray-500";
        empty.textContent = "표시할 통계 데이터가 없습니다.";
        statsBodypartListEl.appendChild(empty);
    } else {
        labels.forEach(part => {
            const vol = Math.round(bodyVolume[part] || 0);
            const row = document.createElement("div");
            row.className = "stat-item flex justify-between items-center";

            const left = document.createElement("div");
            left.textContent = part;

            const right = document.createElement("div");
            right.className = "text-xs text-gray-600";
            right.textContent = `${vol.toLocaleString()} kg·rep`;

            row.appendChild(left);
            row.appendChild(right);
            statsBodypartListEl.appendChild(row);
        });
    }

    // PR 리스트
    prListEl.innerHTML = "";
    const prArray = Object.values(prs);

    if (!prArray.length) {
        const empty = document.createElement("div");
        empty.className = "text-xs text-gray-500";
        empty.textContent = "기록된 PR이 없습니다.";
        prListEl.appendChild(empty);
    } else {
        // 무게 기준 정렬
        prArray.sort((a, b) => b.maxWeight - a.maxWeight);

        prArray.slice(0, 10).forEach(item => {
            const row = document.createElement("div");
            row.className = "flex justify-between items-center text-xs border-b py-1";

            const left = document.createElement("div");
            left.textContent = `${item.part} - ${item.name}`;

            const right = document.createElement("div");
            right.className = "text-[11px] text-gray-600";
            right.textContent = `최고 ${item.maxWeight} kg`;

            row.appendChild(left);
            row.appendChild(right);
            prListEl.appendChild(row);
        });
    }
}

/* -------------------------------
   통계 범위 버튼 이벤트
--------------------------------*/
if (statsRange7Btn) {
    statsRange7Btn.addEventListener("click", () => {
        statsRange = "7";
        renderStats();
    });
}
if (statsRange30Btn) {
    statsRange30Btn.addEventListener("click", () => {
        statsRange = "30";
        renderStats();
    });
}
if (statsRangeAllBtn) {
    statsRangeAllBtn.addEventListener("click", () => {
        statsRange = "all";
        renderStats();
    });
}

/* -------------------------------
   전체 데이터 초기화
--------------------------------*/
const resetDataBtn = document.getElementById("reset-data-btn");

if (resetDataBtn) {
    resetDataBtn.addEventListener("click", () => {
        if (!confirm("정말 전체 운동 데이터를 초기화할까요? 이 작업은 되돌릴 수 없습니다.")) {
            return;
        }

        appState = {
            currentPage: "home",
            routines: [],
            logs: {},
            stats: {},
            currentSession: null,
        };

        saveStorage();

        // 화면들 초기화
        homeSelectedDateKey = getTodayKey();
        renderRoutineList();
        renderHome();
        renderCalendar();
        renderStats();

        switchPage("home");
    });
}
