/* ============================================================
   PokéRun PRO - history.js
   기록 탭 엔진
   - 저장된 러닝 기록 리스트 표시
   - 일주일 통계 그래프(막대)
   - 상세 팝업
   - 삭제 / 공유 기능
============================================================ */

/* ----------------------- 데이터 --------------------------- */

const HistoryManager = {
    records: [],       // storage.js에서 불러옴
    selectedIndex: null
};

/* ------------------------------------------------------------
   기록 불러오기
------------------------------------------------------------ */
function loadHistory() {
    if (window.StorageAPI) {
        HistoryManager.records = StorageAPI.loadRuns();
    }
}

/* ------------------------------------------------------------
   기록 탭 UI 렌더링
------------------------------------------------------------ */
function renderHistoryList() {
    const container = document.querySelector("#historyList");
    if (!container) return;

    container.innerHTML = "";

    if (!HistoryManager.records.length) {
        container.innerHTML = `<div class="no-history">저장된 기록이 없습니다.</div>`;
        return;
    }

    HistoryManager.records.forEach((rec, index) => {
        const date = formatDate(rec.date);
        const time = formatTime(rec.time);
        const km = (rec.distance / 1000).toFixed(2);
        const pace = rec.pace;

        const card = document.createElement("div");
        card.className = "history-card";
        card.dataset.index = index;

        card.innerHTML = `
            <div class="history-left">
                <div class="history-date">${date}</div>
                <div class="history-time">${time}</div>
                <div class="history-info">
                    <span>${km}km</span>
                    <span>${pace}</span>
                </div>
            </div>
            <div class="history-route">
                ${renderMiniPolyline(rec.polyline)}
            </div>
        `;

        card.addEventListener("click", () => openHistoryPopup(index));
        container.appendChild(card);
    });
}

/* ------------------------------------------------------------
   미니 폴리라인 렌더링 (지도 없이 SVG만 사용)
------------------------------------------------------------ */
function renderMiniPolyline(coords) {
    if (!coords || coords.length < 2) return `<div class="mini-route-empty"></div>`;

    // 좌표 정규화
    const xs = coords.map((c) => c[1]);
    const ys = coords.map((c) => c[0]);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const w = 120;
    const h = 60;

    const points = coords
        .map((c) => {
            const x = ((c[1] - minX) / (maxX - minX || 1)) * w;
            const y = h - ((c[0] - minY) / (maxY - minY || 1)) * h;
            return `${x},${y}`;
        })
        .join(" ");

    return `
        <svg width="${w}" height="${h}">
            <polyline 
                points="${points}" 
                fill="none" 
                stroke="black" 
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round" />
        </svg>
    `;
}

/* ------------------------------------------------------------
   상세 팝업 열기
------------------------------------------------------------ */
function openHistoryPopup(index) {
    const popup = document.querySelector("#historyPopup");
    if (!popup) return;

    HistoryManager.selectedIndex = index;
    const rec = HistoryManager.records[index];

    // DOM
    popup.querySelector(".popup-date").textContent = formatDate(rec.date);
    popup.querySelector(".popup-time").textContent = formatTime(rec.time);
    popup.querySelector(".popup-km").textContent = (rec.distance / 1000).toFixed(2) + " km";
    popup.querySelector(".popup-pace").textContent = rec.pace;
    popup.querySelector(".popup-speed").textContent = rec.avgSpeed.toFixed(1) + " km/h";

    popup.querySelector(".popup-route").innerHTML = renderMiniPolyline(rec.polyline);

    popup.style.display = "flex";
}

/* ------------------------------------------------------------
   팝업 닫기
------------------------------------------------------------ */
function closeHistoryPopup() {
    const popup = document.querySelector("#historyPopup");
    if (popup) popup.style.display = "none";
}

/* ------------------------------------------------------------
   기록 삭제
------------------------------------------------------------ */
function deleteHistoryRecord() {
    if (HistoryManager.selectedIndex === null) return;

    if (!confirm("이 기록을 삭제할까요?")) return;

    HistoryManager.records.splice(HistoryManager.selectedIndex, 1);

    // storage 저장
    if (window.StorageAPI) StorageAPI.saveRuns(HistoryManager.records);

    HistoryManager.selectedIndex = null;
    closeHistoryPopup();
    renderHistoryList();
    renderWeeklyStats();
}

/* ------------------------------------------------------------
   공유하기 (기초 구조)
------------------------------------------------------------ */
function shareRecord() {
    if (HistoryManager.selectedIndex === null) return;
    const rec = HistoryManager.records[HistoryManager.selectedIndex];

    alert("이 기록이 친구에게 공유됩니다. (추후 서버 연결 예정)");
}

/* ------------------------------------------------------------
   일주일 통계 (km 막대)
------------------------------------------------------------ */
function renderWeeklyStats() {
    const container = document.querySelector("#weeklyStats");
    if (!container) return;

    container.innerHTML = "";

    const last7 = {};

    // 최근 7일 날짜 생성
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);

        const key = d.toISOString().slice(0, 10);
        last7[key] = 0;
    }

    // 기록 반영
    HistoryManager.records.forEach((rec) => {
        const key = rec.date.slice(0, 10);
        if (key in last7) {
            last7[key] += rec.distance / 1000;
        }
    });

    Object.entries(last7).forEach(([date, km]) => {
        const bar = document.createElement("div");
        bar.className = "stat-bar";

        const h = Math.min(km * 20, 100); // KM 높이 비례

        bar.innerHTML = `
            <div class="bar-value" style="height:${h}px"></div>
            <div class="bar-label">${date.slice(5)}</div>
        `;

        container.appendChild(bar);
    });
}

/* ------------------------------------------------------------
   날짜/시간 포맷
------------------------------------------------------------ */
function formatDate(dateStr) {
    const d = new Date(dateStr);
    const y = d.getFullYear().toString().slice(2);
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const d2 = d.getDate().toString().padStart(2, "0");

    return `${y}.${m}.${d2}`;
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------
   이벤트 연결
------------------------------------------------------------ */
window.addEventListener("load", () => {
    loadHistory();
    renderHistoryList();
    renderWeeklyStats();

    const closeBtn = document.querySelector("#popupCloseBtn");
    const deleteBtn = document.querySelector("#popupDeleteBtn");
    const shareBtn = document.querySelector("#popupShareBtn");

    if (closeBtn) closeBtn.addEventListener("click", closeHistoryPopup);
    if (deleteBtn) deleteBtn.addEventListener("click", deleteHistoryRecord);
    if (shareBtn) shareBtn.addEventListener("click", shareRecord);
});
