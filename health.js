/* ============================================================
   health.js — PART 1/4
   (App Init / Router / Storage / Utils)
   ============================================================ */

/* ------------------------------------------------------------
   스토리지 기본 구조
------------------------------------------------------------ */
const STORAGE_KEY = "health_training_data_v1";

let db = {
  sessions: {},         // 날짜별 세션 기록
  templates: [],        // 루틴 템플릿
  exercises: {},        // exercises.js + 사용자 정의 운동
  pr: {},               // PR 저장
};

/* ------------------------------------------------------------
   스토리지 로드 / 저장
------------------------------------------------------------ */
function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    db = { ...db, ...parsed };
  } catch (e) {
    console.error("DB Parse Error:", e);
  }
}

/* ------------------------------------------------------------
   날짜 포맷팅 유틸
------------------------------------------------------------ */
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getTodayKey() {
  return formatDate(new Date());
}

/* ------------------------------------------------------------
   오늘 날짜가 세션에 없으면 생성
------------------------------------------------------------ */
function ensureTodaySession() {
  const key = getTodayKey();
  if (!db.sessions[key]) {
    db.sessions[key] = {
      date: key,
      exercises: [],
      createdAt: Date.now(),
    };
    saveDB();
  }
}

/* ------------------------------------------------------------
   공통 DOM 유틸
------------------------------------------------------------ */
function $(id) {
  return document.getElementById(id);
}

function show(el) {
  el.classList.remove("hidden");
  el.classList.add("show");
}

function hide(el) {
  el.classList.add("hidden");
  el.classList.remove("show");
}

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/* ------------------------------------------------------------
   페이지 라우터
------------------------------------------------------------ */
const pages = {
  calendar: $("page-calendar"),
  routines: $("page-routines"),
  session: $("page-session"),
  stats: $("page-stats"),
};

function switchPage(pageName) {
  Object.keys(pages).forEach((name) => {
    const page = pages[name];
    if (name === pageName) {
      page.classList.add("page-active");
      page.classList.remove("hidden");
    } else {
      page.classList.remove("page-active");
      page.classList.add("hidden");
    }
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    if (btn.dataset.page === pageName) {
      btn.classList.add("nav-btn-active");
    } else {
      btn.classList.remove("nav-btn-active");
    }
  });
}

/* ------------------------------------------------------------
   네비게이션 버튼 이벤트 등록
------------------------------------------------------------ */
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    switchPage(page);

    if (page === "calendar") renderCalendar();
    if (page === "session") renderSessionPage();
    if (page === "routines") renderRoutineTemplates();
    if (page === "stats") renderStatsPage();
  });
});

/* ------------------------------------------------------------
   EXERCISES 초기 로드
------------------------------------------------------------ */
function loadExercises() {
  db.exercises = JSON.parse(JSON.stringify(EXERCISE_DB));
  saveDB();
}

/* ------------------------------------------------------------
   DB 초기화 버튼
------------------------------------------------------------ */
$("reset-data-btn").addEventListener("click", () => {
  if (confirm("모든 데이터가 삭제됩니다. 계속할까요?")) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
});

/* ------------------------------------------------------------
   앱 초기화
------------------------------------------------------------ */
function initApp() {
  loadDB();

  if (!db.exercises || Object.keys(db.exercises).length === 0) {
    loadExercises();
  }

  ensureTodaySession();

  switchPage("calendar");
  renderCalendar();
}

/* ------------------------------------------------------------
   DOMContentLoaded
------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", initApp);

/* ============================================================
   health.js — PART 2/4
   (Calendar + Daily Log)
   ============================================================ */

/* ------------------------------------------------------------
   Calendar Rendering
------------------------------------------------------------ */

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0~11

function renderCalendar() {
  const calendarEl = $("calendar");
  clearChildren(calendarEl);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayKey = getTodayKey();

  $("calendar-title").innerText = `${currentYear}년 ${currentMonth + 1}월`;

  // prev empty cells
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day calendar-day-disabled";
    calendarEl.appendChild(empty);
  }

  // actual days
  for (let date = 1; date <= lastDate; date++) {
    const yyyy = currentYear;
    const mm = String(currentMonth + 1).padStart(2, "0");
    const dd = String(date).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;

    const cell = document.createElement("div");
    cell.className = "calendar-day";

    cell.innerText = date;

    // 오늘 표시
    if (key === todayKey) {
      cell.classList.add("calendar-day-today");
    }

    // 세션이 있는 날짜
    if (db.sessions[key] && db.sessions[key].exercises.length > 0) {
      cell.classList.add("calendar-day-has-session");
    }

    // 클릭 시 선택 / daily log 모달 표시
    cell.addEventListener("click", () => {
      renderSelectedDateSummary(key);
      openDailyLogModal(key);
    });

    calendarEl.appendChild(cell);
  }
}

/* ------------------------------------------------------------
   Calendar month nav
------------------------------------------------------------ */
$("prev-month-btn").addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
});

$("next-month-btn").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
});

$("today-btn").addEventListener("click", () => {
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  renderCalendar();
});

/* ------------------------------------------------------------
   Selected date summary card
------------------------------------------------------------ */
function renderSelectedDateSummary(key) {
  const session = db.sessions[key];

  $("selected-date-label").innerText = key;

  if (!session) {
    $("selected-date-volume").innerText = "0kg";
    $("selected-date-exercise-count").innerText = "0개";
    return;
  }

  // 총 볼륨
  let totalVolume = 0;
  session.exercises.forEach((ex) => {
    ex.sets.forEach((s) => {
      totalVolume += s.weight * s.reps;
    });
  });

  // 총 운동 종류
  const exCount = session.exercises.length;

  $("selected-date-volume").innerText = `${totalVolume}kg`;
  $("selected-date-exercise-count").innerText = `${exCount}개`;
}

/* ------------------------------------------------------------
   Daily Log Modal
------------------------------------------------------------ */
const dailyLogModal = $("daily-log-modal");
const dailyLogList = $("daily-log-modal-list");

function openDailyLogModal(key) {
  const session = db.sessions[key];
  clearChildren(dailyLogList);

  $("daily-log-modal-title").innerText = `${key} 기록`;

  if (!session || session.exercises.length === 0) {
    const empty = document.createElement("div");
    empty.className = "text-sm text-gray-500 text-center py-4";
    empty.innerText = "기록이 없습니다.";
    dailyLogList.appendChild(empty);

    show(dailyLogModal);
    return;
  }

  session.exercises.forEach((ex) => {
    const wrap = document.createElement("div");
    wrap.className = "bg-white border border-gray-200 rounded-xl p-3 space-y-1";

    const title = document.createElement("div");
    title.className = "font-semibold text-sm text-blue-700";
    title.innerText = ex.name;
    wrap.appendChild(title);

    ex.sets.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "text-xs text-gray-700 flex justify-between";

      row.innerHTML = `
        <div>세트 ${i + 1}</div>
        <div>${s.weight}kg × ${s.reps}회 ${s.done ? "✔" : ""}</div>
      `;

      wrap.appendChild(row);
    });

    dailyLogList.appendChild(wrap);
  });

  show(dailyLogModal);
}

$("close-daily-log-modal-btn").addEventListener("click", () => {
  hide(dailyLogModal);
});

/* ------------------------------------------------------------
   Date search
------------------------------------------------------------ */
$("date-search-input").addEventListener("change", (e) => {
  const key = e.target.value;
  if (!key) return;

  currentYear = Number(key.split("-")[0]);
  currentMonth = Number(key.split("-")[1]) - 1;

  renderCalendar();
  renderSelectedDateSummary(key);
  openDailyLogModal(key);
});
/* ============================================================
   health.js — PART 3/4
   (Session / Sets / Timer / PR / Drag&Drop)
   ============================================================ */

/* ------------------------------------------------------------
   세션 페이지 렌더링
------------------------------------------------------------ */
function getTodaySession() {
  const key = getTodayKey();
  if (!db.sessions[key]) {
    db.sessions[key] = {
      date: key,
      exercises: [],
      createdAt: Date.now()
    };
    saveDB();
  }
  return db.sessions[key];
}

function renderSessionPage() {
  const key = getTodayKey();
  const session = db.sessions[key];
  $("session-date-label").innerText = key;

  // 운동 개수
  $("session-exercise-count").innerText = `${session.exercises.length}개`;

  // 총 볼륨 계산
  let totalVolume = 0;
  session.exercises.forEach(ex => {
    ex.sets.forEach(s => totalVolume += s.weight * s.reps);
  });
  $("session-total-volume").innerText = `${totalVolume}kg`;

  // 전체 렌더링
  renderWorkoutList(session);
}

/* ------------------------------------------------------------
   운동 목록 렌더링
------------------------------------------------------------ */
function renderWorkoutList(session) {
  const list = $("workout-session-list");
  clearChildren(list);

  session.exercises.forEach((exercise, exIndex) => {
    const card = document.createElement("div");
    card.className = "exercise-card fade-in";
    
    card.innerHTML = `
      <div class="flex items-center space-x-3">
        <img src="${exercise.img || 'images/default.png'}" class="exercise-thumb">
        <div>
          <div class="font-semibold text-sm text-gray-800">${exercise.name}</div>
          <div class="text-xs text-gray-500">${exercise.part}</div>
        </div>
      </div>

      <button class="text-xs text-blue-600 underline" data-ex="${exIndex}">
        세트 추가
      </button>
    `;

    // 세트 목록
    const setWrap = document.createElement("div");
    setWrap.className = "space-y-2 mt-2";

    exercise.sets.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = `set-card ${s.done ? "set-complete" : ""}`;

      row.innerHTML = `
        <div class="flex justify-between items-center text-sm">
          <div>세트 ${i + 1}</div>
          <div class="font-semibold">${s.weight}kg × ${s.reps}회</div>
        </div>

        <div class="flex justify-between mt-1">
          <button class="text-xs text-blue-600 underline" data-ex="${exIndex}" data-set="${i}">수정</button>
          <button class="set-copy-btn" data-copy-ex="${exIndex}" data-copy-set="${i}">복사</button>
        </div>
      `;

      setWrap.appendChild(row);
    });

    const container = document.createElement("div");
    container.className = "space-y-2";
    container.appendChild(card);
    container.appendChild(setWrap);

    list.appendChild(container);
  });

  registerSessionEvents();
}

/* ------------------------------------------------------------
   세트 추가
------------------------------------------------------------ */
$("open-add-exercise-modal-btn").addEventListener("click", () => {
  renderSessionExerciseModal();
  show($("add-to-session-modal"));
});

function renderSessionExerciseModal() {
  const list = $("session-exercise-select");
  clearChildren(list);

  const searchValue = $("session-search-input").value.toLowerCase();

  const selectedPart = currentSessionPartFilter || null;

  Object.keys(db.exercises).forEach(part => {
    db.exercises[part].forEach(ex => {
      if (selectedPart && ex.part !== selectedPart) return;
      if (searchValue && !ex.name.toLowerCase().includes(searchValue)) return;

      const row = document.createElement("div");
      row.className = "exercise-card";

      row.innerHTML = `
        <div class="flex items-center space-x-3">
          <img src="${ex.img || 'images/default.png'}" class="exercise-thumb">
          <div class="font-semibold text-sm">${ex.name}</div>
        </div>
        <button class="text-xs text-blue-600 underline" data-add="${ex.name}" data-part="${ex.part}" data-img="${ex.img || ''}">
          추가
        </button>
      `;

      list.appendChild(row);
    });
  });

  registerModalEvents();
}

/* ------------------------------------------------------------
   운동 추가 이벤트
------------------------------------------------------------ */
function registerModalEvents() {
  document.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.add;
      const part = btn.dataset.part;
      const img = btn.dataset.img;

      const key = getTodayKey();
      const session = db.sessions[key];

      session.exercises.push({
        name,
        part,
        img,
        sets: []
      });

      saveDB();
      hide($("add-to-session-modal"));
      renderSessionPage();
    });
  });
}

/* ------------------------------------------------------------
   세트 추가 버튼
------------------------------------------------------------ */
function registerSessionEvents() {
  document.querySelectorAll("[data-ex]").forEach(btn => {
    btn.addEventListener("click", () => {
      const exIndex = Number(btn.dataset.ex);
      openAddSet(exIndex);
    });
  });

  document.querySelectorAll("[data-set]").forEach(btn => {
    btn.addEventListener("click", () => {
      const exIndex = Number(btn.dataset.ex);
      const setIndex = Number(btn.dataset.set);
      openEditSetModal(exIndex, setIndex);
    });
  });

  // 세트 복사
  document.querySelectorAll("[data-copy-ex]").forEach(btn => {
    btn.addEventListener("click", () => {
      const ex = Number(btn.dataset.copyEx);
      const st = Number(btn.dataset.copySet);
      duplicateSet(ex, st);
    });
  });
}

/* ------------------------------------------------------------
   세트 추가
------------------------------------------------------------ */
function openAddSet(exIndex) {
  const key = getTodayKey();
  const session = db.sessions[key];

  session.exercises[exIndex].sets.push({
    weight: 0,
    reps: 10,
    done: false
  });

  saveDB();
  renderSessionPage();
}

/* ------------------------------------------------------------
   세트 복사
------------------------------------------------------------ */
function duplicateSet(exIndex, setIndex) {
  const key = getTodayKey();
  const session = db.sessions[key];

  const target = session.exercises[exIndex].sets[setIndex];
  if (!target) return;

  session.exercises[exIndex].sets.splice(setIndex + 1, 0, {
    weight: target.weight,
    reps: target.reps,
    done: false
  });

  saveDB();
  renderSessionPage();
}

/* ------------------------------------------------------------
   세트 수정 모달
------------------------------------------------------------ */
let editingExIndex = null;
let editingSetIndex = null;

function openEditSetModal(exIndex, setIndex) {
  editingExIndex = exIndex;
  editingSetIndex = setIndex;

  const key = getTodayKey();
  const s = db.sessions[key].exercises[exIndex].sets[setIndex];

  $("edit-weight-input").value = s.weight;
  $("edit-reps-input").value = s.reps;
  $("edit-done-input").value = s.done ? "true" : "false";

  show($("edit-set-modal"));
}

$("close-edit-set-modal-btn").addEventListener("click", () => {
  hide($("edit-set-modal"));
});

/* ------------------------------------------------------------
   세트 삭제
------------------------------------------------------------ */
$("delete-set-btn").addEventListener("click", () => {
  const key = getTodayKey();
  db.sessions[key].exercises[editingExIndex].sets.splice(editingSetIndex, 1);
  saveDB();
  hide($("edit-set-modal"));
  renderSessionPage();
});

/* ------------------------------------------------------------
   세트 수정 적용
------------------------------------------------------------ */
$("apply-set-edit-btn").addEventListener("click", () => {
  const key = getTodayKey();
  const set = db.sessions[key].exercises[editingExIndex].sets[editingSetIndex];

  set.weight = Number($("edit-weight-input").value);
  set.reps = Number($("edit-reps-input").value);
  set.done = $("edit-done-input").value === "true";

  saveDB();
  hide($("edit-set-modal"));
  renderSessionPage();

  detectPR(editingExIndex, set.weight, set.reps);
});

/* ------------------------------------------------------------
   PR 감지
------------------------------------------------------------ */
function detectPR(exIndex, w, r) {
  const exName = getTodaySession().exercises[exIndex].name;
  const value = w * r;

  if (!db.pr[exName] || db.pr[exName] < value) {
    db.pr[exName] = value;
    saveDB();
    showPRModal(exName, value);
  }
}

function showPRModal(name, value) {
  const list = $("pr-celebration-list");
  list.innerHTML = `
    <div class="text-sm">${name}: ${value}kg</div>
  `;
  show($("pr-celebration-modal"));
}

$("close-pr-modal").addEventListener("click", () => {
  hide($("pr-celebration-modal"));
});

/* ------------------------------------------------------------
   타이머 기능
------------------------------------------------------------ */
let timerInterval = null;
let timerSeconds = 60;

const timerModal = $("timer-modal");
const floatingTimer = $("floating-timer");
const timerDisplay = $("timer-digital-display");
const floatingDisplay = $("floating-timer-display");

function updateTimerDisplay() {
  const m = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const s = String(timerSeconds % 60).padStart(2, "0");
  timerDisplay.innerText = `${m}:${s}`;
  floatingDisplay.innerText = `${m}:${s}`;
}

$("open-timer-modal-btn").addEventListener("click", () => {
  timerSeconds = Number($("timer-input").value) || 60;
  updateTimerDisplay();
  show(timerModal);
});

$("close-timer-modal-btn").addEventListener("click", () => {
  hide(timerModal);
});

/* 시간 조절 */
$("timer-minus-30").onclick = () => { timerSeconds = Math.max(10, timerSeconds - 30); updateTimerDisplay(); };
$("timer-minus-10").onclick = () => { timerSeconds = Math.max(10, timerSeconds - 10); updateTimerDisplay(); };
$("timer-plus-10").onclick = () => { timerSeconds += 10; updateTimerDisplay(); };
$("timer-plus-30").onclick = () => { timerSeconds += 30; updateTimerDisplay(); };

$("start-stop-timer-btn").addEventListener("click", () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    hide(floatingTimer);
    $("start-stop-timer-btn").innerText = "시작";
    return;
  }

  $("start-stop-timer-btn").innerText = "정지";
  show(floatingTimer);

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();

    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      hide(floatingTimer);
      $("start-stop-timer-btn").innerText = "시작";
    }
  }, 1000);
});

$("close-floating-timer").addEventListener("click", () => {
  hide(floatingTimer);
});
/* ============================================================
   health.js — PART 4/4
   (Exercises init fix / Filters / Routines / Stats / DragSort)
   ============================================================ */

/* ------------------------------------------------------------
   exercises.js 구조에 맞게 Exercises 초기화 재정의
   - bodyPartImages, exercisesData 사용
   - db.exercises[part] = [{name, part, img}, ...]
------------------------------------------------------------ */
function loadExercises() {
  if (typeof exercisesData === "undefined") return;

  db.exercises = {};

  Object.keys(exercisesData).forEach((part) => {
    exercisesData[part].forEach((item) => {
      if (!db.exercises[part]) db.exercises[part] = [];
      db.exercises[part].push({
        name: item.name,
        part: part,
        img:
          item.image ||
          (typeof bodyPartImages !== "undefined" ? bodyPartImages[part] : null) ||
          null,
      });
    });
  });

  saveDB();
}

/* ------------------------------------------------------------
   세션 운동 선택 모달: 파트 필터 + 검색
------------------------------------------------------------ */
let currentSessionPartFilter = null;

function buildSessionPartFilterChips() {
  const wrap = $("session-part-filter");
  if (!wrap) return;
  clearChildren(wrap);

  const allBtn = document.createElement("button");
  allBtn.className =
    "px-3 py-1 rounded-full text-xs border border-gray-300 text-gray-600";
  allBtn.innerText = "전체";
  allBtn.addEventListener("click", () => {
    currentSessionPartFilter = null;
    renderSessionExerciseModal();
  });
  wrap.appendChild(allBtn);

  Object.keys(db.exercises).forEach((part) => {
    const btn = document.createElement("button");
    btn.className =
      "px-3 py-1 rounded-full text-xs border border-gray-300 text-gray-600";
    btn.innerText = part;
    btn.addEventListener("click", () => {
      currentSessionPartFilter = part;
      renderSessionExerciseModal();
    });
    wrap.appendChild(btn);
  });
}

/* 검색 입력 이벤트 */
const searchInput = $("session-search-input");
if (searchInput) {
  searchInput.addEventListener("input", () => {
    renderSessionExerciseModal();
  });
}

/* 모달 닫기 버튼 */
const cancelAddExerciseBtn = $("cancel-add-exercise-btn");
if (cancelAddExerciseBtn) {
  cancelAddExerciseBtn.addEventListener("click", () => {
    hide($("add-to-session-modal"));
  });
}

/* ------------------------------------------------------------
   루틴 템플릿 (저장 / 불러오기 / 삭제)
------------------------------------------------------------ */

function renderRoutineTemplates() {
  const list = $("routine-template-list");
  if (!list) return;
  clearChildren(list);

  if (!db.templates || db.templates.length === 0) {
    const empty = document.createElement("div");
    empty.className = "text-xs text-gray-500";
    empty.innerText = "저장된 루틴이 없습니다.";
    list.appendChild(empty);
    return;
  }

  db.templates.forEach((tpl, index) => {
    const card = document.createElement("div");
    card.className = "template-card";

    const header = document.createElement("div");
    header.className = "flex justify-between items-center mb-1";
    header.innerHTML = `
      <div class="font-semibold text-sm text-gray-800">${tpl.title}</div>
      <div class="text-[11px] text-gray-400">${tpl.exercises.length}개 운동</div>
    `;
    card.appendChild(header);

    const exWrap = document.createElement("div");
    exWrap.className =
      "mt-1 text-[11px] text-gray-600 flex flex-wrap gap-1";
    tpl.exercises.forEach((ex) => {
      const chip = document.createElement("span");
      chip.className =
        "px-2 py-0.5 rounded-full bg-gray-100 text-gray-700";
      chip.innerText = ex.name;
      exWrap.appendChild(chip);
    });
    card.appendChild(exWrap);

    const btnRow = document.createElement("div");
    btnRow.className = "flex gap-2 mt-3";

    // 세션에 불러오기
    const loadBtn = document.createElement("button");
    loadBtn.className =
      "flex-1 bg-blue-500 text-white text-xs rounded-full py-1.5";
    loadBtn.innerText = "세션에 불러오기";
    loadBtn.addEventListener("click", () => {
      const key = getTodayKey();
      const session = getTodaySession();
      // 기존 세션에 이어붙이기
      tpl.exercises.forEach((exItem) => {
        session.exercises.push(JSON.parse(JSON.stringify(exItem)));
      });
      saveDB();
      switchPage("session");
      renderSessionPage();
    });

    // 삭제 버튼
    const delBtn = document.createElement("button");
    delBtn.className =
      "px-3 py-1.5 text-xs border border-gray-300 rounded-full text-gray-600";
    delBtn.innerText = "삭제";
    delBtn.addEventListener("click", () => {
      if (!confirm("이 루틴을 삭제할까요?")) return;
      db.templates.splice(index, 1);
      saveDB();
      renderRoutineTemplates();
    });

    btnRow.appendChild(loadBtn);
    btnRow.appendChild(delBtn);
    card.appendChild(btnRow);

    list.appendChild(card);
  });
}

/* 새 루틴 생성 버튼 */
const createTplBtn = $("create-new-template-btn");
if (createTplBtn) {
  createTplBtn.addEventListener("click", () => {
    const session = getTodaySession();
    if (!session.exercises.length) {
      alert("현재 세션에 운동이 있어야 루틴으로 저장할 수 있습니다.");
      return;
    }
    const title = prompt("루틴 이름을 입력하세요. (예: 상체 A)");
    if (!title) return;

    const tpl = {
      id: Date.now(),
      title,
      exercises: JSON.parse(JSON.stringify(session.exercises)),
    };
    db.templates.push(tpl);
    saveDB();
    renderRoutineTemplates();
    alert("루틴이 저장되었습니다.");
  });
}

/* ------------------------------------------------------------
   통계: 기간별 부위 볼륨 + PR 리스트
------------------------------------------------------------ */

let currentStatsRange = 7; // 7, 30, 'all'

function getAllSessions() {
  return Object.values(db.sessions || {});
}

function getSessionsInRange(days) {
  const all = getAllSessions();
  if (days === "all") return all;

  const today = new Date();
  const base = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const from = new Date(base);
  from.setDate(base.getDate() - (days - 1));

  return all.filter((s) => {
    const d = new Date(s.date);
    return d >= from && d <= base;
  });
}

function computeBodypartVolumes(sessions) {
  const map = {};
  sessions.forEach((session) => {
    session.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        const v = s.weight * s.reps;
        if (!map[ex.part]) map[ex.part] = 0;
        map[ex.part] += v;
      });
    });
  });
  return map;
}

function renderPRList() {
  const wrap = $("pr-list");
  if (!wrap) return;
  clearChildren(wrap);

  const entries = Object.entries(db.pr || {});
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "text-xs text-gray-500";
    empty.innerText = "기록된 PR이 없습니다.";
    wrap.appendChild(empty);
    return;
  }

  entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([name, value]) => {
      const row = document.createElement("div");
      row.className =
        "flex justify-between items-center text-sm text-gray-700";
      row.innerHTML = `
        <div>${name}</div>
        <div class="text-xs text-blue-600">${value} (무게×횟수)</div>
      `;
      wrap.appendChild(row);
    });
}

function renderStatsPage() {
  const sessions =
    currentStatsRange === "all"
      ? getSessionsInRange("all")
      : getSessionsInRange(currentStatsRange);
  const volumes = computeBodypartVolumes(sessions);

  const list = $("stats-bodypart-list");
  if (!list) return;
  clearChildren(list);

  const labelEl = $("stats-period-label");
  if (labelEl) {
    if (currentStatsRange === 7) labelEl.innerText = "최근 7일";
    else if (currentStatsRange === 30) labelEl.innerText = "최근 30일";
    else labelEl.innerText = "전체 기간";
  }

  const parts = Object.keys(volumes);
  if (!parts.length) {
    const empty = document.createElement("div");
    empty.className = "text-xs text-gray-500";
    empty.innerText = "통계 데이터가 없습니다.";
    list.appendChild(empty);
  } else {
    parts.forEach((part) => {
      const row = document.createElement("div");
      row.className = "stats-bodypart-row";
      row.innerHTML = `
        <div class="text-sm text-gray-700">${part}</div>
        <div class="stats-number">${volumes[part]}kg</div>
      `;
      list.appendChild(row);
    });
  }

  renderPRList();
}

/* 통계 범위 버튼 */
const btn7 = $("stats-range-7");
if (btn7) {
  btn7.addEventListener("click", () => {
    currentStatsRange = 7;
    renderStatsPage();
  });
}
const btn30 = $("stats-range-30");
if (btn30) {
  btn30.addEventListener("click", () => {
    currentStatsRange = 30;
    renderStatsPage();
  });
}
const btnAll = $("stats-range-all");
if (btnAll) {
  btnAll.addEventListener("click", () => {
    currentStatsRange = "all";
    renderStatsPage();
  });
}

/* PR 전체 보기 버튼 (모달에 전체 PR 리스트) */
const openPrBtn = $("open-pr-modal-btn");
if (openPrBtn) {
  openPrBtn.addEventListener("click", () => {
    const wrap = $("pr-celebration-list");
    if (!wrap) return;
    clearChildren(wrap);

    const entries = Object.entries(db.pr || {});
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "text-xs text-gray-500";
      empty.innerText = "기록된 PR이 없습니다.";
      wrap.appendChild(empty);
    } else {
      entries
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, value]) => {
          const row = document.createElement("div");
          row.className =
            "flex justify-between items-center text-sm text-gray-700";
          row.innerHTML = `
            <div>${name}</div>
            <div class="text-xs text-blue-600">${value} (무게×횟수)</div>
          `;
          wrap.appendChild(row);
        });
    }

    show($("pr-celebration-modal"));
  });
}

/* ------------------------------------------------------------
   드래그 정렬 (운동 순서 변경)
------------------------------------------------------------ */
function initExerciseSortable() {
  const list = $("workout-session-list");
  if (!list || typeof Sortable === "undefined") return;

  // 이미 초기화된 경우 다시 생성하지 않음
  if (list._sortableInit) return;
  list._sortableInit = true;

  Sortable.create(list, {
    animation: 150,
    handle: ".exercise-card",
    onEnd: (evt) => {
      const oldIndex = evt.oldIndex;
      const newIndex = evt.newIndex;
      if (oldIndex === newIndex) return;

      const key = getTodayKey();
      const session = getTodaySession();
      const arr = session.exercises;

      const moved = arr.splice(oldIndex, 1)[0];
      arr.splice(newIndex, 0, moved);

      saveDB();
      renderSessionPage();
    },
  });
}

/* renderSessionPage 보강 (드래그 정렬 초기화 포함) */
const _oldRenderSessionPage = renderSessionPage;
renderSessionPage = function () {
  _oldRenderSessionPage();
  initExerciseSortable();
};

/* ------------------------------------------------------------
   초기 진입 시 선택된 날짜 요약 한 번 렌더
------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  const todayKey = getTodayKey();
  if (typeof renderSelectedDateSummary === "function") {
    renderSelectedDateSummary(todayKey);
  }
  // 파트 필터 칩 구성
  buildSessionPartFilterChips();
});
