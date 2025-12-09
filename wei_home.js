/* ============================================================
   POKERUN WEIGHT HOME LOGIC
   - Weekly Summary & Streak Calculation
   - Friend Feed (Dummy Data)
   - Quick Start (Integrated Session Logic)
   ============================================================ */

// 상태 변수 (세션용)
let activeRoutine = []; 
let restTime = 60;      
let timerInterval = null;
let currentRest = 0;    

// Dummy Friends
const DUMMY_FEED = [
    {
        name: "헬창김씨", avatar: "김", date: "방금 전",
        volume: "12,400kg", photo: "운동사진 예시", 
        exercises: [
            { name: "벤치 프레스", detail: "80kg x 8회 x 5세트" },
            { name: "인클라인 덤벨", detail: "30kg x 12회 x 4세트" }
        ]
    },
    {
        name: "득근요정", avatar: "득", date: "1시간 전",
        volume: "8,500kg", photo: "오운완!", 
        exercises: [
            { name: "스쿼트", detail: "100kg x 5회 x 5세트" },
            { name: "레그 익스텐션", detail: "40kg x 15회 x 4세트" }
        ]
    }
];

window.onload = function() {
    renderWeeklySummary();
    renderFriendFeed();

    // 버튼 이벤트
    document.getElementById('btnQuickStart').addEventListener('click', () => {
        renderRoutineSelect();
        document.getElementById('routineSelectModal').classList.remove('hidden');
    });
    
    document.getElementById('closeRoutineSelectBtn').addEventListener('click', () => {
        document.getElementById('routineSelectModal').classList.add('hidden');
    });
    document.getElementById('btnStartEmpty').addEventListener('click', () => {
        startSession([], "자유 운동");
    });

    document.getElementById('closeSessionBtn').addEventListener('click', () => {
        if(confirm("운동을 취소하시겠습니까? 저장되지 않습니다.")) {
            document.getElementById('sessionModal').classList.add('hidden');
            stopTimer();
        }
    });
    document.getElementById('btnFinishSession').addEventListener('click', finishSession);

    // 타이머
    document.getElementById('btnMinus30').addEventListener('click', () => adjustTimer(-30));
    document.getElementById('btnPlus30').addEventListener('click', () => adjustTimer(30));
    document.getElementById('timerDisplayStr').addEventListener('click', () => {
        const newTime = prompt("휴식 시간(초)을 입력하세요:", restTime);
        if(newTime !== null) {
            const parsed = parseInt(newTime);
            if(!isNaN(parsed) && parsed > 0) {
                restTime = parsed;
                resetTimerUI();
            }
        }
    });
};

// --- 1. 상단 요약 (실제 데이터 연동) ---
function renderWeeklySummary() {
    const records = JSON.parse(localStorage.getItem('myWorkoutRecords') || "[]");
    let weeklyVol = 0;
    
    // 이번주 월요일 찾기
    const now = new Date();
    const day = now.getDay(); 
    const diff = now.getDate() - day + (day == 0 ? -6 : 1); 
    const monday = new Date(now.setDate(diff));
    monday.setHours(0,0,0,0);

    // 연속일수 계산 (단순 로직: 오늘부터 역순으로 기록 있는지 체크)
    let streak = 0;
    for(let i=0; i<365; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - i);
        const hasRecord = records.some(r => {
            const d = new Date(r.id);
            return d.getFullYear() === checkDate.getFullYear() && 
                   d.getMonth() === checkDate.getMonth() && 
                   d.getDate() === checkDate.getDate();
        });
        if(hasRecord) streak++;
        else if (i > 0) break; // 오늘/어제 기록 없으면 중단 (오늘 안했어도 어제 했으면 1일차로 칠수도 있지만 엄격하게)
    }
    // 오늘 안했어도 어제 했으면 스트릭 유지해주는 로직은 복잡하니 패스, 일단 있는 날짜만 카운트

    records.forEach(rec => {
        if(rec.id >= monday.getTime()) {
            weeklyVol += parseFloat(rec.totalVolume);
        }
    });

    document.getElementById('weeklyVolume').innerText = weeklyVol.toLocaleString() + " kg";
    document.getElementById('streakDays').innerText = streak + " 일";
}

// --- 2. 친구 피드 렌더링 ---
function renderFriendFeed() {
    const listEl = document.getElementById('friendFeedList');
    listEl.innerHTML = '';

    DUMMY_FEED.forEach(f => {
        const li = document.createElement('li');
        li.className = 'feed-item';
        
        let exRows = f.exercises.map(e => `
            <div class="fr-row">
                <span class="fr-name">${e.name}</span>
                <span class="fr-detail">${e.detail}</span>
            </div>
        `).join('');

        li.innerHTML = `
            <div class="f-header">
                <div class="f-user">
                    <div class="f-avatar">${f.avatar}</div>
                    <div class="f-name">${f.name}</div>
                </div>
                <div class="f-vol">Total ${f.volume}</div>
            </div>
            <div class="f-photo">${f.photo} (이미지)</div>
            <div class="f-routine">
                ${exRows}
            </div>
        `;
        listEl.appendChild(li);
    });
}

// --- 3. 운동 세션 로직 (Calendar.js에서 복사됨) ---
function renderRoutineSelect() {
    const list = document.getElementById('selectRoutineList');
    list.innerHTML = '';
    const routines = JSON.parse(localStorage.getItem('myRoutines') || "[]");

    if(routines.length === 0) {
        list.innerHTML = '<li style="padding:10px; text-align:center; color:#999;">저장된 루틴이 없습니다.</li>';
        return;
    }

    routines.forEach(r => {
        const li = document.createElement('li');
        li.className = 'select-item';
        li.innerText = r.name;
        li.onclick = () => startSession(JSON.parse(JSON.stringify(r.exercises)), r.name);
        list.appendChild(li);
    });
}

function startSession(exercises, routineName) {
    document.getElementById('routineSelectModal').classList.add('hidden');
    document.getElementById('sessionModal').classList.remove('hidden');
    document.getElementById('sessionTitle').innerText = routineName;
    
    activeRoutine = exercises;
    activeRoutine.forEach(ex => {
        ex.setsData = [];
        for(let i=0; i<ex.sets; i++) {
            ex.setsData.push({ kg: ex.kg, reps: ex.reps, done: false });
        }
    });

    renderSessionBody();
    resetTimerUI();
}

function renderSessionBody() {
    const container = document.getElementById('sessionExerciseList');
    container.innerHTML = '';

    activeRoutine.forEach((ex, exIdx) => {
        const card = document.createElement('div');
        card.className = 'session-card';
        
        const imgSrc = ex.image ? ex.image : ''; 
        const iconHtml = ex.image ? `<img src="${ex.image}" class="sc-img">` : `<span class="material-icons" style="color:#aaa;">fitness_center</span>`;

        let setRows = '';
        ex.setsData.forEach((set, sIdx) => {
            const isDone = set.done ? 'done' : '';
            setRows += `
                <div class="set-row">
                    <div class="set-num">${sIdx+1}</div>
                    <input type="number" class="set-input" value="${set.kg}" onchange="updateSetData(${exIdx}, ${sIdx}, 'kg', this.value)" ${set.done?'disabled':''}>
                    <span class="unit-txt">kg</span>
                    <input type="number" class="set-input" value="${set.reps}" onchange="updateSetData(${exIdx}, ${sIdx}, 'reps', this.value)" ${set.done?'disabled':''}>
                    <span class="unit-txt">회</span>
                    <button class="btn-set-action btn-check ${isDone}" onclick="toggleSet(${exIdx}, ${sIdx})">
                        <span class="material-icons">check</span>
                    </button>
                    <button class="btn-set-action btn-del" onclick="deleteSet(${exIdx}, ${sIdx})">
                        <span class="material-icons">close</span>
                    </button>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="sc-header">
                <div class="sc-left">
                    ${iconHtml}
                    <div class="sc-title">${ex.name}</div>
                </div>
                <div class="sc-actions">
                    <button class="btn-small-text complete" onclick="completeAllSets(${exIdx})">전체 완료</button>
                    <button class="btn-small-text delete" onclick="deleteExercise(${exIdx})">
                        <span class="material-icons" style="font-size:14px;">close</span> 종목 삭제
                    </button>
                </div>
            </div>
            <div class="set-list">
                ${setRows}
            </div>
        `;
        container.appendChild(card);
    });
}

// 데이터 업데이트 함수들 (전역)
window.updateSetData = (exIdx, sIdx, key, val) => { activeRoutine[exIdx].setsData[sIdx][key] = val; };
window.toggleSet = (exIdx, sIdx) => {
    const set = activeRoutine[exIdx].setsData[sIdx];
    set.done = !set.done;
    renderSessionBody(); 
    if (set.done) startRestTimer();
};
window.deleteSet = (exIdx, sIdx) => { if(confirm("삭제하시겠습니까?")) { activeRoutine[exIdx].setsData.splice(sIdx, 1); renderSessionBody(); } };
window.completeAllSets = (exIdx) => { activeRoutine[exIdx].setsData.forEach(set => set.done = true); renderSessionBody(); startRestTimer(); };
window.deleteExercise = (exIdx) => { if(confirm("종목을 삭제하시겠습니까?")) { activeRoutine.splice(exIdx, 1); renderSessionBody(); } };

// 타이머
function adjustTimer(sec) { restTime += sec; if(restTime < 0) restTime = 0; resetTimerUI(); }
function resetTimerUI() { stopTimer(); currentRest = restTime; updateTimerDisplay(currentRest); }
function startRestTimer() {
    stopTimer(); currentRest = restTime; updateTimerDisplay(currentRest);
    document.getElementById('timerPath').style.strokeDasharray = "100, 100";
    timerInterval = setInterval(() => {
        currentRest--; updateTimerDisplay(currentRest);
        const percentage = (currentRest / restTime) * 100;
        document.getElementById('timerPath').style.strokeDasharray = `${percentage}, 100`;
        if (currentRest <= 0) { stopTimer(); alert("휴식 끝! 다음 세트 시작하세요! 💪"); }
    }, 1000);
}
function stopTimer() { if(timerInterval) clearInterval(timerInterval); }
function updateTimerDisplay(sec) {
    const m = Math.floor(sec / 60); const s = sec % 60;
    document.getElementById('timerDisplayStr').innerText = `${m}:${String(s).padStart(2,'0')}`;
}

// 저장
function finishSession() {
    if(confirm("운동을 완료하고 저장하시겠습니까?")) {
        let totalVolume = 0;
        activeRoutine.forEach(ex => {
            ex.setsData.filter(s => s.done).forEach(s => totalVolume += (parseFloat(s.kg) * parseFloat(s.reps)));
        });

        const record = {
            id: Date.now(),
            routineName: document.getElementById('sessionTitle').innerText,
            totalVolume: totalVolume,
            exercises: activeRoutine.map(ex => ({ name: ex.name, sets: ex.setsData.filter(s => s.done).length })),
            fullData: activeRoutine
        };

        let records = JSON.parse(localStorage.getItem('myWorkoutRecords') || "[]");
        records.push(record);
        localStorage.setItem('myWorkoutRecords', JSON.stringify(records));

        alert(`저장 완료! 오늘 볼륨: ${totalVolume}kg 🔥`);
        document.getElementById('sessionModal').classList.add('hidden');
        stopTimer();
        renderWeeklySummary(); // 요약 갱신
    }
}