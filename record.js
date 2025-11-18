document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        backBtn: document.getElementById('back-to-main-btn'),
        calendarTitle: document.getElementById('calendar-title'),
        calendarBody: document.getElementById('calendar'),
        prevMonthBtn: document.getElementById('prev-month-btn'),
        nextMonthBtn: document.getElementById('next-month-btn'),
        todayBtn: document.getElementById('today-btn'),
        dateSearchBtn: document.getElementById('date-search-btn'),
        dateSearchInput: document.getElementById('date-search-input'),
        routineTemplateList: document.getElementById('routine-template-list'),
        createNewTemplateBtn: document.getElementById('create-new-template-btn'),
        openStatsModalBtn: document.getElementById('open-stats-modal-btn'),
        floatingTimer: document.getElementById('floating-timer'),
        floatingTimerDisplay: document.getElementById('floating-timer-display'),
        floatingTimerProgress: document.getElementById('floating-timer-progress'),
        closeFloatingTimer: document.getElementById('close-floating-timer'),
        dailyLogModal: document.getElementById('daily-log-modal'),
        templateEditorModal: document.getElementById('template-editor-modal'),
        statsModal: document.getElementById('stats-modal'),
        workoutSessionModal: document.getElementById('workout-session-modal'),
        addExerciseModal: document.getElementById('add-exercise-modal'),
        prCelebrationModal: document.getElementById('pr-celebration-modal'),
        summaryModal: document.getElementById('summary-modal'),
        confirmModal: document.getElementById('custom-confirm-modal'),
        addToSessionModal: document.getElementById('add-to-session-modal'),
        // Template Editor
        templateModalTitle: document.getElementById('template-modal-title'),
        templateTitleInput: document.getElementById('template-title-input'),
        openAddExerciseModalBtn: document.getElementById('open-add-exercise-modal-btn'),
        exerciseCategorySelect: document.getElementById('exercise-category-select'),
        exerciseListSelect: document.getElementById('exercise-list-select'),
        templateWeightInput: document.getElementById('template-weight-input'),
        templateRepsInput: document.getElementById('template-reps-input'),
        templateSetsInput: document.getElementById('template-sets-input'),
        addUpdateExerciseBtn: document.getElementById('add-update-exercise-btn'),
        templateExerciseList: document.getElementById('template-exercise-list'),
        saveTemplateBtn: document.getElementById('save-template-btn'),
        // Add Exercise
        newExercisePart: document.getElementById('new-exercise-part'),
        newExerciseName: document.getElementById('new-exercise-name'),
        saveNewExerciseBtn: document.getElementById('save-new-exercise-btn'),
        cancelAddExerciseBtn: document.getElementById('cancel-add-exercise-btn'),
        // Workout Session
        workoutSessionTitle: document.getElementById('workout-session-title'),
        workoutSessionList: document.getElementById('workout-session-list'),
        addExerciseToSessionBtn: document.getElementById('add-exercise-to-session-btn'),
        saveSessionBtn: document.getElementById('save-session-btn'),
        hideSessionBtn: document.getElementById('hide-session-btn'),
        // Add to Session Modal
        sessionCategorySelect: document.getElementById('session-ex-category-select'),
        sessionExListSelect: document.getElementById('session-ex-list-select'),
        sessionWeightInput: document.getElementById('session-weight-input'),
        sessionRepsInput: document.getElementById('session-reps-input'),
        sessionSetsInput: document.getElementById('session-sets-input'),
        saveToSessionBtn: document.getElementById('save-to-session-btn'),
        // Timers
        sessionTotalTimerDisplay: document.getElementById('session-total-timer-display'),
        timerDigitalDisplay: document.getElementById('timer-digital-display'),
        analogClockHand: document.getElementById('clock-second-hand'),
        timerInput: document.getElementById('timer-input'),
        timerMinus30Btn: document.getElementById('timer-minus-30'),
        timerPlus30Btn: document.getElementById('timer-plus-30'),
        timerMinus10Btn: document.getElementById('timer-minus-10'),
        timerPlus10Btn: document.getElementById('timer-plus-10'),
        // Daily Log
        dailyLogModalTitle: document.getElementById('daily-log-modal-title'),
        dailyLogModalList: document.getElementById('daily-log-modal-list'),
        // Stats
        statsStartDateInput: document.getElementById('stats-start-date'),
        statsEndDateInput: document.getElementById('stats-end-date'),
        statsResetBtn: document.getElementById('stats-reset-btn'),
        statsPartSelector: document.getElementById('stats-part-selector'),
        statsExerciseSelect: document.getElementById('stats-exercise-select'),
        statsChartCanvas: document.getElementById('stats-chart-canvas'),
        // PR Modal
        prList: document.getElementById('pr-list'),
        closePrModalBtn: document.getElementById('close-pr-modal'),
        // Summary Modal
        summaryContent: document.getElementById('summary-content'),
        closeSummaryBtn: document.getElementById('close-summary-btn'),
        // Confirm Modal
        confirmMessage: document.getElementById('confirm-message'),
        confirmOkBtn: document.getElementById('confirm-ok-btn'),
        confirmCancelBtn: document.getElementById('confirm-cancel-btn')
    };

    let currentDate = new Date();
    let selectedDate = null;
    let workoutLogs = {}; // { 'YYYY-MM-DD': { routineName, exercises: [...] } }
    let routineTemplates = {}; // { 'uuid': { name, exercises: [...] } }
    let exerciseDB = {}; // { 'part': [{name, pr}, ...] }
    let prRecords = {}; // { 'exerciseName': { weight, reps, date } }

    let currentSession = {
        date: null,
        routineName: "오늘의 운동",
        exercises: [] // { id, name, part, sets: [{id, weight, reps, completed}] }
    };
    let currentTemplate = {
        id: null,
        name: "",
        exercises: [] // { id, name, part, weight, reps, sets }
    };
    let currentEditingTemplateExerciseId = null;
    
    // v24 ★추가 (REQ 6): 세션 내 운동 수정 시 ID를 저장할 변수
    let currentEditingExerciseInSessionId = null; 

    // Timers
    let sessionTotalTimerInterval = null;
    let sessionTotalSeconds = 0;
    let sessionRestTimerInterval = null;
    let sessionRestSeconds = 0;
    let sessionRestDefaultSeconds = 60;
    let isRestTimerRunning = false;
    let lastRestAudioTime = 0;
    const restTimerAudio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
    const floatingTimerRadius = 42;
    const floatingTimerCircumference = 2 * Math.PI * floatingTimerRadius;

    let statsChart = null;
    let confirmCallback = null;

    const DATA_VERSION = "v21";
    const LOG_KEY = `workoutLogs_${DATA_VERSION}`;
    const TEMPLATE_KEY = `routineTemplates_${DATA_VERSION}`;
    const EXERCISE_DB_KEY = `exerciseDB_${DATA_VERSION}`;
    const PR_KEY = `prRecords_${DATA_VERSION}`;

    // ===================================================================
    // 데이터 로드, 저장, 초기화 (v21 원본)
    // ===================================================================

    const loadData = () => {
        workoutLogs = JSON.parse(localStorage.getItem(LOG_KEY)) || {};
        routineTemplates = JSON.parse(localStorage.getItem(TEMPLATE_KEY)) || {};
        prRecords = JSON.parse(localStorage.getItem(PR_KEY)) || {};
        
        const storedExerciseDB = JSON.parse(localStorage.getItem(EXERCISE_DB_KEY));
        if (!storedExerciseDB || Object.keys(storedExerciseDB).length === 0) {
            exerciseDB = { ...exercisesData }; // exercises.js에서 복사
            saveExerciseDB();
        } else {
            exerciseDB = storedExerciseDB;
        }
    };

    const saveData = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };
    
    const saveLogs = () => saveData(LOG_KEY, workoutLogs);
    const saveTemplates = () => saveData(TEMPLATE_KEY, routineTemplates);
    const saveExerciseDB = () => saveData(EXERCISE_DB_KEY, exerciseDB);
    const savePRs = () => saveData(PR_KEY, prRecords);

    // ===================================================================
    // 캘린더
    // ===================================================================

    const renderCalendar = (date) => {
        elements.calendarBody.innerHTML = '';
        const year = date.getFullYear();
        const month = date.getMonth();
        
        elements.calendarTitle.textContent = `${year}년 ${month + 1}월`;

        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();
        
        // v25 ★수정: 오늘 날짜를 '자정' 기준으로 설정 (정확한 비교 위함)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 오늘 날짜 자정
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const prevLastDate = new Date(year, month, 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            elements.calendarBody.appendChild(createDayCell(prevLastDate - i, 'other-month', null, today));
        }

        for (let day = 1; day <= lastDate; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const classes = [];
            if (dateStr === todayStr) classes.push('today');
            if (dateStr === selectedDate) classes.push('selected-day');
            
            elements.calendarBody.appendChild(createDayCell(day, classes.join(' '), dateStr, today));
        }
        
        const nextDays = (7 - (firstDay + lastDate) % 7) % 7;
        for (let day = 1; day <= nextDays; day++) {
            elements.calendarBody.appendChild(createDayCell(day, 'other-month', null, today));
        }
    };

    // v25 ★수정: createDayCell에 'today' 인자 추가 (미래 날짜 비교용)
    const createDayCell = (day, classes, dateStr, today) => {
        const dayCell = document.createElement('div');
        dayCell.className = `calendar-day ${classes}`;
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);

        if (dateStr && workoutLogs[dateStr]) {
            // (v21 원본)
            const log = workoutLogs[dateStr];
            const parts = new Set(log.exercises.map(ex => ex.part.toLowerCase().replace('/', '-').split(' ')[0]));
            const partsContainer = document.createElement('div');
            partsContainer.className = 'day-parts';
            parts.forEach(part => {
                const partSpan = document.createElement('span');
                partSpan.className = `part-${part}`; // CSS 스타일링용 클래스
                partSpan.textContent = part.charAt(0).toUpperCase() + part.slice(1);
                partsContainer.appendChild(partSpan);
            });
            dayCell.appendChild(partsContainer);
            dayCell.dataset.date = dateStr;
        }

        if (dateStr) {
            // v25 ★수정 (REQ 2, v26 ★수정 REQ 1): 미래 날짜 비활성화 (오늘 *이후* 부터)
            const cellDate = new Date(dateStr);
            if (cellDate > today) { // '오늘'은 cellDate > today가 false임
                dayCell.classList.add('future-day'); // 'record.css'에 추가된 스타일
                // 클릭 이벤트를 추가하지 않음 (선택 불가)
            } else {
                // 과거 또는 오늘 날짜만 클릭 가능
                dayCell.addEventListener('click', () => handleDayClick(dateStr, dayCell));
            }
        }
        
        return dayCell;
    };
    
    const handleDayClick = (dateStr, dayCell) => {
        if (selectedDate === dateStr) {
            // 두 번 클릭: 로그 보기
            openDailyLogModal(dateStr);
            return;
        }

        const oldSelected = elements.calendarBody.querySelector('.selected-day');
        if (oldSelected) {
            oldSelected.classList.remove('selected-day');
        }
        
        dayCell.classList.add('selected-day');
        selectedDate = dateStr;
    };

    // ===================================================================
    // 루틴 템플릿
    // ===================================================================

    const renderTemplateList = () => {
        elements.routineTemplateList.innerHTML = '';
        const templateIds = Object.keys(routineTemplates);

        if (templateIds.length === 0) {
            elements.routineTemplateList.innerHTML = '<p class="text-gray-500 text-center">저장된 루틴이 없습니다.</p>';
            return;
        }

        templateIds.forEach(id => {
            const template = routineTemplates[id];
            elements.routineTemplateList.appendChild(createTemplateCard(id, template));
        });
    };

    const createTemplateCard = (id, template) => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.dataset.templateId = id;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'template-info';

        // v26 ★삭제 (REQ 11): 템플릿 이미지 삭제
        // const img = document.createElement('img'); ...

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'template-details';
        
        const nameP = document.createElement('p');
        nameP.className = 'template-name editable'; // v26 ★추가 (REQ 10): 'editable' 클래스
        nameP.textContent = template.name;
        // v26 ★추가 (REQ 10): 루틴 이름 클릭 시 '수정'
        nameP.addEventListener('click', (e) => {
            e.stopPropagation();
            openTemplateEditorModal(id);
        });

        const partsP = document.createElement('p');
        partsP.className = 'template-parts';
        const parts = new Set(template.exercises.map(ex => ex.part));
        partsP.textContent = Array.from(parts).slice(0, 3).join(', ');

        detailsDiv.appendChild(nameP);
        detailsDiv.appendChild(partsP);
        // infoDiv.appendChild(img); // v26 ★삭제 (REQ 11)
        infoDiv.appendChild(detailsDiv);

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'template-controls flex gap-2';
        
        // v26 ★수정 (REQ 10): '수정' 버튼을 '실행' 버튼으로 변경
        const startBtn = document.createElement('button');
        startBtn.textContent = '실행';
        startBtn.className = 'start-btn'; // 'record.css'에 스타일 추가
        startBtn.onclick = (e) => {
            e.stopPropagation();
            startWorkoutFromTemplate(id);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            customConfirm(`'${template.name}' 루틴을 삭제하시겠습니까?`, () => {
                delete routineTemplates[id];
                saveTemplates();
                renderTemplateList();
            });
        };

        controlsDiv.appendChild(startBtn); // v26 ★수정 (REQ 10)
        controlsDiv.appendChild(deleteBtn);
        
        card.appendChild(infoDiv);
        card.appendChild(controlsDiv);
        
        // v26 ★삭제 (REQ 10): 카드 전체 클릭 이벤트 삭제 (버튼으로 대체)
        // card.addEventListener('click', () => startWorkoutFromTemplate(id));
        
        return card;
    };

    const startWorkoutFromTemplate = (templateId) => {
        if (!selectedDate) {
            alert('운동을 시작할 날짜를 캘린더에서 먼저 선택하세요.');
            return;
        }
        
        const template = routineTemplates[templateId];
        if (!template) return;
        
        if (workoutLogs[selectedDate]) {
            customConfirm(`${selectedDate}에 이미 운동 기록이 있습니다.\n루틴을 새로 시작하면 이전 기록을 덮어씁니다.\n계속하시겠습니까?`, () => {
                loadTemplateIntoSession(template);
            });
        } else {
            loadTemplateIntoSession(template);
        }
    };
    
    const loadTemplateIntoSession = (template) => {
        currentSession.date = selectedDate;
        currentSession.routineName = template.name;
        currentSession.exercises = template.exercises.map(ex => ({
            id: `ex_${Date.now()}_${Math.random()}`,
            name: ex.name,
            part: ex.part,
            sets: Array(ex.sets).fill(0).map((_, i) => ({
                id: `set_${Date.now()}_${Math.random()}_${i}`,
                weight: ex.weight,
                reps: ex.reps,
                completed: false
            }))
        }));
        
        openWorkoutSessionModal();
    };

    // ===================================================================
    // 모달 공통 (v21 원본)
    // ===================================================================
    let modalStack = [];
    const openModal = (modalEl) => {
        const zIndex = 50 + modalStack.length;
        modalEl.style.zIndex = zIndex;
        modalEl.setAttribute('aria-hidden', 'false');
        modalEl.style.display = 'flex'; // 'hidden' 클래스 대신 display 사용
        setTimeout(() => modalEl.style.opacity = 1, 10);
        modalStack.push(modalEl);
    };

    const closeModal = (modalEl) => {
        if (!modalEl) modalEl = modalStack[modalStack.length - 1]; // 최상위 모달 닫기
        if (!modalEl) return;

        modalEl.style.opacity = 0;
        setTimeout(() => {
            modalEl.setAttribute('aria-hidden', 'true');
            modalEl.style.display = 'none';
            modalStack = modalStack.filter(m => m !== modalEl);
        }, 200);
    };
    
    const customConfirm = (message, onOk) => {
        elements.confirmMessage.textContent = message;
        confirmCallback = onOk;
        openModal(elements.confirmModal);
    };

    // ===================================================================
    // 운동 데이터베이스 (v21 원본)
    // ===================================================================

    const populateExerciseSelect = (selectEl, part) => {
        selectEl.innerHTML = '<option value="">운동 선택</option>';
        if (part && exerciseDB[part]) {
            selectEl.disabled = false;
            exerciseDB[part].forEach(ex => {
                const option = document.createElement('option');
                option.value = ex.name;
                option.textContent = ex.name;
                selectEl.appendChild(option);
            });
        } else {
            selectEl.disabled = true;
        }
    };
    
    const populateCategorySelect = (selectEl) => {
        selectEl.innerHTML = '<option value="">부위 선택</option>';
        Object.keys(exerciseDB).forEach(part => {
            const option = document.createElement('option');
            option.value = part;
            option.textContent = part;
            selectEl.appendChild(option);
        });
    };

    // ===================================================================
    // 새 운동 만들기 모달 (v21 원본)
    // ===================================================================

    const openAddExerciseModal = () => {
        populateCategorySelect(elements.newExercisePart);
        elements.newExerciseName.value = '';
        openModal(elements.addExerciseModal);
    };

    const handleSaveNewExercise = () => {
        const part = elements.newExercisePart.value;
        const name = elements.newExerciseName.value.trim();

        if (!part || !name) {
            alert('부위와 운동 이름을 모두 입력하세요.');
            return;
        }
        
        if (!exerciseDB[part]) exerciseDB[part] = [];
        
        if (exerciseDB[part].some(ex => ex.name === name)) {
            alert('이미 존재하는 운동 이름입니다.');
            return;
        }
        
        exerciseDB[part].push({ name: name, pr: 0 }); // pr은 1rm
        saveExerciseDB();
        
        // 템플릿 편집기 드롭다운 새로고침
        populateCategorySelect(elements.exerciseCategorySelect);
        elements.exerciseCategorySelect.value = part;
        populateExerciseSelect(elements.exerciseListSelect, part);
        elements.exerciseListSelect.value = name;
        
        // 세션에 추가 모달 드롭다운 새로고침
        populateCategorySelect(elements.sessionCategorySelect);
        
        closeModal(elements.addExerciseModal);
    };

    // ===================================================================
    // 템플릿 편집기 모달
    // ===================================================================

    const openTemplateEditorModal = (templateId = null) => {
        if (templateId) {
            // 수정 모드
            currentTemplate = JSON.parse(JSON.stringify(routineTemplates[templateId]));
            currentTemplate.id = templateId;
            elements.templateModalTitle.textContent = "루틴 수정";
            elements.templateTitleInput.value = currentTemplate.name;
        } else {
            // 생성 모드
            currentTemplate = {
                id: `template_${Date.now()}`,
                name: "",
                exercises: []
            };
            elements.templateModalTitle.textContent = "새 루틴 만들기";
            elements.templateTitleInput.value = "";
        }
        
        currentEditingTemplateExerciseId = null;
        elements.addUpdateExerciseBtn.textContent = "운동 추가";
        
        populateCategorySelect(elements.exerciseCategorySelect);
        populateExerciseSelect(elements.exerciseListSelect, "");
        
        elements.templateWeightInput.value = "";
        elements.templateRepsInput.value = "";
        elements.templateSetsInput.value = "";
        
        renderTemplateExerciseList();
        openModal(elements.templateEditorModal);
    };

    const renderTemplateExerciseList = () => {
        elements.templateExerciseList.innerHTML = "";
        if (currentTemplate.exercises.length === 0) {
            elements.templateExerciseList.innerHTML = "<p class='text-gray-500 text-center'>운동을 추가하세요.</p>";
            return;
        }
        
        currentTemplate.exercises.forEach(ex => {
            const item = document.createElement('div');
            item.className = 'template-exercise-item';
            item.dataset.id = ex.id;
            
            item.innerHTML = `
                <div>
                    <p class="template-exercise-name">${ex.name} (${ex.part})</p>
                    <p class="template-exercise-info">${ex.weight}kg / ${ex.reps}회 / ${ex.sets}세트</p>
                </div>
                <div>
                    <button class="template-exercise-edit p-2 text-blue-500">수정</button>
                    <button class="template-exercise-delete p-2 text-red-500">삭제</button>
                </div>
            `;
            
            item.querySelector('.template-exercise-edit').addEventListener('click', () => {
                currentEditingTemplateExerciseId = ex.id;
                elements.exerciseCategorySelect.value = ex.part;
                populateExerciseSelect(elements.exerciseListSelect, ex.part);
                elements.exerciseListSelect.value = ex.name;
                elements.templateWeightInput.value = ex.weight;
                elements.templateRepsInput.value = ex.reps;
                elements.templateSetsInput.value = ex.sets;
                elements.addUpdateExerciseBtn.textContent = "운동 수정";
            });
            
            item.querySelector('.template-exercise-delete').addEventListener('click', () => {
                currentTemplate.exercises = currentTemplate.exercises.filter(e => e.id !== ex.id);
                renderTemplateExerciseList();
            });
            
            elements.templateExerciseList.appendChild(item);
        });
        
        // SortableJS
        new Sortable(elements.templateExerciseList, {
            animation: 150,
            onEnd: (evt) => {
                const movedItem = currentTemplate.exercises.splice(evt.oldIndex, 1)[0];
                currentTemplate.exercises.splice(evt.newIndex, 0, movedItem);
            }
        });
    };

    const handleAddOrUpdateExerciseInTemplate = () => {
        const part = elements.exerciseCategorySelect.value;
        const name = elements.exerciseListSelect.value;
        const weight = parseFloat(elements.templateWeightInput.value) || 0;
        const reps = parseInt(elements.templateRepsInput.value) || 0;
        const sets = parseInt(elements.templateSetsInput.value) || 0;

        if (!part || !name || sets === 0) {
            alert('부위, 운동, 세트 수를 모두 입력하세요.');
            return;
        }

        if (currentEditingTemplateExerciseId) {
            // 수정
            const ex = currentTemplate.exercises.find(e => e.id === currentEditingTemplateExerciseId);
            if (ex) {
                ex.part = part;
                ex.name = name;
                ex.weight = weight;
                ex.reps = reps;
                ex.sets = sets;
            }
        } else {
            // 추가
            currentTemplate.exercises.push({
                id: `template_ex_${Date.now()}`,
                part, name, weight, reps, sets
            });
        }
        
        renderTemplateExerciseList();
        
        // 폼 리셋
        currentEditingTemplateExerciseId = null;
        elements.addUpdateExerciseBtn.textContent = "운동 추가";
        elements.exerciseCategorySelect.value = "";
        populateExerciseSelect(elements.exerciseListSelect, "");
        elements.templateWeightInput.value = "";
        elements.templateRepsInput.value = "";
        elements.templateSetsInput.value = "";
    };

    const handleSaveTemplate = () => {
        // v25 ★수정 (REQ 3): 루틴 이름 자동 생성
        let name = elements.templateTitleInput.value.trim(); // let으로 변경
        
        if (currentTemplate.exercises.length === 0) {
            alert('적어도 하나의 운동을 추가하세요.');
            return;
        }

        if (!name) {
            // v26 ★수정 (REQ 11): '운동 이름' -> '부위 이름'으로 자동 생성
            // 여러 부위가 섞여있을 수 있으니 Set으로 중복 제거
            const parts = new Set(currentTemplate.exercises.map(ex => ex.part));
            name = `${Array.from(parts).join('/')} 루틴`;
        }
        
        currentTemplate.name = name;
        routineTemplates[currentTemplate.id] = currentTemplate;
        saveTemplates();
        renderTemplateList();
        closeModal(elements.templateEditorModal);
    };

    // ===================================================================
    // 운동 세션 모달
    // ===================================================================
    
    const openWorkoutSessionModal = () => {
        elements.workoutSessionTitle.textContent = currentSession.routineName;
        renderWorkoutSessionList();
        startSessionTimers();
        openModal(elements.workoutSessionModal);
    };
    
    const closeWorkoutSessionModal = () => {
        stopSessionTimers();
        closeModal(elements.workoutSessionModal);
    };
    
    const getSessionData = () => {
        return currentSession;
    };

    const renderWorkoutSessionList = () => {
        elements.workoutSessionList.innerHTML = "";
        if (currentSession.exercises.length === 0) {
            elements.workoutSessionList.innerHTML = "<p class='text-gray-500 text-center py-10'>'운동 추가' 버튼으로 운동을 추가하세요.</p>";
            return;
        }
        
        currentSession.exercises.forEach(ex => {
            elements.workoutSessionList.appendChild(createExerciseCard(ex));
        });
        
        // SortableJS
        new Sortable(elements.workoutSessionList, {
            animation: 150,
            handle: '.exercise-header', // 헤더를 드래그
            onEnd: (evt) => {
                const movedItem = currentSession.exercises.splice(evt.oldIndex, 1)[0];
                currentSession.exercises.splice(evt.newIndex, 0, movedItem);
            }
        });
    };

    const createExerciseCard = (exercise) => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        card.dataset.exerciseid = exercise.id; // html은 dataset.exerciseid

        const exerciseHeader = document.createElement('div');
        exerciseHeader.className = 'exercise-header';

        const exerciseNameEl = document.createElement('h4');
        exerciseNameEl.className = 'exercise-name';
        exerciseNameEl.textContent = exercise.name;
        
        // v24 ★추가 (REQ 6): 운동 이름 클릭 시 수정 모달 열기
        exerciseNameEl.style.cursor = 'pointer'; // 클릭 가능하도록 커서 변경
        exerciseNameEl.addEventListener('click', () => {
            openAddToSessionModal(exercise.id); // exercise.id를 인자로 전달
        });

        const controlsWrapper = document.createElement('div');
        controlsWrapper.className = 'flex items-center gap-2'; // Tailwind
        
        // v24 ★추가 (REQ 3): 세트 조절 버튼 (+/-)
        const setControlsDiv = document.createElement('div');
        setControlsDiv.className = 'flex items-center gap-1';
        
        const removeSetBtn = document.createElement('button');
        removeSetBtn.className = 'adjust-set-btn-small'; // 새 CSS 클래스 (record.css에 추가됨)
        removeSetBtn.textContent = '–'; // - (마이너스)
        removeSetBtn.title = '세트 삭제';
        removeSetBtn.onclick = () => {
            if (exercise.sets.length > 1) { // 최소 1세트는 남김
                exercise.sets.pop(); // 데이터 모델에서 마지막 세트 제거
                renderWorkoutSessionList(); // 목록 새로고침 (가장 간단한 방법)
            }
        };

        const addSetBtn = document.createElement('button');
        addSetBtn.className = 'adjust-set-btn-small'; // 새 CSS 클래스 (record.css에 추가됨)
        addSetBtn.textContent = '+';
        addSetBtn.title = '세트 추가';
        addSetBtn.onclick = () => {
            const lastSet = exercise.sets[exercise.sets.length - 1] || { weight: 0, reps: 0 };
            exercise.sets.push({
                id: `set_${Date.now()}_${Math.random()}`,
                weight: lastSet.weight, // 마지막 세트 정보 복사
                reps: lastSet.reps,
                completed: false
            });
            renderWorkoutSessionList(); // 목록 새로고침
        };
        
        setControlsDiv.appendChild(removeSetBtn);
        setControlsDiv.appendChild(addSetBtn);

        // v24 ★추가 (REQ 4): 전체 완료 버튼
        const completeAllBtn = document.createElement('button');
        completeAllBtn.className = 'complete-all-btn'; // 새 CSS 클래스 (record.css에 추가됨)
        // v26 ★수정 (REQ 9): '✓' -> '전체'
        completeAllBtn.textContent = '✓'; // 텍스트가 길면 버튼이 커지므로 아이콘 유지, title 수정
        completeAllBtn.title = '모든 세트 완료'; // (v24 원본)
        completeAllBtn.onclick = () => {
            card.querySelectorAll('.set-checkbox:not(:checked)').forEach(checkbox => {
                checkbox.checked = true;
                const setItem = checkbox.closest('.set-item');
                const setId = setItem.dataset.setId;
                handleSetComplete(checkbox, setItem, exercise.id, setId);
            });
        };

        // v21 (원본) 삭제 버튼
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-exercise-btn';
        // v26 ★수정 (REQ 9): '×' -> '삭제'
        deleteBtn.textContent = '×'; // 텍스트가 길면 디자인이 깨지므로 아이콘 유지
        deleteBtn.title = "운동 삭제"; // 툴팁으로 '삭제' 표시
        deleteBtn.onclick = () => deleteExercise(exercise.id, card);

        // 헤더에 버튼들 추가
        exerciseHeader.appendChild(exerciseNameEl);
        controlsWrapper.appendChild(setControlsDiv); // v24 (REQ 3)
        controlsWrapper.appendChild(completeAllBtn); // v24 (REQ 4)
        
        // v24 ★수정 (REQ 5): 메모 아이콘(연필) 없음 (v21 원본)
        
        controlsWrapper.appendChild(deleteBtn); // v21 (원본) 삭제 버튼
        exerciseHeader.appendChild(controlsWrapper);
        
        card.appendChild(exerciseHeader);

        const setHeader = document.createElement('div');
        setHeader.className = 'set-header';
        // v26 ★수정 (REQ 9): 헤더 텍스트 한글로 변경
        setHeader.innerHTML = `
            <span>세트</span>
            <span>무게 (kg)</span>
            <span>횟수</span>
            <span>완료</span>
        `;
        card.appendChild(setHeader);

        const setsContainer = document.createElement('div');
        setsContainer.className = 'sets-container';
        exercise.sets.forEach((set, index) => {
            setsContainer.appendChild(createSetItem(exercise, set, index + 1));
        });
        card.appendChild(setsContainer);

        return card;
    };

    const createSetItem = (exercise, set, index) => {
        const setItem = document.createElement('div');
        setItem.className = 'set-item';
        setItem.dataset.setId = set.id;
        if (set.completed) {
            setItem.classList.add('set-completed');
        }

        setItem.innerHTML = `
            <span class="set-number">${index}</span>
            <div><input type="number" class="set-input weight-input" value="${set.weight}" placeholder="0"></div>
            <div><input type="number" class="set-input reps-input" value="${set.reps}" placeholder="0"></div>
            <div><input type="checkbox" class="set-checkbox" ${set.completed ? 'checked' : ''}></div>
        `;

        const weightInput = setItem.querySelector('.weight-input');
        const repsInput = setItem.querySelector('.reps-input');
        const setCheckbox = setItem.querySelector('.set-checkbox');
        
        weightInput.addEventListener('change', () => { set.weight = parseFloat(weightInput.value) || 0; });
        repsInput.addEventListener('change', () => { set.reps = parseInt(repsInput.value) || 0; });
        
        // v24 ★수정 (REQ 2): 'click' 대신 'change' 이벤트를 사용
        setCheckbox.addEventListener('change', () => {
            handleSetComplete(setCheckbox, setItem, exercise.id, set.id);
        });

        return setItem;
    };

    const deleteExercise = (exerciseId, card) => {
        customConfirm("이 운동을 세션에서 삭제하시겠습니까?", () => {
            currentSession.exercises = currentSession.exercises.filter(ex => ex.id !== exerciseId);
            card.remove();
        });
    };

    const handleSetComplete = (setCheckbox, setItem, exerciseId, setId) => {
        const session = getSessionData();
        const exercise = session.exercises.find(ex => ex.id === exerciseId);
        const set = exercise.sets.find(s => s.id === setId);
        
        // v24 ★수정 (REQ 2): 체크/해제 토글 기능
        if (setCheckbox.checked) {
            // 체크 시
            setItem.classList.add('set-completed');
            set.completed = true;
            startRestTimer(); // REQ 1을 위해 수정된 함수
            checkPR(exercise.name, set.weight, set.reps);
        } else {
            // v24 ★추가 (REQ 2): 체크 해제 시
            setItem.classList.remove('set-completed');
            set.completed = false;
            stopSessionTimers(false); // REQ 1을 위해 'false' 전달
        }
    };

    // v24 ★수정 (REQ 6): '세션에 운동 추가' 모달 열기 (수정 모드 지원)
    const openAddToSessionModal = (editingExerciseId = null) => {
        const modal = elements.addToSessionModal;
        const title = modal.querySelector('#add-to-session-modal-title');
        const saveBtn = modal.querySelector('#save-to-session-btn');
        
        elements.sessionCategorySelect.value = "";
        elements.sessionExListSelect.innerHTML = "<option value=''>운동 선택</option>";
        elements.sessionExListSelect.disabled = true;
        elements.sessionWeightInput.value = "";
        elements.sessionRepsInput.value = "";
        elements.sessionSetsInput.value = "";
        
        populateCategorySelect(elements.sessionCategorySelect); 

        if (editingExerciseId) {
            // v24 ★추가 (REQ 6): 수정 모드
            currentEditingExerciseInSessionId = editingExerciseId; 
            title.textContent = "세션에서 운동 수정";
            saveBtn.textContent = "수정";

            const exercise = currentSession.exercises.find(ex => ex.id === editingExerciseId);
            if (exercise) {
                const category = exercise.part;
                if (category && exerciseDB[category]) {
                    elements.sessionCategorySelect.value = category;
                    populateExerciseSelect(elements.sessionExListSelect, category);
                    elements.sessionExListSelect.value = exercise.name;
                }
                
                if (exercise.sets.length > 0) {
                    elements.sessionWeightInput.value = exercise.sets[0].weight;
                    elements.sessionRepsInput.value = exercise.sets[0].reps;
                }
                elements.sessionSetsInput.value = exercise.sets.length;
            }
        } else {
            // v21 (원본): 추가 모드
            currentEditingExerciseInSessionId = null; 
            title.textContent = "세션에 운동 추가";
            saveBtn.textContent = "추가";
        }

        openModal(modal);
    };

    // v24 ★수정 (REQ 6): '세션에 운동 추가' 모달 저장 (수정 모드 지원)
    const handleSaveToSession = () => {
        const category = elements.sessionCategorySelect.value;
        const exerciseName = elements.sessionExListSelect.value;
        const weight = parseFloat(elements.sessionWeightInput.value) || 0;
        const reps = parseInt(elements.sessionRepsInput.value) || 0;
        const setCount = parseInt(elements.sessionSetsInput.value) || 0;

        if (!category || !exerciseName || setCount === 0) {
            alert('부위, 운동, 세트 수를 모두 입력하세요.');
            return;
        }

        if (currentEditingExerciseInSessionId) {
            // v24 ★추가 (REQ 6): 수정 로직
            const exercise = currentSession.exercises.find(ex => ex.id === currentEditingExerciseInSessionId);
            if (exercise) {
                exercise.name = exerciseName;
                exercise.part = category;
                
                const newSets = [];
                for (let i = 0; i < setCount; i++) {
                    const oldSet = exercise.sets[i];
                    newSets.push({
                        id: oldSet ? oldSet.id : `set_${Date.now()}_${Math.random()}_${i}`,
                        weight: weight,
                        reps: reps,    
                        completed: oldSet ? oldSet.completed : false 
                    });
                }
                exercise.sets = newSets;
            }
            renderWorkoutSessionList(); 

        } else {
            // v21 (원본): 추가 로직
            const newExercise = {
                id: `ex_${Date.now()}`,
                name: exerciseName,
                part: category,
                sets: []
            };
            for (let i = 0; i < setCount; i++) {
                newExercise.sets.push({ 
                    id: `${newExercise.id}_set${i+1}`, 
                    weight: weight, 
                    reps: reps, 
                    completed: false 
                });
            }
            addExerciseToSession(newExercise);
        }

        closeModal(elements.addToSessionModal);
        currentEditingExerciseInSessionId = null; 
    };
    
    const addExerciseToSession = (exercise) => {
        if (currentSession.exercises.length === 0) {
            elements.workoutSessionList.innerHTML = "";
        }
        currentSession.exercises.push(exercise);
        elements.workoutSessionList.appendChild(createExerciseCard(exercise));
    };

    const handleSaveSession = () => {
        if (currentSession.exercises.length === 0) {
            alert('저장할 운동이 없습니다.');
            return;
        }
        
        // v24 ★수정 (REQ 1): 'true'를 전달하여 총 운동시간 타이머도 정지시킴
        stopSessionTimers(true); 

        const finalLog = {
            routineName: currentSession.routineName,
            exercises: JSON.parse(JSON.stringify(currentSession.exercises)) 
        };
        
        workoutLogs[currentSession.date] = finalLog;
        saveLogs();
        renderCalendar(currentDate); 
        closeWorkoutSessionModal();
        openSummaryModal(finalLog);
    };

    // ===================================================================
    // 타이머
    // ===================================================================

    const startSessionTimers = () => {
        sessionTotalSeconds = 0;
        elements.sessionTotalTimerDisplay.textContent = formatTime(sessionTotalSeconds);
        
        if (sessionTotalTimerInterval) clearInterval(sessionTotalTimerInterval);
        sessionTotalTimerInterval = setInterval(() => {
            sessionTotalSeconds++;
            elements.sessionTotalTimerDisplay.textContent = formatTime(sessionTotalSeconds);
        }, 1000);
        
        sessionRestDefaultSeconds = parseInt(elements.timerInput.value) || 60;
        sessionRestSeconds = sessionRestDefaultSeconds;
        updateRestTimerDisplay();
    };

    // v24 ★수정 (REQ 1): 총 운동시간 타이머를 선택적으로 정지
    const stopSessionTimers = (stopTotalTimer = true) => {
        // v24 ★수정 (REQ 1): 'stopTotalTimer'가 true일 때만 총 운동시간 정지
        if (stopTotalTimer) {
            clearInterval(sessionTotalTimerInterval);
            sessionTotalTimerInterval = null;
        }
        
        // v21 (원본): 휴식 타이머는 항상 정지
        clearInterval(sessionRestTimerInterval);
        sessionRestTimerInterval = null;
        isRestTimerRunning = false;
        
        sessionRestSeconds = sessionRestDefaultSeconds;
        updateRestTimerDisplay();
        
        elements.floatingTimer.style.display = 'none';
    };

    const startRestTimer = () => {
        // v24 ★수정 (REQ 1): 'false'를 전달 (총 운동시간은 놔두고 휴식 타이머만 제어)
        stopSessionTimers(false); 

        isRestTimerRunning = true;
        sessionRestSeconds = sessionRestDefaultSeconds;
        lastRestAudioTime = 0;
        updateRestTimerDisplay();

        sessionRestTimerInterval = setInterval(() => {
            sessionRestSeconds--;
            updateRestTimerDisplay();
            updateFloatingTimerDisplay();

            if (sessionRestSeconds === 10 || sessionRestSeconds === 3) {
                playRestTimerSound(1);
            }

            if (sessionRestSeconds <= 0) {
                stopSessionTimers(false); // v24 ★수정 (REQ 1)
                playRestTimerSound(3); 
            }
        }, 1000);
    };
    
    const updateRestTimerDisplay = () => {
        const minutes = Math.floor(sessionRestSeconds / 60);
        const seconds = sessionRestSeconds % 60;
        elements.timerDigitalDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // v26 ★수정 (REQ 8): 시계 방향으로 회전 (0 -> 360)
        // (기존) const angle = (sessionRestSeconds / sessionRestDefaultSeconds) * 360;
        const angle = (sessionRestDefaultSeconds - sessionRestSeconds) / sessionRestDefaultSeconds * 360;
        elements.analogClockHand.style.transform = `rotate(${angle}deg)`;
    };
    
    const updateFloatingTimerDisplay = () => {
        if (!isRestTimerRunning) {
            elements.floatingTimer.style.display = 'none';
            return;
        }
        
        elements.floatingTimerDisplay.textContent = `${String(Math.floor(sessionRestSeconds / 60)).padStart(2, '0')}:${String(sessionRestSeconds % 60).padStart(2, '0')}`;
        
        const progress = sessionRestSeconds / sessionRestDefaultSeconds;
        const offset = floatingTimerCircumference * (1 - progress);
        elements.floatingTimerProgress.style.strokeDasharray = `${floatingTimerCircumference}`;
        elements.floatingTimerProgress.style.strokeDashoffset = offset;
    };
    
    const adjustRestTimer = (seconds) => {
        sessionRestDefaultSeconds = Math.max(0, sessionRestDefaultSeconds + seconds);
        elements.timerInput.value = sessionRestDefaultSeconds;
        if (!isRestTimerRunning) {
            sessionRestSeconds = sessionRestDefaultSeconds;
            updateRestTimerDisplay();
        }
    };
    
    const playRestTimerSound = (count) => {
        if (Date.now() - lastRestAudioTime < 1000) return; 
        lastRestAudioTime = Date.now();
        
        restTimerAudio.currentTime = 0;
        let played = 0;
        const playCount = () => {
            if (played < count) {
                restTimerAudio.play();
                played++;
            }
        };
        restTimerAudio.onended = playCount;
        playCount();
    };

    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    // ===================================================================
    // PR 및 요약 (v21 원본)
    // ===================================================================

    const checkPR = (exerciseName, weight, reps) => {
        const currentPR = prRecords[exerciseName] || { weight: 0, reps: 0 };
        const estimated1RM = weight * (1 + reps / 30);
        const current1RM = currentPR.weight * (1 + currentPR.reps / 30);

        if (estimated1RM > current1RM) {
            const newPR = { weight, reps, date: currentSession.date };
            prRecords[exerciseName] = newPR;
            savePRs();
            
            const prItem = document.createElement('p');
            prItem.innerHTML = `<strong>${exerciseName}:</strong> ${weight}kg x ${reps}회 (새 기록!)`;
            elements.prList.appendChild(prItem);
        }
    };

    const openSummaryModal = (log) => {
        elements.summaryContent.innerHTML = "";
        
        let totalVolume = 0;
        let totalSets = 0;
        
        log.exercises.forEach(ex => {
            const exDiv = document.createElement('div');
            exDiv.className = 'mb-3';
            exDiv.innerHTML = `<h4 class="font-bold text-lg">${ex.name} (${ex.part})</h4>`;
            
            const setsList = document.createElement('ul');
            setsList.className = 'list-disc list-inside text-gray-700';
            
            ex.sets.forEach(set => {
                if(set.completed) {
                    setsList.innerHTML += `<li>${set.weight}kg x ${set.reps}회</li>`;
                    totalVolume += set.weight * set.reps;
                    totalSets++;
                }
            });
            exDiv.appendChild(setsList);
            elements.summaryContent.appendChild(exDiv);
        });
        
        const summaryText = document.createElement('p');
        summaryText.className = 'mt-4 pt-4 border-t font-bold';
        summaryText.textContent = `총 볼륨: ${totalVolume}kg | 총 세트: ${totalSets}세트`;
        elements.summaryContent.prepend(summaryText);
        
        if (elements.prList.children.length > 0) {
            openModal(elements.prCelebrationModal);
        } else {
            openModal(elements.summaryModal);
        }
    };

    // ===================================================================
    // 일간 로그 모달 (v21 원본)
    // ===================================================================
    
    const openDailyLogModal = (dateStr) => {
        const log = workoutLogs[dateStr];
        if (!log) return;
        
        elements.dailyLogModalTitle.textContent = `${dateStr} (${log.routineName})`;
        elements.dailyLogModalList.innerHTML = "";
        
        log.exercises.forEach(ex => {
            const exDiv = document.createElement('div');
            exDiv.className = 'mb-3';
            exDiv.innerHTML = `<h4 class="font-bold text-lg">${ex.name} (${ex.part})</h4>`;
            
            const setsList = document.createElement('ul');
            setsList.className = 'list-disc list-inside text-gray-700';
            
            ex.sets.forEach(set => {
                if(set.completed) {
                    setsList.innerHTML += `<li>${set.weight}kg x ${set.reps}회</li>`;
                } else {
                    setsList.innerHTML += `<li class="text-gray-400 line-through">${set.weight}kg x ${set.reps}회 (미완료)</li>`;
                }
            });
            exDiv.appendChild(setsList);
            elements.dailyLogModalList.appendChild(exDiv);
        });
        
        openModal(elements.dailyLogModal);
    };
    
    // ===================================================================
    // 통계 모달 (v21 원본)
    // ===================================================================
    
    const openStatsModal = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        elements.statsStartDateInput.value = firstDay.toISOString().split('T')[0];
        elements.statsEndDateInput.value = lastDay.toISOString().split('T')[0];
        
        elements.statsPartSelector.innerHTML = "";
        const allBtn = createPartBtn('전체');
        allBtn.classList.add('selected');
        elements.statsPartSelector.appendChild(allBtn);
        
        Object.keys(exerciseDB).forEach(part => {
            elements.statsPartSelector.appendChild(createPartBtn(part));
        });
        
        updateStatsExerciseSelect('전체');
        updateStatsChart();
        
        openModal(elements.statsModal);
    };

    const createPartBtn = (part) => {
        const btn = document.createElement('button');
        btn.className = 'part-btn';
        btn.textContent = part;
        btn.dataset.part = part;
        btn.addEventListener('click', () => {
            elements.statsPartSelector.querySelectorAll('.part-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            updateStatsExerciseSelect(part);
            updateStatsChart();
        });
        return btn;
    };
    
    const updateStatsExerciseSelect = (part) => {
        elements.statsExerciseSelect.innerHTML = '<option value="전체">모든 운동</option>';
        if (part === '전체') {
            Object.values(exerciseDB).flat().forEach(ex => {
                elements.statsExerciseSelect.innerHTML += `<option value="${ex.name}">${ex.name}</option>`;
            });
        } else if (exerciseDB[part]) {
            exerciseDB[part].forEach(ex => {
                elements.statsExerciseSelect.innerHTML += `<option value="${ex.name}">${ex.name}</option>`;
            });
        }
    };
    
    const updateStatsChart = () => {
        const startDate = elements.statsStartDateInput.value;
        const endDate = elements.statsEndDateInput.value;
        const part = elements.statsPartSelector.querySelector('.part-btn.selected').dataset.part;
        const exercise = elements.statsExerciseSelect.value;
        
        const data = {
            labels: [],
            datasets: [
                {
                    label: '총 볼륨 (kg)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'yVolume',
                    tension: 0.1
                },
                {
                    label: '최대 1RM (kg)',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y1RM',
                    tension: 0.1
                }
            ]
        };
        
        const dates = Object.keys(workoutLogs).filter(date => date >= startDate && date <= endDate).sort();
        
        dates.forEach(date => {
            const log = workoutLogs[date];
            let dailyVolume = 0;
            let dailyMax1RM = 0;
            
            log.exercises.forEach(ex => {
                if ((part === '전체' || ex.part === part) && (exercise === '전체' || ex.name === exercise)) {
                    ex.sets.forEach(set => {
                        if (set.completed) {
                            dailyVolume += set.weight * set.reps;
                            const est1RM = set.weight * (1 + set.reps / 30);
                            if (est1RM > dailyMax1RM) dailyMax1RM = est1RM;
                        }
                    });
                }
            });
            
            if (dailyVolume > 0 || dailyMax1RM > 0) {
                data.labels.push(date);
                data.datasets[0].data.push(dailyVolume);
                data.datasets[1].data.push(dailyMax1RM);
            }
        });

        if (statsChart) statsChart.destroy();
        
        statsChart = new Chart(elements.statsChartCanvas, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    yVolume: {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: '볼륨 (kg)' }
                    },
                    y1RM: {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: '1RM (kg)' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    };
    
    const resetStatsDate = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        elements.statsStartDateInput.value = firstDay.toISOString().split('T')[0];
        elements.statsEndDateInput.value = lastDay.toISOString().split('T')[0];
        updateStatsChart();
    };
    
    // v25 ★추가 (REQ 4): Enter 키 탐색 헬퍼 함수
    const addEnterNavigation = (inputs) => {
        inputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    
                    if (input.tagName === 'BUTTON') {
                        input.click();
                        return; 
                    }

                    const nextInput = inputs[index + 1];
                    if (nextInput) {
                        nextInput.focus();
                        if (nextInput.tagName === 'INPUT' && nextInput.type !== 'select-one') {
                            nextInput.select();
                        }
                    } else {
                        inputs[0].focus();
                        if (inputs[0].tagName === 'INPUT' && inputs[0].type !== 'select-one') {
                            inputs[0].select();
                        }
                    }
                }
            });
        });
    };


    // ===================================================================
    // 이벤트 리스너 초기화 (v21 원본 + v24, v25, v26 수정)
    // ===================================================================

    const initEventListeners = () => {
        // 캘린더
        elements.prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar(currentDate);
        });
        elements.nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar(currentDate);
        });
        elements.todayBtn.addEventListener('click', () => {
            currentDate = new Date();
            // v25 ★수정: 오늘 날짜로 '선택'
            selectedDate = new Date().toISOString().split('T')[0];
            renderCalendar(currentDate);
        });
        elements.dateSearchBtn.addEventListener('click', () => {
            elements.dateSearchInput.showPicker();
        });
        elements.dateSearchInput.addEventListener('change', () => {
            const dateStr = elements.dateSearchInput.value;
            if (dateStr) {
                // v25 ★수정: 미래 날짜 선택 시 경고
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const cellDate = new Date(dateStr);

                if (cellDate > today) { // v26 ★수정 (REQ 1): '오늘'은 > today가 false임
                    alert("오늘 이후의 날짜는 선택할 수 없습니다.");
                    elements.dateSearchInput.value = ""; // 값 초기화
                    return;
                }
                
                currentDate = new Date(dateStr);
                selectedDate = dateStr;
                renderCalendar(currentDate);
            }
        });
        
        // 메인
        elements.createNewTemplateBtn.addEventListener('click', () => openTemplateEditorModal());
        elements.openStatsModalBtn.addEventListener('click', openStatsModal);
        elements.backBtn.addEventListener('click', () => {
            if (document.referrer) window.history.back();
            else alert('이전 페이지가 없습니다.');
        });

        // 템플릿 편집기
        elements.openAddExerciseModalBtn.addEventListener('click', openAddExerciseModal);
        elements.exerciseCategorySelect.addEventListener('change', (e) => {
            populateExerciseSelect(elements.exerciseListSelect, e.target.value);
        });
        elements.addUpdateExerciseBtn.addEventListener('click', handleAddOrUpdateExerciseInTemplate);
        elements.saveTemplateBtn.addEventListener('click', handleSaveTemplate);
        
        // v25 ★추가 (REQ 4-1): 템플릿 편집기 Enter 키 탐색
        addEnterNavigation([
            elements.templateTitleInput,
            elements.exerciseCategorySelect,
            elements.exerciseListSelect,
            elements.templateWeightInput,
            elements.templateRepsInput,
            elements.templateSetsInput,
            elements.addUpdateExerciseBtn
        ]);

        // 새 운동 만들기
        elements.saveNewExerciseBtn.addEventListener('click', handleSaveNewExercise);
        elements.cancelAddExerciseBtn.addEventListener('click', () => closeModal(elements.addExerciseModal));
        
        // v25 ★추가 (REQ 4-2): 새 운동 만들기 모달 Enter 키 탐색
        addEnterNavigation([
            elements.newExercisePart,
            elements.newExerciseName,
            elements.saveNewExerciseBtn
        ]);

        // 운동 세션
        // v24 ★수정 (REQ 6)
        elements.addExerciseToSessionBtn.addEventListener('click', () => openAddToSessionModal()); 
        elements.saveSessionBtn.addEventListener('click', handleSaveSession);
        elements.hideSessionBtn.addEventListener('click', () => {
            elements.workoutSessionModal.style.display = 'none'; 
            elements.floatingTimer.style.display = 'flex';
            updateFloatingTimerDisplay();
        });

        // v24 ★수정 (REQ 6)
        elements.saveToSessionBtn.addEventListener('click', handleSaveToSession);
        
        elements.sessionCategorySelect.addEventListener('change', (e) => {
            populateExerciseSelect(elements.sessionExListSelect, e.target.value);
        });
        
        // v25 ★추가 (REQ 4-3): 세션에 추가 모달 Enter 키 탐색
        addEnterNavigation([
            elements.sessionCategorySelect,
            elements.sessionExListSelect,
            elements.sessionWeightInput,
            elements.sessionRepsInput,
            elements.sessionSetsInput,
            elements.saveToSessionBtn
        ]);

        // 타이머
        elements.timerInput.addEventListener('change', () => {
            sessionRestDefaultSeconds = parseInt(elements.timerInput.value) || 60;
            if (!isRestTimerRunning) {
                sessionRestSeconds = sessionRestDefaultSeconds;
                updateRestTimerDisplay();
            }
        });
        elements.timerMinus30Btn.addEventListener('click', () => adjustRestTimer(-30));
        elements.timerPlus30Btn.addEventListener('click', () => adjustRestTimer(30));
        elements.timerMinus10Btn.addEventListener('click', () => adjustRestTimer(-10));
        elements.timerPlus10Btn.addEventListener('click', () => adjustRestTimer(10));
        
        // 플로팅 타이머
        elements.floatingTimer.addEventListener('click', () => {
            elements.floatingTimer.style.display = 'none';
            elements.workoutSessionModal.style.display = 'flex';
            openModal(elements.workoutSessionModal); 
        });
        elements.closeFloatingTimer.addEventListener('click', (e) => {
            e.stopPropagation();
            customConfirm("운동 세션을 종료하시겠습니까?\n저장되지 않은 기록은 사라집니다.", () => {
                closeWorkoutSessionModal();
            });
        });

        // 통계
        elements.statsStartDateInput.addEventListener('change', updateStatsChart);
        elements.statsEndDateInput.addEventListener('change', updateStatsChart);
        elements.statsExerciseSelect.addEventListener('change', updateStatsChart);
        elements.statsResetBtn.addEventListener('click', resetStatsDate);
        
        // PR/요약 모달
        elements.closePrModalBtn.addEventListener('click', () => {
            closeModal(elements.prCelebrationModal);
            openModal(elements.summaryModal); 
        });
        elements.closeSummaryBtn.addEventListener('click', () => closeModal(elements.summaryModal));

        // 확인 모달
        elements.confirmOkBtn.addEventListener('click', () => {
            if (confirmCallback) confirmCallback();
            confirmCallback = null;
            closeModal(elements.confirmModal);
        });
        elements.confirmCancelBtn.addEventListener('click', () => {
            confirmCallback = null;
            closeModal(elements.confirmModal);
        });

        // 전역 모달 닫기
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal && modal.id !== 'workout-session-modal' && modal.id !== 'custom-confirm-modal') {
                    closeModal(modal);
                }
            });
        });
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) closeModal(modal);
            });
        });
        
        // 전역 Esc 키
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                let topModal = null;
                let maxZ = 0;
                const visibleModals = document.querySelectorAll('.modal-overlay[style*="display: flex"]');
                
                visibleModals.forEach(modal => {
                    const z = parseInt(window.getComputedStyle(modal).zIndex) || 0;
                    if (z > maxZ) {
                        maxZ = z;
                        topModal = modal;
                    }
                });

                if (topModal) {
                    if (topModal.id === 'workout-session-modal') {
                        elements.workoutSessionModal.style.display = 'none';
                        elements.floatingTimer.style.display = 'flex';
                        updateFloatingTimerDisplay();
                    } else if (topModal.id !== 'custom-confirm-modal') {
                        closeModal(topModal);
                    }
                }
            }
        });
        
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', e => e.preventDefault());
        });
        
        document.querySelectorAll('input, textarea, select').forEach(el => {
            if (el.type !== 'checkbox' && el.type !== 'radio') {
                 el.style.fontSize = '16px';
            }
        });

    };

    const init = () => {
        loadData();
        // v25 ★수정 (REQ 1): 오늘 날짜를 기본으로 선택
        selectedDate = new Date().toISOString().split('T')[0];
        renderCalendar(currentDate);
        renderTemplateList();
        initEventListeners();
    };

    init();
});