/* ============================================================
   POKERUN RECORD LOGIC (FINAL - No Bottom Bar)
   - Statistics (Chart.js)
   - Record List (LocalStorage)
   - Detailed Popup with Map
   ============================================================ */

const KEY_VWORLD = '0E603DDF-E18F-371F-96E8-ECD87D4CA088';

// State
let popupMap, popupPolyline;
let currentRecordId = null; 

window.onload = function() {
    loadRecordsAndRender();
};

function loadRecordsAndRender() {
    // 1. 데이터 불러오기
    let records = JSON.parse(localStorage.getItem('myRunningRecords') || "[]");
    
    // 최신순 정렬
    records.sort((a, b) => b.id - a.id);

    // 2. 통계 및 그래프 렌더링
    renderStatistics(records);

    // 3. 리스트 렌더링
    renderList(records);
}

// --- 1. 통계 (Chart.js) ---
function renderStatistics(records) {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const today = new Date();
    const stats = new Array(7).fill(0);
    const labels = new Array(7).fill('');

    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        labels[6-i] = days[d.getDay()];
    }

    records.forEach(rec => {
        const recDate = new Date(rec.id);
        const diffTime = Math.abs(today - recDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays <= 7) {
            const dayIndex = 6 - (Math.floor((today - recDate) / (1000*60*60*24)));
            if(dayIndex >= 0 && dayIndex <= 6) {
                stats[dayIndex] += parseFloat(rec.dist);
            }
        }
    });

    const totalDist = stats.reduce((a,b) => a+b, 0).toFixed(2);
    document.getElementById('totalWeeklyDist').innerText = `${totalDist} km`;

    const ctx = document.getElementById('weeklyChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '거리 (km)',
                data: stats,
                borderColor: '#3586ff',
                backgroundColor: 'rgba(53, 134, 255, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#3586ff',
                pointRadius: 4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, display: false },
                x: { grid: { display: false } }
            }
        }
    });
}

// --- 2. 리스트 렌더링 ---
function renderList(records) {
    const listEl = document.getElementById('recordList');
    listEl.innerHTML = '';

    if (records.length === 0) {
        listEl.innerHTML = '<li style="text-align:center; padding:20px; color:#999;">아직 기록이 없습니다.</li>';
        return;
    }

    records.forEach(rec => {
        const li = document.createElement('li');
        li.className = 'record-item';

        const d = new Date(rec.id);
        const dateStr = `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;

        let allPoints = [];
        if(Array.isArray(rec.path) && rec.path.length > 0) {
            rec.path.forEach(segment => {
                if(Array.isArray(segment)) allPoints.push(...segment);
            });
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
                <div class="r-date">${dateStr}</div>
                <div class="r-dist">${rec.dist} km</div>
                <div class="r-time">${rec.time}</div>
                <div class="r-pace">${rec.pace}</div>
            </div>
            <svg class="record-map-preview" viewBox="0 0 60 60">
                <path d="${svgPath}" fill="none" stroke="#3586ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        li.addEventListener('click', () => openPopup(rec));
        listEl.appendChild(li);
    });
}

// --- 3. 팝업 (상세 보기) ---
const modal = document.getElementById('recordModal');

function openPopup(rec) {
    currentRecordId = rec.id;
    
    const d = new Date(rec.id);
    document.getElementById('popupDate').innerText = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    document.getElementById('popupTime').innerText = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    document.getElementById('popupDist').innerText = rec.dist;
    document.getElementById('popupDuration').innerText = rec.time;
    document.getElementById('popupPace').innerText = rec.pace;
    document.getElementById('popupCal').innerText = rec.cal;
    document.getElementById('popupAvgSpeed').innerText = "-"; 

    modal.classList.remove('hidden');

    setTimeout(() => {
        if (!popupMap) {
            popupMap = L.map('popupMap', { 
                zoomControl: false, 
                attributionControl: false,
                dragging: false, 
                scrollWheelZoom: false,
                doubleClickZoom: false,
                touchZoom: false
            });
            L.tileLayer(`https://api.vworld.kr/req/wmts/1.0.0/${KEY_VWORLD}/Base/{z}/{y}/{x}.png`, { maxZoom: 19 }).addTo(popupMap);
        }
        
        if (popupPolyline) popupMap.removeLayer(popupPolyline);

        if(rec.path && rec.path.length > 0) {
            popupPolyline = L.polyline(rec.path, { color: '#3586ff', weight: 5 }).addTo(popupMap);
            popupMap.fitBounds(popupPolyline.getBounds(), { padding: [20, 20] });
        }
        
        popupMap.invalidateSize();
    }, 100);
}

document.getElementById('closePopupBtn').addEventListener('click', () => {
    modal.classList.add('hidden');
});

document.getElementById('btnDeleteRecord').addEventListener('click', () => {
    if(confirm("이 기록을 정말 삭제하시겠습니까?")) {
        let records = JSON.parse(localStorage.getItem('myRunningRecords') || "[]");
        const newRecords = records.filter(r => r.id !== currentRecordId);
        localStorage.setItem('myRunningRecords', JSON.stringify(newRecords));
        
        alert("삭제되었습니다.");
        modal.classList.add('hidden');
        loadRecordsAndRender();
    }
});

document.getElementById('btnShareRecord').addEventListener('click', () => {
    alert("공유 기능은 준비 중입니다!");
});