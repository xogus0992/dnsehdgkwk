/* ============================================================
   POKERUN ROUTINE LOGIC (FINAL v2 - Layout Updated)
   - Updated Summary Layout: Left(Name) - Right(Details)
   ============================================================ */

// 상태 변수
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

window.onload = function() {
    renderRoutineList();
    initCreationPopup();
    
    document.getElementById('btnAddRoutine').addEventListener('click', () => openRoutineModal());
    document.getElementById('closeRoutineBtn').addEventListener('click', () => els.modal.classList.add('hidden'));
    
    document.getElementById('btnAddExerciseToStart').addEventListener('click', addExerciseToRoutine);
    document.getElementById('btnSaveRoutine').addEventListener('click', saveRoutine);
    
    document.getElementById('btnOpenCustom').addEventListener('click', () => els.customModal.classList.remove('hidden'));
    document.getElementById('closeCustomBtn').addEventListener('click', () => els.customModal.classList.add('hidden'));
    document.getElementById('btnSaveCustomExercise').addEventListener('click', saveCustomExercise);
};

// --- 1. 메인 리스트 렌더링 ---
function renderRoutineList() {
    const routines = JSON.parse(localStorage.getItem('myRoutines') || "[]");
    els.listContainer.innerHTML = '';

    if (routines.length === 0) {
        els.listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#aaa;">등록된 루틴이 없습니다.<br>+ 버튼을 눌러 루틴을 만들어보세요!</div>';
        return;
    }

    routines.forEach(routine => {
        // 부위 태그
        const parts = [...new Set(routine.exercises.map(e => e.part))];
        const tagsHtml = parts.map(p => `<span class="tag">${p}</span>`).join('');
        
        // [수정] 운동 목록 HTML 생성 (좌우 정렬 구조)
        const summaryHtml = routine.exercises.map(e => {
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
                    <button onclick="editRoutine(${routine.id})"><span class="material-icons">edit</span></button>
                    <button onclick="deleteRoutine(${routine.id})"><span class="material-icons">delete</span></button>
                </div>
            </div>
            <div class="routine-tags">${tagsHtml}</div>
            
            <div class="routine-summary-box">
                ${summaryHtml}
            </div>
            
            <button class="btn-start-routine" onclick="startRoutine(${routine.id})">시 작 하 기</button>
        `;
        els.listContainer.appendChild(card);
    });
}

// --- 2. 루틴 생성/수정 팝업 로직 ---
function openRoutineModal(id = null) {
    editingRoutineId = id;
    currentRoutine = [];
    els.routineName.value = '';
    els.inputKg.value = ''; els.inputReps.value = ''; els.inputSets.value = '';
    
    document.getElementById('modalTitle').innerText = id ? "루틴 수정" : "루틴 만들기";

    if (id) {
        const routines = JSON.parse(localStorage.getItem('myRoutines') || "[]");
        const target = routines.find(r => r.id === id);
        if (target) {
            els.routineName.value = target.name;
            currentRoutine = [...target.exercises];
        }
    }

    renderAddedList();
    renderBodyPartTabs();
    selectBodyPart(Object.keys(bodyPartImages)[0]); 
    els.modal.classList.remove('hidden');
}

function initCreationPopup() {
    renderBodyPartTabs();
}

function renderBodyPartTabs() {
    els.bodyPartTabs.innerHTML = '';
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

function renderExerciseList(part) {
    els.exList.innerHTML = '';
    let list = exercisesData[part] || [];
    const customData = JSON.parse(localStorage.getItem('myCustomExercises') || "{}");
    if(customData[part]) list = [...list, ...customData[part]];

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
        image: selectedExercise.image,
        kg: kg || 0,
        reps: reps,
        sets: sets,
        id: Date.now() + Math.random() 
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
            <button class="btn-delete-ex" onclick="removeExercise(${idx})">
                <span class="material-icons">close</span>
            </button>
        `;
        els.addedList.appendChild(li);
    });
}

window.removeExercise = function(idx) {
    currentRoutine.splice(idx, 1);
    renderAddedList();
};

// --- 3. 루틴 저장 ---
function saveRoutine() {
    if (currentRoutine.length === 0) return alert("운동을 최소 1개 이상 추가해주세요.");

    let name = els.routineName.value.trim();
    if (!name) {
        const parts = [...new Set(currentRoutine.map(e => e.part))];
        name = parts.join(', ') + " 루틴";
    }

    const routines = JSON.parse(localStorage.getItem('myRoutines') || "[]");

    if (editingRoutineId) {
        const idx = routines.findIndex(r => r.id === editingRoutineId);
        if (idx !== -1) {
            routines[idx].name = name;
            routines[idx].exercises = currentRoutine;
        }
    } else {
        const newRoutine = {
            id: Date.now(),
            name: name,
            exercises: currentRoutine,
            createdAt: new Date().toISOString()
        };
        routines.push(newRoutine);
    }

    localStorage.setItem('myRoutines', JSON.stringify(routines));
    els.modal.classList.add('hidden');
    renderRoutineList();
}

window.deleteRoutine = function(id) {
    if(confirm("이 루틴을 삭제하시겠습니까?")) {
        let routines = JSON.parse(localStorage.getItem('myRoutines') || "[]");
        routines = routines.filter(r => r.id !== id);
        localStorage.setItem('myRoutines', JSON.stringify(routines));
        renderRoutineList();
    }
};

window.editRoutine = function(id) {
    openRoutineModal(id);
};

window.startRoutine = function(id) {
    alert(`루틴 ID ${id} 시작! (다음 단계에서 구현)`);
};

// --- 4. 커스텀 운동 추가 ---
function saveCustomExercise() {
    const part = els.customPart.value;
    const name = els.customName.value.trim();
    if(!name) return alert("운동 이름을 입력해주세요.");

    let customData = JSON.parse(localStorage.getItem('myCustomExercises') || "{}");
    if(!customData[part]) customData[part] = [];
    
    customData[part].push({ name: name, image: null }); 
    localStorage.setItem('myCustomExercises', JSON.stringify(customData));

    alert(`"${name}" 운동이 추가되었습니다!`);
    els.customName.value = '';
    els.customModal.classList.add('hidden');
    if (selectedBodyPart === part) renderExerciseList(part);
}