import { db, auth } from './firebase-service.js';
import { ref, get, child, remove } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ============================================================
   POKERUN RECORD LOGIC (FINAL v2.3 Firebase + Upload Connect)
   - Connection: Firebase Realtime Database
   - Feature: Share -> sends data to upload.html
   ============================================================ */

const KEY_VWORLD = '0E603DDF-E18F-371F-96E8-ECD87D4CA088';

// State
let popupMap, popupPolyline;
let currentRecord = null; // 현재 선택된 기록 객체 (ID 포함)
let currentUser = null;

// [초기화] 인증 확인 후 데이터 로드
window.addEventListener('load', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadRecordsAndRender(user.uid);
        } else {
            document.getElementById('recordList').innerHTML = 
                '<li style="text-align:center; padding:20px;">로그인이 필요합니다.<br><a href="index.html" style="color:#3586ff;">로그인 하러가기</a></li>';
        }
    });
});

function loadRecordsAndRender(uid) {
    const dbRef = ref(db);
    
    get(child(dbRef, `users/${uid}/history`)).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Firebase 객체 -> 배열로 변환 ({key: val} -> [{...val, key}])
            const records = Object.keys(data).map(key => ({
                ...data[key],
                firebaseKey: key // 삭제 시 필요한 키
            }));

            // 최신순 정렬 (id가 타임스탬프라고 가정)
            records.sort((a, b) => b.id - a.id);

            renderStatistics(records);
            renderList(records);
        } else {
            renderList([]); // 기록 없음
            renderStatistics([]);
        }
    }).catch((error) => {
        console.error("Data Load Error:", error);
        document.getElementById('recordList').innerHTML = '<li style="padding:20px; text-align:center;">데이터를 불러오지 못했습니다.</li>';
    });
}

// --- 1. 통계 (Chart.js) ---
function renderStatistics(records) {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const today = new Date();
    const stats = new Array(7).fill(0);
    const labels = new Array(7).fill('');

    // 최근 7일 라벨 생성
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        labels[6-i] = days[d.getDay()];
    }

    // 데이터 집계
    records.forEach(rec => {
        const recDate = new Date(rec.id);
        // 날짜 차이 계산 (일 단위)
        const diffTime = today.setHours(0,0,0,0) - recDate.setHours(0,0,0,0);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= 6) {
            // 오늘이 인덱스 6, 어제가 5...
            stats[6 - diffDays] += parseFloat(rec.dist);
        }
    });

    // 화면 표시
    const totalDist = stats.reduce((a,b) => a+b, 0).toFixed(2);
    document.getElementById('totalWeeklyDist').innerText = `${totalDist} km`;

    // 차트 그리기
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    
    // 기존 차트가 있다면 파괴 (중복 렌더링 방지)
    if(window.myWeeklyChart) window.myWeeklyChart.destroy();

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
                x: { grid: { display: false }, ticks: { font: {family: 'Chakra Petch'} } }
            },
            layout: { padding: { left: 10, right: 10, top: 10, bottom: 0 } }
        }
    });
}

// --- 2. 리스트 렌더링 ---
function renderList(records) {
    const listEl = document.getElementById('recordList');
    listEl.innerHTML = '';

    if (records.length === 0) {
        listEl.innerHTML = '<li style="text-align:center; padding:40px; color:#999;">아직 달린 기록이 없습니다.<br>러닝 탭에서 첫 달리기를 시작해보세요!</li>';
        return;
    }

    records.forEach(rec => {
        const li = document.createElement('li');
        li.className = 'record-item';

        const d = new Date(rec.id);
        const dateStr = `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;

        // SVG 미니맵 경로 생성
        let svgPath = "";
        try {
            // run_running.js에서 저장한 구조: [[{lat,lng},..], [{lat,lng},..]] (중첩 배열 가능성)
            // 평탄화 작업
            let allPoints = [];
            if(rec.path) {
                rec.path.forEach(segment => {
                    // 세그먼트가 배열이면 그대로, 아니면(객체면) 처리
                    if(Array.isArray(segment)) allPoints.push(...segment);
                    else allPoints.push(segment);
                });
            }

            if (allPoints.length > 0) {
                // lat, lng 값 추출
                const lats = allPoints.map(p => p.lat);
                const lngs = allPoints.map(p => p.lng);
                
                if(lats.length > 0) {
                    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
                    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
                    const latRange = maxLat - minLat || 0.001;
                    const lngRange = maxLng - minLng || 0.001;

                    allPoints.forEach((p, i) => {
                        // SVG 좌표계 (60x60 박스)에 맞게 정규화
                        const y = 60 - ((p.lat - minLat) / latRange) * 60; // 위도가 y축 (뒤집힘 주의)
                        const x = ((p.lng - minLng) / lngRange) * 60;
                        svgPath += `${i===0?'M':'L'} ${x} ${y} `;
                    });
                }
            }
        } catch(e) {
            console.warn("Path render error:", e);
            svgPath = "M 30 30 L 30 30"; // 에러 시 점 하나
        }

        li.innerHTML = `
            <div class="record-info">
                <div class="r-date">${dateStr}</div>
                <div class="r-dist">${rec.dist} km</div>
                <div class="r-time">${rec.time}</div>
                <div class="r-pace" style="text-align:right;">${rec.pace} /km</div>
            </div>
            <svg class="record-map-preview" viewBox="-5 -5 70 70">
                <path d="${svgPath}" fill="none" stroke="#3586ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        li.addEventListener('click', () => openPopup(rec));
        listEl.appendChild(li);
    });
}

// --- 3. 팝업 (상세 보기) ---
const modal = document.getElementById('recordModal');

function openPopup(rec) {
    currentRecord = rec; // 현재 선택된 기록 저장
    
    const d = new Date(rec.id);
    document.getElementById('popupDate').innerText = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    document.getElementById('popupTime').innerText = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    document.getElementById('popupDist').innerText = rec.dist;
    document.getElementById('popupDuration').innerText = rec.time;
    document.getElementById('popupPace').innerText = rec.pace;
    document.getElementById('popupCal').innerText = rec.cal || '0';
    
    // 평균 속도 계산 (데이터에 없다면 역산)
    if(rec.dist > 0 && rec.time) {
        // 간단 표시용 (정확한 계산은 저장 시 하는게 좋음)
        // document.getElementById('popupAvgSpeed').innerText = ...
    }
    document.getElementById('popupAvgSpeed').innerText = "-"; // 일단 비워둠

    modal.classList.remove('hidden');

    // 지도 렌더링 (팝업이 뜬 직후에 그려야 깨지지 않음)
    setTimeout(() => {
        if (!popupMap) {
            popupMap = L.map('popupMap', { 
                zoomControl: false, attributionControl: false,
                dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false
            });
            L.tileLayer(`https://api.vworld.kr/req/wmts/1.0.0/${KEY_VWORLD}/Base/{z}/{y}/{x}.png`, { maxZoom: 19 }).addTo(popupMap);
        }
        
        if (popupPolyline) popupMap.removeLayer(popupPolyline);

        // 경로 그리기
        if(rec.path) {
            // Leaflet에 맞게 다중 배열 구조 평탄화 필요할 수 있음
            // 여기선 간단히 첫번째 세그먼트만 그리거나 전체를 그림
            // rec.path 구조: [[{lat,lng}...], [{lat,lng}...]]
            popupPolyline = L.polyline(rec.path, { color: '#3586ff', weight: 5 }).addTo(popupMap);
            popupMap.fitBounds(popupPolyline.getBounds(), { padding: [30, 30] });
        }
        
        popupMap.invalidateSize();
    }, 100);
}

document.getElementById('closePopupBtn').addEventListener('click', () => {
    modal.classList.add('hidden');
});

// [삭제 기능] Firebase 삭제
document.getElementById('btnDeleteRecord').addEventListener('click', () => {
    if(!currentRecord || !currentUser) return;

    if(confirm("이 기록을 클라우드에서 완전히 삭제하시겠습니까?")) {
        const recordRef = ref(db, `users/${currentUser.uid}/history/${currentRecord.firebaseKey}`);
        
        remove(recordRef).then(() => {
            alert("삭제되었습니다.");
            modal.classList.add('hidden');
            loadRecordsAndRender(currentUser.uid); // 목록 새로고침
        }).catch(err => {
            alert("삭제 실패: " + err.message);
        });
    }
});

// [★ 공유 기능] upload.html로 이동
document.getElementById('btnShareRecord').addEventListener('click', () => {
    if(!currentRecord) return;

    // upload.html로 데이터를 넘기는 방법
    // 1. URL 파라미터 (보안상 비추천하지만 간단함)
    // 2. sessionStorage (추천: 브라우저 탭 닫으면 사라짐)
    
    sessionStorage.setItem('shareData', JSON.stringify(currentRecord));
    
    // 페이지 이동
    window.location.href = 'upload.html';
});