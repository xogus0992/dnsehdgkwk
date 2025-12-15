import { db, auth } from './firebase-service.js';
import { ref, get, child } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ============================================================
   POKERUN HOME LOGIC (FINAL v2.3 Firebase + Modules)
   - Connection: Firebase Realtime Database
   - Calendar: Fetches user history and aggregates by date.
   - Feed: Uses dummy data (since friend system DB is not set up)
   ============================================================ */

const KEY_VWORLD = '0E603DDF-E18F-371F-96E8-ECD87D4CA088';

// State
let currDate = new Date();
let selectedDay = null; 
let currentUser = null;
let userRecords = []; // 메모리에 저장된 전체 기록 (매번 요청 방지)

// Dummy Data (친구 피드용 - 실제 DB 구현 시 이 부분만 교체하면 됨)
const DUMMY_FRIENDS = [
    { id: 1, name: "김철수", date: "어제", dist: "5.12", time: "32:10", pace: "6'15\"", cadence: "170", path: [[37.5665, 126.9780], [37.5675, 126.9800], [37.5655, 126.9820]] },
    { id: 2, name: "RunQueen", date: "2일 전", dist: "10.05", time: "55:40", pace: "5'32\"", cadence: "180", path: [[37.5547, 126.9707], [37.5560, 126.9720], [37.5530, 126.9750]] },
];

window.addEventListener('load', () => {
    // 1. 친구 피드 먼저 렌더링 (데이터 없어도 보임)
    renderFriendFeed();

    // 2. 인증 체크 후 내 기록 로드
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadUserHistory(user.uid);
        } else {
            // 비로그인 상태면 캘린더 비움
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
});

// --- 1. Firebase 데이터 로드 ---
function loadUserHistory(uid) {
    const dbRef = ref(db);
    get(child(dbRef, `users/${uid}/history`)).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            // 객체를 배열로 변환
            userRecords = Object.values(data);
        } else {
            userRecords = [];
        }
        renderCalendar(); // 데이터 로드 완료 후 캘린더 그리기
    }).catch((error) => {
        console.error("Home Data Load Error:", error);
    });
}

// --- 2. 캘린더 로직 ---
function renderCalendar() {
    const year = currDate.getFullYear();
    const month = currDate.getMonth();
    
    document.getElementById('currentMonthLabel').innerText = `${year}. ${String(month+1).padStart(2,'0')}`;

    const firstDay = new Date(year, month, 1).getDay(); // 이번 달 1일의 요일 (0:일 ~ 6:토)
    const lastDate = new Date(year, month + 1, 0).getDate(); // 이번 달 마지막 날짜

    // 이번 달 기록 집계
    const dailySum = {};
    userRecords.forEach(rec => {
        const d = new Date(rec.id); // rec.id는 timestamp
        if(d.getFullYear() === year && d.getMonth() === month) {
            const dayKey = d.getDate();
            if(!dailySum[dayKey]) dailySum[dayKey] = 0;
            dailySum[dayKey] += parseFloat(rec.dist);
        }
    });

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    // 앞쪽 빈 칸
    for(let i=0; i<firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell empty';
        grid.appendChild(empty);
    }

    // 날짜 생성
    const today = new Date();
    for(let day=1; day<=lastDate; day++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        
        // 오늘 표시
        if(year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            cell.classList.add('today');
        }

        // 선택된 날짜 표시
        if(selectedDay === day) {
            cell.classList.add('selected-day');
        }

        // 뛴 거리 표시
        let distHtml = '';
        if(dailySum[day]) {
            distHtml = `<div class="day-dist">${dailySum[day].toFixed(1)}</div>`;
        }

        cell.innerHTML = `<span class="day-num">${day}</span>${distHtml}`;
        
        // 클릭 이벤트
        cell.onclick = () => {
            if(selectedDay === day) {
                // 이미 선택된거 누르면 닫기
                selectedDay = null;
                closeDailyRecord();
            } else {
                // 새로운 날짜 선택
                selectedDay = day;
                openDailyRecord(day, year, month);
            }
            renderCalendar(); // UI 갱신 (선택 스타일 적용)
        };

        grid.appendChild(cell);
    }
}

// --- 3. 일별 상세 기록 (SVG 포함) ---
function openDailyRecord(day, year, month) {
    const container = document.getElementById('dailyRecordSection');
    const label = document.getElementById('selectedDateLabel');
    const listEl = document.getElementById('dailyRecordList');
    
    label.innerText = `${month+1}월 ${day}일의 활동`;
    listEl.innerHTML = '';
    
    // 메모리에 있는 데이터에서 필터링
    const targetRecords = userRecords.filter(rec => {
        const d = new Date(rec.id);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

    // 최신순 정렬
    targetRecords.sort((a,b) => b.id - a.id);

    if(targetRecords.length === 0) {
        listEl.innerHTML = '<li style="text-align:center; padding:15px; color:#999; font-size:13px;">기록이 없습니다.</li>';
    } else {
        targetRecords.forEach(rec => {
            const li = document.createElement('li');
            li.className = 'record-item'; 

            // SVG 미니맵 경로 생성 (run_record.js와 동일 로직)
            let svgPath = "";
            let allPoints = [];
            if(rec.path) {
                // 중첩 배열 평탄화
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

            // 시간 포맷 (오전/오후 HH:MM)
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
            // 클릭 시 run_record.html의 상세 팝업을 띄우려면 복잡해지므로, 
            // 여기서는 단순 리스트 확인 용도로만 둡니다.
            
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

        // Leaflet 지도 초기화 (타임아웃으로 DOM 생성 후 실행)
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
                
                // 지도 클릭 시 확대/이동 방지
                fMap.dragging.disable();
            }
        }, 150);
    });
}