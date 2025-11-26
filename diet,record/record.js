document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        backBtn: document.getElementById('back-to-main-btn'),
        resetDataBtn: document.getElementById('reset-data-btn'), // 추가됨
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
        newExercisePart: document.getElementById('new-exercise-part'),
        newExerciseName: document.getElementById('new-exercise-name'),
        saveNewExerciseBtn: document.getElementById('save-new-exercise-btn'),
        cancelAddExerciseBtn: document.getElementById('cancel-add-exercise-btn'),
        workoutSessionTitle: document.getElementById('workout-session-title'),
        workoutSessionList: document.getElementById('workout-session-list'),
        addExerciseToSessionBtn: document.getElementById('add-exercise-to-session-btn'),
        saveSessionBtn: document.getElementById('save-session-btn'),
        hideSessionBtn: document.getElementById('hide-session-btn'),
        sessionCategorySelect: document.getElementById('session-ex-category-select'),
        sessionExListSelect: document.getElementById('session-ex-list-select'),
        sessionWeightInput: document.getElementById('session-weight-input'),
        sessionRepsInput: document.getElementById('session-reps-input'),
        sessionSetsInput: document.getElementById('session-sets-input'),
        saveToSessionBtn: document.getElementById('save-to-session-btn'),
        sessionTotalTimerDisplay: document.getElementById('session-total-timer-display'),
        timerDigitalDisplay: document.getElementById('timer-digital-display'),
        analogClockHand: document.getElementById('clock-second-hand'),
        timerInput: document.getElementById('timer-input'),
        timerMinus30Btn: document.getElementById('timer-minus-30'),
        timerPlus30Btn: document.getElementById('timer-plus-30'),
        timerMinus10Btn: document.getElementById('timer-minus-10'),
        timerPlus10Btn: document.getElementById('timer-plus-10'),
        dailyLogModalTitle: document.getElementById('daily-log-modal-title'),
        dailyLogModalList: document.getElementById('daily-log-modal-list'),
        statsStartDateInput: document.getElementById('stats-start-date'),
        statsEndDateInput: document.getElementById('stats-end-date'),
        statsResetBtn: document.getElementById('stats-reset-btn'),
        statsPartSelector: document.getElementById('stats-part-selector'),
        statsExerciseSelect: document.getElementById('stats-exercise-select'),
        statsChartCanvas: document.getElementById('stats-chart-canvas'),
        prList: document.getElementById('pr-list'),
        closePrModalBtn: document.getElementById('close-pr-modal'),
        summaryContent: document.getElementById('summary-content'),
        closeSummaryBtn: document.getElementById('close-summary-btn'),
        confirmMessage: document.getElementById('confirm-message'),
        confirmOkBtn: document.getElementById('confirm-ok-btn'),
        confirmCancelBtn: document.getElementById('confirm-cancel-btn'),
        choiceModal: document.getElementById('choice-modal'),
        choiceMessage: document.getElementById('choice-message'),
        choiceOverwriteBtn: document.getElementById('choice-overwrite-btn'),
        choiceAppendBtn: document.getElementById('choice-append-btn'),
        choiceCancelBtn: document.getElementById('choice-cancel-btn')
    };

    let currentDate = new Date();
    let selectedDate = null;
    let workoutLogs = {};
    let routineTemplates = {};
    let exerciseDB = {};
    let prRecords = {};

    let currentSession = {
        date: null,
        routineName: "오늘의 운동",
        exercises: []
    };
    let currentTemplate = {
        id: null,
        name: "",
        exercises: []
    };
    let currentEditingTemplateExerciseId = null;
    let currentEditingExerciseInSessionId = null;
    let lastSelectedBodyPart = null;
    let editingLogIndex = null;

    const bodyPartImages = {
        "가슴": "images/chest.png",
        "등": "images/back.png",
        "하체": "images/legs.png",
        "어깨": "images/shoulders.png",
        "팔": "images/arms.png",
        "복근": "images/core.png"
    };

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
    let choiceCallbacks = {
        onOverwrite: null,
        onAppend: null,
        onCancel: null
    };

    const DATA_VERSION = "v21";
    const LOG_KEY = `workoutLogs_${DATA_VERSION}`;
    const TEMPLATE_KEY = `routineTemplates_${DATA_VERSION}`;
    const EXERCISE_DB_KEY = `exerciseDB_${DATA_VERSION}`;
    const PR_KEY = `prRecords_${DATA_VERSION}`;

    const getLocalToday = () => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };

    const loadData = () => {
        workoutLogs = JSON.parse(localStorage.getItem(LOG_KEY)) || {};
        routineTemplates = JSON.parse(localStorage.getItem(TEMPLATE_KEY)) || {};
        prRecords = JSON.parse(localStorage.getItem(PR_KEY)) || {};

        const storedExerciseDB = JSON.parse(localStorage.getItem(EXERCISE_DB_KEY));
        if (!storedExerciseDB || Object.keys(storedExerciseDB).length === 0) {
            exerciseDB = {
                ...exercisesData
            };
            saveExerciseDB();
        } else {
            exerciseDB = storedExerciseDB;
        }

        Object.keys(workoutLogs).forEach(date => {
            if (!Array.isArray(workoutLogs[date])) {
                workoutLogs[date] = [workoutLogs[date]];
            }
        });

        // 자동 마이그레이션: 복근/코어, 코어 -> 복근, 다리 -> 하체
        let dataChanged = false;
        const migrateKey = (obj, oldKey, newKey) => {
            if (obj[oldKey]) {
                obj[newKey] = obj[oldKey];
                delete obj[oldKey];
                dataChanged = true;
            }
        };

        migrateKey(exerciseDB, "복근/코어", "복근");
        migrateKey(exerciseDB, "코어", "복근");
        migrateKey(exerciseDB, "다리", "하체");

        if (dataChanged) saveExerciseDB();

        dataChanged = false;
        Object.keys(workoutLogs).forEach(date => {
            workoutLogs[date].forEach(log => {
                log.exercises.forEach(ex => {
                    if (ex.part === "복근/코어" || ex.part === "코어") {
                        ex.part = "복근";
                        dataChanged = true;
                    }
                    if (ex.part === "다리") {
                        ex.part = "하체";
                        dataChanged = true;
                    }
                });
            });
        });
        if (dataChanged) saveLogs();

        dataChanged = false;
        Object.keys(routineTemplates).forEach(id => {
            routineTemplates[id].exercises.forEach(ex => {
                if (ex.part === "복근/코어" || ex.part === "코어") {
                    ex.part = "복근";
                    dataChanged = true;
                }
                if (ex.part === "다리") {
                    ex.part = "하체";
                    dataChanged = true;
                }
            });
        });
        if (dataChanged) saveTemplates();
    };

    const saveData = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const saveLogs = () => saveData(LOG_KEY, workoutLogs);
    const saveTemplates = () => saveData(TEMPLATE_KEY, routineTemplates);
    const saveExerciseDB = () => saveData(EXERCISE_DB_KEY, exerciseDB);
    const savePRs = () => saveData(PR_KEY, prRecords);

    const renderCalendar = (date) => {
        elements.calendarBody.innerHTML = '';
        const year = date.getFullYear();
        const month = date.getMonth();

        elements.calendarTitle.textContent = `${year}년 ${month + 1}월`;

        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        const todayStr = getLocalToday();

        const prevLastDate = new Date(year, month, 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            elements.calendarBody.appendChild(createDayCell(prevLastDate - i, 'other-month', null, todayStr));
        }

        for (let day = 1; day <= lastDate; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const classes = [];
            if (dateStr === todayStr) classes.push('today');
            if (dateStr === selectedDate) classes.push('selected-day');

            elements.calendarBody.appendChild(createDayCell(day, classes.join(' '), dateStr, todayStr));
        }

        const nextDays = (7 - (firstDay + lastDate) % 7) % 7;
        for (let day = 1; day <= nextDays; day++) {
            elements.calendarBody.appendChild(createDayCell(day, 'other-month', null, todayStr));
        }
    };

    const createDayCell = (day, classes, dateStr, todayStr) => {
        const dayCell = document.createElement('div');
        dayCell.className = `calendar-day ${classes}`;

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);

        if (dateStr && workoutLogs[dateStr]) {
            const logsForDay = workoutLogs[dateStr];
            const logsArray = Array.isArray(logsForDay) ? logsForDay : [logsForDay];
            const partsSet = new Set();
            let totalVolume = 0;

            logsArray.forEach(log => {
                log.exercises.forEach(ex => {
                    const partKey = ex.part.toLowerCase().replace('/', '-').split(' ')[0];
                    partsSet.add(partKey);
                    ex.sets.forEach(s => {
                        if (s.completed) totalVolume += (s.weight * s.reps);
                    });
                });
            });

            if (totalVolume > 0) {
                const volDiv = document.createElement('div');
                volDiv.className = 'calendar-volume-text';
                volDiv.innerText = `${(totalVolume).toLocaleString()}kg`;
                dayCell.appendChild(volDiv);
            }

            const partsContainer = document.createElement('div');
            partsContainer.className = 'day-parts';
            partsSet.forEach(part => {
                const partSpan = document.createElement('span');
                let className = `part-${part}`;
                if (part === '복근') className = 'part-abs';
                const partSpanEl = document.createElement('span');
                partSpanEl.className = className;
                partSpanEl.textContent = part.charAt(0).toUpperCase() + part.slice(1);
                partsContainer.appendChild(partSpanEl);
            });
            dayCell.appendChild(partsContainer);
            dayCell.dataset.date = dateStr;
        }

        if (dateStr) {
            if (dateStr > todayStr) {
                dayCell.classList.add('future-day');
            } else {
                dayCell.addEventListener('click', () => handleDayClick(dateStr, dayCell));
                dayCell.addEventListener('dblclick', () => {
                    if (workoutLogs[dateStr]) {
                        openDailyLogModal(dateStr);
                    }
                });
            }
        }

        return dayCell;
    };

    const handleDayClick = (dateStr, dayCell) => {
        const oldSelected = elements.calendarBody.querySelector('.selected-day');
        if (oldSelected) {
            oldSelected.classList.remove('selected-day');
        }
        dayCell.classList.add('selected-day');
        selectedDate = dateStr;
    };

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

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'template-details';

        const nameP = document.createElement('p');
        nameP.className = 'template-name editable';
        nameP.textContent = template.name;
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
        infoDiv.appendChild(detailsDiv);

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'template-controls flex gap-2';

        const startBtn = document.createElement('button');
        startBtn.textContent = '실행';
        startBtn.className = 'start-btn';
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

        controlsDiv.appendChild(startBtn);
        controlsDiv.appendChild(deleteBtn);

        card.addEventListener('click', (e) => {
            if (e.target === card || e.target === infoDiv || e.target === partsP || e.target === detailsDiv) {
                startWorkoutFromTemplate(id);
            }
        });

        card.appendChild(infoDiv);
        card.appendChild(controlsDiv);

        return card;
    };

    const startWorkoutFromTemplate = (templateId) => {
        if (!selectedDate) {
            alert('운동을 시작할 날짜를 캘린더에서 먼저 선택하세요.');
            return;
        }

        const template = routineTemplates[templateId];
        if (!template) return;

        const templateExercises = template.exercises.map(ex => ({
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

        if (workoutLogs[selectedDate] && workoutLogs[selectedDate].length > 0) {
            customConfirm(`${selectedDate}에 이미 운동 기록이 있습니다.\n추가하시겠습니까?`, () => {
                startSession(template.name, templateExercises);
            });
        } else {
            startSession(template.name, templateExercises);
        }
    };

    const startSession = (name, exercises) => {
        editingLogIndex = null;
        currentSession.date = selectedDate;
        currentSession.routineName = name;
        currentSession.exercises = exercises;
        openWorkoutSessionModal();
    };

    let modalStack = [];
    const openModal = (modalEl) => {
        const zIndex = 50 + modalStack.length;
        modalEl.style.zIndex = zIndex;
        modalEl.setAttribute('aria-hidden', 'false');
        modalEl.style.display = 'flex';
        setTimeout(() => modalEl.style.opacity = 1, 10);
        modalStack.push(modalEl);
    };

    const closeModal = (modalEl) => {
        if (!modalEl) modalEl = modalStack[modalStack.length - 1];
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

    const showChoiceModal = (message, callbacks) => {
        elements.choiceMessage.textContent = message;
        choiceCallbacks = callbacks;
        openModal(elements.choiceModal);
    };

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

    const getPartByExerciseName = (exerciseName) => {
        for (const [part, list] of Object.entries(exerciseDB)) {
            if (list.some(ex => ex.name === exerciseName)) {
                return part;
            }
        }
        return null;
    };

    const openAddExerciseModal = () => {
        populateCategorySelect(elements.newExercisePart);
        if (lastSelectedBodyPart) {
            elements.newExercisePart.value = lastSelectedBodyPart;
        }
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

        lastSelectedBodyPart = part;

        if (!exerciseDB[part]) exerciseDB[part] = [];

        if (exerciseDB[part].some(ex => ex.name === name)) {
            alert('이미 존재하는 운동 이름입니다.');
            return;
        }

        exerciseDB[part].push({
            name: name,
            pr: 0
        });
        saveExerciseDB();

        populateCategorySelect(elements.exerciseCategorySelect);
        elements.exerciseCategorySelect.value = part;
        populateExerciseSelect(elements.exerciseListSelect, part);
        elements.exerciseListSelect.value = name;

        populateCategorySelect(elements.sessionCategorySelect);

        closeModal(elements.addExerciseModal);
    };

    const openTemplateEditorModal = (templateId = null) => {
        if (templateId) {
            currentTemplate = JSON.parse(JSON.stringify(routineTemplates[templateId]));
            currentTemplate.id = templateId;
            elements.templateModalTitle.textContent = "루틴 수정";
            elements.templateTitleInput.value = currentTemplate.name;
        } else {
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
            const ex = currentTemplate.exercises.find(e => e.id === currentEditingTemplateExerciseId);
            if (ex) {
                ex.part = part;
                ex.name = name;
                ex.weight = weight;
                ex.reps = reps;
                ex.sets = sets;
            }
        } else {
            currentTemplate.exercises.push({
                id: `template_ex_${Date.now()}`,
                part,
                name,
                weight,
                reps,
                sets
            });
        }

        renderTemplateExerciseList();
        currentEditingTemplateExerciseId = null;
        elements.addUpdateExerciseBtn.textContent = "운동 추가";
        elements.templateWeightInput.value = "";
        elements.templateRepsInput.value = "";
        elements.templateSetsInput.value = "";
    };

    const handleSaveTemplate = () => {
        let name = elements.templateTitleInput.value.trim();

        if (currentTemplate.exercises.length === 0) {
            alert('적어도 하나의 운동을 추가하세요.');
            return;
        }

        if (!name) {
            const parts = new Set(currentTemplate.exercises.map(ex => ex.part));
            name = `${Array.from(parts).join('/')} 루틴`;
        }

        currentTemplate.name = name;
        routineTemplates[currentTemplate.id] = currentTemplate;
        saveTemplates();
        renderTemplateList();
        closeModal(elements.templateEditorModal);
    };

    const openWorkoutSessionModal = () => {
        elements.workoutSessionTitle.textContent = currentSession.routineName;
        elements.prList.innerHTML = "";
        renderWorkoutSessionList();
        startSessionTimers();
        openModal(elements.workoutSessionModal);
    };

    const closeWorkoutSessionModal = () => {
        stopSessionTimers(true);
        closeModal(elements.workoutSessionModal);
    };

    const getSessionData = () => currentSession;

    const renderWorkoutSessionList = () => {
        elements.workoutSessionList.innerHTML = "";
        if (currentSession.exercises.length === 0) {
            elements.workoutSessionList.innerHTML = "<p class='text-gray-500 text-center py-10'>'운동 추가' 버튼으로 운동을 추가하세요.</p>";
            return;
        }

        currentSession.exercises.forEach(ex => {
            elements.workoutSessionList.appendChild(createExerciseCard(ex));
        });

        new Sortable(elements.workoutSessionList, {
            animation: 150,
            handle: '.exercise-header',
            onEnd: (evt) => {
                const movedItem = currentSession.exercises.splice(evt.oldIndex, 1)[0];
                currentSession.exercises.splice(evt.newIndex, 0, movedItem);
            }
        });
    };

    const createExerciseCard = (exercise) => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        card.dataset.exerciseid = exercise.id;

        const exerciseHeader = document.createElement('div');
        exerciseHeader.className = 'exercise-header';

        const imgUrl = bodyPartImages[exercise.part] || bodyPartImages["가슴"];
        const headerLeft = document.createElement('div');
        headerLeft.className = 'flex items-center gap-2';
        headerLeft.innerHTML = `
            <img src="${imgUrl}" class="w-8 h-8 rounded border">
            <h4 class="exercise-name cursor-pointer">${exercise.name}</h4>
        `;
        headerLeft.querySelector('.exercise-name').addEventListener('click', () => {
            openAddToSessionModal(exercise.id);
        });

        const controlsWrapper = document.createElement('div');
        controlsWrapper.className = 'flex items-center gap-2';

        const setControlsDiv = document.createElement('div');
        setControlsDiv.className = 'flex items-center gap-1';

        const removeSetBtn = document.createElement('button');
        removeSetBtn.className = 'adjust-set-btn-small';
        removeSetBtn.textContent = '–';
        removeSetBtn.onclick = () => {
            if (exercise.sets.length > 1) {
                exercise.sets.pop();
                renderWorkoutSessionList();
            }
        };

        const addSetBtn = document.createElement('button');
        addSetBtn.className = 'adjust-set-btn-small';
        addSetBtn.textContent = '+';
        addSetBtn.onclick = () => {
            const lastSet = exercise.sets[exercise.sets.length - 1] || {
                weight: 0,
                reps: 0
            };
            exercise.sets.push({
                id: `set_${Date.now()}_${Math.random()}`,
                weight: lastSet.weight,
                reps: lastSet.reps,
                completed: false
            });
            renderWorkoutSessionList();
        };

        setControlsDiv.appendChild(removeSetBtn);
        setControlsDiv.appendChild(addSetBtn);

        const completeAllBtn = document.createElement('button');
        completeAllBtn.className = 'complete-all-btn';
        completeAllBtn.textContent = '✓';
        completeAllBtn.title = '모든 세트 완료/취소';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-exercise-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = () => deleteExercise(exercise.id, card);

        controlsWrapper.appendChild(setControlsDiv);
        controlsWrapper.appendChild(completeAllBtn);
        controlsWrapper.appendChild(deleteBtn);

        exerciseHeader.appendChild(headerLeft);
        exerciseHeader.appendChild(controlsWrapper);
        card.appendChild(exerciseHeader);

        const setHeader = document.createElement('div');
        setHeader.className = 'set-header';
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

        completeAllBtn.onclick = () => {
            const allCompleted = exercise.sets.every(s => s.completed);
            const targetChecked = !allCompleted;

            card.querySelectorAll('.set-checkbox').forEach((checkbox, idx) => {
                checkbox.checked = targetChecked;
                const setItem = checkbox.closest('.set-item');
                const setId = setItem.dataset.setId;
                const isLast = idx === exercise.sets.length - 1;
                handleSetComplete(checkbox, setItem, exercise.id, setId, isLast && targetChecked);
            });
        };

        return card;
    };

    const createSetItem = (exercise, set, index) => {
        const setItem = document.createElement('div');
        setItem.className = 'set-item';
        setItem.dataset.setId = set.id;
        if (set.completed) setItem.classList.add('set-completed');

        const createStepperHtml = (value, type) => `
            <div class="stepper-input-wrapper">
                <input type="number" class="stepper-input ${type}-input" value="${value}" placeholder="0">
                <div class="stepper-controls">
                    <div class="stepper-btn up">▲</div>
                    <div class="stepper-btn down">▼</div>
                </div>
            </div>
        `;

        setItem.innerHTML = `
            <span class="set-number">${index}</span>
            <div>${createStepperHtml(set.weight, 'weight')}</div>
            <div>${createStepperHtml(set.reps, 'reps')}</div>
            <div><input type="checkbox" class="set-checkbox" ${set.completed ? 'checked' : ''}></div>
        `;

        const weightInput = setItem.querySelector('.weight-input');
        const repsInput = setItem.querySelector('.reps-input');
        const setCheckbox = setItem.querySelector('.set-checkbox');

        weightInput.addEventListener('change', () => {
            set.weight = parseFloat(weightInput.value) || 0;
        });
        repsInput.addEventListener('change', () => {
            set.reps = parseInt(repsInput.value) || 0;
        });

        const setupStepper = (input, type) => {
            const wrapper = input.closest('.stepper-input-wrapper');
            wrapper.querySelector('.up').addEventListener('click', () => {
                input.value = Number(input.value) + 1;
                input.dispatchEvent(new Event('change'));
            });
            wrapper.querySelector('.down').addEventListener('click', () => {
                if (input.value > 0) {
                    input.value = Number(input.value) - 1;
                    input.dispatchEvent(new Event('change'));
                }
            });
        };
        setupStepper(weightInput, 'weight');
        setupStepper(repsInput, 'reps');

        setCheckbox.addEventListener('change', () => {
            handleSetComplete(setCheckbox, setItem, exercise.id, set.id, true);
        });

        return setItem;
    };

    const deleteExercise = (exerciseId, card) => {
        customConfirm("이 운동을 세션에서 삭제하시겠습니까?", () => {
            currentSession.exercises = currentSession.exercises.filter(ex => ex.id !== exerciseId);
            card.remove();
        });
    };

    const handleSetComplete = (setCheckbox, setItem, exerciseId, setId, triggerRest) => {
        const session = getSessionData();
        const exercise = session.exercises.find(ex => ex.id === exerciseId);
        const set = exercise.sets.find(s => s.id === setId);

        if (setCheckbox.checked) {
            setItem.classList.add('set-completed');
            set.completed = true;
            if (triggerRest) {
                startRestTimer();
            }
            checkPR(exercise.name, set.weight, set.reps);
        } else {
            setItem.classList.remove('set-completed');
            set.completed = false;
        }
    };

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
            currentEditingExerciseInSessionId = null;
            title.textContent = "세션에 운동 추가";
            saveBtn.textContent = "추가";
        }

        openModal(modal);
    };

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

        stopSessionTimers(true);

        const finalLog = {
            routineName: currentSession.routineName,
            exercises: JSON.parse(JSON.stringify(currentSession.exercises))
        };

        if (!workoutLogs[currentSession.date]) {
            workoutLogs[currentSession.date] = [];
        }

        if (editingLogIndex !== null && editingLogIndex >= 0) {
            workoutLogs[currentSession.date][editingLogIndex] = finalLog;
        } else {
            workoutLogs[currentSession.date].push(finalLog);
        }

        saveLogs();
        renderCalendar(currentDate);
        closeWorkoutSessionModal();
        openSummaryModal(finalLog);
        editingLogIndex = null;
    };

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

    const stopSessionTimers = (stopTotalTimer = true) => {
        if (stopTotalTimer) {
            clearInterval(sessionTotalTimerInterval);
            sessionTotalTimerInterval = null;
        }

        clearInterval(sessionRestTimerInterval);
        sessionRestTimerInterval = null;
        isRestTimerRunning = false;

        sessionRestSeconds = sessionRestDefaultSeconds;
        updateRestTimerDisplay();

        elements.floatingTimer.style.display = 'none';
    };

    const startRestTimer = () => {
        clearInterval(sessionRestTimerInterval);
        sessionRestTimerInterval = null;

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
                stopSessionTimers(false);
                playRestTimerSound(3);
            }
        }, 1000);
    };

    const updateRestTimerDisplay = () => {
        const minutes = Math.floor(sessionRestSeconds / 60);
        const seconds = sessionRestSeconds % 60;
        elements.timerDigitalDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const total = sessionRestDefaultSeconds > 0 ? sessionRestDefaultSeconds : 60;
        const angle = ((total - sessionRestSeconds) / total) * 360;
        elements.analogClockHand.style.transform = `rotate(${angle}deg)`;
    };

    const updateFloatingTimerDisplay = () => {
        if (!isRestTimerRunning) {
            elements.floatingTimer.style.display = 'none';
            return;
        }

        elements.floatingTimerDisplay.textContent = `${String(Math.floor(sessionRestSeconds / 60)).padStart(2, '0')}:${String(sessionRestSeconds % 60).padStart(2, '0')}`;

        const total = sessionRestDefaultSeconds > 0 ? sessionRestDefaultSeconds : 60;
        const progress = sessionRestSeconds / total;
        const offset = floatingTimerCircumference * (1 - progress);
        elements.floatingTimerProgress.style.strokeDasharray = `${floatingTimerCircumference}`;
        elements.floatingTimerProgress.style.strokeDashoffset = offset;
    };

    const adjustRestTimer = (seconds) => {
        sessionRestSeconds = Math.max(0, sessionRestSeconds + seconds);
        updateRestTimerDisplay();
        if (isRestTimerRunning) {
            updateFloatingTimerDisplay();
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

    const checkPR = (exerciseName, weight, reps) => {
        const currentPR = prRecords[exerciseName] || {
            weight: 0,
            reps: 0
        };

        const estimated1RM = weight * (1 + reps / 30);
        const current1RM = currentPR.weight * (1 + currentPR.reps / 30);

        if (estimated1RM > current1RM) {
            const newPR = {
                weight,
                reps,
                date: currentSession.date
            };
            prRecords[exerciseName] = newPR;
            savePRs();

            Array.from(elements.prList.children).forEach(child => {
                if (child.dataset && child.dataset.exercise === exerciseName) {
                    elements.prList.removeChild(child);
                }
            });

            const part = getPartByExerciseName(exerciseName);
            const imgUrl = bodyPartImages[part] || bodyPartImages["가슴"];

            const prItem = document.createElement('div');
            prItem.className = 'summary-exercise-item';
            prItem.dataset.exercise = exerciseName;

            const imgEl = document.createElement('img');
            imgEl.src = imgUrl;
            imgEl.alt = part || '운동';
            imgEl.className = 'summary-exercise-img';

            const textDiv = document.createElement('div');
            textDiv.innerHTML = `
                <strong>${exerciseName}</strong><br>
                ${weight}kg x ${reps}회<br>
                <span class="text-sm text-gray-600">예상 1RM: ${estimated1RM.toFixed(1)} kg</span>
            `;

            prItem.appendChild(imgEl);
            prItem.appendChild(textDiv);
            elements.prList.appendChild(prItem);
        }
    };

    const openSummaryModal = (log) => {
        elements.summaryContent.innerHTML = "";

        let totalVolume = 0;
        let totalSets = 0;

        log.exercises.forEach(ex => {
            const imgUrl = bodyPartImages[ex.part] || bodyPartImages["가슴"];

            const hasCompletedSets = ex.sets.some(s => s.completed);
            if (!hasCompletedSets) return;

            const exWrap = document.createElement('div');
            exWrap.className = 'summary-exercise-item';

            const imgEl = document.createElement('img');
            imgEl.src = imgUrl;
            imgEl.alt = ex.part;
            imgEl.className = 'summary-exercise-img';

            const exDiv = document.createElement('div');
            exDiv.innerHTML = `<h4 class="font-bold text-lg">${ex.name} (${ex.part})</h4>`;

            const setsList = document.createElement('ul');
            setsList.className = 'list-disc list-inside text-gray-700';

            const setsMap = new Map();
            ex.sets.forEach(set => {
                if (set.completed) {
                    const key = `${set.weight}kg x ${set.reps}회`;
                    setsMap.set(key, (setsMap.get(key) || 0) + 1);
                    totalVolume += set.weight * set.reps;
                    totalSets++;
                }
            });

            const sortedGroups = Array.from(setsMap.entries()).sort((a, b) => {
                const [wa, ra] = a[0].match(/[\d.]+/g).map(Number);
                const [wb, rb] = b[0].match(/[\d.]+/g).map(Number);
                const ca = a[1];
                const cb = b[1];
                if (wa !== wb) return wb - wa;
                if (ra !== rb) return rb - ra;
                return cb - ca;
            });

            sortedGroups.forEach(([key, count]) => {
                setsList.innerHTML += `<li>${key} x ${count}세트</li>`;
            });

            exDiv.appendChild(setsList);
            exWrap.appendChild(imgEl);
            exWrap.appendChild(exDiv);
            elements.summaryContent.appendChild(exWrap);
        });

        const summaryText = document.createElement('p');
        summaryText.className = 'mt-4 pt-4 border-t font-bold';
        summaryText.textContent = `총 볼륨: ${totalVolume.toLocaleString()}kg | 총 세트: ${totalSets}세트`;
        elements.summaryContent.prepend(summaryText);

        if (elements.prList.children.length > 0) {
            openModal(elements.prCelebrationModal);
        } else {
            openModal(elements.summaryModal);
        }
    };

    const openDailyLogModal = (dateStr) => {
        const logs = workoutLogs[dateStr];
        if (!logs || (Array.isArray(logs) && logs.length === 0)) {
            alert("운동한 기록이 없습니다.");
            return;
        }

        const logsArray = Array.isArray(logs) ? logs : [logs];

        elements.dailyLogModalTitle.textContent = `${dateStr} 운동 기록`;
        elements.dailyLogModalList.innerHTML = "";

        logsArray.forEach((log, index) => {
            const logWrapper = document.createElement('div');
            logWrapper.className = 'mb-4 pb-4 border-b';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'flex justify-between items-center mb-2';

            const logTitle = document.createElement('h3');
            logTitle.className = 'text-xl font-bold text-blue-600';
            logTitle.textContent = `[운동 ${index + 1}] ${log.routineName}`;

            const btnGroup = document.createElement('div');
            btnGroup.className = 'flex gap-2';

            const editBtn = document.createElement('button');
            editBtn.className = 'text-sm bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded';
            editBtn.textContent = '수정';
            editBtn.onclick = () => {
                editingLogIndex = index;
                currentSession.date = dateStr;
                currentSession.routineName = log.routineName;
                currentSession.exercises = JSON.parse(JSON.stringify(log.exercises));
                closeModal(elements.dailyLogModal);
                openWorkoutSessionModal();
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'text-sm bg-red-100 text-red-500 hover:bg-red-200 px-2 py-1 rounded';
            deleteBtn.textContent = '삭제';
            deleteBtn.onclick = () => {
                customConfirm("이 운동 기록을 정말 삭제하시겠습니까?", () => {
                    workoutLogs[dateStr].splice(index, 1);
                    if (workoutLogs[dateStr].length === 0) delete workoutLogs[dateStr];
                    saveLogs();
                    renderCalendar(currentDate);
                    closeModal(elements.dailyLogModal);
                    if (workoutLogs[dateStr]) openDailyLogModal(dateStr);
                });
            };

            btnGroup.appendChild(editBtn);
            btnGroup.appendChild(deleteBtn);

            headerDiv.appendChild(logTitle);
            headerDiv.appendChild(btnGroup);
            logWrapper.appendChild(headerDiv);

            log.exercises.forEach(ex => {
                const imgUrl = bodyPartImages[ex.part] || bodyPartImages["가슴"];

                const hasCompletedSets = ex.sets.some(s => s.completed);
                if (!hasCompletedSets) return;

                const exWrap = document.createElement('div');
                exWrap.className = 'summary-exercise-item mb-2';

                const imgEl = document.createElement('img');
                imgEl.src = imgUrl;
                imgEl.alt = ex.part;
                imgEl.className = 'summary-exercise-img';

                const exDiv = document.createElement('div');

                let exerciseVolume = 0;
                const setsMap = new Map();

                ex.sets.forEach(set => {
                    if (set.completed) {
                        const key = `${set.weight}kg x ${set.reps}회`;
                        setsMap.set(key, (setsMap.get(key) || 0) + 1);
                        exerciseVolume += set.weight * set.reps;
                    }
                });

                exDiv.innerHTML = `<h4 class="font-bold text-lg">${ex.name} (${ex.part}) - <span class="font-normal text-gray-800">총 ${exerciseVolume.toLocaleString()} kg</span></h4>`;

                const setsList = document.createElement('ul');
                setsList.className = 'list-disc list-inside text-gray-700';

                const sortedGroups = Array.from(setsMap.entries()).sort((a, b) => {
                    const [wa, ra] = a[0].match(/[\d.]+/g).map(Number);
                    const [wb, rb] = b[0].match(/[\d.]+/g).map(Number);
                    const ca = a[1];
                    const cb = b[1];
                    if (wa !== wb) return wb - wa;
                    if (ra !== rb) return rb - ra;
                    return cb - ca;
                });

                sortedGroups.forEach(([key, count]) => {
                    setsList.innerHTML += `<li>${key} x ${count}세트</li>`;
                });

                exDiv.appendChild(setsList);
                exWrap.appendChild(imgEl);
                exWrap.appendChild(exDiv);
                logWrapper.appendChild(exWrap);
            });

            elements.dailyLogModalList.appendChild(logWrapper);
        });

        openModal(elements.dailyLogModal);
    };

    const openStatsModal = () => {
        const today = new Date();
        const endStr = getLocalToday();

        const end = new Date(endStr);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);

        elements.statsStartDateInput.value = start.toISOString().split('T')[0];
        elements.statsEndDateInput.value = endStr;

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

    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    const updateStatsChart = () => {
        const startDate = elements.statsStartDateInput.value;
        const endDate = elements.statsEndDateInput.value;
        const part = elements.statsPartSelector.querySelector('.part-btn.selected').dataset.part;
        const exercise = elements.statsExerciseSelect.value;

        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split('T')[0]);
        }

        let datasets = [];

        if (part === '전체') {
            const bodyParts = Object.keys(bodyPartImages);
            const partColors = {
                "가슴": '#ff6384',
                "등": '#36a2eb',
                "하체": '#cc65fe',
                "어깨": '#ffce56',
                "팔": '#4bc0c0',
                "복근": '#9966ff'
            };

            datasets = bodyParts.map(bp => {
                return {
                    label: bp,
                    backgroundColor: partColors[bp] || '#999',
                    stack: 'combined',
                    data: dates.map(date => {
                        const logsForDay = workoutLogs[date];
                        if (!logsForDay) return 0;
                        const logsArray = Array.isArray(logsForDay) ? logsForDay : [logsForDay];

                        let vol = 0;
                        logsArray.forEach(log => {
                            log.exercises.forEach(ex => {
                                if (exercise !== '전체' && ex.name !== exercise) return;
                                if (ex.part === bp) {
                                    ex.sets.forEach(s => {
                                        if (s.completed) vol += (s.weight * s.reps);
                                    });
                                }
                            });
                        });
                        return vol;
                    })
                };
            });

        } else {
            const exerciseNames = new Set();
            dates.forEach(date => {
                const logsForDay = workoutLogs[date];
                if (logsForDay) {
                    const logsArray = Array.isArray(logsForDay) ? logsForDay : [logsForDay];
                    logsArray.forEach(log => {
                        log.exercises.forEach(ex => {
                            if (ex.part === part) {
                                if (exercise === '전체' || ex.name === exercise) {
                                    exerciseNames.add(ex.name);
                                }
                            }
                        });
                    });
                }
            });

            datasets = Array.from(exerciseNames).map(exName => {
                return {
                    label: exName,
                    backgroundColor: getRandomColor(),
                    stack: 'combined',
                    data: dates.map(date => {
                        const logsForDay = workoutLogs[date];
                        if (!logsForDay) return 0;
                        const logsArray = Array.isArray(logsForDay) ? logsForDay : [logsForDay];

                        let vol = 0;
                        logsArray.forEach(log => {
                            log.exercises.forEach(ex => {
                                if (ex.name === exName) {
                                    ex.sets.forEach(s => {
                                        if (s.completed) vol += (s.weight * s.reps);
                                    });
                                }
                            });
                        });
                        return vol;
                    })
                };
            });
        }

        const filteredDatasets = datasets.filter(ds => ds.data.some(v => v > 0));

        if (statsChart) statsChart.destroy();

        statsChart = new Chart(elements.statsChartCanvas, {
            type: 'bar',
            data: {
                labels: dates.map(d => d.slice(5)),
                datasets: filteredDatasets.length > 0 ? filteredDatasets : [{
                    label: '데이터 없음',
                    data: [],
                    stack: 'combined'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '볼륨 (kg)'
                        }
                    }
                },
                plugins: {
                    datalabels: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw.toLocaleString()} kg`;
                            }
                        }
                    }
                }
            }
        });
    };

    const resetStatsDate = () => {
        const endStr = getLocalToday();
        const end = new Date(endStr);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);

        elements.statsStartDateInput.value = start.toISOString().split('T')[0];
        elements.statsEndDateInput.value = endStr;
        updateStatsChart();
    };

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

    const initEventListeners = () => {
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
            selectedDate = getLocalToday();
            renderCalendar(currentDate);
        });
        elements.dateSearchBtn.addEventListener('click', () => {
            elements.dateSearchInput.showPicker();
        });
        elements.dateSearchInput.addEventListener('change', () => {
            const dateStr = elements.dateSearchInput.value;
            if (dateStr) {
                const todayStr = getLocalToday();
                if (dateStr > todayStr) {
                    alert("오늘 이후의 날짜는 선택할 수 없습니다.");
                    elements.dateSearchInput.value = "";
                    return;
                }
                currentDate = new Date(dateStr);
                selectedDate = dateStr;
                renderCalendar(currentDate);
            }
        });

        elements.createNewTemplateBtn.addEventListener('click', () => openTemplateEditorModal());
        elements.openStatsModalBtn.addEventListener('click', openStatsModal);
        elements.backBtn.addEventListener('click', () => {
            if (document.referrer) window.history.back();
            else alert('이전 페이지가 없습니다.');
        });

        // 초기화 버튼 이벤트
        elements.resetDataBtn.addEventListener('click', () => {
            customConfirm("⚠️ 경고: 모든 운동 기록과 루틴이 삭제됩니다.\n정말 초기화하시겠습니까?", () => {
                localStorage.clear();
                location.reload();
            });
        });

        elements.openAddExerciseModalBtn.addEventListener('click', openAddExerciseModal);
        elements.exerciseCategorySelect.addEventListener('change', (e) => {
            populateExerciseSelect(elements.exerciseListSelect, e.target.value);
        });
        elements.addUpdateExerciseBtn.addEventListener('click', handleAddOrUpdateExerciseInTemplate);
        elements.saveTemplateBtn.addEventListener('click', handleSaveTemplate);

        addEnterNavigation([
            elements.templateTitleInput,
            elements.exerciseCategorySelect,
            elements.exerciseListSelect,
            elements.templateWeightInput,
            elements.templateRepsInput,
            elements.templateSetsInput,
            elements.addUpdateExerciseBtn
        ]);

        elements.saveNewExerciseBtn.addEventListener('click', handleSaveNewExercise);
        elements.cancelAddExerciseBtn.addEventListener('click', () => closeModal(elements.addExerciseModal));

        addEnterNavigation([
            elements.newExercisePart,
            elements.newExerciseName,
            elements.saveNewExerciseBtn
        ]);

        elements.addExerciseToSessionBtn.addEventListener('click', () => openAddToSessionModal());
        elements.saveSessionBtn.addEventListener('click', handleSaveSession);

        elements.hideSessionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            customConfirm("운동 세션을 종료하시겠습니까?\n저장되지 않은 기록은 사라집니다.", () => {
                stopSessionTimers(true);
                currentSession = {
                    date: null,
                    routineName: "오늘의 운동",
                    exercises: []
                };
                closeWorkoutSessionModal();
            });
        });

        elements.saveToSessionBtn.addEventListener('click', handleSaveToSession);

        elements.sessionCategorySelect.addEventListener('change', (e) => {
            populateExerciseSelect(elements.sessionExListSelect, e.target.value);
        });

        addEnterNavigation([
            elements.sessionCategorySelect,
            elements.sessionExListSelect,
            elements.sessionWeightInput,
            elements.sessionRepsInput,
            elements.sessionSetsInput,
            elements.saveToSessionBtn
        ]);

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

        elements.floatingTimer.addEventListener('click', () => {
            elements.floatingTimer.style.display = 'none';
            elements.workoutSessionModal.style.display = 'flex';
            openModal(elements.workoutSessionModal);
        });

        elements.closeFloatingTimer.addEventListener('click', (e) => {
            e.stopPropagation();
            customConfirm("운동 세션을 종료하시겠습니까?\n저장되지 않은 기록은 사라집니다.", () => {
                stopSessionTimers(true);
                currentSession = {
                    date: null,
                    routineName: "오늘의 운동",
                    exercises: []
                };
                closeWorkoutSessionModal();
            });
        });

        elements.statsStartDateInput.addEventListener('change', updateStatsChart);
        elements.statsEndDateInput.addEventListener('change', updateStatsChart);
        elements.statsExerciseSelect.addEventListener('change', updateStatsChart);
        elements.statsResetBtn.addEventListener('click', resetStatsDate);

        elements.closePrModalBtn.addEventListener('click', () => {
            closeModal(elements.prCelebrationModal);
            openModal(elements.summaryModal);
        });
        elements.closeSummaryBtn.addEventListener('click', () => closeModal(elements.summaryModal));

        elements.confirmOkBtn.addEventListener('click', () => {
            if (confirmCallback) confirmCallback();
            confirmCallback = null;
            closeModal(elements.confirmModal);
        });
        elements.confirmCancelBtn.addEventListener('click', () => {
            confirmCallback = null;
            closeModal(elements.confirmModal);
        });

        elements.choiceOverwriteBtn.addEventListener('click', () => {
            if (choiceCallbacks.onOverwrite) choiceCallbacks.onOverwrite();
            closeModal(elements.choiceModal);
        });
        elements.choiceAppendBtn.addEventListener('click', () => {
            if (choiceCallbacks.onAppend) choiceCallbacks.onAppend();
            closeModal(elements.choiceModal);
        });
        elements.choiceCancelBtn.addEventListener('click', () => {
            if (choiceCallbacks.onCancel) choiceCallbacks.onCancel();
            closeModal(elements.choiceModal);
        });

        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal && modal.id !== 'custom-confirm-modal' && modal.id !== 'choice-modal') {
                    if (modal.id === 'workout-session-modal') {
                        elements.workoutSessionModal.style.display = 'none';
                        elements.floatingTimer.style.display = 'flex';
                        updateFloatingTimerDisplay();
                    } else {
                        closeModal(modal);
                    }
                }
            });
        });
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) closeModal(modal);
            });
        });

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
                    } else if (topModal.id !== 'custom-confirm-modal' && topModal.id !== 'choice-modal') {
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
        selectedDate = getLocalToday();
        renderCalendar(currentDate);
        renderTemplateList();
        initEventListeners();
    };

    init();
});
