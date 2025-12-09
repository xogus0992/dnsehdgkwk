/* ============================================================
   POKERUN CALENDAR & SESSION LOGIC (FINAL v3)
   - Layout Optimized: Inputs fill width (flex:1)
   - Edit History & Delete Exercise features included
   ============================================================ */

// 상태
let currDate = new Date();
let selectedDay = null;
let activeRoutine = []; 
let editingRecordId = null;

let restTime = 60;      
let timerInterval = null;
let currentRest = 0;    

window.onload = function() {
    renderCalendar();
    
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        currDate.setMonth(currDate.getMonth() - 1);
        selectedDay = null; renderCalendar(); renderDailyList();
    });
    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        currDate.setMonth(currDate.getMonth() + 1);
        selectedDay = null; renderCalendar(); renderDailyList();
    });

    document.getElementById('btnStartWorkout').addEventListener('click', () => {
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

// --- 캘린더 ---
function renderCalendar() {
    const year = currDate.getFullYear();
    const month = currDate.getMonth();
    
    document.getElementById('currentMonthLabel').innerText = `${year}. ${String(month+1).padStart(2,'0')}`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    const records = JSON.parse(localStorage.getItem('myWorkoutRecords') || "[]");
    const dailyVol = {}; 

    records.forEach(rec => {
        const d = new Date(rec.id);
        if(d.getFullYear() === year && d.getMonth() === month) {
            const dayKey = d.getDate();
            if(!dailyVol[dayKey]) dailyVol[dayKey] = 0;
            dailyVol[dayKey] += parseFloat(rec.totalVolume);
        }
    });

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    for(let i=0; i<firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell empty';
        grid.appendChild(empty);
    }

    const today = new Date();
    for(let day=1; day<=lastDate; day++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        
        if(year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            cell.classList.add('today');
        }
        if(selectedDay === day) {
            cell.classList.add('selected-day');
        }
        if(dailyVol[day]) {
            cell.classList.add('has-record');
        }

        let volHtml = dailyVol[day] ? `<div class="day-vol">${(dailyVol[day]/1000).toFixed(1)}t</div>` : ''; 
        if(dailyVol[day] < 1000) volHtml = `<div class="day-vol">${dailyVol[day]}kg</div>`;

        cell.innerHTML = `<span class="day-num">${day}</span>${volHtml}`;
        
        cell.onclick = () => {
            selectedDay = day;
            renderCalendar();
            renderDailyList();
        };
        grid.appendChild(cell);
    }
}

// --- 리스트 ---
function renderDailyList() {
    const listEl = document.getElementById('dailyWorkoutList');
    const label = document.getElementById('selectedDateText');
    listEl.innerHTML = '';

    if (!selectedDay) {
        label.innerText = "오늘";
        return;
    }
    label.innerText = `${currDate.getMonth()+1}월 ${selectedDay}일`;

    const records = JSON.parse(localStorage.getItem('myWorkoutRecords') || "[]");
    const targetRecords = records.filter(rec => {
        const d = new Date(rec.id);
        return d.getFullYear() === currDate.getFullYear() && 
               d.getMonth() === currDate.getMonth() && 
               d.getDate() === selectedDay;
    });

    if(targetRecords.length === 0) {
        listEl.innerHTML = '<li style="text-align:center; padding:20px; color:#999;">운동 기록이 없습니다.</li>';
        return;
    }

    targetRecords.forEach(rec => {
        const li = document.createElement('li');
        li.className = 'workout-item';
        li.innerHTML = `
            <div>
                <div class="wi-name">${rec.routineName}</div>
                <div class="wi-vol">${rec.exercises.length} 종목 수행</div>
            </div>
            <div class="wi-total">${rec.totalVolume} kg</div>
        `;
        li.onclick = () => openSessionForEdit(rec);
        listEl.appendChild(li);
    });
}

function openSessionForEdit(record) {
    editingRecordId = record.id; 
    document.getElementById('routineSelectModal').classList.add('hidden');
    document.getElementById('sessionModal').classList.remove('hidden');
    document.getElementById('sessionTitle').innerText = record.routineName + " (수정)";
    
    activeRoutine = JSON.parse(JSON.stringify(record.fullData || [])); 
    renderSessionBody();
    resetTimerUI();
}

// --- 세션 ---
function startSession(exercises, routineName = "자유 운동") {
    editingRecordId = null;
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

window.updateSetData = function(exIdx, sIdx, key, val) {
    activeRoutine[exIdx].setsData[sIdx][key] = val;
};

window.toggleSet = function(exIdx, sIdx) {
    const set = activeRoutine[exIdx].setsData[sIdx];
    set.done = !set.done;
    renderSessionBody(); 
    if (set.done) startRestTimer();
};

window.deleteSet = function(exIdx, sIdx) {
    if(confirm("이 세트를 삭제하시겠습니까?")) {
        activeRoutine[exIdx].setsData.splice(sIdx, 1);
        renderSessionBody();
    }
};

window.completeAllSets = function(exIdx) {
    activeRoutine[exIdx].setsData.forEach(set => set.done = true);
    renderSessionBody();
    startRestTimer();
};

window.deleteExercise = function(exIdx) {
    if(confirm("이 종목을 루틴에서 제외하시겠습니까?")) {
        activeRoutine.splice(exIdx, 1);
        renderSessionBody();
    }
};

// --- 타이머 ---
function adjustTimer(sec) {
    restTime += sec;
    if(restTime < 0) restTime = 0;
    resetTimerUI();
}

function resetTimerUI() {
    stopTimer();
    currentRest = restTime;
    updateTimerDisplay(currentRest);
}

function startRestTimer() {
    stopTimer();
    currentRest = restTime; 
    updateTimerDisplay(currentRest);
    document.getElementById('timerPath').style.strokeDasharray = "100, 100";

    timerInterval = setInterval(() => {
        currentRest--;
        updateTimerDisplay(currentRest);
        const percentage = (currentRest / restTime) * 100;
        document.getElementById('timerPath').style.strokeDasharray = `${percentage}, 100`;

        if (currentRest <= 0) {
            stopTimer();
            alert("휴식 끝! 다음 세트 시작하세요! 💪");
        }
    }, 1000);
}

function stopTimer() {
    if(timerInterval) clearInterval(timerInterval);
}

function updateTimerDisplay(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    document.getElementById('timerDisplayStr').innerText = `${m}:${String(s).padStart(2,'0')}`;
}

// --- 저장 ---
function finishSession() {
    if(confirm("운동을 완료하고 기록을 저장하시겠습니까?")) {
        let totalVolume = 0;
        activeRoutine.forEach(ex => {
            const doneSets = ex.setsData.filter(s => s.done);
            if(doneSets.length > 0) {
                let exVol = 0;
                doneSets.forEach(s => exVol += (parseFloat(s.kg) * parseFloat(s.reps)));
                totalVolume += exVol;
            }
        });

        const record = {
            id: editingRecordId ? editingRecordId : Date.now(),
            routineName: document.getElementById('sessionTitle').innerText.replace(" (수정)", ""),
            totalVolume: totalVolume,
            exercises: activeRoutine.map(ex => ({ 
                name: ex.name,
                sets: ex.setsData.filter(s => s.done).length
            })),
            fullData: activeRoutine 
        };

        let records = JSON.parse(localStorage.getItem('myWorkoutRecords') || "[]");
        
        if (editingRecordId) {
            const idx = records.findIndex(r => r.id === editingRecordId);
            if(idx !== -1) records[idx] = record;
        } else {
            records.push(record);
        }

        localStorage.setItem('myWorkoutRecords', JSON.stringify(records));
        alert(`저장 완료! 오늘 볼륨: ${totalVolume}kg 🔥`);
        
        document.getElementById('sessionModal').classList.add('hidden');
        stopTimer();
        renderCalendar(); 
        renderDailyList();
    }
}

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