import { db, auth } from './firebase-service.js';
import { ref, get, child, remove } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ============================================================
   POKERUN RECORD LOGIC (FINAL v2.6 - Course Summary Mini-Map)
   - Connection: Firebase Realtime Database ('users/{uid}/history')
   - Map Tile: OpenStreetMap
   - Feature: Course Summary View (Start/End Markers, MaxZoom Cap, Dual-layer Polyline)
   ============================================================ */

// State
let popupMap = null;
let popupPolylineBg = null;
let popupPolyline = null;
let startMarker = null;
let endMarker = null;
let currentRecord = null;
let currentUser = null;

// [1. 초기화] 인증 상태 확인 후 데이터 로드
window.addEventListener('load', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadRecordsAndRender(user.uid);
        } else {
            const listEl = document.getElementById('recordList');
            if (listEl) {
                listEl.innerHTML = 
                    '<li style="text-align:center; padding:30px; color:#666;">로그인이 필요합니다.<br><a href="index.html" style="color:#3586ff; font-weight:bold; text-decoration:none; margin-top:8px; display:inline-block;">로그인 하러가기</a></li>';
            }
        }
    });

    const closeBtn = document.getElementById('closePopupBtn');
    if (closeBtn) closeBtn.addEventListener('click', closePopup);

    const deleteBtn = document.getElementById('btnDeleteRecord');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteRecord);

    const shareBtn = document.getElementById('btnShareRecord');
    if (shareBtn) shareBtn.addEventListener('click', shareRecord);
});

// [2. 다양한 구조의 경로 데이터를 [lat, lng] 표준 배열로 추출]
function extractPoints(path) {
    if (!path) return [];
    let points = [];

    function traverse(item) {
        if (!item) return;
        if (Array.isArray(item)) {
            if (item.length === 2 && typeof item[0] === 'number' && typeof item[1] === 'number') {
                points.push([item[0], item[1]]);
            } else {
                item.forEach(sub => traverse(sub));
            }
        } else if (typeof item === 'object' && item.lat !== undefined && item.lng !== undefined) {
            points.push([Number(item.lat), Number(item.lng)]);
        }
    }

    traverse(path);
    return points;
}

// [3. Firebase 데이터 로드]
function loadRecordsAndRender(uid) {
    const dbRef = ref(db);
    
    get(child(dbRef, `users/${uid}/history`)).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const records = Object.keys(data).map(key => ({
                ...data[key],
                firebaseKey: key
            }));

            records.sort((a, b) => (b.timestamp || b.id || 0) - (a.timestamp || a.id || 0));

            renderStatistics(records);
            renderList(records);
        } else {
            renderList([]); 
            renderStatistics([]);
        }
    }).catch((error) => {
        console.error("Data Load Error:", error);
        const listEl = document.getElementById('recordList');
        if (listEl) {
            listEl.innerHTML = '<li style="padding:30px; text-align:center; color:#999;">데이터를 불러오지 못했습니다.</li>';
        }
    });
}

// [4. 주간 활동 통계]
function renderStatistics(records) {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const today = new Date();
    const stats = new Array(7).fill(0);
    const labels = new Array(7).fill('');

    for(let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        labels[6 - i] = days[d.getDay()];
    }

    records.forEach(rec => {
        const recDate = new Date(rec.timestamp || rec.id);
        const diffTime = today.setHours(0,0,0,0) - recDate.setHours(0,0,0,0);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= 6) {
            stats[6 - diffDays] += parseFloat(rec.dist || 0);
        }
    });

    const totalDist = stats.reduce((a, b) => a + b, 0).toFixed(1);
    const totalDistEl = document.getElementById('totalWeeklyDist');
    if (totalDistEl) totalDistEl.innerText = `${totalDist} km`;

    const chartCanvas = document.getElementById('weeklyChart');
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');
    
    if (window.myWeeklyChart) window.myWeeklyChart.destroy();

    window.myWeeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'km',
                data: stats,
                borderColor: '#3586ff',
                backgroundColor: 'rgba(53, 134, 255, 0.1)',
                borderWidth: 3,
                tension: 0.3,
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
                y: { display: false, beginAtZero: true },
                x: { grid: { display: false }, ticks: { font: { family: 'Chakra Petch' } } }
            },
            layout: { padding: { left: 10, right: 10, top: 10, bottom: 0 } }
        }
    });
}

// [5. 기록 리스트 및 SVG 미니맵 경로]
function renderList(records) {
    const listEl = document.getElementById('recordList');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (records.length === 0) {
        listEl.innerHTML = '<li style="text-align:center; padding:40px; color:#999;">아직 달린 기록이 없습니다.<br>러닝 탭에서 첫 달리기를 시작해보세요!</li>';
        return;
    }

    records.forEach(rec => {
        const li = document.createElement('li');
        li.className = 'record-item';

        const d = new Date(rec.timestamp || rec.id);
        const dateStr = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;

        let svgPath = "";
        try {
            const allPoints = extractPoints(rec.path);

            if (allPoints.length >= 2) {
                const lats = allPoints.map(p => p[0]);
                const lngs = allPoints.map(p => p[1]);
                
                const minLat = Math.min(...lats), maxLat = Math.max(...lats);
                const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
                const latRange = maxLat - minLat || 0.0001;
                const lngRange = maxLng - minLng || 0.0001;

                allPoints.forEach((p, i) => {
                    const y = 60 - ((p[0] - minLat) / latRange) * 60;
                    const x = ((p[1] - minLng) / lngRange) * 60;
                    if (!isNaN(x) && !isNaN(y)) {
                        svgPath += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
                    }
                });
            } else {
                svgPath = "M 30 30 L 30 30";
            }
        } catch (e) {
            svgPath = "M 30 30 L 30 30";
        }

        li.innerHTML = `
            <div class="record-info">
                <div class="r-date">${dateStr}</div>
                <div class="r-dist">${rec.dist || '0.00'} km</div>
                <div class="r-time">${rec.time || '00:00'}</div>
                <div class="r-pace" style="text-align:right;">${rec.pace || "-'--\""} /km</div>
            </div>
            <svg class="record-map-preview" viewBox="-5 -5 70 70">
                <path d="${svgPath.trim() || 'M 30 30 L 30 30'}" fill="none" stroke="#3586ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        li.addEventListener('click', () => openPopup(rec));
        listEl.appendChild(li);
    });
}

// [6. 코스 요약 미니맵 팝업 모달]
const modal = document.getElementById('recordModal');

function openPopup(rec) {
    currentRecord = rec;
    
    const d = new Date(rec.timestamp || rec.id);
    
    const popupDate = document.getElementById('popupDate');
    if (popupDate) popupDate.innerText = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    const popupTime = document.getElementById('popupTime');
    if (popupTime) popupTime.innerText = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const popupDist = document.getElementById('popupDist');
    if (popupDist) popupDist.innerText = rec.dist || '0.00';
    
    const popupDuration = document.getElementById('popupDuration');
    if (popupDuration) popupDuration.innerText = rec.time || '00:00';
    
    const popupPace = document.getElementById('popupPace');
    if (popupPace) popupPace.innerText = rec.pace || "-'--\"";
    
    const popupCal = document.getElementById('popupCal');
    if (popupCal) popupCal.innerText = rec.cal || '0';
    
    const popupAvgSpeed = document.getElementById('popupAvgSpeed');
    if (popupAvgSpeed) {
        if (rec.dist && rec.time) {
            const parts = rec.time.split(':');
            const totalHours = (parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0)) / 60;
            const avgS = totalHours > 0 ? (parseFloat(rec.dist) / totalHours).toFixed(1) : "0.0";
            popupAvgSpeed.innerText = avgS;
        } else {
            popupAvgSpeed.innerText = "0.0";
        }
    }

    if (modal) modal.classList.remove('hidden');

    setTimeout(() => {
        const mapContainer = document.getElementById('popupMap');
        if (!mapContainer) return;

        if (!popupMap) {
            popupMap = L.map('popupMap', { 
                zoomControl: false, 
                attributionControl: false
            });
            
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                maxZoom: 19 
            }).addTo(popupMap);
        }
        
        // 기존 요점 레이어 초기화
        if (popupPolylineBg) popupMap.removeLayer(popupPolylineBg);
        if (popupPolyline) popupMap.removeLayer(popupPolyline);
        if (startMarker) popupMap.removeLayer(startMarker);
        if (endMarker) popupMap.removeLayer(endMarker);

        const points = extractPoints(rec.path);

        if (points.length >= 2) {
            // 1) 외각 테두리 흰색 선 (선명함 보장)
            popupPolylineBg = L.polyline(points, { 
                color: '#ffffff', 
                weight: 8, 
                lineCap: 'round', 
                lineJoin: 'round',
                opacity: 0.9
            }).addTo(popupMap);

            // 2) 내부 빨간색 메인 경로선
            popupPolyline = L.polyline(points, { 
                color: '#ff4d4d', 
                weight: 5, 
                lineCap: 'round', 
                lineJoin: 'round' 
            }).addTo(popupMap);

            // 3) 출발점(초록 마커) & 도착점(빨간 마커) 미니 아이콘 생성
            const startIcon = L.divIcon({
                className: 'start-pin',
                html: '<div style="width:12px;height:12px;background:#00cc66;border:2px solid white;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            const endIcon = L.divIcon({
                className: 'end-pin',
                html: '<div style="width:12px;height:12px;background:#ff4d4d;border:2px solid white;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            startMarker = L.marker(points[0], { icon: startIcon }).addTo(popupMap);
            endMarker = L.marker(points[points.length - 1], { icon: endIcon }).addTo(popupMap);

            // ★ 핵심: maxZoom: 16 설정으로 과도하게 확도되어 길 하나만 보이는 현상 방지 및 코스 전체 조망
            popupMap.fitBounds(popupPolyline.getBounds(), { 
                padding: [25, 25],
                maxZoom: 16 
            });
        } else if (points.length === 1) {
            popupMap.setView(points[0], 15);
        } else {
            popupMap.setView([37.5665, 126.9780], 15);
        }
        
        popupMap.invalidateSize();
    }, 200);
}

// [7. 팝업 닫기]
function closePopup() {
    if (modal) modal.classList.add('hidden');
}

// [8. 삭제 기능]
function deleteRecord() {
    if (!currentRecord || !currentUser) return;

    if (confirm("이 기록을 클라우드에서 완전히 삭제하시겠습니까?")) {
        const recordRef = ref(db, `users/${currentUser.uid}/history/${currentRecord.firebaseKey}`);
        
        remove(recordRef).then(() => {
            alert("기록이 삭제되었습니다.");
            closePopup();
            loadRecordsAndRender(currentUser.uid);
        }).catch(err => {
            alert("삭제 실패: " + err.message);
        });
    }
}

// [9. 공유 기능]
function shareRecord() {
    if (!currentRecord) return;
    sessionStorage.setItem('shareData', JSON.stringify(currentRecord));
    window.location.href = 'upload.html';
}
