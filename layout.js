/* ============================================================
   POKERUN LAYOUT INJECTOR (FINAL v4)
   - 3 Layout Modes: Run / Weight / Main(Index)
   - Center Button Logic: Expand -> Navigate to Index
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    injectLayout();
    highlightCurrentNav();
    fetchUserCoin(); 
});

// 센터 메뉴 상태 (펼쳐졌는지 여부)
let isMenuExpanded = false;

function injectLayout() {
    const body = document.body;
    const path = window.location.pathname;
    const page = path.split("/").pop(); // 현재 파일명

    // --- 1. 상단바 (공통) ---
    // 우측 아이콘 순서: 설정 -> 다크모드 -> 코인
    const headerHTML = `
        <header class="app-header">
            <div class="header-left" onclick="location.href='index.html'">
                <div class="logo-icon"><span class="material-icons">flash_on</span></div>
                <div class="logo-text">
                    <span class="logo-poke">POKE</span><span class="logo-run">RUN</span>
                </div>
            </div>
            <div class="header-right">
                <button class="icon-btn" onclick="location.href='settings.html'"><span class="material-icons">settings</span></button>
                <button class="icon-btn" onclick="toggleDarkMode()"><span class="material-icons">dark_mode</span></button>
                <div class="coin-capsule">
                    <span class="material-icons coin-icon">monetization_on</span>
                    <span id="userCoinDisplay">0</span>
                </div>
            </div>
        </header>
    `;

    // --- 2. 하단바 (모드별 분기) ---
    let navItemsHTML = "";

    // [Mode 1] 러닝 모드 (run_ 접두사)
    if (page.includes('run_')) {
        navItemsHTML = `
            <a href="run_running.html" class="nav-item" id="nav-run">
                <span class="material-icons">directions_run</span><div>러닝</div>
            </a>
            <a href="run_course.html" class="nav-item" id="nav-course">
                <span class="material-icons">map</span><div>코스</div>
            </a>
            <div class="nav-space"></div> <a href="run_record.html" class="nav-item" id="nav-record">
                <span class="material-icons">format_list_bulleted</span><div>기록</div>
            </a>
            <a href="profile.html" class="nav-item" id="nav-profile">
                <span class="material-icons">person_outline</span><div>프로필</div>
            </a>
        `;
    } 
    // [Mode 2] 웨이트 모드 (wei_ 또는 weight_ 접두사)
    else if (page.includes('wei_') || page.includes('weight_')) {
        navItemsHTML = `
            <a href="wei_calendar.html" class="nav-item" id="nav-calendar">
                <span class="material-icons">calendar_today</span><div>캘린더</div>
            </a>
            <a href="wei_routine.html" class="nav-item" id="nav-routine">
                <span class="material-icons">fitness_center</span><div>루틴</div>
            </a>
            <div class="nav-space"></div> <a href="wei_stats.html" class="nav-item" id="nav-stats">
                <span class="material-icons">bar_chart</span><div>통계</div>
            </a>
            <a href="profile.html" class="nav-item" id="nav-profile">
                <span class="material-icons">person_outline</span><div>프로필</div>
            </a>
        `;
    } 
    // [Mode 3] 메인/기본 모드 (index, reels, profile 등)
    else {
        navItemsHTML = `
            <a href="index.html" class="nav-item" id="nav-feed">
                <span class="material-icons">home</span><div>피드</div>
            </a>
            <a href="reels.html" class="nav-item" id="nav-reels">
                <span class="material-icons">movie</span><div>릴스</div>
            </a>
            <div class="nav-space"></div> <a href="profile.html" class="nav-item" id="nav-profile">
                <span class="material-icons">person_outline</span><div>프로필</div>
            </a>
            <a href="settings.html" class="nav-item" id="nav-settings">
                <span class="material-icons">settings</span><div>설정</div>
            </a>
        `;
    }

    // 하단바 조립
    const footerHTML = `
        <div id="menuOverlay" class="menu-overlay" onclick="closeCenterMenu()"></div>

        <nav class="app-bottom-nav">
            ${navItemsHTML}

            <div class="center-menu-container" id="centerMenu">
                <div class="satellite yellow-ball" onclick="location.href='run_home.html'"></div>
                <div class="satellite green-ball"  onclick="location.href='black_white.html'"></div>
                <div class="satellite blue-ball"   onclick="location.href='wei_home.html'"></div>
                
                <div class="main-ball" onclick="handleCenterClick()"></div>
            </div>
        </nav>
    `;

    body.insertAdjacentHTML('afterbegin', headerHTML);
    body.insertAdjacentHTML('beforeend', footerHTML);
}

// --- 센터 버튼 핵심 로직 ---
function handleCenterClick() {
    const menu = document.getElementById('centerMenu');
    
    if (!isMenuExpanded) {
        // 1. 닫힌 상태 -> 펼치기
        menu.classList.add('expanded');
        isMenuExpanded = true;
    } else {
        // 2. 펼쳐진 상태 -> index.html로 이동
        window.location.href = 'index.html';
    }
}

// 메뉴 닫기 (오버레이 클릭 시)
function closeCenterMenu() {
    const menu = document.getElementById('centerMenu');
    menu.classList.remove('expanded');
    isMenuExpanded = false;
}

// --- 유틸리티 ---
function highlightCurrentNav() {
    const path = window.location.pathname;
    const page = path.split("/").pop(); 

    // 현재 페이지 아이콘 활성화 로직
    if (page === 'index.html') document.getElementById('nav-feed')?.classList.add('active');
    else if (page === 'reels.html') document.getElementById('nav-reels')?.classList.add('active');
    else if (page === 'settings.html') document.getElementById('nav-settings')?.classList.add('active');
    else if (page.includes('profile')) document.getElementById('nav-profile')?.classList.add('active');
    
    // Run
    else if (page.includes('run_running')) document.getElementById('nav-run')?.classList.add('active');
    else if (page.includes('run_course')) document.getElementById('nav-course')?.classList.add('active');
    else if (page.includes('run_record')) document.getElementById('nav-record')?.classList.add('active');
    
    // Weight
    else if (page.includes('calendar')) document.getElementById('nav-calendar')?.classList.add('active');
    else if (page.includes('routine')) document.getElementById('nav-routine')?.classList.add('active');
    else if (page.includes('stats')) document.getElementById('nav-stats')?.classList.add('active');
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

function fetchUserCoin() {
    // 서버 통신 대용 (3000 코인)
    const el = document.getElementById('userCoinDisplay');
    if(el) el.innerText = "3,000"; 
}