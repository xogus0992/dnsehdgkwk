/* ============================================================
   POKERUN LAYOUT INJECTOR (SAFE MOBILE VERSION)
   - DESIGN / ANIMATION UNCHANGED
   - ONLY RATIO & HEIGHT CALCULATION
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    injectLayout();
    adjustContentHeight();
    highlightCurrentNav();
    fetchUserCoin();
    window.addEventListener('resize', adjustContentHeight);
});

let isMenuExpanded = false;

function injectLayout() {
    const body = document.body;
    const path = window.location.pathname;
    const page = path.split("/").pop();

    const headerHTML = `
        <header class="app-header">
            <div class="header-left" onclick="location.href='index.html'">
                <div class="logo-icon"><span class="material-icons">flash_on</span></div>
                <div class="logo-text">
                    <span class="logo-poke">POKE</span><span class="logo-run">RUN</span>
                </div>
            </div>
            <div class="header-right">
                <button class="icon-btn" onclick="location.href='settings.html'">
                    <span class="material-icons">settings</span>
                </button>
                <div class="coin-capsule">
                    <span class="material-icons coin-icon">monetization_on</span>
                    <span id="userCoinDisplay">0</span>
                </div>
            </div>
        </header>
    `;

    let navItemsHTML = "";

    if (page.startsWith('run_')) {
        navItemsHTML = `
            <a href="run_running.html" class="nav-item" id="nav-running">
                <span class="material-icons">directions_run</span><div>러닝</div>
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
    } else if (page.startsWith('wei_') || page.startsWith('weight_')) {
        navItemsHTML = `
            <a href="wei_calendar.html" class="nav-item" id="nav-calendar">
                <span class="material-icons">calendar_month</span><div>캘린더</div>
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
    } else {
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

    const footerHTML = `
        <div id="menuOverlay" class="menu-overlay" onclick="closeCenterMenu()"></div>
        <nav class="app-bottom-nav">
            ${navItemsHTML}
            <div class="center-menu-container" id="centerMenu">
                <div class="satellite yellow-ball" onclick="location.href='run_home.html'"></div>
                <div class="satellite green-ball" onclick="location.href='black_white.html'"></div>
                <div class="satellite blue-ball" onclick="location.href='wei_home.html'"></div>
                <div class="main-ball" onclick="handleCenterClick()"></div>
            </div>
        </nav>
    `;

    body.insertAdjacentHTML('afterbegin', headerHTML);
    body.insertAdjacentHTML('beforeend', footerHTML);
}

function adjustContentHeight() {
    const header = document.querySelector('.app-header');
    const footer = document.querySelector('.app-bottom-nav');
    const content = document.querySelector('.app-content');

    if (!content || !header || !footer) return;

    const headerH = header.offsetHeight;
    const footerH = footer.offsetHeight;

    document.documentElement.style.setProperty('--header-h', `${headerH}px`);
    document.documentElement.style.setProperty('--footer-h', `${footerH}px`);
}

function handleCenterClick() {
    const menu = document.getElementById('centerMenu');
    if (!isMenuExpanded) {
        menu.classList.add('expanded');
        isMenuExpanded = true;
    } else {
        window.location.href = 'index.html';
    }
}

function closeCenterMenu() {
    const menu = document.getElementById('centerMenu');
    if (menu) menu.classList.remove('expanded');
    isMenuExpanded = false;
}

function highlightCurrentNav() {
    const page = window.location.pathname.split("/").pop();

    if (page === 'index.html') document.getElementById('nav-feed')?.classList.add('active');
    else if (page === 'reels.html') document.getElementById('nav-reels')?.classList.add('active');
    else if (page === 'settings.html') document.getElementById('nav-settings')?.classList.add('active');
    else if (page === 'profile.html') document.getElementById('nav-profile')?.classList.add('active');
    else if (page === 'run_home.html') document.getElementById('nav-home')?.classList.add('active');
    else if (page === 'run_course.html') document.getElementById('nav-course')?.classList.add('active');
    else if (page === 'run_record.html') document.getElementById('nav-record')?.classList.add('active');
    else if (page === 'wei_home.html') document.getElementById('nav-home')?.classList.add('active');
    else if (page === 'wei_routine.html') document.getElementById('nav-routine')?.classList.add('active');
    else if (page === 'wei_stats.html') document.getElementById('nav-stats')?.classList.add('active');
}

function fetchUserCoin() {
    const el = document.getElementById('userCoinDisplay');
    if (el) el.innerText = "3,500";
}
