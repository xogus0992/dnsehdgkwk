/* ============================================================
   POKERUN LAYOUT INJECTOR (Fixed Navigation Logic)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    injectLayout();
    highlightCurrentNav();
    fetchUserCoin(); 
});

let isMenuExpanded = false;

function injectLayout() {
    const body = document.body;
    const path = window.location.pathname;
    const page = path.split("/").pop(); // 현재 파일명 (예: index.html)

    // 1. 상단바 (공통)
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
                <div class="coin-capsule">
                    <span class="material-icons coin-icon">monetization_on</span>
                    <span id="userCoinDisplay">0</span>
                </div>
            </div>
        </header>
    `;

    // 2. 하단바 아이템 결정 로직 (여기가 중요!)
    let navItemsHTML = "";

    // [A] 러닝 모드 (run_ 으로 시작)
    if (page.startsWith('run_')) {
        navItemsHTML = `
            <a href="run_home.html" class="nav-item" id="nav-home">
                <span class="material-icons">home</span><div>홈</div>
            </a>
            <a href="run_course.html" class="nav-item" id="nav-course">
                <span class="material-icons">map</span><div>코스</div>
            </a>
            <div class="nav-space"></div>
            <a href="run_record.html" class="nav-item" id="nav-record">
                <span class="material-icons">list_alt</span><div>기록</div>
            </a>
            <a href="profile.html" class="nav-item" id="nav-profile">
                <span class="material-icons">person</span><div>프로필</div>
            </a>
        `;
    } 
    // [B] 웨이트 모드 (wei_ 로 시작)
    else if (page.startsWith('wei_') || page.startsWith('weight_')) {
        navItemsHTML = `
            <a href="wei_home.html" class="nav-item" id="nav-home">
                <span class="material-icons">home</span><div>홈</div>
            </a>
            <a href="wei_routine.html" class="nav-item" id="nav-routine">
                <span class="material-icons">fitness_center</span><div>루틴</div>
            </a>
            <div class="nav-space"></div>
            <a href="wei_stats.html" class="nav-item" id="nav-stats">
                <span class="material-icons">bar_chart</span><div>통계</div>
            </a>
            <a href="profile.html" class="nav-item" id="nav-profile">
                <span class="material-icons">person</span><div>프로필</div>
            </a>
        `;
    } 
    // [C] 소셜/메인 모드 (index.html, reels.html, settings.html 등 나머지 전부)
    else {
        navItemsHTML = `
            <a href="index.html" class="nav-item" id="nav-feed">
                <span class="material-icons">home</span><div>피드</div>
            </a>
            <a href="reels.html" class="nav-item" id="nav-reels">
                <span class="material-icons">movie</span><div>릴스</div>
            </a>
            <div class="nav-space"></div>
            <a href="profile.html" class="nav-item" id="nav-profile">
                <span class="material-icons">person</span><div>프로필</div>
            </a>
            <a href="settings.html" class="nav-item" id="nav-settings">
                <span class="material-icons">settings</span><div>설정</div>
            </a>
        `;
    }

    // 3. 하단바 조립 (게임 페이지 black_white.html은 CSS로 하단바 숨김)
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

function handleCenterClick() {
    const menu = document.getElementById('centerMenu');
    if (!isMenuExpanded) {
        menu.classList.add('expanded');
        isMenuExpanded = true;
    } else {
        // 이미 열려있으면 메인(index)으로 이동
        window.location.href = 'index.html';
    }
}

function closeCenterMenu() {
    const menu = document.getElementById('centerMenu');
    if(menu) menu.classList.remove('expanded');
    isMenuExpanded = false;
}

function highlightCurrentNav() {
    const path = window.location.pathname;
    const page = path.split("/").pop(); 

    // 현재 페이지 활성화 (파란색 불 들어오게)
    if (page === 'index.html') document.getElementById('nav-feed')?.classList.add('active');
    else if (page === 'reels.html') document.getElementById('nav-reels')?.classList.add('active');
    else if (page === 'settings.html') document.getElementById('nav-settings')?.classList.add('active');
    else if (page === 'profile.html') document.getElementById('nav-profile')?.classList.add('active');
    
    // 러닝
    else if (page === 'run_home.html') document.getElementById('nav-home')?.classList.add('active');
    else if (page === 'run_course.html') document.getElementById('nav-course')?.classList.add('active');
    else if (page === 'run_record.html') document.getElementById('nav-record')?.classList.add('active');

    // 웨이트
    else if (page === 'wei_home.html') document.getElementById('nav-home')?.classList.add('active');
    else if (page === 'wei_routine.html') document.getElementById('nav-routine')?.classList.add('active');
    else if (page === 'wei_stats.html') document.getElementById('nav-stats')?.classList.add('active');
}

function fetchUserCoin() {
    // 실제 파이어베이스 연동 시 수정
    const el = document.getElementById('userCoinDisplay');
    if(el) el.innerText = "3,500"; 
}