import { db, auth } from './firebase-service.js';
import { ref, get, child, remove } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ============================================================
   POKERUN RECORD LOGIC (FINAL v2.5 - Fixed Mini-map & Popup Map)
   - Connection: Firebase Realtime Database ('users/{uid}/history')
   - Map Tile: OpenStreetMap (팝업 지도 회색 현상 완전 해결)
   - Feature: SVG Mini-map (NaN 에러 방지), Chart.js 주간 활동, 공유/삭제
   ============================================================ */

// State
let popupMap = null;
let popupPolyline = null;
let currentRecord = null; // 현재 선택된 기록 객체
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

    // 팝업 닫기 버튼 이벤트 바인딩
    const closeBtn = document.getElementById('closePopupBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePopup);
    }

    // 삭제 버튼 이벤트 바인딩
    const deleteBtn = document.getElementById('btnDeleteRecord');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteRecord);
    }

    // 공유 버튼 이벤트 바인딩
    const shareBtn = document.getElementById('btnShareRecord');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareRecord);
    }
});

// [2. 다양한 차원/구조의 경로 데이터를 단일 좌표 배열 [[lat, lng], ...]로 평탄화]
function extractPoints(path) {
    if (!path) return [];
    let points = [];

    function traverse(item) {
        if (!item) return;
        if (Array.isArray(item)) {
            // [lat, lng] 숫자의 2원소 배열인 경우
            if (item.length === 2 && typeof item[0] === 'number' && typeof item[1] === 'number') {
                points.push([item[0], item[1]]);
            } else {
                item.forEach(sub => traverse(sub));
            }
        } else if (typeof item === 'object' && item.lat !== undefined && item.lng !== undefined) {
            // {lat: x, lng: y} 객체 형태인 경우
            points.push([Number(item.lat), Number(item.lng)]);
        }
    }

    traverse(path);
    return points;
}

// [3. Firebase 기록 불러오기 및 렌더링]
function loadRecordsAndRender(uid) {
    const dbRef = ref(db);
    
    get(child(dbRef, `users/${uid}/history`)).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Firebase 객체 -> 배열 변환 ({key: val} -> [{...val, firebaseKey}])
            const records = Object.keys(data).map(key => ({
                ...data[key],
                firebaseKey: key // 삭제 시 사용
            }));

            // 최신순 정렬 (timestamp 또는 id 기준)
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

// [4. 주간 활동 통계 (Chart.js)]
function renderStatistics(records) {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const today = new Date();
    const stats = new Array(7).fill(0);
    const labels = new Array(7).fill('');

    // 최근 7일 라벨 생성
    for(let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        labels[6 - i] = days[d.getDay()];
    }

    // 데이터 집계 (최근 7일)
    records.forEach(rec => {
        const recDate = new Date(rec.timestamp || rec.id);
        const diffTime = today.setHours(0,0,0,0) - recDate.setHours(0,0,0,0);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= 6) {
            stats[6 - diffDays] += parseFloat(rec.dist || 0);
        }
    });

    // 주간 총 거리 표기
    const totalDist = stats.reduce((a, b) => a + b, 0).toFixed(1);
    const totalDistEl = document.getElementById('totalWeeklyDist');
    if (totalDistEl) totalDistEl.innerText = `${totalDist} km`;

    // Chart.js 그래프 렌더링
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

// [5. 최근 활동 리스트 렌더링 (SVG 미니맵 포함)]
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

        // SVG 미니맵 좌표 계산 (M NaN NaN 방지 처리)
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
                    // viewBox="-5 -5 70 70" 내부 60x60 영역 정규화
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
            console.warn("SVG Path error:", e);
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

// [6. 팝업 모달 열기 및 OpenStreetMap 지도 렌더링]
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
    
    // 평균 속도 계산 (거리 / 시간h)
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

    // 모달 노출 후 지도 초기화 및 그리기
    setTimeout(() => {
        const mapContainer = document.getElementById('popupMap');
        if (!mapContainer) return;

        if (!popupMap) {
            popupMap = L.map('popupMap', { 
                zoomControl: false, 
                attributionControl: false
            });
            
            // 무료 OpenStreetMap 타일 연결
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                maxZoom: 19 
            }).addTo(popupMap);
        }
        
        if (popupPolyline) {
            popupMap.removeLayer(popupPolyline);
            popupPolyline = null;
        }

        // 경로 좌표 추출 및 그리기 (눈에 띄는 빨간 실선)
        const points = extractPoints(rec.path);
        if (points.length > 0) {
            popupPolyline = L.polyline(points, { 
                color: '#ff4d4d', 
                weight: 5, 
                lineCap: 'round', 
                lineJoin: 'round' 
            }).addTo(popupMap);

            popupMap.fitBounds(popupPolyline.getBounds(), { padding: [30, 30] });
        } else {
            popupMap.setView([37.5665, 126.9780], 15);
        }
        
        // 렌더링 깨짐 방지
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
            loadRecordsAndRender(currentUser.uid); // 목록 새로고침
        }).catch(err => {
            alert("삭제 실패: " + err.message);
        });
    }
}

// [9. 공유 기능 (upload.html 전송)]
function shareRecord() {
    if (!currentRecord) return;
    
    sessionStorage.setItem('shareData', JSON.stringify(currentRecord));
    window.location.href = 'upload.html';
}
