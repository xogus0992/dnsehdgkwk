/* ============================================================
   POKERUN HOME LOGIC (Updated)
   - Calendar Click: Highlights date & Shows daily records
   - Daily Record List: Same design as Record Tab
   - Friend Feed: Dummy Data
   ============================================================ */

const KEY_VWORLD = '0E603DDF-E18F-371F-96E8-ECD87D4CA088';

// State
let currDate = new Date();
let selectedDay = null; // 현재 선택된 날짜 (숫자)

// Dummy Data
const DUMMY_FRIENDS = [
    { id: 1, name: "김철수", date: "2023-10-24", dist: "5.12", time: "32:10", pace: "6'15\"", cadence: "170", path: [[37.5665, 126.9780], [37.5675, 126.9800], [37.5655, 126.9820]] },
    { id: 2, name: "RunningQueen", date: "2023-10-23", dist: "10.05", time: "55:40", pace: "5'32\"", cadence: "180", path: [[37.5547, 126.9707], [37.5560, 126.9720], [37.5530, 126.9750]] },
    { id: 3, name: "포켓러너", date: "2023-10-22", dist: "3.20", time: "20:05", pace: "6'40\"", cadence: "165", path: [[37.5575, 126.9245], [37.5585, 126.9260], [37.5565, 126.9280]] }
];

window.onload = function() {
    renderCalendar();
    renderFriendFeed();

    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        currDate.setMonth(currDate.getMonth() - 1);
        selectedDay = null; // 달 바뀌면 선택 초기화
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
        renderCalendar(); // 선택 해제 반영
        closeDailyRecord();
    });
};

// --- 1. 캘린더 로직 ---
function renderCalendar() {
    const year = currDate.getFullYear();
    const month = currDate.getMonth();
    
    document.getElementById('currentMonthLabel').innerText = `${year}. ${String(month+1).padStart(2,'0')}`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // 데이터 로드
    const records = JSON.parse(localStorage.getItem('myRunningRecords') || "[]");
    const dailySum = {};

    records.forEach(rec => {
        const d = new Date(rec.id);
        if(d.getFullYear() === year && d.getMonth() === month) {
            const dayKey = d.getDate();
            if(!dailySum[dayKey]) dailySum[dayKey] = 0;
            dailySum[dayKey] += parseFloat(rec.dist);
        }
    });

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    // 빈 칸
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

        // [NEW] 선택된 날짜 표시
        if(selectedDay === day) {
            cell.classList.add('selected-day');
        }

        // 거리 표시
        let distHtml = '';
        if(dailySum[day]) {
            distHtml = `<div class="day-dist">${dailySum[day].toFixed(1)}</div>`;
        }

        cell.innerHTML = `<span class="day-num">${day}</span>${distHtml}`;
        
        // [NEW] 클릭 이벤트 (토글)
        cell.onclick = () => {
            if(selectedDay === day) {
                // 이미 선택된거 누르면 닫기
                selectedDay = null;
                closeDailyRecord();
            } else {
                // 새로운 날짜 누르면 열기
                selectedDay = day;
                openDailyRecord(day, year, month);
            }
            renderCalendar(); // UI 갱신 (Highlight 적용)
        };

        grid.appendChild(cell);
    }
}

// --- 2. 일별 기록 상세 보기 ---
function openDailyRecord(day, year, month) {
    const container = document.getElementById('dailyRecordSection');
    const label = document.getElementById('selectedDateLabel');
    const listEl = document.getElementById('dailyRecordList');
    
    label.innerText = `${month+1}월 ${day}일의 기록`;
    listEl.innerHTML = '';
    
    // 데이터 필터링
    const records = JSON.parse(localStorage.getItem('myRunningRecords') || "[]");
    const targetRecords = records.filter(rec => {
        const d = new Date(rec.id);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

    if(targetRecords.length === 0) {
        listEl.innerHTML = '<li style="text-align:center; padding:15px; color:#999; font-size:14px;">기록이 없습니다.</li>';
    } else {
        // 기록 탭과 동일한 디자인으로 렌더링
        targetRecords.forEach(rec => {
            const li = document.createElement('li');
            li.className = 'record-item'; // record.css 스타일 사용

            // 미니맵 SVG
            let allPoints = [];
            if(Array.isArray(rec.path)) {
                rec.path.forEach(seg => { if(Array.isArray(seg)) allPoints.push(...seg); });
            }
            let svgPath = "";
            if (allPoints.length > 0) {
                const lats = allPoints.map(p => p.lat);
                const lngs = allPoints.map(p => p.lng);
                const minLat = Math.min(...lats), maxLat = Math.max(...lats);
                const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
                allPoints.forEach((p, i) => {
                    const y = 60 - ((p.lat - minLat) / (maxLat - minLat || 1)) * 60;
                    const x = ((p.lng - minLng) / (maxLng - minLng || 1)) * 60;
                    svgPath += `${i===0?'M':'L'} ${x} ${y} `;
                });
            }

            li.innerHTML = `
                <div class="record-info">
                    <div class="r-date">${rec.time}</div> <div class="r-dist">${rec.dist} km</div>
                    <div class="r-time">페이스: ${rec.pace}</div>
                    <div class="r-pace">칼로리: ${rec.cal}</div>
                </div>
                <svg class="record-map-preview" viewBox="0 0 60 60">
                    <path d="${svgPath}" fill="none" stroke="#3586ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            // 클릭 시 어디로 갈지? 일단은 alert or nothing (요청 없으므로)
            listEl.appendChild(li);
        });
    }

    container.classList.remove('hidden');
}

function closeDailyRecord() {
    document.getElementById('dailyRecordSection').classList.add('hidden');
}

// --- 3. 친구 피드 로직 ---
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

        li.addEventListener('click', () => {
            window.location.href = 'index.html'; // 코스 탭 이동
        });

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
            }
        }, 100);
    });
}