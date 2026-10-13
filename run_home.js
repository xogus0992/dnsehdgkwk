import { db, auth } from './firebase-service.js';
import { ref, get, child, set } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ============================================================
   POKERUN HOME LOGIC (FINAL v2.4 Firebase + Modules + Missions)
   - Connection: Firebase Realtime Database
   - Calendar: Fetches user history and aggregates by date.
   - Feed: Uses dummy data
   - Missions: Distance-based running missions with coins
   ============================================================ */

const KEY_VWORLD = '0E603DDF-E18F-371F-96E8-ECD87D4CA088';

// State
let currDate = new Date();
let selectedDay = null; 
let currentUser = null;
let userRecords = []; // 메모리에 저장된 전체 기록

// 미션 및 코인 변수
let userCoins = 0;
let claimedRunMissions = {};
let userRunStats = { todayDist: 0, totalDist: 0, todayRunCount: 0 };

// 🏃‍♂️ 거리별 난이도 10개 러닝 미션 (3km, 5km, 10km, 15km, 30km, 50km, 100km 등)
const RUNNING_MISSIONS = [
    { id: 'rm1', title: '[초급] 첫 달리기', desc: '오늘 1km 이상 러닝 달성', reward: 1000, check: (s) => s.todayDist >= 1.0 },
    { id: 'rm2', title: '[초급] 3K 도전', desc: '오늘 3km 이상 러닝 달성', reward: 1200, check: (s) => s.todayDist >= 3.0 },
    { id: 'rm3', title: '[초급] 5K 러너', desc: '오늘 5km 이상 러닝 달성', reward: 1500, check: (s) => s.todayDist >= 5.0 },
    { id: 'rm4', title: '[중급] 10K 러너', desc: '오늘 10km 이상 러닝 달성', reward: 2000, check: (s) => s.todayDist >= 10.0 },
    { id: 'rm5', title: '[중급] 15K 누적', desc: '누적 러닝 거리 15km 달성', reward: 2500, check: (s) => s.totalDist >= 15.0 },
    { id: 'rm6', title: '[중급] 하프 도전', desc: '오늘 15km 이상 러닝 달성', reward: 3000, check: (s) => s.todayDist >= 15.0 },
    { id: 'rm7', title: '[상급] 30K 누적', desc: '누적 러닝 거리 30km 달성', reward: 3500, check: (s) => s.totalDist >= 30.0 },
    { id: 'rm8', title: '[상급] 50K 누적', desc: '누적 러닝 거리 50km 달성', reward: 4000, check: (s) => s.totalDist >= 50.0 },
    { id: 'rm9', title: '[마스터] 80K 누적', desc: '누적 러닝 거리 80km 달성', reward: 4500, check: (s) => s.totalDist >= 80.0 },
    { id: 'rm10', title: '[마스터] 100K 전설', desc: '누적 러닝 거리 100km 달성', reward: 5000, check: (s) => s.totalDist >= 100.0 }
];

// Dummy Data (친구 피드용)
const DUMMY_FRIENDS = [
    { id: 1, name: "김철수", date: "어제", dist: "5.12", time: "32:10", pace: "6'15\"", cadence: "170", path: [[37.5665, 126.9780], [37.5675, 126.9800], [37.5655, 126.9820]] },
    { id: 2, name: "RunQueen", date: "2일 전", dist: "10.05", time: "55:40", pace: "5'32\"", cadence: "180", path: [[37.5547, 126.9707], [37.5560, 126.9720], [37.5530, 126.9750]] },
];

window.addEventListener('load', () => {
    // 1. 친구 피드 먼저 렌더링
    renderFriendFeed();

    // 2. 인증 체크 후 내 기록 로드
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadUserHistory(user.uid);
            loadUserCoinsAndMissions(user.uid);
        } else {
            document.getElementById('currentMonthLabel').innerText = "Login Required";
        }
    });

    // 버튼 이벤트 리스너
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        currDate.setMonth(currDate.getMonth() - 1);
        selectedDay = null; 
        closeDailyRecord();
        renderCalendar();
    });
    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        currDate.setMonth(currDate.getMonth() + 1);
        selectedDay = null;
        closeDailyRecord();
        renderCalendar();
    });
    document.getElementById('closeDailyBtn').addEventListener('click', () => {
        selectedDay = null;
        renderCalendar(); 
        closeDailyRecord();
    });

    // 미션 모달 이벤트
    document.getElementById('btnOpenMission').addEventListener('click', () => {
        renderMissions();
        document.getElementById('missionModal').classList.remove('hidden');
    });
    document.getElementById('closeMissionBtn').addEventListener('click', () => {
        document.getElementById('missionModal').classList.add('hidden');
    });
});

// --- 1. Firebase 데이터 로드 ---
function loadUserHistory(uid) {
    const dbRef = ref(db);
    get(child(dbRef, `users/${uid}/history`)).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            userRecords = Object.values(data);
        } else {
            userRecords = [];
        }
        calculateRunStats(); // 러닝 통계 계산 (미션용)
        renderCalendar(); // 데이터 로드 완료 후 캘린더 그리기
    }).catch((error) => {
        console.error("Home Data Load Error:", error);
    });
}

// 러닝 통계 집계 (오늘 거리 및 누적 거리)
function calculateRunStats() {
    const today = new Date();
    let todayD = 0;
    let totalD = 0;
    let todayCount = 0;

    userRecords.forEach(rec => {
        const d = new Date(rec.id);
        const dist = parseFloat(rec.dist || 0);
        totalD += dist;

        if(d.getFullYear() === today.getFullYear() && 
           d.getMonth() === today.getMonth() && 
           d.getDate() === today.getDate()) {
            todayD += dist;
            todayCount++;
        }
    });

    userRunStats = {
        todayDist: todayD,
        totalDist: totalD,
        todayRunCount: todayCount
    };
}

// --- 2. 캘린더 로직 ---
function renderCalendar() {
    const year = currDate.getFullYear();
    const month = currDate.getMonth();
    
    document.getElementById('currentMonthLabel').innerText = `${year}. ${String(month+1).padStart(2,'0')}`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    const dailySum = {};
    userRecords.forEach(rec => {
        const d = new Date(rec.id);
        if(d.getFullYear() === year && d.getMonth() === month) {
            const dayKey = d.getDate();
            if(!dailySum[dayKey]) dailySum[dayKey] = 0;
            dailySum[dayKey] += parseFloat(rec.dist);
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

        let distHtml = '';
        if(dailySum[day]) {
            distHtml = `<div class="day-dist">${dailySum[day].toFixed(1)}</div>`;
        }

        cell.innerHTML = `<span class="day-num">${day}</span>${distHtml}`;
        
        cell.onclick = () => {
            if(selectedDay === day) {
                selectedDay = null;
                closeDailyRecord();
            } else {
                selectedDay = day;
                openDailyRecord(day, year, month);
            }
            renderCalendar();
        };

        grid.appendChild(cell);
    }
}

// --- 3. 일별 상세 기록 ---
function openDailyRecord(day, year, month) {
    const container = document.getElementById('dailyRecordSection');
    const label = document.getElementById('selectedDateLabel');
    const listEl = document.getElementById('dailyRecordList');
    
    label.innerText = `${month+1}월 ${day}일의 활동`;
    listEl.innerHTML = '';
    
    const targetRecords = userRecords.filter(rec => {
        const d = new Date(rec.id);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

    targetRecords.sort((a,b) => b.id - a.id);

    if(targetRecords.length === 0) {
        listEl.innerHTML = '<li style="text-align:center; padding:15px; color:#999; font-size:13px;">기록이 없습니다.</li>';
    } else {
        targetRecords.forEach(rec => {
            const li = document.createElement('li');
            li.className = 'record-item'; 

            let svgPath = "";
            let allPoints = [];
            if(rec.path) {
                if(Array.isArray(rec.path)) {
                    rec.path.forEach(seg => {
                        if(Array.isArray(seg)) allPoints.push(...seg);
                        else allPoints.push(seg);
                    });
                }
            }

            if (allPoints.length > 0) {
                const lats = allPoints.map(p => p.lat);
                const lngs = allPoints.map(p => p.lng);
                const minLat = Math.min(...lats), maxLat = Math.max(...lats);
                const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
                const latRange = maxLat - minLat || 0.001;
                const lngRange = maxLng - minLng || 0.001;

                allPoints.forEach((p, i) => {
                    const y = 60 - ((p.lat - minLat) / latRange) * 60;
                    const x = ((p.lng - minLng) / lngRange) * 60;
                    svgPath += `${i===0?'M':'L'} ${x} ${y} `;
                });
            } else {
                 svgPath = "M 30 30 L 30 30";
            }

            const timeStr = new Date(rec.id).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

            li.innerHTML = `
                <div class="record-info">
                    <div class="r-date">${timeStr}</div> 
                    <div class="r-dist">${rec.dist} km</div>
                    <div class="r-pace">${rec.pace} /km</div>
                </div>
                <svg class="record-map-preview" viewBox="-5 -5 70 70">
                    <path d="${svgPath}" fill="none" stroke="#3586ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            
            listEl.appendChild(li);
        });
    }

    container.classList.remove('hidden');
}

function closeDailyRecord() {
    document.getElementById('dailyRecordSection').classList.add('hidden');
}

// --- 4. 친구 피드 (Dummy) ---
function renderFriendFeed() {
    const listEl = document.getElementById('friendList');
    listEl.innerHTML = '';

    DUMMY_FRIENDS.forEach((friend, index) => {
        const li = document.createElement('li');
        li.className = 'friend-card';
        
        li.innerHTML = `
            <div class="card-header">
                <div class="friend-profile">
                    <div class="avatar">${friend.name[0]}</div>
                    <div class="friend-name">${friend.name}</div>
                </div>
                <div class="run-date">${friend.date}</div>
            </div>
            <div id="friendMap${index}" class="card-map"></div>
            <div class="card-stats">
                <div class="stat-box"><span class="s-label">거리</span><span class="s-val">${friend.dist}km</span></div>
                <div class="stat-box"><span class="s-label">시간</span><span class="s-val">${friend.time}</span></div>
                <div class="stat-box"><span class="s-label">페이스</span><span class="s-val">${friend.pace}</span></div>
                <div class="stat-box"><span class="s-label">케이던스</span><span class="s-val">${friend.cadence}</span></div>
            </div>
        `;

        listEl.appendChild(li);

        setTimeout(() => {
            const mapId = `friendMap${index}`;
            const mapEl = document.getElementById(mapId);
            if(mapEl) {
                const fMap = L.map(mapId, { 
                    zoomControl: false, attributionControl: false, dragging: false, 
                    scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false
                });
                L.tileLayer(`https://api.vworld.kr/req/wmts/1.0.0/${KEY_VWORLD}/Base/{z}/{y}/{x}.png`, { maxZoom: 19 }).addTo(fMap);
                const polyline = L.polyline(friend.path, { color: '#3586ff', weight: 4 }).addTo(fMap);
                fMap.fitBounds(polyline.getBounds(), { padding: [20,20] });
                fMap.dragging.disable();
            }
        }, 150);
    });
}

// --- 5. 미션 & 코인 로직 (Firebase) ---
async function loadUserCoinsAndMissions(uid) {
    if(!uid) return;
    try {
        const coinSnap = await get(child(ref(db), `users/${uid}/coins`));
        userCoins = coinSnap.exists() ? coinSnap.val() : 0;
        document.getElementById('userCoinDisplay').innerText = `🪙 ${userCoins.toLocaleString()}`;

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const missionSnap = await get(child(ref(db), `users/${uid}/claimedRunMissions/${todayStr}`));
        claimedRunMissions = missionSnap.exists() ? missionSnap.val() : {};
    } catch(e) { console.error("Coin/Mission Load Error:", e); }
}

function renderMissions() {
    const listEl = document.getElementById('missionList');
    if(!listEl) return;
    listEl.innerHTML = '';

    RUNNING_MISSIONS.forEach(m => {
        const isCompleted = m.check(userRunStats);
        const isClaimed = !!claimedRunMissions[m.id];

        const li = document.createElement('li');
        li.className = 'mission-item';

        let btnHtml = '';
        if (isClaimed) {
            btnHtml = `<button class="btn-claim completed" disabled>완료됨</button>`;
        } else if (isCompleted) {
            btnHtml = `<button class="btn-claim" onclick="claimRunMission('${m.id}', ${m.reward})">보상 받기</button>`;
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

window.claimRunMission = async (missionId, reward) => {
    if(!currentUser) return;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    try {
        userCoins += reward;
        await set(ref(db, `users/${currentUser.uid}/coins`), userCoins);

        claimedRunMissions[missionId] = true;
        await set(ref(db, `users/${currentUser.uid}/claimedRunMissions/${todayStr}/${missionId}`), true);

        document.getElementById('userCoinDisplay').innerText = `🪙 ${userCoins.toLocaleString()}`;
        alert(`🎉 ${reward.toLocaleString()} 코인을 받았습니다!`);
        renderMissions();
    } catch(e) {
        console.error("Claim Error:", e);
    }
};
