/* ============================================================
   POKERUN WEIGHT HOME LOGIC (Firebase Version + Missions & Coins)
   - Weekly Summary & Streak Calculation (Realtime DB)
   - Quick Start: Routine Fetch -> Session -> Save to Firebase
   - Mission & Coin Reward System
   ============================================================ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, push, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { 
    apiKey: "AIzaSyAbHwLLXIH8rBQ8gNMVqE5SE208aIbfFZ0", 
    authDomain: "pokbattle.firebaseapp.com", 
    databaseURL: "https://pokbattle-default-rtdb.firebaseio.com", 
    projectId: "pokbattle" 
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);

// 상태 변수
let currentUser = null;
let activeRoutine = []; 
let restTime = 60;      
let timerInterval = null;
let currentRest = 0;    

// 미션 및 코인 변수
let userCoins = 0;
let claimedMissions = {};
let userCurrentStats = { todayVolume: 0, todaySets: 0, todaySessionCount: 0, weeklyVolume: 0, streak: 0 };

// 난이도별 10개 미션 (1,000 ~ 5,000 코인)
const WEIGHT_MISSIONS = [
    { id: 'm1', title: '[초급] 첫 걸음', desc: '오늘 운동 1회 완료', reward: 1000, check: (s) => s.todaySessionCount >= 1 },
    { id: 'm2', title: '[초급] 라이트급', desc: '오늘 총 볼륨 1,000kg 달성', reward: 1200, check: (s) => s.todayVolume >= 1000 },
    { id: 'm3', title: '[초급] 세트 정복자', desc: '오늘 총 10세트 완료', reward: 1500, check: (s) => s.todaySets >= 10 },
    { id: 'm4', title: '[중급] 웰터급', desc: '오늘 총 볼륨 3,000kg 달성', reward: 2000, check: (s) => s.todayVolume >= 3000 },
    { id: 'm5', title: '[중급] 꾸준함', desc: '연속 운동(Streak) 3일 달성', reward: 2500, check: (s) => s.streak >= 3 },
    { id: 'm6', title: '[중급] 미들급', desc: '오늘 총 볼륨 5,000kg 달성', reward: 3000, check: (s) => s.todayVolume >= 5000 },
    { id: 'm7', title: '[상급] 헤비급', desc: '오늘 총 볼륨 10,000kg 달성', reward: 3500, check: (s) => s.todayVolume >= 10000 },
    { id: 'm8', title: '[상급] 주간 챔피언', desc: '이번 주 총 볼륨 20,000kg 달성', reward: 4000, check: (s) => s.weeklyVolume >= 20000 },
    { id: 'm9', title: '[마스터] 철인', desc: '연속 운동(Streak) 5일 달성', reward: 4500, check: (s) => s.streak >= 5 },
    { id: 'm10', title: '[마스터] 몬스터', desc: '오늘 총 볼륨 20,000kg 달성', reward: 5000, check: (s) => s.todayVolume >= 20000 }
];

// Dummy Friends (소셜 기능은 나중에 구현)
const DUMMY_FEED = [
    { name: "헬창김씨", avatar: "김", date: "방금 전", volume: "12,400kg", photo: "운동사진 예시", exercises: [{ name: "벤치 프레스", detail: "80kg x 8회 x 5세트" }] },
    { name: "득근요정", avatar: "득", date: "1시간 전", volume: "8,500kg", photo: "오운완!", exercises: [{ name: "스쿼트", detail: "100kg x 5회 x 5세트" }] }
];

// 초기화
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        updateHomeStats(); // 통계 로드
        loadUserCoinsAndMissions(); // 코인 및 미션 로드
    } else {
        // 로그인 안되어 있으면 로그인 페이지로? (여기선 일단 알림만)
        // alert("로그인이 필요합니다.");
    }
});

window.onload = function() {
    renderFriendFeed();

    // 버튼 이벤트
    document.getElementById('btnQuickStart').addEventListener('click', openRoutineSelect);
    document.getElementById('closeRoutineSelectBtn').addEventListener('click', () => {
        document.getElementById('routineSelectModal').classList.add('hidden');
    });
    document.getElementById('btnStartEmpty').addEventListener('click', () => {
        startSession([], "자유 운동");
    });

    // 미션 모달 열기/닫기 이벤트
    document.getElementById('btnOpenMission').addEventListener('click', () => {
        renderMissions();
        document.getElementById('missionModal').classList.remove('hidden');
    });
    document.getElementById('closeMissionBtn').addEventListener('click', () => {
        document.getElementById('missionModal').classList.add('hidden');
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

// --- 1. 통계 (Firebase) ---
async function updateHomeStats() {
    if(!currentUser) return;

    // 1) 이번주 볼륨 및 오늘 기록 계산
    const now = new Date();
    // 이번주 월요일 찾기
    const day = now.getDay(); 
    const diff = now.getDate() - day + (day == 0 ? -6 : 1); 
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0,0,0,0);

    // 이번달 키 (YYYY-MM)
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const todayStr = `${yearMonth}-${String(now.getDate()).padStart(2,'0')}`;
    
    let weeklyVol = 0;
    let todayVol = 0;
    let todaySetsCount = 0;
    let todaySessions = 0;
    let records = [];

    // 이번달 기록 가져오기
    try {
        const snapshot = await get(ref(db, `users/${currentUser.uid}/records/${yearMonth}`));
        if(snapshot.exists()) {
            const data = snapshot.val();
            // data structure: { "2023-12-15": { pushId: {...} }, ... }
            Object.keys(data).forEach(dateKey => {
                const dayRecords = data[dateKey];
                Object.values(dayRecords).forEach(rec => {
                    const recDate = new Date(rec.date || rec.id);
                    if(recDate >= monday) {
                        weeklyVol += parseFloat(rec.totalVolume || 0);
                    }
                    if(dateKey === todayStr) {
                        todayVol += parseFloat(rec.totalVolume || 0);
                        todaySessions++;
                        if(rec.exercises) {
                            rec.exercises.forEach(ex => {
                                todaySetsCount += (ex.sets || (ex.setsData ? ex.setsData.length : 0));
                            });
                        }
                    }
                    records.push(rec); // 스트릭 계산용
                });
            });
        }
    } catch(e) { console.error("Stats Error:", e); }

    document.getElementById('weeklyVolume').innerText = weeklyVol.toLocaleString() + " kg";

    // 2) 스트릭 및 미션용 통계 계산
    const currentStreak = calculateStreak(records);

    userCurrentStats = {
        todayVolume: todayVol,
        todaySets: todaySetsCount,
        todaySessionCount: todaySessions,
        weeklyVolume: weeklyVol,
        streak: currentStreak
    };
}

function calculateStreak(records) {
    // 기록이 있는 날짜들을 Set으로 만듦 (YYYY-MM-DD)
    const recordDates = new Set();
    records.forEach(r => {
        const d = new Date(r.date || r.id);
        const dateStr = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        recordDates.add(dateStr);
    });

    let streak = 0;
    const checkDate = new Date(); // 오늘부터 역순 체크

    // 최대 30일까지만 체크
    for(let i=0; i<30; i++) {
        const y = checkDate.getFullYear();
        const m = checkDate.getMonth() + 1;
        const d = checkDate.getDate();
        const key = `${y}-${m}-${d}`;

        if(recordDates.has(key)) {
            streak++;
        } else {
            if (i === 0 && !recordDates.has(key)) {
                // 오늘 안함. 어제 확인해봐야 함. 일단 pass
            } else {
                break;
            }
        }
        checkDate.setDate(checkDate.getDate() - 1);
    }
    document.getElementById('streakDays').innerText = streak + " Day";
    return streak;
}

// --- 2. 루틴 불러오기 (Firebase) ---
async function openRoutineSelect() {
    if(!currentUser) return alert("로그인 필요");
    
    const list = document.getElementById('selectRoutineList');
    list.innerHTML = '<li style="padding:15px; text-align:center; color:#999;">로딩 중...</li>';
    document.getElementById('routineSelectModal').classList.remove('hidden');

    try {
        const snap = await get(ref(db, `users/${currentUser.uid}/routines`));
        list.innerHTML = '';
        
        if(!snap.exists()) {
            list.innerHTML = '<li style="padding:15px; text-align:center; color:#999;">저장된 루틴이 없습니다.</li>';
            return;
        }

        const routines = snap.val(); // Object
        Object.values(routines).forEach(r => {
            const li = document.createElement('li');
            li.className = 'select-item';
            li.innerText = r.name;
            li.onclick = () => startSession(JSON.parse(JSON.stringify(r.exercises)), r.name);
            list.appendChild(li);
        });

    } catch(e) {
        console.error(e);
        list.innerHTML = '<li style="padding:15px; text-align:center; color:red;">불러오기 실패</li>';
    }
}

// --- 3. 세션 로직 (로컬 상태 관리) ---
function startSession(exercises, routineName) {
    document.getElementById('routineSelectModal').classList.add('hidden');
    document.getElementById('sessionModal').classList.remove('hidden');
    document.getElementById('sessionTitle').innerText = routineName;
    
    activeRoutine = exercises;
    // 세트 데이터 초기화
    activeRoutine.forEach(ex => {
        if(!ex.setsData) {
            ex.setsData = [];
            for(let i=0; i<ex.sets; i++) {
                ex.setsData.push({ kg: ex.kg || 0, reps: ex.reps || 0, done: false });
            }
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
                        <span class="material-icons" style="font-size:12px;">close</span> 삭제
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

// 전역 함수 연결 (HTML onclick 용)
window.updateSetData = (exIdx, sIdx, key, val) => { activeRoutine[exIdx].setsData[sIdx][key] = val; };
window.toggleSet = (exIdx, sIdx) => {
    const set = activeRoutine[exIdx].setsData[sIdx];
    set.done = !set.done;
    renderSessionBody(); 
    if (set.done) startRestTimer();
};
window.deleteSet = (exIdx, sIdx) => { if(confirm("이 세트를 삭제하시겠습니까?")) { activeRoutine[exIdx].setsData.splice(sIdx, 1); renderSessionBody(); } };
window.completeAllSets = (exIdx) => { activeRoutine[exIdx].setsData.forEach(set => set.done = true); renderSessionBody(); startRestTimer(); };
window.deleteExercise = (exIdx) => { if(confirm("이 종목을 삭제하시겠습니까?")) { activeRoutine.splice(exIdx, 1); renderSessionBody(); } };

// --- 4. 타이머 & 저장 ---
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

async function finishSession() {
    if(!currentUser) return alert("로그인 필요");
    if(confirm("운동을 완료하고 저장하시겠습니까?")) {
        
        // 1. 데이터 정리
        let totalVolume = 0;
        activeRoutine.forEach(ex => {
            ex.setsData.filter(s => s.done).forEach(s => totalVolume += (parseFloat(s.kg) * parseFloat(s.reps)));
        });

        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        const dateStr = `${yearMonth}-${String(now.getDate()).padStart(2,'0')}`;

        const record = {
            id: Date.now(), // 타임스탬프
            date: dateStr,
            routineName: document.getElementById('sessionTitle').innerText,
            totalVolume: totalVolume,
            exercises: activeRoutine.map(ex => ({ 
                name: ex.name, 
                part: ex.part || '',
                sets: ex.setsData.filter(s => s.done).length,
                setsData: ex.setsData 
            })),
            fullData: activeRoutine // 원본 데이터 보존
        };

        // 2. Firebase 저장
        // 경로: users/{uid}/records/{YYYY-MM}/{YYYY-MM-DD}/{pushId}
        try {
            const recordsRef = ref(db, `users/${currentUser.uid}/records/${yearMonth}/${dateStr}`);
            const newRef = push(recordsRef);
            await set(newRef, record);

            alert(`저장 완료! 오늘 볼륨: ${totalVolume.toLocaleString()}kg 🔥`);
            document.getElementById('sessionModal').classList.add('hidden');
            stopTimer();
            await updateHomeStats(); // 홈 통계 및 미션 조건 즉시 갱신

        } catch(e) {
            console.error(e);
            alert("저장 중 오류가 발생했습니다.");
        }
    }
}

function renderFriendFeed() {
    const listEl = document.getElementById('friendFeedList');
    listEl.innerHTML = '';
    DUMMY_FEED.forEach(f => {
        const li = document.createElement('li');
        li.className = 'feed-item';
        let exRows = f.exercises.map(e => `<div class="fr-row"><span class="fr-name">${e.name}</span><span class="fr-detail">${e.detail}</span></div>`).join('');
        li.innerHTML = `
            <div class="f-header">
                <div class="f-user"><div class="f-avatar">${f.avatar}</div><div class="f-name">${f.name}</div></div>
                <div class="f-vol">${f.volume}</div>
            </div>
            <div class="f-photo">${f.photo}</div>
            <div class="f-routine">${exRows}</div>
        `;
        listEl.appendChild(li);
    });
}

// --- 5. 미션 및 코인 처리 로직 ---
async function loadUserCoinsAndMissions() {
    if(!currentUser) return;
    try {
        const coinSnap = await get(ref(db, `users/${currentUser.uid}/coins`));
        userCoins = coinSnap.exists() ? coinSnap.val() : 0;
        document.getElementById('userCoinDisplay').innerText = `🪙 ${userCoins.toLocaleString()}`;

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const missionSnap = await get(ref(db, `users/${currentUser.uid}/claimedMissions/${todayStr}`));
        claimedMissions = missionSnap.exists() ? missionSnap.val() : {};
    } catch(e) { console.error("Coin Load Error:", e); }
}

function renderMissions() {
    const listEl = document.getElementById('missionList');
    if(!listEl) return;
    listEl.innerHTML = '';

    WEIGHT_MISSIONS.forEach(m => {
        const isCompleted = m.check(userCurrentStats);
        const isClaimed = !!claimedMissions[m.id];

        const li = document.createElement('li');
        li.className = 'mission-item';

        let btnHtml = '';
        if (isClaimed) {
            btnHtml = `<button class="btn-claim completed" disabled>완료됨</button>`;
        } else if (isCompleted) {
            btnHtml = `<button class="btn-claim" onclick="claimMission('${m.id}', ${m.reward})">보상 받기</button>`;
        } else {
            btnHtml = `<button class="btn-claim" disabled>진행 중</button>`;
        }

        li.innerHTML = `
            <div class="m-info">
                <div class="m-title">${m.title}</div>
                <div class="m-desc">${m.desc}</div>
                <div class="m-reward">+🪙 ${m.reward.toLocaleString()} 코인</div>
            </div>
            <div>${btnHtml}</div>
        `;
        listEl.appendChild(li);
    });
}

window.claimMission = async (missionId, reward) => {
    if(!currentUser) return;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    try {
        userCoins += reward;
        await set(ref(db, `users/${currentUser.uid}/coins`), userCoins);

        claimedMissions[missionId] = true;
        await set(ref(db, `users/${currentUser.uid}/claimedMissions/${todayStr}/${missionId}`), true);

        document.getElementById('userCoinDisplay').innerText = `🪙 ${userCoins.toLocaleString()}`;
        alert(`🎉 ${reward.toLocaleString()} 코인을 받았습니다!`);
        renderMissions();
    } catch(e) {
        console.error("Claim Error:", e);
    }
};
