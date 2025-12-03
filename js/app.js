// js/app.js
(() => {
  const tabButtons = document.querySelectorAll(".bottom-nav .nav-item");
  const tabScreens = document.querySelectorAll(".tab-screen");

  function showTab(tabName) {
    // 화면 전환
    tabScreens.forEach((sec) => {
      sec.classList.toggle("is-active", sec.dataset.tab === tabName);
    });

    // 하단 아이콘 활성화
    tabButtons.forEach((btn) => {
      btn.classList.toggle(
        "is-active",
        btn.dataset.tabTarget === tabName
      );
    });

    // 지도 위치 이동
    if (window.mapManager) {
      if (tabName === "running") {
        window.mapManager.moveTo("running");
      } else if (tabName === "course") {
        window.mapManager.moveTo("course");
      }
      // 홈·기록·설정은 지도 안 보이게 둠 (필요하면 나중에 history-detail로 이동)
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    // 탭 버튼 클릭
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.tabTarget;
        if (!target) return;
        showTab(target);
      });
    });

    // 초기 탭 = 러닝
    showTab("running");
  });

  // 다른 JS에서 필요하면 사용할 수 있도록
  window.appTabs = { showTab };
})();
