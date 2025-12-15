// firebase-service.js
// ----------------------------------------------------
// (1) Import: 설정은 config.js에서, 기능은 CDN에서 가져옴
// ----------------------------------------------------

// 1. 이미 초기화된 auth, db 객체를 config.js에서 가져옵니다. (중복 초기화 방지)
import { auth, db } from './config.js';

// 2. 인증 관련 함수들 (로그인, 회원가입 등 기능)
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 3. 데이터베이스 관련 함수들 (읽기, 쓰기, 검색)
import { 
    ref, 
    set, 
    get, 
    query, 
    orderByChild, 
    equalTo 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// 상태 변수 export (다른 파일에서 import 해서 사용 가능)
export let isIdChecked = false;
export let isNickChecked = false;

// ----------------------------------------------------
// (2) 핵심 비즈니스 로직 함수 (export)
// ----------------------------------------------------

/** 로그인 처리 (DOM 접근 없이 순수 로직만) */
export const handleLoginLogic = async (email, pw) => {
    if(!email || !pw) throw new Error("이메일과 비밀번호를 입력해주세요.");
    // config.js에서 가져온 auth 객체 사용
    await signInWithEmailAndPassword(auth, email, pw);
};

/** 아이디 중복확인 로직 (DOM 접근 없이 순수 로직만) */
export const checkDuplicateIDLogic = async (val) => {
    if(val.length < 4) throw new Error("아이디는 4글자 이상이어야 합니다.");
    
    // config.js에서 가져온 db 객체 사용
    const q = query(ref(db, 'users'), orderByChild('userId'), equalTo(val));
    const snap = await get(q);
    
    isIdChecked = !snap.exists(); // 변수 업데이트
    return { isAvailable: isIdChecked, message: isIdChecked ? "사용 가능한 아이디입니다." : "이미 존재하는 아이디입니다." };
};

/** 닉네임 중복확인 로직 (DOM 접근 없이 순수 로직만) */
export const checkDuplicateNickLogic = async (val) => {
    if(val.length < 2) throw new Error("2글자 이상 입력하세요.");

    const q = query(ref(db, 'users'), orderByChild('nickname'), equalTo(val));
    const snap = await get(q);
    
    isNickChecked = !snap.exists(); // 변수 업데이트
    return { isAvailable: isNickChecked, message: isNickChecked ? "사용 가능합니다." : "이미 존재하는 닉네임입니다." };
};

/** 회원가입 처리 로직 (DOM 접근 없이 순수 로직만) */
export const handleSignupLogic = async (email, customId, nick, pw, name, phone, dob) => {
    if(!email || !pw || !name || !phone) throw new Error("필수 정보를 입력하세요.");
    if(!customId) throw new Error("아이디를 입력하세요.");
    if(!isIdChecked) throw new Error("아이디 중복확인 필수.");
    if(!isNickChecked) throw new Error("닉네임 중복확인 필수.");

    // 1. 인증(Auth)에 이메일/비번으로 계정 생성
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    
    // 2. DB에 상세 정보 저장
    await set(ref(db, 'users/' + cred.user.uid), {
        userId: customId,
        nickname: nick,
        email: email,
        realName: name,
        phone: phone,
        dob: dob,
        password: pw, // 보안상 비권장하지만 요청대로 유지
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${nick}`
    });
};

/** 아이디 찾기 로직 (DOM 접근 없이 순수 로직만) */
export const findIDLogic = async (email) => {
    if(!email) throw new Error("이메일을 입력하세요.");
    
    const q = query(ref(db, 'users'), orderByChild('email'), equalTo(email));
    const snap = await get(q);
    
    if (snap.exists()) {
        const data = Object.values(snap.val())[0];
        return data.userId || null;
    }
    return null;
};

/** 비밀번호 찾기 로직 (DOM 접근 없이 순수 로직만) */
export const findPWLogic = async (targetId, targetEmail) => {
    if(!targetId || !targetEmail) throw new Error("모두 입력하세요.");

    const q = query(ref(db, 'users'), orderByChild('userId'), equalTo(targetId));
    const snap = await get(q);

    if (snap.exists()) {
        const data = Object.values(snap.val())[0];
        if(data.email === targetEmail) {
            return data.password || null;
        } else {
            throw new Error("이메일 불일치.");
        }
    } else {
        throw new Error("존재하지 않는 아이디.");
    }
};

export { auth, db };