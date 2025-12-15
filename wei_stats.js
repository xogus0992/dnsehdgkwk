/* ============================================================
   POKERUN WEIGHT STATS LOGIC (Firebase Version)
   - Tab Filter: All (Body Parts) vs Specific Part (Exercises)
   - Fetches data across months from Firebase
   ============================================================ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

let currentUser = null;
let chartInstance = null;
let currentFilter = '전체'; // '전체' or '가슴', '등' ...
let myCustomExercises = {}; // Firebase에서 불러온 커스텀 운동

const PART_COLORS = {
    "가슴": "rgba(53, 134, 255, 0.8)",
    "등": "rgba(75, 192, 192, 0.8)",
    "하체": "rgba(255, 99, 132, 0.8)",
    "어깨": "rgba(255, 159, 64, 0.8)",
    "팔": "rgba(153, 102, 255, 0.8)",
    "복근": "rgba(255, 205, 86, 0.8)",
    "기타": "rgba(201, 203, 207, 0.8)"
};

const TABS = ["전체", "가슴", "등", "하체", "어깨", "팔", "복근"];

// ----------------------------------------------------
// 초기화
// ----------------------------------------------------
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await fetchCustomExercises(); // 커스텀 운동 먼저 로드
        updateStats(); // 데이터 로드 및 렌더링
    } else {
        alert("로그인이 필요합니다.");
    }
});

window.onload = function() {
    // 1. 날짜 초기화 (최근 7일)
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 6);

    document.getElementById('endDate').valueAsDate = today;
    document.getElementById('startDate').valueAsDate = lastWeek;

    // 2. 탭 생성
    renderTabs();

    // 3. 이벤트
    document.getElementById('btnSearch').addEventListener('click', updateStats);
};

// ----------------------------------------------------
// 데이터 로직 (Firebase)
// ----------------------------------------------------

// 커스텀 운동 불러오기 (부위 매핑용)
async function fetchCustomExercises() {
    if(!currentUser) return;
    try {
        const snap = await get(ref(db, `users/${currentUser.uid}/customExercises`));
        if(snap.exists()) {
            myCustomExercises = snap.val();
        }
    } catch(e) { console.error("커스텀 운동 로드 실패", e); }
}

// 메인 함수
async function updateStats() {
    if(!currentUser) return;

    const startStr = document.getElementById('startDate').value;
    const endStr = document.getElementById('endDate').value;
    
    if(!startStr || !endStr) return alert("날짜를 선택해주세요.");

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    endDate.setHours(23, 59, 59, 999); 

    const btn = document.getElementById('btnSearch');
    btn.innerHTML = '<span class="material-icons">hourglass_empty</span> 조회중';
    btn.disabled = true;

    try {
        // 1. 필요한 월(Month) 키 계산 (예: 2023-10, 2023-11)
        const monthKeys = getMonthKeys(startDate, endDate);
        
        // 2. Firebase에서 해당 월 데이터 병렬 요청
        const promises = monthKeys.map(key => get(ref(db, `users/${currentUser.uid}/records/${key}`)));
        const snapshots = await Promise.all(promises);

        // 3. 데이터 병합 및 필터링
        let allRecords = [];
        snapshots.forEach(snap => {
            if(snap.exists()) {
                const monthData = snap.val(); // { "2023-10-01": {pushId: {..}}, "2023-10-02": ... }
                
                Object.entries(monthData).forEach(([dateKey, sessions]) => {
                    // 날짜 필터링 (String 비교 활용)
                    const d = new Date(dateKey);
                    if (d >= startDate && d <= endDate) {
                        // 세션 데이터들을 배열로 변환
                        Object.values(sessions).forEach(session => {
                            // 날짜 정보 주입 (UI 사용 편의)
                            session.dateStr = dateKey; 
                            allRecords.push(session);
                        });
                    }
                });
            }
        });

        // 4. 렌더링
        renderChart(allRecords, startDate, endDate);
        renderList(allRecords);
        renderSummary(allRecords);

    } catch(e) {
        console.error(e);
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
        btn.innerHTML = '<span class="material-icons">search</span> 조회';
        btn.disabled = false;
    }
}

// 시작일~종료일 사이의 모든 "YYYY-MM" 키 생성
function getMonthKeys(start, end) {
    const keys = [];
    let curr = new Date(start);
    curr.setDate(1); // 1일로 설정하여 달 넘김 계산 정확하게

    const endMonth = new Date(end);
    endMonth.setDate(1);

    while (curr <= endMonth) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        keys.push(`${y}-${m}`);
        curr.setMonth(curr.getMonth() + 1);
    }
    return keys;
}

// ----------------------------------------------------
// UI 렌더링 로직
// ----------------------------------------------------

function renderTabs() {
    const container = document.getElementById('statsTabs');
    container.innerHTML = '';
    
    TABS.forEach(tab => {
        const btn = document.createElement('div');
        btn.className = `stat-tab ${tab === currentFilter ? 'active' : ''}`;
        btn.innerText = tab;
        btn.onclick = () => {
            currentFilter = tab;
            renderTabs(); 
            updateStats(); // 필터 변경 시 재계산
        };
        container.appendChild(btn);
    });
}

function renderChart(records, start, end) {
    const ctx = document.getElementById('volumeChart').getContext('2d');
    
    // X축 라벨 생성
    const labels = [];
    const dateMap = {}; 
    let curr = new Date(start);
    let idx = 0;
    const MAX_DAYS = 31; // 너무 길면 성능 이슈
    let loopCount = 0;

    // 차트 X축은 최대 31일까지만 표시 (초과시 UI 깨짐 방지 권장)
    while(curr <= end && loopCount < MAX_DAYS) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth()+1).padStart(2,'0');
        const d = String(curr.getDate()).padStart(2,'0');
        const dateStr = `${y}-${m}-${d}`;
        
        labels.push(`${curr.getMonth()+1}/${curr.getDate()}`);
        dateMap[dateStr] = idx++;
        
        curr.setDate(curr.getDate() + 1);
        loopCount++;
    }

    // 데이터셋 집계
    const datasets = {};

    records.forEach(rec => {
        const dataIdx = dateMap[rec.dateStr]; // rec.dateStr: YYYY-MM-DD
        
        // 날짜 범위 벗어난 데이터(위의 31일 제한)는 차트에서 제외
        if (dataIdx !== undefined) {
            
            // fullData가 없으면(구버전) exercises 배열 사용
            const exercises = rec.fullData || rec.exercises || [];

            exercises.forEach(ex => {
                const part = ex.part || findBodyPart(ex.name);
                
                let key = null;
                if(currentFilter === '전체') {
                    key = part; // Chest, Back...
                } else {
                    if(part === currentFilter) {
                        key = ex.name; // Bench Press...
                    }
                }

                if(key) {
                    if(!datasets[key]) datasets[key] = new Array(labels.length).fill(0);
                    
                    let exVol = 0;
                    // setsData가 있으면(신버전) 디테일하게, 없으면 sets * kg * reps(구버전 추정)
                    if(ex.setsData) {
                        ex.setsData.forEach(s => {
                            if(s.done) exVol += (parseFloat(s.kg) * parseFloat(s.reps));
                        });
                    } else {
                        // 대략적인 계산 (세트 수 정보만 있는 경우 등)
                        exVol = 0; // 정확하지 않으므로 0 처리하거나, 저장된 totalVolume을 N빵 해야함 (복잡)
                    }

                    // fullData가 없는 아주 옛날 데이터의 경우 totalVolume 필드를 사용해야 할 수도 있음
                    // 여기서는 fullData 구조를 우선으로 함.

                    datasets[key][dataIdx] += exVol;
                }
            });
        }
    });

    const chartDatasets = Object.keys(datasets).map(key => ({
        label: key,
        data: datasets[key],
        backgroundColor: currentFilter === '전체' ? PART_COLORS[key] : getExerciseColor(key),
        stack: 'Stack 0',
        borderRadius: 4,
    })).filter(ds => ds.data.some(v => v > 0)); 

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: chartDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, family: 'Noto Sans KR' } } },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: { family: 'Chakra Petch' },
                    bodyFont: { family: 'Noto Sans KR' },
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toLocaleString()} kg`;
                        }
                    }
                }
            },
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true, grid: { color: '#f0f0f0' } }
            }
        }
    });
}

function renderSummary(records) {
    let count = 0; 
    let volume = 0;

    records.forEach(rec => {
        let hasTargetPart = false;
        const exercises = rec.fullData || rec.exercises || [];

        exercises.forEach(ex => {
            const part = ex.part || findBodyPart(ex.name);
            
            if (currentFilter === '전체' || part === currentFilter) {
                hasTargetPart = true;
                if(ex.setsData) {
                    ex.setsData.forEach(s => {
                        if(s.done) volume += (parseFloat(s.kg) * parseFloat(s.reps));
                    });
                }
            }
        });
        if(hasTargetPart) count++;
    });

    document.getElementById('totalCount').innerText = `${count}회`;
    
    if(volume >= 1000) {
        document.getElementById('totalVolumeSum').innerText = `${(volume/1000).toFixed(1)} ton`;
    } else {
        document.getElementById('totalVolumeSum').innerText = `${volume.toLocaleString()} kg`;
    }
}

function renderList(records) {
    const listEl = document.getElementById('recentRecordList');
    listEl.innerHTML = '';
    
    // 날짜 내림차순 정렬
    const sorted = [...records].sort((a,b) => new Date(b.dateStr) - new Date(a.dateStr));

    if (sorted.length === 0) {
        listEl.innerHTML = '<li style="text-align:center; padding:20px; color:#aaa;">해당 기간의 기록이 없습니다.</li>';
        return;
    }

    sorted.forEach(rec => {
        // 날짜 포맷
        const [y, m, d] = rec.dateStr.split('-'); // YYYY-MM-DD
        const dateDisplay = `${m}.${d}`;

        const exercises = rec.fullData || rec.exercises || [];
        
        let detailHtml = '';
        if(exercises.length > 0) {
            // 최대 3개까지만 표시
            detailHtml = exercises.slice(0, 3).map(e => `
                <div class="rc-row">
                    <span class="rc-ex-name">${e.name}</span>
                    <span>${e.sets || (e.setsData ? e.setsData.filter(s=>s.done).length : 0)} set</span>
                </div>
            `).join('');
            
            if(exercises.length > 3) {
                detailHtml += `<div style="text-align:center; font-size:10px; color:#999; margin-top:4px;">...외 ${exercises.length-3}개</div>`;
            }
        }

        const li = document.createElement('li');
        li.className = 'record-card';
        li.innerHTML = `
            <div class="rc-header">
                <div class="rc-date">${dateDisplay}</div>
                <div class="rc-name">${rec.routineName}</div>
            </div>
            <div class="rc-body">${detailHtml}</div>
            <div class="rc-total">Total ${rec.totalVolume.toLocaleString()} kg</div>
        `;
        listEl.appendChild(li);
    });
}

// ----------------------------------------------------
// 유틸리티
// ----------------------------------------------------
function findBodyPart(exName) {
    // 1. exercises.js (전역변수 exercisesData)
    if(typeof exercisesData !== 'undefined') {
        for(const part in exercisesData) {
            const found = exercisesData[part].find(e => e.name === exName);
            if(found) return part;
        }
    }
    // 2. Custom Exercises (Firebase)
    for(const part in myCustomExercises) {
        const found = myCustomExercises[part].find(e => e.name === exName);
        if(found) return part;
    }
    return "기타";
}

function getExerciseColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const hex = "00000".substring(0, 6 - c.length) + c;
    return `#${hex}CC`; 
}