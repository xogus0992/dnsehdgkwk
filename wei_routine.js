/* ============================================================
   POKERUN ROUTINE LOGIC (Firebase Version)
   - exercises.js 데이터 사용
   - Firebase Realtime Database Integrated
   ============================================================ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, push, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { 
    apiKey: "AIzaSyAbHwLLXIH8rBQ8gNMVqE5SE208aIbfFZ0", 
    authDomain: "pokbattle.firebaseapp.com", 
    databaseURL: "https://pokbattle-default-rtdb.firebaseio.com", 
    projectId: "pokbattle" 
};

// layout.js에서 이미 앱을 켰을 수 있으므로 체크 후 가져옴
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);

// ----------------------------------------------------
// 상태 변수
// ----------------------------------------------------
let currentUser = null;
let currentRoutine = []; 
let selectedBodyPart = "가슴"; 
let selectedExercise = null;   
let editingRoutineId = null;   

// DOM 요소
const els = {
    listContainer: document.getElementById('routineListContainer'),
    modal: document.getElementById('routineModal'),
    customModal: document.getElementById('customExerciseModal'),
    
    // Inputs
    routineName: document.getElementById('routineNameInput'),
    inputKg: document.getElementById('inputKg'),
    inputReps: document.getElementById('inputReps'),
    inputSets: document.getElementById('inputSets'),
    
    // Lists
    bodyPartTabs: document.getElementById('bodyPartTabs'),
    exList: document.getElementById('exerciseSelectScroll'),
    addedList: document.getElementById('addedExerciseList'),
    
    // Custom Inputs
    customPart: document.getElementById('customBodyPartSelect'),
    customName: document.getElementById('customExerciseName')
};

// ----------------------------------------------------
// 초기화 및 이벤트 리스너
// ----------------------------------------------------
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        renderRoutineList(); // 로그인 되면 DB에서 루틴 불러오기
    } else {
        els.listContainer.innerHTML = '<div style="padding:40px; text-align:center;">로그인이 필요합니다.</div>';
    }
});

window.onload = function() {
    initCreationPopup();
    
    document.getElementById('btnAddRoutine').addEventListener('click', () => {
        if(!currentUser) return alert("로그인이 필요합니다.");
        openRoutineModal();
    });
    document.getElementById('closeRoutineBtn').addEventListener('click', () => els.modal.classList.add('hidden'));
    
    document.getElementById('btnAddExerciseToStart').addEventListener('click', addExerciseToRoutine);
    document.getElementById('btnSaveRoutine').addEventListener('click', saveRoutine);
    
    document.getElementById('btnOpenCustom').addEventListener('click', () => els.customModal.classList.remove('hidden'));
    document.getElementById('closeCustomBtn').addEventListener('click', () => els.customModal.classList.add('hidden'));
    document.getElementById('btnSaveCustomExercise').addEventListener('click', saveCustomExercise);
};

// --- 1. 메인 리스트 렌더링 (Firebase) ---
async function renderRoutineList() {
    if(!currentUser) return;
    els.listContainer.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">로딩 중...</div>';

    const routinesRef = ref(db, `users/${currentUser.uid}/routines`);
    try {
        const snapshot = await get(routinesRef);
        els.listContainer.innerHTML = '';
        
        if (!snapshot.exists()) {
            els.listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#aaa;">등록된 루틴이 없습니다.<br>+ 버튼을 눌러 루틴을 만들어보세요!</div>';
            return;
        }

        const data = snapshot.val();
        // Firebase 객체를 배열로 변환
        const routines = Object.keys(data).map(key => ({
            id: key, // Firebase Key를 ID로 사용
            ...data[key]
        }));

        routines.forEach(routine => {
            const exercises = routine.exercises || [];
            // 부위 태그
            const parts = [...new Set(exercises.map(e => e.part))];
            const tagsHtml = parts.map(p => `<span class="tag">${p}</span>`).join('');
            
            // 요약 리스트
            const summaryHtml = exercises.map(e => {
                const weight = e.kg > 0 ? `${e.kg}kg` : '맨몸';
                return `
                    <div class="summary-row">
                        <span class="ex-name">${e.name}</span>
                        <span class="ex-info">${weight} X ${e.sets}세트</span>
                    </div>
                `;
            }).join('');

            const card = document.createElement('div');
            card.className = 'routine-card';
            card.innerHTML = `
                <div class="card-top">
                    <div class="routine-title">${routine.name}</div>
                    <div class="card-actions">
                        <button class="btn-edit-routine" data-id="${routine.id}"><span class="material-icons">edit</span></button>
                        <button class="btn-del-routine" data-id="${routine.id}"><span class="material-icons">delete</span></button>
                    </div>
                </div>
                <div class="routine-tags">${tagsHtml}</div>
                
                <div class="routine-summary-box">
                    ${summaryHtml}
                </div>
                
                <button class="btn-start-routine" data-id="${routine.id}">시 작 하 기</button>
            `;
            els.listContainer.appendChild(card);
        });

        // 동적 생성된 버튼에 이벤트 바인딩
        document.querySelectorAll('.btn-edit-routine').forEach(btn => 
            btn.addEventListener('click', (e) => editRoutine(e.currentTarget.dataset.id)));
        document.querySelectorAll('.btn-del-routine').forEach(btn => 
            btn.addEventListener('click', (e) => deleteRoutine(e.currentTarget.dataset.id)));
        document.querySelectorAll('.btn-start-routine').forEach(btn => 
            btn.addEventListener('click', (e) => startRoutine(e.currentTarget.dataset.id)));

    } catch (error) {
        console.error(error);
        els.listContainer.innerHTML = '불러오기 실패';
    }
}

// --- 2. 루틴 생성/수정 팝업 로직 ---
async function openRoutineModal(id = null) {
    editingRoutineId = id;
    currentRoutine = [];
    els.routineName.value = '';
    els.inputKg.value = ''; els.inputReps.value = ''; els.inputSets.value = '';
    
    document.getElementById('modalTitle').innerText = id ? "루틴 수정" : "루틴 만들기";

    if (id && currentUser) {
        // 수정 모드: DB에서 데이터 가져오기
        const rRef = ref(db, `users/${currentUser.uid}/routines/${id}`);
        const snap = await get(rRef);
        if(snap.exists()){
            const data = snap.val();
            els.routineName.value = data.name;
            currentRoutine = data.exercises || [];
        }
    }

    renderAddedList();
    renderBodyPartTabs();
    // bodyPartImages는 exercises.js에 있다고 가정
    if(typeof bodyPartImages !== 'undefined') {
        selectBodyPart(Object.keys(bodyPartImages)[0]); 
    }
    els.modal.classList.remove('hidden');
}

function initCreationPopup() {
    renderBodyPartTabs();
}

function renderBodyPartTabs() {
    els.bodyPartTabs.innerHTML = '';
    // bodyPartImages가 exercises.js에 정의되어 있어야 함
    if(typeof bodyPartImages === 'undefined') return;

    Object.keys(bodyPartImages).forEach(part => {
        const chip = document.createElement('div');
        chip.className = `chip ${part === selectedBodyPart ? 'active' : ''}`;
        chip.innerText = part;
        chip.onclick = () => selectBodyPart(part);
        els.bodyPartTabs.appendChild(chip);
    });
}

function selectBodyPart(part) {
    selectedBodyPart = part;
    Array.from(els.bodyPartTabs.children).forEach(chip => {
        if(chip.innerText === part) chip.classList.add('active');
        else chip.classList.remove('active');
    });
    renderExerciseList(part);
}

async function renderExerciseList(part) {
    els.exList.innerHTML = '';
    
    // 1. 기본 운동 리스트 (exercises.js)
    let list = (typeof exercisesData !== 'undefined' && exercisesData[part]) ? exercisesData[part] : [];

    // 2. 커스텀 운동 리스트 (DB에서 가져오기)
    if (currentUser) {
        try {
            const customRef = ref(db, `users/${currentUser.uid}/customExercises/${part}`);
            const snap = await get(customRef);
            if(snap.exists()) {
                const customObj = snap.val();
                const customArr = Object.values(customObj);
                list = [...list, ...customArr];
            }
        } catch(e) { console.log(e); }
    }

    list.forEach(ex => {
        const div = document.createElement('div');
        div.className = 'ex-item';
        const iconHtml = ex.image 
            ? `<img src="${ex.image}" class="ex-icon">` 
            : `<span class="material-icons ex-icon" style="font-size:24px; color:#aaa;">fitness_center</span>`;

        div.innerHTML = `${iconHtml} ${ex.name}`;
        div.onclick = () => {
            Array.from(els.exList.children).forEach(c => c.classList.remove('selected'));
            div.classList.add('selected');
            selectedExercise = ex;
        };
        els.exList.appendChild(div);
    });
    selectedExercise = null; 
}

function addExerciseToRoutine() {
    if (!selectedExercise) return alert("운동 종목을 선택해주세요.");
    const sets = els.inputSets.value;
    const reps = els.inputReps.value;
    const kg = els.inputKg.value;

    if (!sets || !reps) return alert("세트와 횟수는 필수입니다.");

    const newEx = {
        name: selectedExercise.name,
        part: selectedBodyPart,
        image: selectedExercise.image || null,
        kg: kg || 0,
        reps: reps,
        sets: sets,
        tempId: Date.now() + Math.random() // 로컬 식별용
    };

    currentRoutine.push(newEx);
    renderAddedList();
}

function renderAddedList() {
    els.addedList.innerHTML = '';
    currentRoutine.forEach((ex, idx) => {
        const li = document.createElement('li');
        li.className = 'added-item';
        const iconHtml = ex.image 
            ? `<img src="${ex.image}" class="ai-img">` 
            : `<span class="material-icons" style="color:#aaa; margin-right:10px;">fitness_center</span>`;

        li.innerHTML = `
            <div class="ai-info">
                ${iconHtml}
                <div class="ai-text">
                    <div>${ex.name}</div>
                    <div>${ex.kg > 0 ? ex.kg+'kg' : '맨몸'} * ${ex.reps}회 * ${ex.sets}세트</div>
                </div>
            </div>
            <button class="btn-delete-ex" data-idx="${idx}">
                <span class="material-icons">close</span>
            </button>
        `;
        els.addedList.appendChild(li);
    });

    document.querySelectorAll('.btn-delete-ex').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            currentRoutine.splice(idx, 1);
            renderAddedList();
        });
    });
}

// --- 3. 루틴 저장 (Firebase) ---
async function saveRoutine() {
    if(!currentUser) return alert("로그인 상태가 아닙니다.");
    if (currentRoutine.length === 0) return alert("운동을 최소 1개 이상 추가해주세요.");

    let name = els.routineName.value.trim();
    if (!name) {
        const parts = [...new Set(currentRoutine.map(e => e.part))];
        name = parts.join(', ') + " 루틴";
    }

    const routineData = {
        name: name,
        exercises: currentRoutine,
        updatedAt: new Date().toISOString()
    };

    try {
        if (editingRoutineId) {
            // 수정 (Update)
            await update(ref(db, `users/${currentUser.uid}/routines/${editingRoutineId}`), routineData);
        } else {
            // 생성 (Push)
            const newRef = push(ref(db, `users/${currentUser.uid}/routines`));
            await set(newRef, {
                ...routineData,
                createdAt: new Date().toISOString()
            });
        }
        
        els.modal.classList.add('hidden');
        renderRoutineList(); // 목록 갱신

    } catch(e) {
        alert("저장 실패: " + e.message);
    }
}

async function deleteRoutine(id) {
    if(!currentUser) return;
    if(confirm("이 루틴을 삭제하시겠습니까?")) {
        try {
            await remove(ref(db, `users/${currentUser.uid}/routines/${id}`));
            renderRoutineList();
        } catch(e) {
            alert("삭제 실패");
        }
    }
}

window.editRoutine = function(id) {
    openRoutineModal(id);
};

window.startRoutine = function(id) {
    alert(`루틴 ID ${id} 시작! (실행 페이지로 이동 예정)`);
};

// --- 4. 커스텀 운동 추가 (Firebase) ---
async function saveCustomExercise() {
    if(!currentUser) return alert("로그인이 필요합니다.");
    const part = els.customPart.value;
    const name = els.customName.value.trim();
    if(!name) return alert("운동 이름을 입력해주세요.");

    try {
        const newRef = push(ref(db, `users/${currentUser.uid}/customExercises/${part}`));
        await set(newRef, {
            name: name,
            image: null
        });

        alert(`"${name}" 운동이 추가되었습니다!`);
        els.customName.value = '';
        els.customModal.classList.add('hidden');
        if (selectedBodyPart === part) renderExerciseList(part);

    } catch(e) {
        alert("추가 실패: " + e.message);
    }
}
window.startRoutine = async function(id) {
    if (!currentUser) return alert("로그인이 필요합니다.");

    const snap = await get(ref(db, `users/${currentUser.uid}/routines/${id}`));
    if (!snap.exists()) return alert("루틴을 찾을 수 없습니다.");

    // 세션 시작용 데이터 저장
    localStorage.setItem('startRoutineData', JSON.stringify({
        name: snap.val().name,
        exercises: snap.val().exercises
    }));

    // 캘린더로 이동
    window.location.href = 'wei_calendar.html';
};
