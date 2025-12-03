/* ============================================================
   PokéRun PRO - api-service.js
   백엔드 API 연동 뼈대
   - 공통 fetch wrapper
   - 토큰 저장/관리
   - 예시 API 함수(로그인, 기록 업로드/다운로드 등)
   - 실제 서버 연결 시 즉시 적용 가능
============================================================ */

const BASE_URL = "https://your-server-domain.com/api"; 
// ← 나중에 실제 서버 주소로 교체하면 됨

const ApiService = {

    /* -----------------------------------------
       토큰 관리
    ----------------------------------------- */
    getToken() {
        return localStorage.getItem("authToken") || null;
    },

    setToken(token) {
        localStorage.setItem("authToken", token);
    },

    clearToken() {
        localStorage.removeItem("authToken");
    },

    /* -----------------------------------------
       공통 요청 처리기 (fetch wrapper)
       options = { method, headers, body }
    ----------------------------------------- */
    async request(endpoint, options = {}) {
        const token = this.getToken();

        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };

        if (token) headers["Authorization"] = `Bearer ${token}`;

        try {
            const res = await fetch(`${BASE_URL}${endpoint}`, {
                method: options.method || "GET",
                headers,
                body: options.body ? JSON.stringify(options.body) : null
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`API Error ${res.status}: ${errText}`);
            }

            return await res.json();

        } catch (err) {
            console.error("API REQUEST FAILED:", err);
            return { success: false, error: err.message };
        }
    },

    /* ============================================================
       여기에 아래와 같은 형태로 API 연결 가능
       지금은 뼈대만 만들고 실제 호출은 가짜 응답 반환
    ============================================================ */

    /* -----------------------------------------
       로그인 API (예시)
       request: { email, password }
       response: { token } 
    ----------------------------------------- */
    async login(email, password) {
        // 실제 서버 연결할 때 아래 request() 사용
        /*
        return this.request("/auth/login", {
            method: "POST",
            body: { email, password }
        });
        */

        // 현재는 서버 없으므로 가짜 응답
        const fakeToken = "FAKE_TOKEN_123456";
        this.setToken(fakeToken);

        return {
            success: true,
            token: fakeToken
        };
    },

    /* -----------------------------------------
       로그아웃
    ----------------------------------------- */
    async logout() {
        this.clearToken();
        return { success: true };
    },

    /* -----------------------------------------
       러닝 기록 서버 업로드 (예시)
       record = run.js에서 만든 기록 객체
    ----------------------------------------- */
    async uploadRunRecord(record) {
        /*
        return this.request("/run/upload", {
            method: "POST",
            body: record
        });
        */

        // 현재는 서버 없음.
        return { success: true, message: "업로드(가짜)" };
    },

    /* -----------------------------------------
       서버에서 기록 불러오기 (예시)
    ----------------------------------------- */
    async fetchRunRecords() {
        /*
        return this.request("/run/list", {
            method: "GET"
        });
        */

        return { success: true, data: [] }; // 빈 리스트 반환
    },

    /* -----------------------------------------
       코스 업로드 (예시)
    ----------------------------------------- */
    async uploadCourse(course) {
        /*
        return this.request("/course/upload", {
            method: "POST",
            body: course
        });
        */

        return { success: true, message: "코스 업로드(가짜)" };
    },

    /* -----------------------------------------
       내 저장된 코스 불러오기 (예시)
    ----------------------------------------- */
    async fetchCourses() {
        /*
        return this.request("/course/list", {
            method: "GET"
        });
        */

        return { success: true, data: [] };
    }
};
