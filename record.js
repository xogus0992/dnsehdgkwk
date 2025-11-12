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
        summaryModal: document.getElementById('summary-modal'),
        prCelebrationModal: document.getElementById('pr-celebration-modal'),
        confirmModal: document.getElementById('custom-confirm-modal'),
        addToSessionModal: document.getElementById('add-to-session-modal'),
        dailyLogModalTitle: document.getElementById('daily-log-modal-title'),
        dailyLogModalList: document.getElementById('daily-log-modal-list'),
        prList: document.getElementById('pr-list'),
        closePrModal: document.getElementById('close-pr-modal'),
        templateModalTitle: document.getElementById('template-modal-title'),
        templateTitleInput: document.getElementById('template-title-input'),
        exerciseCategorySelect: document.getElementById('exercise-category-select'),
        exerciseListSelect: document.getElementById('exercise-list-select'),
        templateWeightInput: document.getElementById('template-weight-input'),
        templateRepsInput: document.getElementById('template-reps-input'),
        templateSetsInput: document.getElementById('template-sets-input'),
        addUpdateExerciseBtn: document.getElementById('add-update-exercise-btn'),
        templateExerciseList: document.getElementById('template-exercise-list'),
        saveTemplateBtn: document.getElementById('save-template-btn'),
        openAddExerciseModalBtn: document.getElementById('open-add-exercise-modal-btn'),
        newExercisePart: document.getElementById('new-exercise-part'),
        newExerciseName: document.getElementById('new-exercise-name'),
        saveNewExerciseBtn: document.getElementById('save-new-exercise-btn'),
        cancelAddExerciseBtn: document.getElementById('cancel-add-exercise-btn'),
        sessionExCategorySelect: document.getElementById('session-ex-category-select'),
        sessionExListSelect: document.getElementById('session-ex-list-select'),
        sessionWeightInput: document.getElementById('session-weight-input'),
        sessionRepsInput: document.getElementById('session-reps-input'),
        sessionSetsInput: document.getElementById('session-sets-input'),
        saveToSessionBtn: document.getElementById('save-to-session-btn'),
        statsStartDate: document.getElementById('stats-start-date'),
        statsEndDate: document.getElementById('stats-end-date'),
        statsResetBtn: document.getElementById('stats-reset-btn'),
        statsPartSelector: document.getElementById('stats-part-selector'),
        statsExerciseSelect: document.getElementById('stats-exercise-select'),
        statsChartCanvas: document.getElementById('stats-chart-canvas'),
        summaryContent: document.getElementById('summary-content'),
        closeSummaryBtn: document.getElementById('close-summary-btn'),
        confirmMessage: document.getElementById('confirm-message'),
        confirmOkBtn: document.getElementById('confirm-ok-btn'),
        confirmCancelBtn: document.getElementById('confirm-cancel-btn'),
        workoutSessionTitle: document.getElementById('workout-session-title'),
        workoutSessionList: document.getElementById('workout-session-list'),
        hideSessionBtn: document.getElementById('hide-session-btn'),
        addExerciseToSessionBtn: document.getElementById('add-exercise-to-session-btn'),
        saveSessionBtn: document.getElementById('save-session-btn'),
        timerInput: document.getElementById('timer-input'),
        timerDigitalDisplay: document.getElementById('timer-digital-display'),
        clockSecondHand: document.getElementById('clock-second-hand'),
        timerMinus10: document.getElementById('timer-minus-10'),
        timerPlus10: document.getElementById('timer-plus-10'),
        timerMinus30: document.getElementById('timer-minus-30'),
        timerPlus30: document.getElementById('timer-plus-30'),
        closeModalBtns: document.querySelectorAll('.close-modal-btn')
    };

    let today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth();
    let workoutLogs = {};
    let routineTemplates = {};
    let customExercises = {};
    let prRecords = {};
    let currentTemplateId = null;
    let currentEditingSet = null;
    let currentEditingTemplateSet = null;
    let currentSessionDate = null;
    let currentSessionTemplateId = null;
    let statsChart = null;
    let confirmResolve = null;
    let timerInterval = null;
    let timerSeconds = 0;
    let timerTotalSeconds = 0;
    let timerRunning = false;
    let floatingTimerDraggable = null;
    let floatingTimerRadius = 0;
    let floatingTimerCircumference = 0;

    const BODY_PART_COLORS = {
        "가슴": "#3B82F6", "등": "#10B981", "하체": "#F59E0B", "어깨": "#EF4444",
        "팔": "#6366F1", "복근/코어": "#EC4899", "기타": "#6B7281"
    };
    
    const APP_VERSION = "v18";
    const LOG_KEY = `workoutLogs_${APP_VERSION}`;
    const TEMPLATE_KEY = `routineTemplates_${APP_VERSION}`;
    const CUSTOM_EX_KEY = `customExercises_${APP_VERSION}`;
    const PR_KEY = `prRecords_${APP_VERSION}`;
    
    // --- Data Management ---
    const loadData = () => {
        workoutLogs = JSON.parse(localStorage.getItem(LOG_KEY) || "{}");
        routineTemplates = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || "{}");
        customExercises = JSON.parse(localStorage.getItem(CUSTOM_EX_KEY) || "{}");
        prRecords = JSON.parse(localStorage.getItem(PR_KEY) || "{}");
        
        // Ensure default exercises are present if none loaded
        if (Object.keys(customExercises).length === 0 && typeof exercisesData !== 'undefined') {
            customExercises = { ...exercisesData };
            saveCustomExercises();
        }
    };

    const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));
    const saveLogs = () => saveData(LOG_KEY, workoutLogs);
    const saveTemplates = () => saveData(TEMPLATE_KEY, routineTemplates);
    const saveCustomExercises = () => saveData(CUSTOM_EX_KEY, customExercises);
    const savePRs = () => saveData(PR_KEY, prRecords);

    // --- Utility Functions ---
    const getPartForExercise = (exerciseName) => {
        for (const part in customExercises) {
            if (customExercises[part].some(ex => ex.name === exerciseName)) {
                return part;
            }
        }
        return "기타";
    };

    const formatDate = (dateStr, format = "MM월 DD일") => {
        const date = new Date(dateStr);
        return format.replace("YYYY", date.getFullYear())
                     .replace("MM", String(date.getMonth() + 1).padStart(2, '0'))
                     .replace("DD", String(date.getDate()).padStart(2, '0'));
    };
    
    const estimate1RM = (weight, reps) => {
        if (reps === 1) return weight;
        if (reps > 10 || reps <= 0) return 0; // 0 또는 10회 초과 Epley 공식은 부정확
        return parseFloat((weight * (1 + reps / 30)).toFixed(2));
    };

    const showCustomConfirm = (message) => {
        elements.confirmMessage.textContent = message;
        openModal(elements.confirmModal);
        return new Promise((resolve) => {
            confirmResolve = resolve;
        });
    };

    // --- Modal Management ---
    const openModal = (modalElement) => {
        if (modalElement) {
            modalElement.style.display = 'flex';
            modalElement.setAttribute('aria-hidden', 'false');
        } else {
            console.error("Attempted to open a null modal element.");
        }
    };

    const closeModal = (modalElement) => {
        if (modalElement) {
            modalElement.style.animation = 'fadeOut 0.3s ease-out forwards';
            const modalContent = modalElement.querySelector('.modal-content');
            if (modalContent) {
                 modalContent.style.animation = 'slideOut 0.3s ease-out forwards';
            }
            
            setTimeout(() => {
                modalElement.style.display = 'none';
                modalElement.setAttribute('aria-hidden', 'true');
                modalElement.style.animation = '';
                if (modalContent) {
                    modalContent.style.animation = '';
                }
                
                // Reset specific modals
                if (modalElement.id === 'template-editor-modal') {
                    resetTemplateEditor();
                }
            }, 300);
        } else {
            console.error("Attempted to close a null modal element.");
        }
    };
    
    const resetTemplateEditor = () => {
        currentTemplateId = null;
        currentEditingTemplateSet = null;
        elements.templateModalTitle.textContent = "새 루틴 만들기";
        elements.templateTitleInput.value = "";
        elements.templateExerciseList.innerHTML = "";
        elements.addUpdateExerciseBtn.textContent = "운동 추가";
        
        // [FIX] templateEditorModal 안의 숨겨진 요소들 다시 보이게
        elements.saveTemplateBtn.style.display = 'block'; 
        elements.templateExerciseList.style.display = 'block'; 
        const heading = document.querySelector('#template-editor-modal h4[class="font-bold mb-2"]');
        if (heading) {
            heading.style.display = 'block'; 
        }
        elements.templateTitleInput.disabled = false;
        elements.templateSetsInput.disabled = false;
        elements.exerciseCategorySelect.disabled = false;
        elements.exerciseListSelect.disabled = false;
    };

    // --- Calendar ---
    
    // [수정 1] renderCalendar 함수 (미래 날짜 클릭 방지, 과거/오늘만 클릭)
    const renderCalendar = (year, month) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        elements.calendarTitle.textContent = `${year}년 ${month + 1}월`;
        elements.calendarBody.innerHTML = '';

        ['일', '월', '화', '수', '목', '금', '토'].forEach(day => {
            elements.calendarBody.innerHTML += `<div class="calendar-header">${day}</div>`;
        });

        for (let i = 0; i < firstDay; i++) {
            elements.calendarBody.innerHTML += `<div class="calendar-day empty"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');

            dayElement.innerHTML = `<span class="day-number">${day}</span>`; // 모든 날짜에 숫자 우선 표시
            
            const isFuture = date > today; // 'today' 변수는 0시 0분 0초여야 함
            
            if (isFuture) {
                // 1. 미래 날짜인 경우
                // 'future-day' 클래스만 추가하고, 클릭 이벤트나 다른 로직을 추가하지 않습니다.
                dayElement.classList.add('future-day');
            } else {
                // 2. 오늘 또는 과거 날짜인 경우
                
                // 오늘 날짜 특별 표시
                if (date.getTime() === today.getTime()) {
                    dayElement.classList.add('today');
                }

                // 운동 기록 점(dot) 표시 로직
                const dayLogs = workoutLogs[dateStr] || [];
                const parts = new Set(dayLogs.flatMap(log => log.sets.map(set => getPartForExercise(set.name))));
                
                if (parts.size > 0) {
                    const partsIndicator = document.createElement('div');
                    partsIndicator.classList.add('parts-indicator');
                    parts.forEach(part => {
                        const partDot = document.createElement('div');
                        partDot.classList.add('part-dot');
                        partDot.style.backgroundColor = BODY_PART_COLORS[part] || BODY_PART_COLORS["기타"];
                        partsIndicator.appendChild(partDot);
                    });
                    dayElement.appendChild(partsIndicator);
                }

                // [중요] 클릭 이벤트 리스너를 이 'else' 블록 안에 추가합니다.
                dayElement.dataset.date = dateStr;
                dayElement.addEventListener('click', () => showDailyLogModal(dateStr));
            }
            
            elements.calendarBody.appendChild(dayElement);
        }
    };


    const changeMonth = (offset) => {
        currentMonth += offset;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        } else if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar(currentYear, currentMonth);
    };
    
    const jumpToDate = (date) => {
        currentYear = date.getFullYear();
        currentMonth = date.getMonth();
        renderCalendar(currentYear, currentMonth);
        
        // Highlight
        const dateStr = date.toISOString().split('T')[0];
        const dayElement = elements.calendarBody.querySelector(`[data-date="${dateStr}"]`);
        if (dayElement) {
            dayElement.classList.add('searched');
            setTimeout(() => dayElement.classList.remove('searched'), 2000);
        }
    };

    // --- Daily Log Modal ---
    const showDailyLogModal = (dateStr) => {
        currentSessionDate = dateStr;
        elements.dailyLogModalTitle.textContent = formatDate(dateStr, "YYYY년 MM월 DD일");
        renderDailyLog(dateStr);
        openModal(elements.dailyLogModal);
    };

    const renderDailyLog = (dateStr) => {
        const dayLogs = workoutLogs[dateStr] || [];
        elements.dailyLogModalList.innerHTML = '';
        
        if (dayLogs.length === 0) {
            elements.dailyLogModalList.innerHTML = '<p class="text-gray-500 text-center">기록된 운동이 없습니다. 루틴을 시작해보세요.</p>';
            return;
        }

        dayLogs.forEach((log, logIndex) => {
            const exerciseName = log.name;
            const part = getPartForExercise(exerciseName);
            
            const logGroup = document.createElement('div');
            logGroup.className = 'exercise-group p-4 border rounded-lg shadow-sm bg-white';
            
            let headerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-6 rounded" style="background-color:${BODY_PART_COLORS[part] || BODY_PART_COLORS['기타']}"></span>
                        <h4 class="font-bold text-lg">${exerciseName}</h4>
                    </div>
                    <button class="delete-log-btn small-btn delete-btn" data-log-index="${logIndex}">기록 삭제</button>
                </div>
                <div class="set-grid grid grid-cols-5 gap-2 items-center font-semibold text-gray-600 mb-2 px-2">
                    <span>세트</span><span>무게(kg)</span><span>횟수</span><span>완료</span><span></span>
                </div>
                <div class="sets-list space-y-2">
            `;
            
            log.sets.forEach((set, setIndex) => {
                const isPR = set.isPR ? '<span class="pr-badge ml-2">PR</span>' : '';
                headerHTML += `
                    <div class="set-item grid grid-cols-5 gap-2 items-center p-2 rounded-md ${set.done ? 'bg-green-50 text-green-800' : 'bg-gray-100'}">
                        <span>${setIndex + 1}</span>
                        <span>${set.weight}</span>
                        <span>${set.reps} ${isPR}</span>
                        <input type="checkbox" class="set-done-check h-5 w-5" data-log-index="${logIndex}" data-set-index="${setIndex}" ${set.done ? 'checked' : ''}>
                        <button class="edit-set-btn text-sm text-gray-500 hover:text-blue-500" data-log-index="${logIndex}" data-set-index="${setIndex}">수정</button>
                    </div>
                `;
            });
            
            logGroup.innerHTML = headerHTML + '</div></div>';
            elements.dailyLogModalList.appendChild(logGroup);
        });
    };

    const handleDailyLogClick = async (e) => {
        const { logIndex, setIndex } = e.target.dataset;
        if (logIndex === undefined || setIndex === undefined) return;
        
        if (!workoutLogs[currentSessionDate]) {
             console.error("No logs for current date:", currentSessionDate);
             return;
        }

        if (e.target.classList.contains('set-done-check')) {
            const log = workoutLogs[currentSessionDate][logIndex];
            if (!log) return;
            
            const set = log.sets[setIndex];
            if (!set) return;

            set.done = e.target.checked;
            saveLogs();
            renderDailyLog(currentSessionDate);
            renderCalendar(currentYear, currentMonth); // Update calendar dots
        }
        
        if (e.target.classList.contains('edit-set-btn')) {
            const log = workoutLogs[currentSessionDate][logIndex];
            if (!log) return;
            const set = log.sets[setIndex];
            if (!set) return;

            currentEditingSet = { date: currentSessionDate, logIndex, setIndex };
            openTemplateEditor(null, set); // Open in "edit set" mode
        }
        
        if (e.target.classList.contains('delete-log-btn')) {
            const confirmed = await showCustomConfirm("이 운동 기록 전체를 삭제하시겠습니까?");
            if (confirmed) {
                workoutLogs[currentSessionDate].splice(logIndex, 1);
                if (workoutLogs[currentSessionDate].length === 0) {
                    delete workoutLogs[currentSessionDate];
                }
                saveLogs();
                renderDailyLog(currentSessionDate);
                renderCalendar(currentYear, currentMonth);
            }
        }
    };
    
    // --- Template Management ---
    const openTemplateEditor = (templateId = null, setToEdit = null) => {
        resetTemplateEditor(); // 먼저 리셋
        populateExerciseSelectors(elements.exerciseCategorySelect, elements.exerciseListSelect);

        if (setToEdit) {
            // Mode 1: Editing a specific set from daily log
            const { name, weight, reps } = setToEdit;
            currentEditingSet = { ...setToEdit, ...currentEditingSet }; // Ensure date/indices are kept
            elements.templateModalTitle.textContent = "세트 수정";
            elements.templateTitleInput.value = name;
            elements.templateTitleInput.disabled = true;
            elements.templateWeightInput.value = weight;
            elements.templateRepsInput.value = reps;
            elements.templateSetsInput.value = 1;
            elements.templateSetsInput.disabled = true;
            elements.exerciseCategorySelect.value = getPartForExercise(name);
            elements.exerciseCategorySelect.disabled = true;
            populateExerciseList(elements.exerciseListSelect, elements.exerciseCategorySelect.value);
            elements.exerciseListSelect.value = name;
            elements.exerciseListSelect.disabled = true;
            elements.addUpdateExerciseBtn.textContent = "세트 수정";
            elements.saveTemplateBtn.style.display = 'none'; // Hide save template btn
            elements.templateExerciseList.style.display = 'none'; // Hide list
            const heading = document.querySelector('#template-editor-modal h4[class="font-bold mb-2"]');
            if (heading) {
                heading.style.display = 'none'; // Hide "현재 루틴"
            }
        } else if (templateId) {
            // Mode 2: Editing an existing routine template
            currentTemplateId = templateId;
            const template = routineTemplates[templateId];
            if (!template) return; // 방어
            elements.templateModalTitle.textContent = "루틴 수정";
            elements.templateTitleInput.value = template.title;
            template.exercises.forEach((ex, index) => renderTemplateExercise(ex, index));
            // resetTemplateEditor에서 이미 다 보이게 처리했으므로 별도 show 처리 불필요
        } else {
            // Mode 3: Creating a new routine template
            currentTemplateId = `template_${new Date().getTime()}`;
            elements.templateModalTitle.textContent = "새 루틴 만들기";
            // resetTemplateEditor에서 이미 다 보이게 처리했으므로 별도 show 처리 불필요
        }
        
        openModal(elements.templateEditorModal);
    };

    const renderTemplateExercise = (exercise, index) => {
        const item = document.createElement('div');
        item.className = 'template-exercise-item flex justify-between items-center p-3 bg-white rounded-md border shadow-sm';
        item.dataset.index = index;
        item.dataset.name = exercise.name;
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="cursor-grab text-gray-400">☰</span>
                <span class="font-semibold">${exercise.name}</span>
                <span class="text-gray-600">${exercise.weight}kg / ${exercise.reps}회 / ${exercise.sets}세트</span>
            </div>
            <div class="flex gap-2">
                <button class="edit-template-set-btn text-sm text-blue-600 hover:text-blue-800" data-index="${index}">수정</button>
                <button class="delete-template-set-btn text-sm text-red-600 hover:text-red-800" data-index="${index}">삭제</button>
            </div>
        `;
        elements.templateExerciseList.appendChild(item);
    };
    
    const refreshTemplateExerciseList = () => {
        const template = routineTemplates[currentTemplateId];
        if (!template) return;
        
        elements.templateExerciseList.innerHTML = '';
        template.exercises.forEach((ex, index) => renderTemplateExercise(ex, index));
    };

    const addOrUpdateExerciseInTemplate = () => {
        // Mode 1: Editing a single set from daily log
        if (currentEditingSet) {
            const { date, logIndex, setIndex } = currentEditingSet;
            const newWeight = parseFloat(elements.templateWeightInput.value) || 0;
            const newReps = parseInt(elements.templateRepsInput.value) || 0;
            
            if (!workoutLogs[date] || !workoutLogs[date][logIndex]) return;
            const log = workoutLogs[date][logIndex];
            const set = log.sets[setIndex];
            if (!set) return;

            set.weight = newWeight;
            set.reps = newReps;
            
            // Check for new PR
            const newPR = checkAndSetPR(log.name, newWeight, newReps);
            set.isPR = newPR.isNewPR;
            
            saveLogs();
            if (newPR.isNewPR) savePRs();
            
            renderDailyLog(date);
            closeModal(elements.templateEditorModal);
            
            if (newPR.isNewPR) {
                showPRCelebration([newPR.record]);
            }
            currentEditingSet = null;
            return;
        }
        
        // Mode 2/3: Editing a routine template
        const exerciseName = elements.exerciseListSelect.value;
        if (!exerciseName) {
            alert("운동을 선택하세요.");
            return;
        }

        const exercise = {
            name: exerciseName,
            weight: parseFloat(elements.templateWeightInput.value) || 0,
            reps: parseInt(elements.templateRepsInput.value) || 0,
            sets: parseInt(elements.templateSetsInput.value) || 1
        };

        if (!routineTemplates[currentTemplateId]) {
            routineTemplates[currentTemplateId] = { id: currentTemplateId, title: "", exercises: [] };
        }
        
        const template = routineTemplates[currentTemplateId];

        if (currentEditingTemplateSet !== null) {
            // Update existing exercise
            template.exercises[currentEditingTemplateSet] = exercise;
            currentEditingTemplateSet = null;
            elements.addUpdateExerciseBtn.textContent = "운동 추가";
        } else {
            // Add new exercise
            template.exercises.push(exercise);
        }
        
        refreshTemplateExerciseList();
        
        // Clear inputs
        elements.templateWeightInput.value = "";
        elements.templateRepsInput.value = "";
        elements.templateSetsInput.value = "";
    };

    const saveTemplate = () => {
        if (!currentTemplateId) return;

        const template = routineTemplates[currentTemplateId];
        
        if (!template || template.exercises.length === 0) {
            alert("운동을 1개 이상 추가해야 루틴을 저장할 수 있습니다.");
            return;
        }
        
        const title = elements.templateTitleInput.value.trim();
        template.title = title || `${formatDate(new Date().toISOString(), "MM/DD")} ${getPartForExercise(template.exercises[0].name)} 루틴`;
        
        saveTemplates();
        renderRoutineTemplates();
        closeModal(elements.templateEditorModal);
    };
    
    const handleTemplateListClick = (e) => {
        const index = e.target.dataset.index;
        if (index === undefined) return;

        const template = routineTemplates[currentTemplateId];
        if (!template) return;
        
        if (e.target.classList.contains('delete-template-set-btn')) {
            template.exercises.splice(index, 1);
            refreshTemplateExerciseList();
        }
        
        if (e.target.classList.contains('edit-template-set-btn')) {
            const exercise = template.exercises[index];
            if (!exercise) return;

            currentEditingTemplateSet = Number(index); // 숫자로 변환
            
            elements.exerciseCategorySelect.value = getPartForExercise(exercise.name);
            populateExerciseList(elements.exerciseListSelect, elements.exerciseCategorySelect.value);
            elements.exerciseListSelect.value = exercise.name;
            elements.templateWeightInput.value = exercise.weight;
            elements.templateRepsInput.value = exercise.reps;
            elements.templateSetsInput.value = exercise.sets;
            elements.addUpdateExerciseBtn.textContent = "운동 수정";
        }
    };

    // --- Routine Templates (Main Page) ---
    const renderRoutineTemplates = () => {
        elements.routineTemplateList.innerHTML = '';
        if (Object.keys(routineTemplates).length === 0) {
            elements.routineTemplateList.innerHTML = '<p class="text-gray-500 text-center">생성된 루틴이 없습니다.</p>';
            return;
        }

        Object.values(routineTemplates).forEach(template => {
            const parts = new Set(template.exercises.map(ex => getPartForExercise(ex.name)));
            const item = document.createElement('div');
            item.className = 'p-4 border rounded-lg shadow-sm bg-white hover:shadow-md transition';
            item.dataset.templateId = template.id;
            
            let partsHTML = '';
            parts.forEach(part => {
                partsHTML += `<span class="w-2 h-4 rounded-sm" style="background-color:${BODY_PART_COLORS[part] || BODY_PART_COLORS['기타']}"></span>`;
            });
            
            item.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-2">
                        <div class="flex gap-1 items-center">${partsHTML}</div>
                        <h4 class="font-bold text-lg truncate" style="max-width: 200px;">${template.title}</h4>
                    </div>
                    <button class="edit-template-btn text-sm text-gray-500 hover:text-blue-600" data-template-id="${template.id}">편집</button>
                </div>
                <div class="flex gap-2">
                    <button class="start-workout-btn w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md font-semibold transition">오늘 운동 시작</button>
                    <button class="delete-template-btn bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-md" data-template-id="${template.id}">🗑️</button>
                </div>
            `;
            elements.routineTemplateList.appendChild(item);
        });
    };
    
    const handleRoutineListClick = async (e) => {
        const templateId = e.target.closest('[data-template-id]')?.dataset.templateId;
        if (!templateId) return;

        if (e.target.classList.contains('edit-template-btn')) {
            e.stopPropagation();
            openTemplateEditor(templateId);
        }
        
        if (e.target.classList.contains('delete-template-btn')) {
            e.stopPropagation();
            const confirmed = await showCustomConfirm("이 루틴을 삭제하시겠습니까?\n(운동 기록은 삭제되지 않습니다.)");
            if (confirmed) {
                delete routineTemplates[templateId];
                saveTemplates();
                renderRoutineTemplates();
            }
        }
        
        if (e.target.classList.contains('start-workout-btn')) {
            e.stopPropagation();
            const dateStr = today.toISOString().split('T')[0];
            currentSessionDate = dateStr; // 세션 날짜를 '오늘'로 설정
            startWorkoutSession(dateStr, templateId);
        }
    };

    // --- Custom Exercise Management ---
    const populateExerciseSelectors = (categorySelect, listSelect) => {
        categorySelect.innerHTML = '<option value="">-- 부위 선택 --</option>';
        Object.keys(customExercises).forEach(part => {
            categorySelect.innerHTML += `<option value="${part}">${part}</option>`;
        });
        listSelect.innerHTML = '<option value="">-- 운동 선택 --</option>';
    };
    
    const populateExerciseList = (listSelect, part) => {
        listSelect.innerHTML = '<option value="">-- 운동 선택 --</option>';
        if (part && customExercises[part]) {
            customExercises[part].forEach(ex => {
                listSelect.innerHTML += `<option value="${ex.name}">${ex.name}</option>`;
            });
        }
    };
    
    const openAddExerciseModal = () => {
        elements.newExercisePart.innerHTML = '';
        Object.keys(customExercises).forEach(part => {
            elements.newExercisePart.innerHTML += `<option value="${part}">${part}</option>`;
        });
        elements.newExercisePart.innerHTML += '<option value="new-part">-- 새 부위 추가 --</option>';
        elements.newExerciseName.value = '';
        openModal(elements.addExerciseModal);
    };

    const saveNewExercise = () => {
        let part = elements.newExercisePart.value;
        const name = elements.newExerciseName.value.trim();

        if (!name) {
            alert("운동 이름을 입력하세요.");
            return;
        }

        if (part === 'new-part') {
            part = prompt("새로운 운동 부위 이름을 입력하세요:");
            if (!part) return; // Cancelled
            if (!customExercises[part]) {
                customExercises[part] = [];
            }
        }

        if (customExercises[part].some(ex => ex.name.toLowerCase() === name.toLowerCase())) {
            alert("이미 존재하는 운동 이름입니다.");
            return;
        }

        customExercises[part].push({ name, image: null });
        saveCustomExercises();
        
        // Refresh selectors in the modal that opened this one
        populateExerciseSelectors(elements.exerciseCategorySelect, elements.exerciseListSelect);
        elements.exerciseCategorySelect.value = part;
        populateExerciseList(elements.exerciseListSelect, part);
        elements.exerciseListSelect.value = name;
        
        populateExerciseSelectors(elements.sessionExCategorySelect, elements.sessionExListSelect);

        closeModal(elements.addExerciseModal);
    };

    // --- Workout Session ---
    const startWorkoutSession = (dateStr, templateId) => {
        // currentSessionDate = dateStr; // 이미 handleRoutineListClick에서 설정됨
        currentSessionTemplateId = templateId;
        const template = routineTemplates[templateId];
        if (!template) {
             console.error("Template not found:", templateId);
             return;
        }
        
        elements.workoutSessionTitle.textContent = template.title;
        renderWorkoutSessionList();
        openModal(elements.workoutSessionModal);
        
        // Reset and start total session timer
        stopTimer();
        timerSeconds = -1; // Will be 0 after first tick
        timerTotalSeconds = -1;
        timerRunning = true;
        updateTimerDisplay(0, false); // Show 00:00
        
        timerInterval = setInterval(() => {
            timerSeconds++;
            timerTotalSeconds++;
            updateTimerDisplay(timerSeconds, false);
        }, 1000);
    };
    
    const renderWorkoutSessionList = () => {
        const template = routineTemplates[currentSessionTemplateId];
        if (!template) return; // 템플릿이 없는 경우 방어
        
        elements.workoutSessionList.innerHTML = '';
        
        template.exercises.forEach((exercise, exIndex) => {
            const part = getPartForExercise(exercise.name);
            const group = document.createElement('div');
            group.className = 'exercise-group p-4 border rounded-lg shadow-sm bg-white';
            
            let setsHTML = '';
            for (let i = 0; i < exercise.sets; i++) {
                setsHTML += `
                    <div class="set-item grid grid-cols-5 gap-2 items-center p-2 bg-gray-100 rounded-md">
                        <span class="font-semibold">${i + 1}세트</span>
                        <input type="number" class="session-weight-input w-full p-1.5 border rounded-md" value="${exercise.weight}" data-ex-index="${exIndex}" data-set-index="${i}" step="0.5">
                        <input type="number" class="session-reps-input w-full p-1.5 border rounded-md" value="${exercise.reps}" data-ex-index="${exIndex}" data-set-index="${i}">
                        <button class="set-complete-btn w-full bg-gray-300 hover:bg-green-500 hover:text-white p-2 rounded-md transition" data-ex-index="${exIndex}" data-set-index="${i}">완료</button>
                        <button class="set-note-btn text-2xl text-gray-400 hover:text-blue-500" data-ex-index="${exIndex}" data-set-index="${i}">✎</button>
                    </div>
                `;
            }
            
            group.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-6 rounded" style="background-color:${BODY_PART_COLORS[part] || BODY_PART_COLORS['기타']}"></span>
                        <h4 class="font-bold text-lg">${exercise.name}</h4>
                    </div>
                    <button class="small-btn delete-btn delete-ex-from-session-btn" data-ex-index="${exIndex}">삭제</button>
                </div>
                <div class="sets-list space-y-2">${setsHTML}</div>
            `;
            elements.workoutSessionList.appendChild(group);
        });
    };
    
    const handleSessionListClick = async (e) => {
        const { exIndex, setIndex } = e.target.dataset;
        if (exIndex === undefined) return; // exIndex만 있어도 삭제는 가능
        
        const template = routineTemplates[currentSessionTemplateId];
        if (!template) return;

        if (e.target.classList.contains('set-complete-btn')) {
            if (setIndex === undefined) return;
            e.target.disabled = true;
            e.target.textContent = "✓";
            e.target.classList.remove('bg-gray-300', 'hover:bg-green-500');
            e.target.classList.add('bg-green-600', 'text-white');
            e.target.closest('.set-item').classList.remove('bg-gray-100');
            e.target.closest('.set-item').classList.add('bg-green-50');
            
            startRestTimer();
        }
        
        if (e.target.classList.contains('delete-ex-from-session-btn')) {
            template.exercises.splice(exIndex, 1);
            renderWorkoutSessionList();
        }
        
        if (e.target.classList.contains('set-note-btn')) {
            if (setIndex === undefined) return;
            const note = prompt("세트 메모:", e.target.dataset.note || "");
            if (note !== null) {
                e.target.dataset.note = note;
                e.target.classList.add('text-blue-500'); // Mark as having note
            }
        }
    };
    
    const saveWorkoutSession = async () => {
        const confirmed = await showCustomConfirm("운동을 완료하고 저장하시겠습니까?");
        if (!confirmed) return;

        stopTimer(true); // Stop and reset timers
        
        const template = routineTemplates[currentSessionTemplateId];
        if (!template) return;

        const newPRs = [];

        template.exercises.forEach((exercise, exIndex) => {
            const logEntry = {
                name: exercise.name,
                sets: []
            };

            const setElements = elements.workoutSessionList.querySelectorAll(`[data-ex-index="${exIndex}"].set-complete-btn`);
            
            setElements.forEach((btn) => { // setIndex가 필요 없음
                if (btn.disabled) { // Only save completed sets
                    const setItem = btn.closest('.set-item');
                    if (!setItem) return;

                    const weightInput = setItem.querySelector('.session-weight-input');
                    const repsInput = setItem.querySelector('.session-reps-input');
                    const noteBtn = setItem.querySelector('.set-note-btn');
                    
                    if (!weightInput || !repsInput) return;

                    const weight = parseFloat(weightInput.value) || 0;
                    const reps = parseInt(repsInput.value) || 0;
                    
                    // Check for PR
                    const prResult = checkAndSetPR(exercise.name, weight, reps);
                    if (prResult.isNewPR) {
                        newPRs.push(prResult.record);
                    }
                    
                    logEntry.sets.push({
                        weight: weight,
                        reps: reps,
                        done: true,
                        isPR: prResult.isNewPR,
                        note: noteBtn ? (noteBtn.dataset.note || "") : "" // noteBtn이 없을 경우 대비
                    });
                }
            });

            if (logEntry.sets.length > 0) {
                if (!workoutLogs[currentSessionDate]) {
                    workoutLogs[currentSessionDate] = [];
                }
                workoutLogs[currentSessionDate].push(logEntry);
            }
        });

        saveLogs();
        if (newPRs.length > 0) savePRs();
        
        renderCalendar(currentYear, currentMonth);
        renderRoutineTemplates(); // In case template was modified
        closeModal(elements.workoutSessionModal);
        
        showSummaryModal(newPRs);
    };

    // --- PR Management ---
    const checkAndSetPR = (exerciseName, weight, reps) => {
        const oneRM = estimate1RM(weight, reps);
        if (oneRM === 0) return { isNewPR: false }; // Not a valid PR

        if (!prRecords[exerciseName] || oneRM > prRecords[exerciseName].oneRM) {
            const record = {
                name: exerciseName,
                oneRM: oneRM,
                weight: weight,
                reps: reps,
                date: currentSessionDate
            };
            prRecords[exerciseName] = record;
            return { isNewPR: true, record: record };
        }
        return { isNewPR: false };
    };

    const showPRCelebration = (prList) => {
        elements.prList.innerHTML = '';
        prList.forEach(pr => {
            elements.prList.innerHTML += `
                <div class="p-2 bg-yellow-50 rounded-md">
                    <span class="font-bold">${pr.name}</span>: ${pr.weight}kg x ${pr.reps}회 (1RM: ${pr.oneRM}kg)
                </div>
            `;
        });
        openModal(elements.prCelebrationModal);
    };
    
    // --- Summary Modal ---
    const showSummaryModal = (newPRs) => {
        let html = `
            <p class="text-lg">총 운동 시간: ${formatTimer(timerTotalSeconds)}</p>
            <hr class="my-2">
            <h4 class="font-bold text-xl mb-2">저장된 운동</h4>
        `;
        
        const logs = workoutLogs[currentSessionDate] || [];
        if (logs.length === 0) {
             html += `<p>저장된 운동이 없습니다.</p>`;
        } else {
            logs.forEach(log => {
                html += `<p><span class="font-semibold">${log.name}</span>: ${log.sets.length} 세트</p>`;
            });
        }
        
        if (newPRs.length > 0) {
            html += '<hr class="my-3"><h4 class="font-bold text-xl mb-2 text-yellow-500">🎉 새로운 PR 달성!</h4>';
            newPRs.forEach(pr => {
                html += `<p><span class="font-semibold">${pr.name}</span>: ${pr.weight}kg x ${pr.reps}회 (1RM: ${pr.oneRM}kg)</p>`;
            });
        }
        
        elements.summaryContent.innerHTML = html;
        openModal(elements.summaryModal);
    };

    // --- Add Exercise to Session (Modal) ---
    const openAddToSessionModal = () => {
        populateExerciseSelectors(elements.sessionExCategorySelect, elements.sessionExListSelect);
        elements.sessionWeightInput.value = '';
        elements.sessionRepsInput.value = '';
        elements.sessionSetsInput.value = '1';
        openModal(elements.addToSessionModal);
    };

    const addExerciseToSession = () => {
        const exerciseName = elements.sessionExListSelect.value;
        if (!exerciseName) {
            alert("운동을 선택하세요.");
            return;
        }
        
        const exercise = {
            name: exerciseName,
            weight: parseFloat(elements.sessionWeightInput.value) || 0,
            reps: parseInt(elements.sessionRepsInput.value) || 0,
            sets: parseInt(elements.sessionSetsInput.value) || 1
        };
        
        const template = routineTemplates[currentSessionTemplateId];
        if (!template) return; // 방어 코드
        
        template.exercises.push(exercise);
        
        renderWorkoutSessionList();
        closeModal(elements.addToSessionModal);
    };

    // --- Stats Modal ---
    const openStatsModal = () => {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        elements.statsStartDate.value = startDate;
        elements.statsEndDate.value = endDate;
        
        elements.statsPartSelector.innerHTML = '';
        Object.keys(BODY_PART_COLORS).forEach(part => {
            elements.statsPartSelector.innerHTML += `
                <button class="stats-part-btn p-2 border rounded-md" data-part="${part}">
                    <span class="w-3 h-3 rounded-full inline-block" style="background-color:${BODY_PART_COLORS[part]}"></span>
                    ${part}
                </button>
            `;
        });
        
        elements.statsExerciseSelect.innerHTML = '<option value="">-- 부위 먼저 선택 --</option>';
        openModal(elements.statsModal);
        renderStatsChart();
    };

    const renderStatsChart = (part = null, exercise = null) => {
        const startDate = elements.statsStartDate.value;
        const endDate = elements.statsEndDate.value;
        
        let labels = [];
        let data = [];
        const filteredLogs = {};
        
        // Filter logs by date
        Object.keys(workoutLogs).forEach(date => {
            if (date >= startDate && date <= endDate) {
                filteredLogs[date] = workoutLogs[date];
            }
        });

        // [수정] 치명적인 오타 수정: `const-` -> `for (const date...`
        // Collate data
        for (const date in filteredLogs) {
            const logs = filteredLogs[date];
            let dailyTotalVolume = 0;
            
            logs.forEach(log => {
                let include = false;
                if (!part) { // No part selected, sum all
                    include = true;
                } else if (getPartForExercise(log.name) === part) {
                    if (!exercise) { // Part selected, no exercise
                        include = true;
                    } else if (log.name === exercise) { // Part and exercise selected
                        include = true;
                    }
                }

                if (include) {
                    log.sets.forEach(set => {
                        if (set.done) {
                            dailyTotalVolume += (set.weight * set.reps);
                        }
                    });
                }
            });
            
            if (dailyTotalVolume > 0) {
                labels.push(date);
                data.push(dailyTotalVolume);
            }
        }; // [수정] 오타 수정된 부분
        
        // 날짜순 정렬
        if (labels.length > 0) {
             let combined = labels.map((label, index) => ({ label, value: data[index] }));
             combined.sort((a, b) => new Date(a.label) - new Date(b.label));
             labels = combined.map(item => item.label);
             data = combined.map(item => item.value);
         }

        if (statsChart) {
            statsChart.destroy();
        }
        
        let title = "전체 운동 볼륨 (kg)";
        if (part && exercise) title = `${exercise} 1RM (추정치)`;
        else if (part) title = `${part} 운동 볼륨 (kg)`;

        // 1RM 차트 로직
        if(part && exercise){
            let oneRMData = [];
            let oneRMLabels = [];
             Object.keys(filteredLogs).forEach(date => {
                const logs = filteredLogs[date];
                logs.forEach(log => {
                    if(log.name === exercise){
                        log.sets.forEach(set => {
                            if(set.done){
                                const rm = estimate1RM(set.weight, set.reps);
                                if (rm > 0) { // 유효한 1RM만
                                    oneRMLabels.push(date);
                                    oneRMData.push(rm);
                                }
                            }
                        });
                    }
                });
            });
            
            if (oneRMLabels.length > 0) {
                 let combined = oneRMLabels.map((label, index) => ({ label, value: oneRMData[index] }));
                 combined.sort((a, b) => new Date(a.label) - new Date(b.label));
                 labels = combined.map(item => item.label);
                 data = combined.map(item => item.value);
             } else {
                 labels = oneRMLabels;
                 data = oneRMData;
             }
        }

        statsChart = new Chart(elements.statsChartCanvas, {
            type: 'line',
            data: { labels, datasets: [{ label: title, data, fill: false, borderColor: '#3B82F6', tension: 0.1 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: { display: false },
                    legend: { display: true },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.parsed.y} kg`
                        }
                    }
                },
                scales: { 
                    y: { beginAtZero: true },
                    x: { ticks: { maxRotation: 0, minRotation: 0, autoSkip: true, maxTicksLimit: 7 } } // X축 레이블 겹침 방지
                } 
            },
            plugins: [ChartDataLabels]
        });
    };
    
    const handleStatsPartClick = (e) => {
        const partBtn = e.target.closest('.stats-part-btn');
        if (!partBtn) return;
        
        const part = partBtn.dataset.part;
        
        // Toggle active
        document.querySelectorAll('.stats-part-btn.bg-blue-100').forEach(btn => btn.classList.remove('bg-blue-100'));
        partBtn.classList.add('bg-blue-100');
        
        // Populate exercises
        elements.statsExerciseSelect.innerHTML = '<option value="">-- 전체 --</option>';
        if (customExercises[part]) {
            customExercises[part].forEach(ex => {
                elements.statsExerciseSelect.innerHTML += `<option value="${ex.name}">${ex.name}</option>`;
            });
        }
        
        renderStatsChart(part);
    };
    
    // --- Timer ---
    const formatTimer = (totalSeconds) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    const updateTimerDisplay = (seconds, isRestTimer) => {
        elements.timerDigitalDisplay.textContent = formatTimer(seconds);
        
        let angle = (seconds % 60) * 6;
        if(elements.clockSecondHand) { // 방어 코드
            elements.clockSecondHand.style.transform = `translateX(-50%) rotate(${angle}deg)`;
        }
        
        if (isRestTimer && timerTotalSeconds > 0) {
            const progress = Math.max(0, (timerTotalSeconds - seconds) / timerTotalSeconds); // 0~1
            const dashoffset = floatingTimerCircumference * (1 - progress);
            elements.floatingTimerProgress.style.strokeDashoffset = dashoffset;
            elements.floatingTimerDisplay.textContent = formatTimer(seconds);
        } else {
             elements.floatingTimerDisplay.textContent = formatTimer(timerTotalSeconds);
        }
    };
    
    const startRestTimer = () => {
        stopTimer();
        timerRunning = true;
        timerSeconds = parseInt(elements.timerInput.value) || 60;
        timerTotalSeconds = timerSeconds;
        
        updateTimerDisplay(timerSeconds, true);
        
        elements.floatingTimer.style.display = 'flex';
        elements.floatingTimerProgress.style.strokeDashoffset = floatingTimerCircumference; // 0%에서 시작
        
        setTimeout(() => { // 부드러운 시작을 위해
             elements.floatingTimerProgress.style.strokeDashoffset = 0;
        }, 100);

        timerInterval = setInterval(() => {
            timerSeconds--;
            updateTimerDisplay(timerSeconds, true);
            
            if (timerSeconds <= 0) {
                stopTimer();
                playTimerSound();
                closeFloatingTimer();
            }
        }, 1000);
    };
    
    const stopTimer = (resetSessionTimer = false) => {
        clearInterval(timerInterval);
        timerInterval = null;
        timerRunning = false;
        if (resetSessionTimer) {
            timerTotalSeconds = 0;
            timerSeconds = 0;
        }
    };
    
    const closeFloatingTimer = () => {
        stopTimer();
        elements.floatingTimer.style.display = 'none';
    };
    
    const adjustTimer = (seconds) => {
        const currentVal = parseInt(elements.timerInput.value) || 0;
        let newVal = currentVal + seconds;
        if (newVal < 0) newVal = 0;
        elements.timerInput.value = newVal;
        
        if (timerRunning && timerSeconds > 0) { // 휴식 타이머가 돌고 있을 때
            timerSeconds += seconds;
            if (timerSeconds < 0) timerSeconds = 0;
            // [수정] 타이머 시간 변경 시 총 시간도 업데이트
            timerTotalSeconds = timerSeconds; 
            updateTimerDisplay(timerSeconds, true);
        }
    };

    const playTimerSound = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
            oscillator.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.warn("Audio context error:", e);
        }
    };
    
    // --- Draggable Timer ---
    const initDraggableTimer = () => {
        if (!elements.floatingTimerProgress) return; // 방어 코드

        floatingTimerRadius = elements.floatingTimerProgress.r.baseVal.value;
        floatingTimerCircumference = floatingTimerRadius * 2 * Math.PI;
        elements.floatingTimerProgress.style.strokeDasharray = `${floatingTimerCircumference} ${floatingTimerCircumference}`;
        elements.floatingTimerProgress.style.strokeDashoffset = floatingTimerCircumference; // 0%
        
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        const dragMouseDown = (e) => {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        };

        const elementDrag = (e) => {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            elements.floatingTimer.style.top = (elements.floatingTimer.offsetTop - pos2) + "px";
            elements.floatingTimer.style.left = (elements.floatingTimer.offsetLeft - pos1) + "px";
        };

        const closeDragElement = () => {
            document.onmouseup = null;
            document.onmousemove = null;
        };
        
        elements.floatingTimer.onmousedown = dragMouseDown;
    };

    // --- Initialization ---
    const init = () => {
        loadData();
        renderCalendar(currentYear, currentMonth);
        renderRoutineTemplates();
        initDraggableTimer();
        initEventListeners();
    };
    
    const initEventListeners = () => {
        elements.backBtn.addEventListener('click', () => {
            // "index.html"이 없을 수 있으므로, 단순 뒤로가기
            if (confirm("메인 페이지로 돌아가시겠습니까?")) {
                 history.back();
            }
        });
        
        elements.prevMonthBtn.addEventListener('click', () => changeMonth(-1));
        elements.nextMonthBtn.addEventListener('click', () => changeMonth(1));
        elements.todayBtn.addEventListener('click', () => {
            today = new Date();
            today.setHours(0,0,0,0);
            jumpToDate(today);
        });
        elements.dateSearchBtn.addEventListener('click', () => {
            try {
                elements.dateSearchInput.showPicker();
            } catch(e) {
                console.warn("showPicker() not supported.", e);
                elements.dateSearchInput.click(); // fallback
            }
        });
        elements.dateSearchInput.addEventListener('change', (e) => {
             if(e.target.value) { // 날짜 선택 시
                jumpToDate(new Date(e.target.value));
             }
        });
        
        elements.dailyLogModalList.addEventListener('click', handleDailyLogClick);
        
        elements.createNewTemplateBtn.addEventListener('click', () => openTemplateEditor());
        elements.routineTemplateList.addEventListener('click', handleRoutineListClick);
        
        elements.exerciseCategorySelect.addEventListener('change', (e) => populateExerciseList(elements.exerciseListSelect, e.target.value));
        elements.addUpdateExerciseBtn.addEventListener('click', addOrUpdateExerciseInTemplate);
        elements.saveTemplateBtn.addEventListener('click', saveTemplate);
        elements.templateExerciseList.addEventListener('click', handleTemplateListClick);
        
        if (elements.templateExerciseList) {
            new Sortable(elements.templateExerciseList, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const template = routineTemplates[currentTemplateId];
                    if (template) {
                        const item = template.exercises.splice(evt.oldIndex, 1)[0];
                        template.exercises.splice(evt.newIndex, 0, item);
                        refreshTemplateExerciseList(); // Re-render to fix indices
                    }
                }
            });
        }
        
        elements.openAddExerciseModalBtn.addEventListener('click', openAddExerciseModal);
        elements.saveNewExerciseBtn.addEventListener('click', saveNewExercise);
        elements.cancelAddExerciseBtn.addEventListener('click', () => closeModal(elements.addExerciseModal));

        elements.openStatsModalBtn.addEventListener('click', openStatsModal);
        elements.statsPartSelector.addEventListener('click', handleStatsPartClick);
        elements.statsExerciseSelect.addEventListener('change', (e) => {
            const part = document.querySelector('.stats-part-btn.bg-blue-100')?.dataset.part;
            renderStatsChart(part, e.target.value || null);
        });
        [elements.statsStartDate, elements.statsEndDate].forEach(el => {
            el.addEventListener('change', () => {
                const part = document.querySelector('.stats-part-btn.bg-blue-100')?.dataset.part;
                const ex = elements.statsExerciseSelect.value || null;
                renderStatsChart(part, ex);
            });
        });
        elements.statsResetBtn.addEventListener('click', () => {
            elements.statsStartDate.value = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            elements.statsEndDate.value = today.toISOString().split('T')[0];
            elements.statsExerciseSelect.innerHTML = '<option value="">-- 부위 먼저 선택 --</option>';
            document.querySelectorAll('.stats-part-btn.bg-blue-100').forEach(btn => btn.classList.remove('bg-blue-100'));
            renderStatsChart();
        });

        elements.confirmOkBtn.addEventListener('click', () => {
            if (confirmResolve) confirmResolve(true);
            closeModal(elements.confirmModal);
        });
        elements.confirmCancelBtn.addEventListener('click', () => {
            if (confirmResolve) confirmResolve(false);
            closeModal(elements.confirmModal);
        });

        elements.saveSessionBtn.addEventListener('click', saveWorkoutSession);
        elements.hideSessionBtn.addEventListener('click', async () => {
            const confirmed = await showCustomConfirm("운동 세션을 중단하고 숨기시겠습니까?\n(진행 상황이 저장되지 않습니다.)");
            if (confirmed) {
                stopTimer(true);
                closeFloatingTimer();
                closeModal(elements.workoutSessionModal);
            }
        });
        
        elements.addExerciseToSessionBtn.addEventListener('click', openAddToSessionModal);
        elements.workoutSessionList.addEventListener('click', handleSessionListClick);
        elements.sessionExCategorySelect.addEventListener('change', (e) => populateExerciseList(elements.sessionExListSelect, e.target.value));
        elements.saveToSessionBtn.addEventListener('click', addExerciseToSession);
        
        elements.closeSummaryBtn.addEventListener('click', () => closeModal(elements.summaryModal));

        elements.timerMinus10.addEventListener('click', () => adjustTimer(-10));
        elements.timerPlus10.addEventListener('click', () => adjustTimer(10));
        elements.timerMinus30.addEventListener('click', () => adjustTimer(-30));
        elements.timerPlus30.addEventListener('click', () => adjustTimer(30));
        elements.closeFloatingTimer.addEventListener('click', (e) => {
            e.stopPropagation();
            closeFloatingTimer();
        });

        // [수정 2] 모든 모달 리스너가 `.modal-overlay`를 사용하도록 수정
        // [수정 2-1] 닫기 버튼(X) 리스너
        elements.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay'); // <--- '.modal'을 '.modal-overlay'로 수정
                if (modal) {
                    if (modal.id === 'workout-session-modal') {
                        elements.hideSessionBtn.click();
                    } else if (modal.id === 'template-editor-modal') {
                        closeModal(modal);
                    } else {
                        closeModal(modal);
                    }
                }
            });
        });
        
        elements.closePrModal.addEventListener('click', () => closeModal(elements.prCelebrationModal));

        // [수정 2-2] 모달 바깥 영역 클릭 리스너
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) { // <--- '.modal'을 '.modal-overlay'로 수정
                const modal = e.target;
                 if (modal.id === 'workout-session-modal') {
                    elements.hideSessionBtn.click();
                 } else if (modal.id !== 'custom-confirm-modal') {
                    closeModal(modal);
                 }
            }
        });

        // [수정 2-3] 'Esc' 키보드 리스너
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay').forEach(closeModal); // <--- '.modal'을 '.modal-overlay'로 수정
            }
        });
        
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', e => e.preventDefault());
        });
        
        // iOS 확대 방지를 위해 16px 이상으로 설정
        document.querySelectorAll('input, textarea, select').forEach(el => {
            if (el.type !== 'checkbox' && el.type !== 'radio') {
                 el.style.fontSize = '16px';
            }
        });

    };

    init();
});