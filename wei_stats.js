/* ============================================================
   POKERUN WEIGHT STATS LOGIC (FINAL v2)
   - Tab Filter: All (Body Parts) vs Specific Part (Exercises)
   ============================================================ */

let chartInstance = null;
let currentFilter = '전체'; // '전체' or '가슴', '등' ...

const PART_COLORS = {
    "가슴": "rgba(53, 134, 255, 0.8)",
    "등": "rgba(75, 192, 192, 0.8)",
    "하체": "rgba(255, 99, 132, 0.8)",
    "어깨": "rgba(255, 159, 64, 0.8)",
    "팔": "rgba(153, 102, 255, 0.8)",
    "복근": "rgba(255, 205, 86, 0.8)",
    "기타": "rgba(201, 203, 207, 0.8)"
};

// 탭 목록 정의
const TABS = ["전체", "가슴", "등", "하체", "어깨", "팔", "복근"];

window.onload = function() {
    // 1. 날짜 초기화 (최근 7일)
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 6);

    document.getElementById('endDate').valueAsDate = today;
    document.getElementById('startDate').valueAsDate = lastWeek;

    // 2. 탭 생성
    renderTabs();

    // 3. 초기 렌더링
    updateStats();

    // 4. 이벤트
    document.getElementById('btnSearch').addEventListener('click', updateStats);
};

function renderTabs() {
    const container = document.getElementById('statsTabs');
    container.innerHTML = '';
    
    TABS.forEach(tab => {
        const btn = document.createElement('div');
        btn.className = `stat-tab ${tab === currentFilter ? 'active' : ''}`;
        btn.innerText = tab;
        btn.onclick = () => {
            currentFilter = tab;
            renderTabs(); // UI 갱신 (Active 상태)
            updateStats(); // 데이터 갱신
        };
        container.appendChild(btn);
    });
}

function updateStats() {
    const startStr = document.getElementById('startDate').value;
    const endStr = document.getElementById('endDate').value;
    
    if(!startStr || !endStr) return alert("날짜를 선택해주세요.");

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    endDate.setHours(23, 59, 59, 999); 

    const records = JSON.parse(localStorage.getItem('myWorkoutRecords') || "[]");
    
    // 1. 기간 필터링
    const dateFiltered = records.filter(rec => {
        const d = new Date(rec.id);
        return d >= startDate && d <= endDate;
    });

    // 2. 부위 필터링 (전체가 아닐 경우) & 차트 데이터 준비
    // 이 단계에서 차트와 리스트, 요약을 모두 처리
    renderChart(dateFiltered, startDate, endDate);
    
    // 리스트와 요약은 필터링된 기준으로 보여줌
    // '전체'일 때는 모든 운동, '가슴'일 때는 가슴 운동만 포함된 기록? 
    // -> UX상 리스트는 그날의 전체 기록을 보여주되, 요약 숫자는 필터링된 값만 보여주는게 맞음.
    renderList(dateFiltered);
    renderSummary(dateFiltered);
}

function renderChart(records, start, end) {
    const ctx = document.getElementById('volumeChart').getContext('2d');
    
    // 날짜 라벨 생성
    const labels = [];
    const dateMap = {}; 
    let curr = new Date(start);
    let idx = 0;
    const MAX_DAYS = 31;
    let loopCount = 0;

    while(curr <= end && loopCount < MAX_DAYS) {
        const dateStr = `${curr.getFullYear()}-${String(curr.getMonth()+1).padStart(2,'0')}-${String(curr.getDate()).padStart(2,'0')}`;
        labels.push(`${curr.getMonth()+1}/${curr.getDate()}`);
        dateMap[dateStr] = idx++;
        curr.setDate(curr.getDate() + 1);
        loopCount++;
    }

    // 데이터셋 집계
    const datasets = {};

    records.forEach(rec => {
        const d = new Date(rec.id);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const dataIdx = dateMap[dateStr];

        if (dataIdx !== undefined) {
            if(rec.fullData && Array.isArray(rec.fullData)) {
                rec.fullData.forEach(ex => {
                    const part = ex.part || findBodyPart(ex.name);
                    
                    // [핵심] 필터 로직
                    // 전체 모드: 부위별로 묶음
                    // 부위 모드: 해당 부위의 운동들만 종목 이름으로 묶음
                    
                    let key = null;
                    if(currentFilter === '전체') {
                        key = part; // Chest, Back...
                    } else {
                        // 선택된 부위와 일치하는 운동만 집계
                        if(part === currentFilter) {
                            key = ex.name; // Bench Press, Push up...
                        }
                    }

                    if(key) {
                        if(!datasets[key]) datasets[key] = new Array(labels.length).fill(0);
                        
                        let exVol = 0;
                        if(ex.setsData) {
                            ex.setsData.forEach(s => {
                                if(s.done) exVol += (parseFloat(s.kg) * parseFloat(s.reps));
                            });
                        }
                        datasets[key][dataIdx] += exVol;
                    }
                });
            } else {
                // 구버전 데이터 호환 (전체일 때만 기타로 표시)
                if(currentFilter === '전체') {
                    if(!datasets['기타']) datasets['기타'] = new Array(labels.length).fill(0);
                    datasets['기타'][dataIdx] += parseFloat(rec.totalVolume);
                }
            }
        }
    });

    // Chart.js Dataset 변환
    const chartDatasets = Object.keys(datasets).map(key => ({
        label: key,
        data: datasets[key],
        backgroundColor: currentFilter === '전체' ? PART_COLORS[key] : getExerciseColor(key),
        stack: 'Stack 0',
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
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toLocaleString()} kg`;
                        }
                    }
                }
            },
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true }
            }
        }
    });
}

function renderSummary(records) {
    let count = 0; // 해당 부위를 운동한 날짜 수 (혹은 세션 수)
    let volume = 0;

    records.forEach(rec => {
        let hasTargetPart = false;
        
        if(rec.fullData && Array.isArray(rec.fullData)) {
            rec.fullData.forEach(ex => {
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
        }
        if(hasTargetPart) count++;
    });

    document.getElementById('totalCount').innerText = `${count}회`;
    
    if(volume >= 1000) {
        document.getElementById('totalVolumeSum').innerText = `${(volume/1000).toFixed(1)} ton`;
    } else {
        document.getElementById('totalVolumeSum').innerText = `${volume.toLocaleString()} kg`;
    }
}

// 부위 찾기 헬퍼
function findBodyPart(exName) {
    if(typeof exercisesData === 'undefined') return "기타";
    for(const part in exercisesData) {
        const found = exercisesData[part].find(e => e.name === exName);
        if(found) return part;
    }
    const customData = JSON.parse(localStorage.getItem('myCustomExercises') || "{}");
    for(const part in customData) {
        const found = customData[part].find(e => e.name === exName);
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

// 리스트 렌더링 (전체 기록)
function renderList(records) {
    const listEl = document.getElementById('recentRecordList');
    listEl.innerHTML = '';
    const sorted = [...records].sort((a,b) => b.id - a.id);

    if (sorted.length === 0) {
        listEl.innerHTML = '<li style="text-align:center; padding:20px; color:#aaa;">해당 기간의 기록이 없습니다.</li>';
        return;
    }

    sorted.forEach(rec => {
        const d = new Date(rec.id);
        const dateStr = `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;
        
        // 상세 내용도 필터링해서 보여줄까? -> 아니요, 리스트는 전체 맥락을 보는 게 좋으므로 전체 표시
        let detailHtml = '';
        if(rec.exercises && rec.exercises.length > 0) {
            detailHtml = rec.exercises.slice(0, 3).map(e => `
                <div class="rc-row">
                    <span class="rc-ex-name">${e.name}</span>
                    <span>${e.sets}세트</span>
                </div>
            `).join('');
            if(rec.exercises.length > 3) detailHtml += `<div style="text-align:center; font-size:10px; color:#999;">...외 ${rec.exercises.length-3}개</div>`;
        }

        const li = document.createElement('li');
        li.className = 'record-card';
        li.innerHTML = `
            <div class="rc-header">
                <div class="rc-date">${dateStr}</div>
                <div class="rc-name">${rec.routineName}</div>
            </div>
            <div class="rc-body">${detailHtml}</div>
            <div class="rc-total">Total ${rec.totalVolume.toLocaleString()} kg</div>
        `;
        listEl.appendChild(li);
    });
}