// 파일명: config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAbHwLLXIH8rBQ8gNMVqE5SE208aIbfFZ0",  // 여기가 수정되었습니다 (숫자 0으로 변경)
    authDomain: "pokbattle.firebaseapp.com",
    databaseURL: "https://pokbattle-default-rtdb.firebaseio.com",
    projectId: "pokbattle",
    storageBucket: "pokbattle.firebasestorage.app",
    messagingSenderId: "445300582484",
    appId: "1:445300582484:web:f8f1373a3bbf643face5c1",
    measurementId: "G-PNXLYD0D0X"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); 
export const db = getDatabase(app);