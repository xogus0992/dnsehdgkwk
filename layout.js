import { auth, db } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, onValue, get, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let isMenuExpanded = false;

document.addEventListener("DOMContentLoaded", () => {
    injectLayout();
    adjustContentHeight();
    highlightCurrentNav();
    initCoinListener();
    initAddCoinButton();
    bindCenterMenuEvents();
    window.addEventListener("resize", adjustContentHeight);
});

function injectLayout() {
    const body = document.body;
    const page = window.location.pathname.split("/").pop();

    const headerHTML = `
        <header class="app-header">
            <div class="header-left" id="logoHome">
                <div class="logo-icon"><span class="material-icons">flash_on</span></div>
                <div class="logo-text"><span class="logo-poke">POKE</span><span class="logo-run">RUN</span></div>
            </div>
            <div class="header-right">
                <button id="addCoinBtn" class="icon-btn" title="+1000 Coin"><span class="material-icons">add</span></button>
                <button class="icon-btn" onclick="location.href='settings.html'"><span class="material-icons">settings</span></button>
                <div class="coin-capsule">
                    <span class="material-icons coin-icon">monetization_on</span>
                    <span id="userCoinDisplay">...</span>
                </div>
            </div>
        </header>
    `;

    let navItemsHTML = "";

    if (page.startsWith("run_")) {
        navItemsHTML = `
            <a href="run_running.html" class="nav-item" id="nav-running"><span class="material-icons">directions_run</span><div>러닝</div></a>
            <a href="run_course.html" class="nav-item" id="nav-course"><span class="material-icons">map</span><div>코스</div></a>
            <div class="nav-space"></div>
            <a href="run_record.html" class="nav-item" id="nav-record"><span class="material-icons">list_alt</span><div>기록</div></a>
            <a href="profile.html" class="nav-item" id="nav-profile"><span class="material-icons">person</span><div>프로필</div></a>
        `;
    } else if (page.startsWith("wei_") || page.startsWith("weight_")) {
        navItemsHTML = `
            <a href="wei_calendar.html" class="nav-item" id="nav-calendar"><span class="material-icons">calendar_month</span><div>캘린더</div></a>
            <a href="wei_routine.html" class="nav-item" id="nav-routine"><span class="material-icons">fitness_center</span><div>루틴</div></a>
            <div class="nav-space"></div>
            <a href="wei_stats.html" class="nav-item" id="nav-stats"><span class="material-icons">bar_chart</span><div>통계</div></a>
            <a href="profile.html" class="nav-item" id="nav-profile"><span class="material-icons">person</span><div>프로필</div></a>
        `;
    } else {
        navItemsHTML = `
            <a href="index.html" class="nav-item" id="nav-feed"><span class="material-icons">home</span><div>피드</div></a>
            <a href="reels.html" class="nav-item" id="nav-reels"><span class="material-icons">movie</span><div>릴스</div></a>
            <div class="nav-space"></div>
            <a href="profile.html" class="nav-item" id="nav-profile"><span class="material-icons">person</span><div>프로필</div></a>
            <a href="settings.html" class="nav-item" id="nav-settings"><span class="material-icons">settings</span><div>설정</div></a>
        `;
    }

    const footerHTML = `
        <div id="menuOverlay" class="menu-overlay"></div>
        <nav class="app-bottom-nav">${navItemsHTML}</nav>
        <div class="center-menu-container" id="centerMenu">
            <div class="satellite yellow-ball" data-link="run_home.html"></div>
            <div class="satellite green-ball" data-link="black_white.html"></div>
            <div class="satellite blue-ball" data-link="wei_home.html"></div>
            <div class="main-ball" id="mainBall"></div>
        </div>
    `;

    body.insertAdjacentHTML("afterbegin", headerHTML);
    body.insertAdjacentHTML("beforeend", footerHTML);

    document.getElementById("logoHome").onclick = () => location.href = "index.html";
}

function bindCenterMenuEvents() {
    const menu = document.getElementById("centerMenu");
    const main = document.getElementById("mainBall");
    const overlay = document.getElementById("menuOverlay");

    main.onclick = e => {
        e.stopPropagation();
        if (!isMenuExpanded) {
            menu.classList.add("expanded");
            overlay.classList.add("active");
            isMenuExpanded = true;
        } else {
            location.href = "index.html";
        }
    };

    overlay.onclick = () => {
        menu.classList.remove("expanded");
        overlay.classList.remove("active");
        isMenuExpanded = false;
    };

    menu.querySelectorAll(".satellite").forEach(s => {
        s.onclick = e => {
            e.stopPropagation();
            const link = s.dataset.link;
            if (link) location.href = link;
        };
    });
}

function adjustContentHeight() {
    const h = document.querySelector(".app-header");
    const f = document.querySelector(".app-bottom-nav");
    if (!h || !f) return;
    document.documentElement.style.setProperty("--header-h", `${h.offsetHeight}px`);
    document.documentElement.style.setProperty("--footer-h", `${f.offsetHeight}px`);
}

function highlightCurrentNav() {
    const page = window.location.pathname.split("/").pop();
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

    if (page === "index.html") document.getElementById("nav-feed")?.classList.add("active");
    else if (page === "reels.html") document.getElementById("nav-reels")?.classList.add("active");
    else if (page === "settings.html") document.getElementById("nav-settings")?.classList.add("active");
    else if (page === "profile.html") document.getElementById("nav-profile")?.classList.add("active");

    else if (page.startsWith("run_running")) document.getElementById("nav-running")?.classList.add("active");
    else if (page.startsWith("run_course")) document.getElementById("nav-course")?.classList.add("active");
    else if (page.startsWith("run_record")) document.getElementById("nav-record")?.classList.add("active");

    else if (page.startsWith("wei_calendar")) document.getElementById("nav-calendar")?.classList.add("active");
    else if (page.startsWith("wei_routine")) document.getElementById("nav-routine")?.classList.add("active");
    else if (page.startsWith("wei_stats")) document.getElementById("nav-stats")?.classList.add("active");
}

function initCoinListener() {
    onAuthStateChanged(auth, user => {
        const coinEl = document.getElementById("userCoinDisplay");
        if (!coinEl) return;

        if (user) {
            const coinRef = ref(db, `users/${user.uid}/coins`);
            onValue(coinRef, snap => {
                coinEl.textContent = (snap.val() || 0).toLocaleString();
            });
        } else {
            coinEl.textContent = "-";
        }
    });
}

function initAddCoinButton() {
    const btn = document.getElementById("addCoinBtn");
    if (!btn) return;

    btn.onclick = () => {
        const user = auth.currentUser;
        if (!user) {
            alert("로그인이 필요합니다");
            return;
        }

        const coinRef = ref(db, `users/${user.uid}/coins`);
        get(coinRef).then(snap => {
            const cur = snap.val() || 0;
            set(coinRef, cur + 1000);
        });
    };
}
