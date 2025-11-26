/* =========================================================
   HEALTH APP STATE
========================================================= */

const healthState = {
    today: new Date(),
    selectedDate: null,
    data: {},
    routines: [],
    session: { exercises: [] }
};

/* =========================================================
   LOCAL STORAGE
========================================================= */

function loadHealthData() {
    const raw = localStorage.getItem("health-data");
    healthState.data = raw ? JSON.parse(raw) : {};
}

function saveHealthData() {
    localStorage.setItem("health-data", JSON.stringify(healthState.data));
}

function saveRoutines() {
    localStorage.setItem("health-routines", JSON.stringify(healthState.routines));
}

function loadRoutines() {
    const raw = localStorage.getItem("health-routines");
    healthState.routines = raw ? JSON.parse(raw) : [];
}

/* =========================================================
   DATE FORMATTER
========================================================= */

function formatDate(date) {
    return date.toISOString().split("T")[0];
}

/* =========================================================
   SAFE IMAGE (fallback X)
========================================================= */

function safeImage(path) {
    return `
        <img src="${path}" class="w-8 h-8 mr-2 rounded object-cover"
             onerror="this.onerror=null; this.outerHTML='<div style=\\'width:32px;height:32px\\' class=\\'mr-2 flex items-center justify-center text-red-500 font-bold border border-red-400 rounded\\'>X</div>';">
    `;
}

/* =========================================================
   PAGE NAVIGATION
========================================================= */

function showPage(pageName) {
    const pages = document.querySelectorAll(".page");
    const btns  = document.querySelectorAll(".nav-btn");

    pages.forEach(p => p.classList.add("hidden"));
    pages.forEach(p => p.classList.remove("active"));

    const target = document.getElementById(`page-${pageName}`);
    if (target) {
        target.classList.remove("hidden");
        target.classList.add("active");
    }

    btns.forEach(b => b.classList.remove("active"));
    const activeBtn = document.querySelector(`[data-page='${pageName}']`);
    if (activeBtn) activeBtn.classList.add("active");
}

/* =========================================================
   ROUTINE RENDER
========================================================= */

function renderRoutineList() {
    const box = document.getElementById("routine-list");
    if (!box) return;

    box.innerHTML = "";

    if (healthState.routines.length === 0) {
        box.innerHTML =
            "<div class='text-center text-gray-500'>등록된 루틴이 없습니다.</div>";
        return;
    }

    healthState.routines.forEach((rt, idx) => {
        const el = document.createElement("div");
        el.className =
            "bg-white border border-sky-200 rounded-xl p-3 shadow flex justify-between items-center";

        el.innerHTML = `
            <div class="font-semibold text-gray-700">${rt.name}</div>
            <button data-del="${idx}" class="text-red-500">삭제</button>
        `;

        box.appendChild(el);
    });

    document.querySelectorAll("[data-del]").forEach(btn => {
        btn.onclick = () => {
            const idx = Number(btn.dataset.del);
            healthState.routines.splice(idx, 1);
            saveRoutines();
            renderRoutineList();
        };
    });
}

/* =========================================================
   SESSION RENDER
========================================================= */

function renderSessionList() {
    const container = document.getElementById("sessionExerciseList");
    if (!container) return;

    if (healthState.session.exercises.length === 0) {
        container.innerHTML =
            "아직 운동이 없습니다.";
        return;
    }

    container.innerHTML = "";

    healthState.session.exercises.forEach(ex => {
        const box = document.createElement("div");
        box.className =
            "bg-white border border-sky-200 p-3 rounded-xl shadow";

        box.innerHTML = `
            <div class="font-semibold text-gray-700 flex items-center">
                ${safeImage(ex.image)}
                ${ex.name}
            </div>
            <div class="text-gray-500 text-sm">세트: ${ex.sets.length}</div>
        `;

        container.appendChild(box);
    });
}

/* =========================================================
   EXERCISE SELECT MODAL
========================================================= */

function buildExerciseSelect() {
    const container = document.getElementById("sessionExerciseSelect");
    container.innerHTML = "";

    // A안: 부위별 그룹
    Object.keys(exercisesData).forEach(part => {
        // 카테고리 헤더
        const header = document.createElement("div");
        header.className =
            "bg-sky-500 text-white px-3 py-1 rounded font-semibold";
        header.textContent = part;
        container.appendChild(header);

        // 해당 부위 운동 리스트
        exercisesData[part].forEach(ex => {
            const el = document.createElement("div");
            el.className =
                "flex items-center bg-white border border-sky-200 p-2 rounded mt-1 shadow cursor-pointer";

            const imgPath = ex.image ? ex.image : bodyPartImages[part];

            el.innerHTML = `
                ${safeImage(imgPath)}
                <span>${ex.name}</span>
            `;

            el.onclick = () => {
                healthState.session.exercises.push({
                    name: ex.name,
                    image: imgPath,
                    sets: []
                });

                renderSessionList();
                closeSessionModal();
            };

            container.appendChild(el);
        });
    });
}

/* =========================================================
   CALENDAR RENDER
========================================================= */

function renderCalendar(baseDate) {
    const container = document.getElementById("calendar-container");
    const summary   = document.getElementById("calendar-summary");

    const year  = baseDate.getFullYear();
    const month = baseDate.getMonth();

    container.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <button id="prevMonth" class="px-3 py-1 bg-sky-200 rounded">이전</button>
            <div class="font-bold text-lg">
                ${year}년 ${month + 1}월
            </div>
            <button id="nextMonth" class="px-3 py-1 bg-sky-200 rounded">다음</button>
        </div>

        <div class="grid grid-cols-7 text-center text-gray-600 mb-2">
            <div>일</div><div>월</div><div>화</div>
            <div>수</div><div>목</div><div>금</div><div>토</div>
        </div>

        <div id="calendarGrid" class="grid grid-cols-7 gap-1 text-center"></div>
    `;

    const grid     = document.getElementById("calendarGrid");
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += "<div></div>";
    }

    for (let d = 1; d <= lastDate; d++) {
        const cur = new Date(year, month, d);
        const key = formatDate(cur);

        const today      = formatDate(new Date());
        const isToday    = today === key;
        const todayClass = isToday
            ? "border border-sky-500 font-bold text-sky-600"
            : "";

        grid.innerHTML += `
            <div class="py-2 rounded ${todayClass}"
                 data-date="${key}">
                ${d}
            </div>
        `;
    }

    // 날짜 선택
    grid.querySelectorAll("[data-date]").forEach(el => {
        el.onclick = () => {
            healthState.selectedDate = el.dataset.date;
            summary.innerHTML = `선택한 날짜: ${el.dataset.date}`;
        };
    });

    // 월 이동
    document.getElementById("prevMonth").onclick =
        () => renderCalendar(new Date(year, month - 1, 1));

    document.getElementById("nextMonth").onclick =
        () => renderCalendar(new Date(year, month + 1, 1));
}

/* =========================================================
   MODAL OPEN / CLOSE
========================================================= */

function openSessionModal() {
    document.getElementById("sessionModal").classList.remove("hidden");
}

function closeSessionModal() {
    document.getElementById("sessionModal").classList.add("hidden");
}

function openRoutineModal() {
    document.getElementById("routineModal").classList.remove("hidden");
}

function closeRoutineModal() {
    document.getElementById("routineModal").classList.add("hidden");
}

/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* Load saved data */
    loadHealthData();
    loadRoutines();

    /* Page Navigation */
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.onclick = () => showPage(btn.dataset.page);
    });

    showPage("calendar");

    /* Render calendar */
    renderCalendar(healthState.today);

    /* Routine */
    renderRoutineList();

    const addRoutineBtn = document.getElementById("addRoutineBtn");
    const closeRoutineBtn = document.getElementById("closeRoutineModal");
    const saveRoutineBtn = document.getElementById("saveRoutineBtn");

    if (addRoutineBtn) addRoutineBtn.onclick = openRoutineModal;
    if (closeRoutineBtn) closeRoutineBtn.onclick = closeRoutineModal;
    if (saveRoutineBtn) {
        saveRoutineBtn.onclick = () => {
            const name = document.getElementById("routineNameInput").value.trim();
            if (name) {
                healthState.routines.push({ name, exercises: [] });
                saveRoutines();
                renderRoutineList();
                closeRoutineModal();
            }
        };
    }

    /* Session */
    const startExerciseBtn = document.getElementById("startExerciseBtn");
    const closeSessionBtn  = document.getElementById("closeSessionModal");

    if (startExerciseBtn) {
        startExerciseBtn.onclick = () => {
            buildExerciseSelect();
            openSessionModal();
        };
    }
    if (closeSessionBtn) {
        closeSessionBtn.onclick = closeSessionModal;
    }

    renderSessionList();
});
