/* ============================================================
   PokéRun PRO - storage.js
   로컬 데이터 저장/불러오기/삭제/초기화 엔진
   - 러닝 기록 저장/로드
   - 코스 저장/로드
   - 전체 초기화
============================================================ */

const StorageAPI = {

    /* ----------------------------------------
       러닝 기록 저장
       record = {
         date, distance, pace, avgSpeed,
         curSpeed, calories, time, polyline[]
       }
    ---------------------------------------- */
    saveRun(record) {
        const list = this.loadRuns();
        list.push(record);

        localStorage.setItem("runRecords", JSON.stringify(list));
    },

    /* ----------------------------------------
       러닝 기록 불러오기
    ---------------------------------------- */
    loadRuns() {
        const raw = localStorage.getItem("runRecords");
        return raw ? JSON.parse(raw) : [];
    },

    /* ----------------------------------------
       러닝 기록 전체 덮어쓰기 (삭제 후 갱신에 사용)
    ---------------------------------------- */
    saveRuns(list) {
        localStorage.setItem("runRecords", JSON.stringify(list));
    },

    /* ----------------------------------------
       코스 저장
       data = { name, distance, coords[] }
    ---------------------------------------- */
    saveCourse(data) {
        const list = this.loadCourses();
        list.push(data);

        localStorage.setItem("savedCourses", JSON.stringify(list));
    },

    /* ----------------------------------------
       코스 불러오기
    ---------------------------------------- */
    loadCourses() {
        const raw = localStorage.getItem("savedCourses");
        return raw ? JSON.parse(raw) : [];
    },

    /* ----------------------------------------
       코스 전체 덮어쓰기
    ---------------------------------------- */
    saveCourses(list) {
        localStorage.setItem("savedCourses", JSON.stringify(list));
    },

    /* ----------------------------------------
       모든 데이터 초기화 (설정 탭 휴지통 버튼)
    ---------------------------------------- */
    clearAll() {
        localStorage.removeItem("runRecords");
        localStorage.removeItem("savedCourses");
    }
};
