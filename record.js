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
        sessionTotalTimerDisplay: document.getElementById('session-total-timer-display'),
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
    let selectedDateStr = null;
    let currentSessionTemplateId = null;
    let statsChart = null;
    let confirmResolve = null;

    let sessionTimerInterval = null; 
    let sessionTotalSeconds = 0;
    let restTimerInterval = null;    
    let restTimerSeconds = 0;
    let restTimerTotalSeconds = 0;
    let restTimerRunning = false;
    
    let floatingTimerRadius = 0;
    let floatingTimerCircumference = 0;
    
    let calendarClickTimer = null;
    let calendarClickCount = 0;

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
        if (reps > 10 || reps <= 0) return 0;
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
            dayElement.dataset.date = dateStr;

            dayElement.innerHTML = `<span class="day-number">${day}</span>`;
            
            const isFuture = date > today;
            
            if (isFuture) {
                dayElement.classList.add('future-day');
            } else {
                if (date.getTime() === today.getTime()) {
                    dayElement.classList.add('today');
                }
                
                if (dateStr === selectedDateStr) {
                    dayElement.classList.add('selected-day');
                }

                // [수정] 점 대신 총 볼륨 표시
                const dayLogs = workoutLogs[dateStr] || [];
                let dailyTotalVolume = 0;
                
                dayLogs.forEach(log => {
                    log.sets.forEach(set => {
                        if (set.done) {
                            dailyTotalVolume += (set.weight * set.reps);
                        }
                    });
                });

                if (dailyTotalVolume > 0) {
                    const volumeText = document.createElement('div');
                    volumeText.className = 'daily-volume-text';
                    volumeText.textContent = `${dailyTotalVolume.toLocaleString()}kg`;
                    dayElement.appendChild(volumeText);
                }
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
                    <div class="set-item-legacy grid grid-cols-5 gap-2 items-center p-2 rounded-md ${set.done ? 'bg-green-50 text-green-800' : 'bg-gray-100'}">
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
        if (logIndex === undefined) return;

        if (!workoutLogs[currentSessionDate]) {
             console.error("No logs for current date:", currentSessionDate);
             return;
        }

        if (e.target.classList.contains('set-done-check')) {
            if (setIndex === undefined) return;
            const log = workoutLogs[currentSessionDate][logIndex];
            if (!log) return;
            
            const set = log.sets[setIndex];
            if (!set) return;

            set.done = e.target.checked;
            saveLogs();
            renderDailyLog(currentSessionDate);
            renderCalendar(currentYear, currentMonth);
        }
        
        if (e.target.classList.contains('edit-set-btn')) {
            if (setIndex === undefined) return;
            const log = workoutLogs[currentSessionDate][logIndex];
            if (!log) return;
            const set = log.sets[setIndex];
            if (!set) return;

            currentEditingSet = { date: currentSessionDate, logIndex, setIndex };
            openTemplateEditor(null, set);
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
        resetTemplateEditor();
        populateExerciseSelectors(elements.exerciseCategorySelect, elements.exerciseListSelect);

        if (setToEdit) {
            const { name, weight, reps } = setToEdit;
            currentEditingSet = { ...setToEdit, ...currentEditingSet };
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
            elements.saveTemplateBtn.style.display = 'none';
            elements.templateExerciseList.style.display = 'none';
            const heading = document.querySelector('#template-editor-modal h4[class="font-bold mb-2"]');
            if (heading) {
                heading.style.display = 'none';
            }
        } else if (templateId) {
            currentTemplateId = templateId;
            const template = routineTemplates[templateId];
            if (!template) return;
            elements.templateModalTitle.textContent = "루틴 수정";
            elements.templateTitleInput.value = template.title;
            template.exercises.forEach((ex, index) => renderTemplateExercise(ex, index));
        } else {
            currentTemplateId = `template_${new Date().getTime()}`;
            elements.templateModalTitle.textContent = "새 루틴 만들기";
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
            
            const newPR = checkAndSetPR(log.name, newWeight, newReps, date);
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
            template.exercises[currentEditingTemplateSet] = exercise;
            currentEditingTemplateSet = null;
            elements.addUpdateExerciseBtn.textContent = "운동 추가";
        } else {
            template.exercises.push(exercise);
        }
        
        refreshTemplateExerciseList();
        
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
        
        if (title) {
            template.title = title;
        } else {
            const parts = new Set(template.exercises.map(ex => getPartForExercise(ex.name)));
            template.title = Array.from(parts).join(', '); 
        }
        
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

            currentEditingTemplateSet = Number(index);
            
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
                    <button class="start-workout-btn w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md font-semibold transition">루틴 시작</button>
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
            if (!selectedDateStr) {
                selectedDateStr = today.toISOString().split('T')[0];
            }
            currentSessionDate = selectedDateStr;
            startWorkoutSession(currentSessionDate, templateId);
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
            if (!part) return;
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
        
        populateExerciseSelectors(elements.exerciseCategorySelect, elements.exerciseListSelect);
        elements.exerciseCategorySelect.value = part;
        populateExerciseList(elements.exerciseListSelect, part);
        elements.exerciseListSelect.value = name;
        
        populateExerciseSelectors(elements.sessionExCategorySelect, elements.sessionExListSelect);

        closeModal(elements.addExerciseModal);
    };

    // --- Workout Session ---
    const startWorkoutSession = (dateStr, templateId) => {
        currentSessionTemplateId = templateId;
        const template = routineTemplates[templateId];
        if (!template) {
             console.error("Template not found:", templateId);
             return;
        }
        
        elements.workoutSessionTitle.textContent = template.title;
        renderWorkoutSessionList();
        openModal(elements.workoutSessionModal);
        
        stopSessionTimer();
        stopRestTimer();
        sessionTotalSeconds = 0;
        elements.sessionTotalTimerDisplay.textContent = formatTimerWithHours(0);
        elements.timerDigitalDisplay.textContent = formatTimer(0);
        
        sessionTimerInterval = setInterval(() => {
            sessionTotalSeconds++;
            elements.sessionTotalTimerDisplay.textContent = formatTimerWithHours(sessionTotalSeconds);
            updateFloatingTimerDisplay();
        }, 1000);
    };
    
    const renderWorkoutSessionList = () => {
        const template = routineTemplates[currentSessionTemplateId];
        if (!template) return;
        
        elements.workoutSessionList.innerHTML = '';
        
        template.exercises.forEach((exercise, exIndex) => {
            const part = getPartForExercise(exercise.name);
            const group = document.createElement('div');
            group.className = 'exercise-group p-4 border rounded-lg shadow-sm bg-white';
            
            let setsHTML = '';
            for (let i = 0; i < exercise.sets; i++) {
                setsHTML += `
                    <div class="set-item" data-ex-index="${exIndex}" data-set-index="${i}">
                        <div class="set-item-inputs">
                            <span>${i + 1}세트</span>
                            <input type="number" class="session-weight-input" value="${exercise.weight}" step="0.5">
                            <input type="number" class="session-reps-input" value="${exercise.reps}">
                        </div>
                        <div class="set-item-actions">
                            <button class="set-note-btn" title="메모">✎</button>
                            <button class="set-complete-btn" title="완료">완료</button>
                        </div>
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
        const setItem = e.target.closest('.set-item');
        const exGroup = e.target.closest('.exercise-group');
        
        if (e.target.classList.contains('delete-ex-from-session-btn')) {
            const { exIndex } = e.target.dataset;
            if (exIndex === undefined) return;
            const template = routineTemplates[currentSessionTemplateId];
            if (!template) return;
            template.exercises.splice(exIndex, 1);
            renderWorkoutSessionList();
            return;
        }

        if (!setItem) return;
        
        const { exIndex, setIndex } = setItem.dataset;
        if (exIndex === undefined || setIndex === undefined) return;

        if (e.target.classList.contains('set-complete-btn')) {
            e.target.disabled = true;
            e.target.textContent = "✓";
            setItem.classList.add('completed');
            
            startRestTimer();
        }
        
        if (e.target.classList.contains('set-note-btn')) {
            const note = prompt("세트 메모:", e.target.dataset.note || "");
            if (note !== null) {
                e.target.dataset.note = note;
                e.target.classList.add('text-blue-500');
            }
        }
    };
    
    const saveWorkoutSession = async () => {
        const confirmed = await showCustomConfirm("운동을 완료하고 저장하시겠습니까?");
        if (!confirmed) return;

        stopSessionTimer();
        stopRestTimer();
        closeFloatingTimer(false);
        
        const template = routineTemplates[currentSessionTemplateId];
        if (!template) return;

        const newPRs = [];

        template.exercises.forEach((exercise, exIndex) => {
            const logEntry = {
                name: exercise.name,
                sets: []
            };

            const setElements = elements.workoutSessionList.querySelectorAll(`[data-ex-index="${exIndex}"].set-item`);
            
            setElements.forEach((setItem) => {
                const completeBtn = setItem.querySelector('.set-complete-btn');
                if (completeBtn && completeBtn.disabled) {
                    const weightInput = setItem.querySelector('.session-weight-input');
                    const repsInput = setItem.querySelector('.session-reps-input');
                    const noteBtn = setItem.querySelector('.set-note-btn');
                    
                    if (!weightInput || !repsInput) return;

                    const weight = parseFloat(weightInput.value) || 0;
                    const reps = parseInt(repsInput.value) || 0;
                    
                    const prResult = checkAndSetPR(exercise.name, weight, reps, currentSessionDate);
                    if (prResult.isNewPR) {
                        newPRs.push(prResult.record);
                    }
                    
                    logEntry.sets.push({
                        weight: weight,
                        reps: reps,
                        done: true,
                        isPR: prResult.isNewPR,
                        note: noteBtn ? (noteBtn.dataset.note || "") : ""
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
        renderRoutineTemplates();
        closeModal(elements.workoutSessionModal);
        
        showSummaryModal(newPRs);
        
        sessionTotalSeconds = 0;
    };

    // --- PR Management ---
    const checkAndSetPR = (exerciseName, weight, reps, date) => {
        const oneRM = estimate1RM(weight, reps);
        if (oneRM === 0) return { isNewPR: false };

        if (!prRecords[exerciseName] || oneRM > prRecords[exerciseName].oneRM) {
            const record = {
                name: exerciseName,
                oneRM: oneRM,
                weight: weight,
                reps: reps,
                date: date
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
            <p class="text-lg">총 운동 시간: ${formatTimerWithHours(sessionTotalSeconds)}</p>
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
        if (!template) return;
        
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
        
        Object.keys(workoutLogs).forEach(date => {
            if (date >= startDate && date <= endDate) {
                filteredLogs[date] = workoutLogs[date];
            }
        });

        for (const date in filteredLogs) {
            const logs = filteredLogs[date];
            let dailyTotalVolume = 0;
            
            logs.forEach(log => {
                let include = false;
                if (!part) {
                    include = true;
                } else if (getPartForExercise(log.name) === part) {
                    if (!exercise) {
                        include = true;
                    } else if (log.name === exercise) {
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
        };
        
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
                                if (rm > 0) {
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

        // [수정] 그래프 타입을 'bar'로 변경
        statsChart = new Chart(elements.statsChartCanvas, {
            type: 'bar',
            data: { labels, datasets: [{ label: title, data, backgroundColor: '#3B82F6' }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: { display: false },
                    legend: { display: true },
                    tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y} kg` } }
                },
                scales: { 
                    y: { beginAtZero: true },
                    x: { ticks: { maxRotation: 0, minRotation: 0, autoSkip: true, maxTicksLimit: 7 } }
                } 
            },
            plugins: [ChartDataLabels]
        });
    };
    
    const handleStatsPartClick = (e) => {
        const partBtn = e.target.closest('.stats-part-btn');
        if (!partBtn) return;
        
        const part = partBtn.dataset.part;
        
        document.querySelectorAll('.stats-part-btn.bg-blue-100').forEach(btn => btn.classList.remove('bg-blue-100'));
        partBtn.classList.add('bg-blue-100');
        
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
    
    const formatTimerWithHours = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    const updateRestTimerDisplay = (seconds) => {
        elements.timerDigitalDisplay.textContent = formatTimer(seconds);
        
        // [수정] 시계방향(CW)으로 돌도록 각도 계산 수정
        let angle = (restTimerTotalSeconds - seconds) * 6;
        if(elements.clockSecondHand) {
            elements.clockSecondHand.style.transform = `translateX(-50%) rotate(${angle}deg)`;
        }
    };
    
    const updateFloatingTimerDisplay = () => {
        if (restTimerRunning) {
            const progress = Math.max(0, (restTimerTotalSeconds - restTimerSeconds) / restTimerTotalSeconds);
            const dashoffset = floatingTimerCircumference * (1 - progress);
            elements.floatingTimerProgress.style.strokeDashoffset = dashoffset;
            elements.floatingTimerDisplay.textContent = formatTimer(restTimerSeconds);
        } else {
            elements.floatingTimerProgress.style.strokeDashoffset = 0;
            elements.floatingTimerDisplay.textContent = formatTimer(sessionTotalSeconds);
        }
    };
    
    const startRestTimer = () => {
        stopSessionTimer();
        stopRestTimer();
        
        restTimerRunning = true;
        restTimerSeconds = parseInt(elements.timerInput.value) || 60;
        restTimerTotalSeconds = restTimerSeconds;
        
        updateRestTimerDisplay(restTimerSeconds);
        updateFloatingTimerDisplay();
        elements.floatingTimer.style.display = 'flex';
        
        elements.floatingTimerProgress.style.transition = 'none';
        elements.floatingTimerProgress.style.strokeDashoffset = floatingTimerCircumference;
        setTimeout(() => {
            elements.floatingTimerProgress.style.transition = 'stroke-dashoffset 1s linear';
            elements.floatingTimerProgress.style.strokeDashoffset = 0;
        }, 100);

        restTimerInterval = setInterval(() => {
            restTimerSeconds--;
            updateRestTimerDisplay(restTimerSeconds);
            updateFloatingTimerDisplay();
            
            if (restTimerSeconds <= 0) {
                stopRestTimer(true);
            }
        }, 1000);
    };

    const stopRestTimer = (resumeSessionTimer = false) => {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        restTimerRunning = false;
        
        if (resumeSessionTimer) {
            playTimerSound();
            closeFloatingTimer(false);
            startSessionTimer();
        }
    };
    
    const startSessionTimer = () => {
        stopRestTimer(false);
        
        if (sessionTimerInterval) return;

        sessionTimerInterval = setInterval(() => {
            sessionTotalSeconds++;
            elements.sessionTotalTimerDisplay.textContent = formatTimerWithHours(sessionTotalSeconds);
            updateFloatingTimerDisplay();
        }, 1000);
    };
    
    const stopSessionTimer = () => {
        clearInterval(sessionTimerInterval);
        sessionTimerInterval = null;
    };

    const closeFloatingTimer = (playSound = true) => {
        if (restTimerRunning) {
            if (playSound) playTimerSound();
            stopRestTimer(true);
        }
        elements.floatingTimer.style.display = 'none';
    };
    
    const adjustTimer = (seconds) => {
        const currentVal = parseInt(elements.timerInput.value) || 0;
        let newVal = currentVal + seconds;
        if (newVal < 0) newVal = 0;
        elements.timerInput.value = newVal;
        
        if (restTimerRunning) { 
            restTimerSeconds += seconds;
            if (restTimerSeconds < 0) restTimerSeconds = 0;
            restTimerTotalSeconds = restTimerSeconds;
            updateRestTimerDisplay(restTimerSeconds);
            updateFloatingTimerDisplay();
        }
    };

    const playTimerSound = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.warn("Audio context error:", e);
        }
    };
    
    // --- Draggable Timer ---
    const initDraggableTimer = () => {
        if (!elements.floatingTimerProgress) return;

        floatingTimerRadius = elements.floatingTimerProgress.r.baseVal.value;
        floatingTimerCircumference = floatingTimerRadius * 2 * Math.PI;
        elements.floatingTimerProgress.style.strokeDasharray = `${floatingTimerCircumference} ${floatingTimerCircumference}`;
        elements.floatingTimerProgress.style.strokeDashoffset = floatingTimerCircumference;
        
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
        selectedDateStr = today.toISOString().split('T')[0];
        currentSessionDate = selectedDateStr; 
        
        renderCalendar(currentYear, currentMonth);
        renderRoutineTemplates();
        initDraggableTimer();
        initEventListeners();
    };
    
    const initEventListeners = () => {
        elements.backBtn.addEventListener('click', () => {
            if (confirm("메인 페이지로 돌아가시겠습니까?")) {
                 history.back();
            }
        });
        
        elements.prevMonthBtn.addEventListener('click', () => changeMonth(-1));
        elements.nextMonthBtn.addEventListener('click', () => changeMonth(1));
        
        elements.todayBtn.addEventListener('click', () => {
            today = new Date();
            today.setHours(0,0,0,0);
            const todayDateStr = today.toISOString().split('T')[0];
            
            jumpToDate(today); 
            
            const oldSelected = elements.calendarBody.querySelector('.selected-day');
            if (oldSelected) oldSelected.classList.remove('selected-day');
            
            const todayElement = elements.calendarBody.querySelector(`[data-date="${todayDateStr}"]`);
            if (todayElement) todayElement.classList.add('selected-day');
            
            selectedDateStr = todayDateStr;
            currentSessionDate = selectedDateStr;
        });
        
        elements.dateSearchBtn.addEventListener('click', () => {
            try {
                elements.dateSearchInput.showPicker();
            } catch(e) {
                console.warn("showPicker() not supported.", e);
                elements.dateSearchInput.click();
            }
        });
        elements.dateSearchInput.addEventListener('change', (e) => {
             if(e.target.value) {
                const newDate = new Date(e.target.value);
                jumpToDate(newDate);
                
                const dateStr = newDate.toISOString().split('T')[0];
                const oldSelected = elements.calendarBody.querySelector('.selected-day');
                if (oldSelected) oldSelected.classList.remove('selected-day');
                
                const newElement = elements.calendarBody.querySelector(`[data-date="${dateStr}"]`);
                if (newElement && !newElement.classList.contains('future-day')) {
                     newElement.classList.add('selected-day');
                     selectedDateStr = dateStr;
                     currentSessionDate = selectedDateStr;
                }
             }
        });
        
        elements.calendarBody.addEventListener('click', (e) => {
            const dayElement = e.target.closest('.calendar-day');
            if (!dayElement || dayElement.classList.contains('empty') || dayElement.classList.contains('future-day')) {
                return;
            }
            
            const dateStr = dayElement.dataset.date;
            calendarClickCount++;

            if (calendarClickCount === 1) {
                calendarClickTimer = setTimeout(() => {
                    const oldSelected = elements.calendarBody.querySelector('.selected-day');
                    if (oldSelected) oldSelected.classList.remove('selected-day');
                    
                    dayElement.classList.add('selected-day');
                    selectedDateStr = dateStr;
                    currentSessionDate = selectedDateStr;
                    
                    calendarClickCount = 0;
                }, 250);
            } else if (calendarClickCount === 2) {
                clearTimeout(calendarClickTimer);
                calendarClickCount = 0;
                showDailyLogModal(dateStr);
            }
        });
        
        elements.dailyLogModalList.addEventListener('click', handleDailyLogClick);
        
        elements.createNewTemplateBtn.addEventListener('click', () => openTemplateEditor());
        elements.routineTemplateList.addEventListener('click', handleRoutineListClick);
        
        elements.exerciseCategorySelect.addEventListener('change', (e) => populateExerciseList(elements.exerciseListSelect, e.target.value));
        elements.addUpdateExerciseBtn.addEventListener('click', addOrUpdateExerciseInTemplate);
        elements.saveTemplateBtn.addEventListener('click', saveTemplate);
        
        if (elements.templateExerciseList) {
            elements.templateExerciseList.addEventListener('click', handleTemplateListClick);
            new Sortable(elements.templateExerciseList, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const template = routineTemplates[currentTemplateId];
                    if (template) {
                        const item = template.exercises.splice(evt.oldIndex, 1)[0];
                        template.exercises.splice(evt.newIndex, 0, item);
                        refreshTemplateExerciseList();
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
        
        // [수정] X 버튼 클릭 시: 운동 종료 및 취소 (롤백)
        elements.hideSessionBtn.addEventListener('click', async () => {
            const confirmed = await showCustomConfirm("운동 세션을 종료하시겠습니까?\n(저장되지 않은 기록은 사라집니다.)");
            if (confirmed) {
                stopSessionTimer();
                stopRestTimer();
                closeFloatingTimer(false);
                closeModal(elements.workoutSessionModal);
                sessionTotalSeconds = 0; // 시간 초기화
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
            closeFloatingTimer(true);
        });
        
        elements.floatingTimer.addEventListener('click', () => {
            if (sessionTimerInterval || restTimerRunning) {
                openModal(elements.workoutSessionModal);
                elements.floatingTimer.style.display = 'none';
            }
        });

        elements.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) {
                    if (modal.id === 'workout-session-modal') {
                        // [수정] X 버튼과 동일 동작 (취소 확인)
                        elements.hideSessionBtn.click();
                    } else {
                        closeModal(modal);
                    }
                }
            });
        });
        
        elements.closePrModal.addEventListener('click', () => closeModal(elements.prCelebrationModal));

        // [수정] 바깥 영역 클릭 시: 백그라운드 모드 (숨기기만 함)
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                const modal = e.target;
                 if (modal.id === 'workout-session-modal') {
                    // 백그라운드 모드: 창만 닫고, 미니 타이머 표시
                    elements.workoutSessionModal.style.display = 'none';
                    elements.floatingTimer.style.display = 'flex';
                    updateFloatingTimerDisplay();
                 } else if (modal.id !== 'custom-confirm-modal') {
                    closeModal(modal);
                 }
            }
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
                        // Esc 키도 백그라운드 모드로 동작하게 설정 (또는 취소로 설정 가능, 여기선 백그라운드로)
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

    init();
});