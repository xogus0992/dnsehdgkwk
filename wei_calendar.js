/* ============================================================
   POKERUN CALENDAR & SESSION LOGIC (Firebase Version)
   - Layout Optimized: Inputs fill width (flex:1)
   - Edit History & Delete Exercise features included
   ============================================================ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, push, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { 
    apiKey: "AIzaSyAbHwLLXIH8rBQ8gNMVqE5SE208aIbfFZ0", 
    authDomain: "pokbattle.firebaseapp.com", 
    databaseURL: "https://pokbattle-default-rtdb.firebaseio.com", 
    projectId: "pokbattle" 
};

// 앱 초기화 확인
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);

// 상태 변수
let currentUser = null;
let currDate = new Date();
let selectedDay = null; // 숫자 (예: 15)
let activeRoutine = []; 
let editingRecordId = null; // 수정 시 Firebase Key
let editingDateKey = null;  // 수정 시 날짜 Key (YYYY-MM-DD)

let restTime = 60;      
let timerInterval = null;
let currentRest = 0;    

// DOM Elements Mapping
const els = {
    monthLabel: document.getElementById('currentMonthLabel'),
    grid: document.getElementById('calendarGrid'),
    dailyList: document.getElementById('dailyWorkoutList'),
    dateText: document.getElementById('selectedDateText'),
    
    // Modals
    routineModal: document.getElementById('routineSelectModal'),
    sessionModal: document.getElementById('sessionModal'),
    
    // Session UI
    sessionTitle: document.getElementById('sessionTitle'),
    sessionList: document.getElementById('sessionExerciseList'),
    timerDisplay: document.getElementById('timerDisplayStr'),
    timerPath: document.getElementById('timerPath')
};

// ----------------------------------------------------
// 초기화
// ----------------------------------------------------
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        renderCalendar();
    } else {
        els.grid.innerHTML = '<div style="grid-column:span 7; text-align:center; padding:20px;">로그인 필요</div>';
    }
});

window.onload = function() {
    // 달력 이동
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        currDate.setMonth(currDate.getMonth() - 1);
        selectedDay = null; renderCalendar(); renderDailyList();
    });
    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        currDate.setMonth(currDate.getMonth() + 1);
        selectedDay = null; renderCalendar(); renderDailyList();
    });

    // 세션 시작
    document.getElementById('btnStartWorkout').addEventListener('click', () => {
        if(!currentUser) return alert("로그인이 필요합니다.");
        renderRoutineSelect();
        els.routineModal.classList.remove('hidden');
    });
    document.getElementById('closeRoutineSelectBtn').addEventListener('click', () => {
        els.routineModal.classList.add('hidden');
    });
    document.getElementById('btnStartEmpty').addEventListener('click', () => {
        startSession([], "자유 운동");
    });

    // 세션 제어
    document.getElementById('closeSessionBtn').addEventListener('click', () => {
        if(confirm("운동을 취소하시겠습니까? 저장되지 않습니다.")) {
            els.sessionModal.classList.add('hidden');
            stopTimer();
        }
    });
    document.getElementById('btnFinishSession').addEventListener('click', finishSession);

    // 타이머
    document.getElementById('btnMinus30').addEventListener('click', () => adjustTimer(-30));
    document.getElementById('btnPlus30').addEventListener('click', () => adjustTimer(30));
    
    els.timerDisplay.addEventListener('click', () => {
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

// ----------------------------------------------------
// 1. 캘린더 로직 (Firebase)
// ----------------------------------------------------
async function renderCalendar() {
    if (!currentUser) return;
    const year = currDate.getFullYear();
    const month = currDate.getMonth();
    
    els.monthLabel.innerText = `${year}. ${String(month+1).padStart(2,'0')}`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // 월별 데이터 가져오기 (records/YYYY-MM)
    const monthKey = `${year}-${String(month+1).padStart(2,'0')}`;
    let monthlyData = {};
    
    try {
        const snap = await get(ref(db, `users/${currentUser.uid}/records/${monthKey}`));
        if (snap.exists()) monthlyData = snap.val();
    } catch(e) { console.error(e); }

    // 볼륨 계산 (일별 합계)
    const dailyVol = {};
    Object.keys(monthlyData).forEach(dateKey => { // dateKey: YYYY-MM-DD
        const dayNum = parseInt(dateKey.split('-')[2]);
        const sessions = monthlyData[dateKey];
        let total = 0;
        
        // sessions는 pushId로 된 객체
        Object.values(sessions).forEach(session => {
            total += parseFloat(session.totalVolume || 0);
        });
        dailyVol[dayNum] = total;
    });

    // 그리드 그리기
    els.grid.innerHTML = '';

    for(let i=0; i<firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell empty';
        els.grid.appendChild(empty);
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

        let volHtml = '';
        if(dailyVol[day]) {
            const vol = dailyVol[day];
            volHtml = vol >= 1000 
                ? `<div class="day-vol">${(vol/1000).toFixed(1)}t</div>` 
                : `<div class="day-vol">${vol}kg</div>`;
        }

        cell.innerHTML = `<span class="day-num">${day}</span>${volHtml}`;
        
        cell.onclick = () => {
            // UI 업데이트
            const prev = document.querySelector('.selected-day');
            if(prev) prev.classList.remove('selected-day');
            cell.classList.add('selected-day');
            
            selectedDay = day;
            renderDailyList();
        };
        els.grid.appendChild(cell);
    }
}

// ----------------------------------------------------
// 2. 리스트 로직 (Firebase)
// ----------------------------------------------------
async function renderDailyList() {
    els.dailyList.innerHTML = '';
    
    if (!selectedDay) {
        els.dateText.innerText = "오늘";
        return;
    }
    
    const year = currDate.getFullYear();
    const month = String(currDate.getMonth()+1).padStart(2,'0');
    const day = String(selectedDay).padStart(2,'0');
    const dateKey = `${year}-${month}-${day}`;
    
    els.dateText.innerText = `${parseInt(month)}월 ${parseInt(day)}일`;

    if(!currentUser) return;
    els.dailyList.innerHTML = '<li style="text-align:center; padding:20px; color:#aaa;">로딩 중...</li>';

    try {
        const snap = await get(ref(db, `users/${currentUser.uid}/records/${year}-${month}/${dateKey}`));
        els.dailyList.innerHTML = '';
        
        if (!snap.exists()) {
            els.dailyList.innerHTML = '<li style="text-align:center; padding:20px; color:#999;">운동 기록이 없습니다.</li>';
            return;
        }

        const data = snap.val(); // { pushId: sessionObj, ... }
        
        Object.entries(data).forEach(([key, session]) => {
            const li = document.createElement('li');
            li.className = 'workout-item';
            
            // exercises 개수
            const exCount = (session.exercises || []).length;
            
            li.innerHTML = `
                <div>
                    <div class="wi-name">${session.routineName}</div>
                    <div class="wi-vol">${exCount} 종목 수행</div>
                </div>
                <div class="wi-total">${session.totalVolume} kg</div>
            `;
            
            // 클릭 시 수정 모드 진입
            li.onclick = () => openSessionForEdit(key, dateKey, session);
            els.dailyList.appendChild(li);
        });

    } catch(e) {
        console.error(e);
        els.dailyList.innerHTML = '불러오기 실패';
    }
}

// ----------------------------------------------------
// 3. 수정 및 세션 시작
// ----------------------------------------------------
function openSessionForEdit(recordId, dateKey, sessionData) {
    editingRecordId = recordId;
    editingDateKey = dateKey;
    
    els.routineModal.classList.add('hidden');
    els.sessionModal.classList.remove('hidden');
    
    els.sessionTitle.innerText = sessionData.routineName + " (수정)";
    
    // fullData가 있으면 사용, 없으면 exercise 데이터 파싱
    if (sessionData.fullData) {
        activeRoutine = JSON.parse(JSON.stringify(sessionData.fullData));
    } else {
        // 하위 호환성 (fullData 없는 옛날 데이터인 경우)
        activeRoutine = (sessionData.exercises || []).map(ex => ({
            ...ex,
            setsData: Array(ex.sets).fill({ kg:0, reps:0, done:true }) // 임시 복구
        }));
    }

    renderSessionBody();
    resetTimerUI();
}

function startSession(exercises, routineName = "자유 운동") {
    editingRecordId = null;
    editingDateKey = null;

    els.routineModal.classList.add('hidden');
    els.sessionModal.classList.remove('hidden');
    els.sessionTitle.innerText = routineName;
    
    // 데이터 초기화
    activeRoutine = exercises.map(ex => {
        const setsData = [];
        const count = ex.sets || 3; // 기본 3세트
        for(let i=0; i<count; i++) {
            setsData.push({ kg: ex.kg || 0, reps: ex.reps || 10, done: false });
        }
        return {
            name: ex.name,
            image: ex.image,
            setsData: setsData
        };
    });

    // 빈 루틴 시작 시 기본 종목 하나 추가 권장? (일단 빈 상태로 시작)
    if (activeRoutine.length === 0 && routineName === "자유 운동") {
         // UI에서 추가 버튼 유도
    }

    renderSessionBody();
    resetTimerUI();
}

// ----------------------------------------------------
// 4. 세션 UI 렌더링 & Window 함수 바인딩
// ----------------------------------------------------
function renderSessionBody() {
    const container = els.sessionList;
    container.innerHTML = '';

    if(activeRoutine.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#999;">등록된 종목이 없습니다.<br>아래 버튼을 눌러 추가하세요.</div>`;
    }

    activeRoutine.forEach((ex, exIdx) => {
        const card = document.createElement('div');
        card.className = 'session-card';
        
        const iconHtml = ex.image 
            ? `<img src="${ex.image}" class="sc-img">` 
            : `<span class="material-icons" style="color:#aaa; font-size:20px;">fitness_center</span>`;

        let setRows = '';
        ex.setsData.forEach((set, sIdx) => {
            const isDone = set.done ? 'done' : '';
            // set.done이 true여도 수정 가능하게 disabled 제거함 (사용성 개선)
            setRows += `
                <div class="set-row">
                    <div class="set-num">${sIdx+1}</div>
                    <input type="number" class="set-input" value="${set.kg}" onchange="updateSetData(${exIdx}, ${sIdx}, 'kg', this.value)">
                    <span class="unit-txt">kg</span>
                    <input type="number" class="set-input" value="${set.reps}" onchange="updateSetData(${exIdx}, ${sIdx}, 'reps', this.value)">
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
                    <button class="btn-small-text" onclick="addSet(${exIdx})">+ 세트</button>
                    <button class="btn-small-text complete" onclick="completeAllSets(${exIdx})">전체 완료</button>
                    <button class="btn-small-text delete" onclick="deleteExercise(${exIdx})">삭제</button>
                </div>
            </div>
            <div class="set-list">
                ${setRows}
            </div>
        `;
        container.appendChild(card);
    });

    // 종목 추가 버튼
    const btnAdd = document.createElement('div');
    btnAdd.innerHTML = `<button class="text-btn" style="width:100%; padding:15px; font-weight:bold; font-size:14px;">+ 종목 추가하기</button>`;
    btnAdd.onclick = openAddExercisePopup;
    container.appendChild(btnAdd);
}

// 모듈 스코프 밖에서 호출될 함수들 window에 바인딩
window.updateSetData = function(exIdx, sIdx, key, val) {
    activeRoutine[exIdx].setsData[sIdx][key] = Number(val);
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

window.addSet = function(exIdx) {
    const prev = activeRoutine[exIdx].setsData[activeRoutine[exIdx].setsData.length-1];
    activeRoutine[exIdx].setsData.push({
        kg: prev ? prev.kg : 0,
        reps: prev ? prev.reps : 10,
        done: false
    });
    renderSessionBody();
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

window.openAddExercisePopup = function() {
    const name = prompt("추가할 운동 이름을 입력하세요:");
    if(name) {
        activeRoutine.push({
            name: name,
            image: null,
            setsData: [{ kg:0, reps:10, done:false }]
        });
        renderSessionBody();
    }
};

// ----------------------------------------------------
// 5. 타이머 & 저장 로직
// ----------------------------------------------------
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
    els.timerDisplay.style.color = "var(--primary)";
    els.timerPath.style.strokeDasharray = "100, 100";

    timerInterval = setInterval(() => {
        currentRest--;
        updateTimerDisplay(currentRest);
        
        // 원형 차트 애니메이션
        const percentage = (currentRest / restTime) * 100;
        els.timerPath.style.strokeDasharray = `${percentage}, 100`;

        if (currentRest <= 0) {
            stopTimer();
            // 필요 시 오디오 재생 코드 추가 가능
        }
    }, 1000);
}

function stopTimer() {
    if(timerInterval) clearInterval(timerInterval);
    els.timerDisplay.style.color = "white";
}

function updateTimerDisplay(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    els.timerDisplay.innerText = `${m}:${String(s).padStart(2,'0')}`;
}

async function finishSession() {
    if(!currentUser) return alert("로그인이 필요합니다.");
    
    if(confirm("운동을 완료하고 기록을 저장하시겠습니까?")) {
        let totalVolume = 0;
        
        // 볼륨 계산 및 데이터 정리
        const exerciseSummary = activeRoutine.map(ex => {
            const doneSets = ex.setsData.filter(s => s.done);
            if(doneSets.length > 0) {
                let exVol = 0;
                doneSets.forEach(s => exVol += (parseFloat(s.kg) * parseFloat(s.reps)));
                totalVolume += exVol;
            }
            return {
                name: ex.name,
                sets: doneSets.length // 완료된 세트 수만 저장
            };
        });

        // 실제 저장될 전체 데이터 구조
        const recordData = {
            routineName: els.sessionTitle.innerText.replace(" (수정)", ""),
            totalVolume: totalVolume,
            exercises: exerciseSummary, // 요약본
            fullData: activeRoutine,    // 상세본 (재수정용)
            updatedAt: new Date().toISOString()
        };

        try {
            // 저장 경로: records/YYYY-MM/YYYY-MM-DD/{pushId}
            let targetRef;
            
            if (editingRecordId && editingDateKey) {
                // 기존 데이터 수정
                const [y, m, d] = editingDateKey.split('-');
                targetRef = ref(db, `users/${currentUser.uid}/records/${y}-${m}/${editingDateKey}/${editingRecordId}`);
                await update(targetRef, recordData);
            } else {
                // 신규 저장
                const now = new Date();
                const y = now.getFullYear();
                const m = String(now.getMonth()+1).padStart(2,'0');
                const d = String(now.getDate()).padStart(2,'0');
                
                targetRef = push(ref(db, `users/${currentUser.uid}/records/${y}-${m}/${y}-${m}-${d}`));
                await set(targetRef, {
                    ...recordData,
                    createdAt: now.toISOString()
                });
            }

            alert(`저장 완료! 오늘 볼륨: ${totalVolume}kg 🔥`);
            
            els.sessionModal.classList.add('hidden');
            stopTimer();
            
            // UI 갱신
            renderCalendar(); 
            // 만약 오늘 날짜가 선택되어 있었다면 리스트도 갱신
            if(selectedDay) renderDailyList();

        } catch(e) {
            console.error(e);
            alert("저장 실패: " + e.message);
        }
    }
}

// 루틴 목록 불러오기 (Firebase)
async function renderRoutineSelect() {
    const list = document.getElementById('selectRoutineList');
    list.innerHTML = '<li style="padding:10px;">로딩 중...</li>';
    
    try {
        const snap = await get(ref(db, `users/${currentUser.uid}/routines`));
        list.innerHTML = '';
        
        if (!snap.exists()) {
            list.innerHTML = '<li style="padding:10px; text-align:center; color:#999;">저장된 루틴이 없습니다.</li>';
            return;
        }

        const data = snap.val();
        Object.keys(data).forEach(key => {
            const r = data[key];
            const li = document.createElement('li');
            li.className = 'select-item';
            li.innerText = r.name;
            li.onclick = () => startSession(r.exercises || [], r.name);
            list.appendChild(li);
        });
    } catch(e) {
        list.innerHTML = '<li>불러오기 실패</li>';
    }
}