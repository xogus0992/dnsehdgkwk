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
        addToSessionModal: document.getElementById('add-to-session-modal'),
        customConfirmModal: document.getElementById('custom-confirm-modal'),
        prCelebrationModal: document.getElementById('pr-celebration-modal'),
        prList: document.getElementById('pr-list'),
        closePrModal: document.getElementById('close-pr-modal'),

        dailyLogModalTitle: document.getElementById('daily-log-modal-title'),
        dailyLogModalList: document.getElementById('daily-log-modal-list'),
        
        statsPartSelector: document.getElementById('stats-part-selector'),
        statsExerciseSelect: document.getElementById('stats-exercise-select'),
        statsChartCanvas: document.getElementById('stats-chart-canvas'),
        statsStartDate: document.getElementById('stats-start-date'),
        statsEndDate: document.getElementById('stats-end-date'),
        statsResetBtn: document.getElementById('stats-reset-btn'),

        templateModalTitle: document.getElementById('template-modal-title'),
        templateTitleInput: document.getElementById('template-title-input'),
        templateExerciseList: document.getElementById('template-exercise-list'),
        exerciseCategorySelect: document.getElementById('exercise-category-select'),
        exerciseListSelect: document.getElementById('exercise-list-select'),
        templateWeightInput: document.getElementById('template-weight-input'),
        templateRepsInput: document.getElementById('template-reps-input'),
        templateSetsInput: document.getElementById('template-sets-input'),
        addUpdateExerciseBtn: document.getElementById('add-update-exercise-btn'),
        saveTemplateBtn: document.getElementById('save-template-btn'),
        deleteTemplateBtn: document.getElementById('delete-template-btn'),
        closeTemplateModalBtn: document.getElementById('close-template-modal-btn'),

        workoutSessionTitle: document.getElementById('workout-session-title'),
        timerInput: document.getElementById('timer-input'),
        timerStartBtn: document.getElementById('timer-start-btn'),
        timerPauseBtn: document.getElementById('timer-pause-btn'),
        timerResetBtn: document.getElementById('timer-reset-btn'),
        timerMinus10Btn: document.getElementById('timer-minus-10'), 
        timerPlus10Btn: document.getElementById('timer-plus-10'),  
        timerMinus30Btn: document.getElementById('timer-minus-30'), 
        timerPlus30Btn: document.getElementById('timer-plus-30'),  
        dailyLogDate: document.getElementById('daily-log-date'), 
        timerDigitalDisplay: document.getElementById('timer-digital-display'),
        clockSecondHand: document.getElementById('clock-second-hand'),
        workoutSessionList: document.getElementById('workout-session-list'),
        addExerciseToSessionBtn: document.getElementById('add-exercise-to-session-btn'),
        saveSessionBtn: document.getElementById('save-session-btn'),
        hideSessionBtn: document.getElementById('hide-session-btn'),

        addExModalCategory: document.getElementById('add-ex-modal-category'),
        addExModalList: document.getElementById('add-ex-modal-list'),
        confirmAddExerciseBtn: document.getElementById('confirm-add-exercise-btn'),
        openAddExerciseModalBtn: document.getElementById('open-add-exercise-modal-btn'),
        cancelAddExerciseBtn: document.getElementById('cancel-add-exercise-btn'),
        newExercisePart: document.getElementById('new-exercise-part'),
        newExerciseName: document.getElementById('new-exercise-name'),
        saveNewExerciseBtn: document.getElementById('save-new-exercise-btn'),
        
        summaryModalTitle: document.getElementById('summary-modal-title'),
        summaryTotalTime: document.getElementById('summary-total-time'),
        summaryTotalVolume: document.getElementById('summary-total-volume'),
        summaryExercises: document.getElementById('summary-exercises'),
        closeSummaryBtn: document.getElementById('close-summary-btn'),
        
        addToSessionModalTitle: document.getElementById('add-to-session-modal-title'),
        sessionWeightInput: document.getElementById('session-weight-input'),
        sessionRepsInput: document.getElementById('session-reps-input'),
        sessionSetsInput: document.getElementById('session-sets-input'),
        saveToSessionBtn: document.getElementById('save-to-session-btn'),
        cancelAddToSessionBtn: document.getElementById('cancel-add-to-session-btn'),

        confirmModalText: document.getElementById('confirm-modal-text'),
        confirmModalYes: document.getElementById('confirm-modal-yes'),
        confirmModalNo: document.getElementById('confirm-modal-no'),

        floatingTimerProgressCircle: document.querySelector('#floating-timer-progress .progress-ring__circle')
    };

    const circumference = elements.floatingTimerProgressCircle ? elements.floatingTimerProgressCircle.r.baseVal.value * 2 * Math.PI : 0;

    const WORKOUT_LOG_KEY = 'workoutLogs_v18';
    const ROUTINE_TEMPLATE_KEY = 'routineTemplates_v18';
    const EXERCISE_LIST_KEY = 'customExercises_v18';
    const BODY_PART_COLORS = {
        "가슴": 'rgba(59, 130, 246, 0.8)',
        "등": 'rgba(34, 197, 94, 0.8)',
        "하체": 'rgba(239, 68, 68, 0.8)',
        "어깨": 'rgba(168, 85, 247, 0.8)',
        "팔": 'rgba(249, 115, 22, 0.8)',
        "복근/코어": 'rgba(234, 179, 8, 0.8)',
        "기타": 'rgba(107, 114, 128, 0.8)',
        "전체": 'rgba(20, 184, 166, 0.8)'
    };

    let currentWorkoutSession = {
        date: null,
        log: { startTime: null, endTime: null, sets: [], note: "" },
        timerInterval: null,
        timerSeconds: 0,
        timerPaused: false,
        editingSetIndex: null
    };
    
    let currentFloatingTimer = null;
    let floatingTimerSeconds = 0;
    
    let currentChart = null;
    let editingTemplateId = null;
    let editingTemplateExerciseIndex = null;
    
    // [수정됨] today 변수의 시간을 0시 0분 0초로 초기화
    let today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth();
    let workoutLogs = {};
    let routineTemplates = {};
    let customExercises = {};
    let combinedExercises = {};

    const loadFromLocalStorage = (key, defaultValue) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    };

    const saveToLocalStorage = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const mergeExercises = () => {
        combinedExercises = JSON.parse(JSON.stringify(exercisesData));
        Object.keys(customExercises).forEach(part => {
            if (!combinedExercises[part]) {
                combinedExercises[part] = [];
            }
            combinedExercises[part] = combinedExercises[part].concat(customExercises[part]);
        });
    };

    const getPartForExercise = (exerciseName) => {
        for (const part in combinedExercises) {
            if (combinedExercises[part].some(ex => ex.name === exerciseName)) {
                return part;
            }
        }
        return "기타";
    };

    const openModal = (modal) => modal.style.display = 'flex';
    const closeModal = (modal) => modal.style.display = 'none';

    // [수정됨] renderCalendar 함수에 미래 날짜 비활성화 로직 추가
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
            
            const isFuture = date > today; // 'today' 변수는 0시 0분 0초이므로 정확히 비교됨
            
            if (isFuture) {
                dayElement.classList.add('future-day');
                // 미래 날짜에는 클릭 이벤트 리스너를 추가하지 않음
            } else {
                // 오늘이거나 과거 날짜
                if (date.getTime() === today.getTime()) {
                    dayElement.classList.add('today');
                }

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

                dayElement.dataset.date = dateStr;
                dayElement.addEventListener('click', () => showDailyLogModal(dateStr));
            }
            elements.calendarBody.appendChild(dayElement);
        }
    };

    const showDailyLogModal = (dateStr) => {
        const date = new Date(dateStr);
        elements.dailyLogModalTitle.textContent = `${date.getMonth() + 1}월 ${date.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`;
        elements.dailyLogDate.value = dateStr;
        renderDailyLogModal(dateStr);
        openModal(elements.dailyLogModal);
    };

    const calculateVolume = (sets) => {
        const volume = sets.filter(set => set.weight > 0).reduce((acc, set) => acc + (set.weight * set.reps), 0);
        return volume > 0 ? `${Math.round(volume)}kg` : '';
    };

    const renderDailyLogModal = (dateStr) => {
        const logs = workoutLogs[dateStr] || [];
        elements.dailyLogModalList.innerHTML = '';
        
        if (logs.length === 0) {
            elements.dailyLogModalList.innerHTML = '<li class="text-gray-500">운동 기록이 없습니다.</li>';
        }

        logs.forEach((log, logIndex) => {
            const logElement = document.createElement('li');
            logElement.className = 'daily-log-item card mb-4';
            
            const uniqueExercises = [...new Set(log.sets.map(s => s.name))];
            const exercisesHtml = uniqueExercises.map((exName, exIdx) => {
                const setsForExercise = (log.sets || []).filter(s => s.exerciseIndex === exIdx);
                const setsHtml = setsForExercise.map(s => 
                    `<li class="flex justify-between items-center p-2">
                        <div><span class="font-semibold">${s.weight}</span>kg x <span class="font-semibold">${s.reps}</span>회</div>
                        ${s.pr ? '<span class="pr-badge">PR</span>' : ''}
                    </li>`
                ).join('');
                
                return `<div class="mt-3">
                            <h5 class="font-semibold text-lg text-gray-800">${exName}</h5>
                            <ul class="list-disc list-inside mt-1 space-y-1">${setsHtml}</ul>
                        </div>`;
            }).join('');

            const startTime = new Date(log.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(log.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            const duration = Math.round((log.endTime - log.startTime) / 60000);
            const totalVolume = calculateVolume(log.sets);

            logElement.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-xl font-bold text-blue-600">운동 기록 #${logIndex + 1}</h4>
                    <div class="flex gap-2">
                        <button class="edit-log-btn small-btn" data-date="${dateStr}" data-log-index="${logIndex}">수정</button>
                        <button class="delete-log-btn small-btn delete-btn" data-date="${dateStr}" data-log-index="${logIndex}">삭제</button>
                    </div>
                </div>
                <div class="text-gray-600 space-y-1">
                    <p><strong>시간:</strong> ${startTime} ~ ${endTime} (${duration}분)</p>
                    ${totalVolume ? `<p><strong>총 볼륨:</strong> ${totalVolume}</p>` : ''}
                </div>
                <div class="mt-4">${exercisesHtml}</div>
            `;
            elements.dailyLogModalList.appendChild(logElement);
        });

        const startRoutineBtn = document.createElement('button');
        startRoutineBtn.id = 'start-routine-btn';
        startRoutineBtn.className = 'w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition';
        startRoutineBtn.textContent = '운동 시작하기 (루틴 선택)';
        startRoutineBtn.dataset.date = dateStr;
        elements.dailyLogModalList.appendChild(startRoutineBtn);
    };

    const renderRoutineTemplateList = () => {
        elements.routineTemplateList.innerHTML = '';
        const templateIds = Object.keys(routineTemplates);
        if (templateIds.length === 0) {
            elements.routineTemplateList.innerHTML = '<p class="text-gray-500 text-center">저장된 루틴 템플릿이 없습니다. 새로 만들어주세요.</p>';
            return;
        }
        
        templateIds.forEach(id => {
            const template = routineTemplates[id];
            const templateEl = document.createElement('div');
            templateEl.className = 'template-item card p-4 flex justify-between items-center';
            templateEl.innerHTML = `
                <span class="font-semibold text-lg">${template.title}</span>
                <div class="flex gap-2">
                    <button class="start-template-btn small-btn" data-id="${id}">시작</button>
                    <button class="edit-template-btn small-btn" data-id="${id}">수정</button>
                </div>
            `;
            elements.routineTemplateList.appendChild(templateEl);
        });
    };

    const openTemplateEditor = (id = null) => {
        if (id) {
            editingTemplateId = id;
            const template = routineTemplates[id];
            elements.templateModalTitle.textContent = '루틴 수정';
            elements.templateTitleInput.value = template.title;
            renderTemplateExerciseList(template.exercises);
            elements.deleteTemplateBtn.style.display = 'block';
        } else {
            editingTemplateId = null;
            elements.templateModalTitle.textContent = '새 루틴 만들기';
            elements.templateTitleInput.value = '';
            renderTemplateExerciseList([]);
            elements.deleteTemplateBtn.style.display = 'none';
        }
        editingTemplateExerciseIndex = null;
        elements.addUpdateExerciseBtn.textContent = '운동 추가';
        populateExerciseSelectors(elements.exerciseCategorySelect, elements.exerciseListSelect);
        resetTemplateForm();
        openModal(elements.templateEditorModal);
    };

    const resetTemplateForm = () => {
        elements.exerciseCategorySelect.value = '';
        elements.exerciseListSelect.innerHTML = '<option value="">-- 운동 선택 --</option>';
        elements.templateWeightInput.value = '';
        elements.templateRepsInput.value = '';
        elements.templateSetsInput.value = '';
        editingTemplateExerciseIndex = null;
        elements.addUpdateExerciseBtn.textContent = '운동 추가';
    };

    const renderTemplateExerciseList = (exercises) => {
        elements.templateExerciseList.innerHTML = '';
        if (!exercises || exercises.length === 0) {
            elements.templateExerciseList.innerHTML = '<p class="text-gray-500 text-center col-span-full">추가된 운동이 없습니다.</p>';
            return;
        }

        exercises.forEach((ex, index) => {
            const exEl = document.createElement('div');
            exEl.className = 'template-exercise-item card p-3 flex justify-between items-center';
            exEl.dataset.index = index;
            exEl.innerHTML = `
                <div class="flex-grow">
                    <span class="font-bold text-lg">${ex.name}</span>
                    <span class="text-gray-600 ml-2">${ex.weight}kg / ${ex.reps}회 / ${ex.sets}세트</span>
                </div>
                <div class="flex gap-2">
                    <button class="edit-ex-btn small-btn" data-index="${index}">수정</button>
                    <button class="delete-ex-btn small-btn delete-btn" data-index="${index}">삭제</button>
                </div>
            `;
            elements.templateExerciseList.appendChild(exEl);
        });
        
        makeSortable();
    };
    
    const makeSortable = () => {
        if (elements.templateExerciseList.sortable) {
            elements.templateExerciseList.sortable.destroy();
        }
        elements.templateExerciseList.sortable = new Sortable(elements.templateExerciseList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                if (!editingTemplateId) return;
                const template = routineTemplates[editingTemplateId];
                if (!template) return;
                
                const [movedItem] = template.exercises.splice(evt.oldIndex, 1);
                template.exercises.splice(evt.newIndex, 0, movedItem);
                
                saveToLocalStorage(ROUTINE_TEMPLATE_KEY, routineTemplates);
                renderTemplateExerciseList(template.exercises);
            }
        });
    };

    const populateExerciseSelectors = (categoryEl, listEl, defaultPart = null) => {
        categoryEl.innerHTML = '<option value="">-- 부위 선택 --</option>';
        Object.keys(combinedExercises).forEach(part => {
            categoryEl.innerHTML += `<option value="${part}" ${part === defaultPart ? 'selected' : ''}>${part}</option>`;
        });
        
        const populateList = (part) => {
            listEl.innerHTML = '<option value="">-- 운동 선택 --</option>';
            if (part && combinedExercises[part]) {
                combinedExercises[part].forEach(ex => {
                    listEl.innerHTML += `<option value="${ex.name}">${ex.name}</option>`;
                });
            }
        };

        categoryEl.onchange = () => populateList(categoryEl.value);
        if (defaultPart) {
            populateList(defaultPart);
        }
    };

    const saveTemplate = () => {
        const title = elements.templateTitleInput.value.trim();
        if (!title) {
            showCustomConfirm("루틴 이름을 입력하세요.", () => {}, false);
            return;
        }

        const exercisesFromDOM = Array.from(elements.templateExerciseList.querySelectorAll('.template-exercise-item'))
            .map(el => {
                const name = el.querySelector('.font-bold').textContent;
                const detailsText = el.querySelector('.text-gray-600').textContent;
                const details = detailsText.match(/(\S+)kg \/ (\S+)회 \/ (\S+)세트/);
                return {
                    name: name,
                    weight: details[1],
                    reps: details[2],
                    sets: details[3]
                };
            });

        if (editingTemplateId) {
            const template = routineTemplates[editingTemplateId];
            
            if (!template) {
                console.error("Save Error: Cannot find template with ID:", editingTemplateId);
                showCustomConfirm("템플릿 저장 중 오류가 발생했습니다. 다시 시도해 주세요.", () => {}, false);
                return;
            }
            
            template.title = title;
            template.exercises = exercisesFromDOM;

        } else {
            const newId = `template_${new Date().getTime()}`;
            routineTemplates[newId] = { title, exercises: exercisesFromDOM };
        }

        saveToLocalStorage(ROUTINE_TEMPLATE_KEY, routineTemplates);
        renderRoutineTemplateList();
        closeModal(elements.templateEditorModal);
    };

    const startWorkoutSession = (dateStr, templateId = null) => {
        currentWorkoutSession = {
            date: dateStr,
            log: { 
                startTime: new Date().getTime(), 
                endTime: null, 
                sets: [],
                note: "" 
            },
            timerInterval: null,
            timerSeconds: 0,
            timerPaused: false,
            editingSetIndex: null
        };

        if (templateId) {
            const template = routineTemplates[templateId];
            elements.workoutSessionTitle.textContent = template.title;
            
            let exerciseIndex = 0;
            template.exercises.forEach((ex) => {
                const exName = ex.name;
                const part = getPartForExercise(exName);
                const weight = parseFloat(ex.weight) || 0;
                const reps = parseInt(ex.reps) || 0;
                const sets = parseInt(ex.sets) || 1;

                for (let i = 0; i < sets; i++) {
                    addSetToSession(exName, exerciseIndex, weight, reps);
                }
                exerciseIndex++;
            });

        } else {
            elements.workoutSessionTitle.textContent = "새 운동";
        }
        
        elements.timerInput.value = "2:30";
        updateTimerDisplay(150);
        
        renderWorkoutSession();
        openModal(elements.workoutSessionModal);
        closeModal(elements.dailyLogModal);
    };

    const renderWorkoutSession = () => {
        elements.workoutSessionList.innerHTML = '';
        const exercises = {};

        currentWorkoutSession.log.sets.forEach((set) => {
            if (!exercises[set.exerciseIndex]) {
                exercises[set.exerciseIndex] = { name: set.name, sets: [] };
            }
            exercises[set.exerciseIndex].sets.push(set);
        });

        Object.keys(exercises).sort((a, b) => a - b).forEach(exIdx => {
            const exercise = exercises[exIdx];
            const exerciseElement = document.createElement('div');
            exerciseElement.className = 'mb-6 exercise-group';
            exerciseElement.dataset.exerciseIndex = exIdx;

            const part = getPartForExercise(exercise.name);
            const color = BODY_PART_COLORS[part] || BODY_PART_COLORS['기타'];

            exerciseElement.innerHTML = `
                <div class="flex justify-between items-center mb-3 p-2 rounded-t-lg" style="background-color: ${color.replace('0.8', '0.2')};">
                    <h4 class="text-xl font-bold" style="color: ${color.replace('0.8', '1')};">${exercise.name}</h4>
                    <div class="flex gap-2">
                        <button class="add-set-btn small-btn" data-exercise-index="${exIdx}" data-exercise-name="${exercise.name}">세트 추가</button>
                        <button class="delete-exercise-btn small-btn delete-btn" data-exercise-index="${exIdx}">운동 삭제</button>
                    </div>
                </div>
            `;
            
            const setsList = document.createElement('ul');
            setsList.className = 'space-y-2';
            
            const setsForExercise = exercise.sets;

            const mainSets = setsForExercise;
            mainSets.forEach((set, mainSetIndex) => {
                const setDiv = createSetElement(set, mainSetIndex);
                setsList.appendChild(setDiv);
            });

            exerciseElement.appendChild(setsList);
            elements.workoutSessionList.appendChild(exerciseElement);
        });
    };

    const createSetElement = (set, mainSetIndex) => {
        const setElement = document.createElement('li');
        setElement.dataset.setIndex = set.index;
        
        const isCompleted = set.completed;
        const baseClasses = 'flex justify-between items-center p-3 rounded-lg shadow-sm transition-all';
        const stateClasses = isCompleted ? 'bg-gray-100 opacity-70' : 'bg-white';
        
        setElement.className = `${baseClasses} ${stateClasses}`;

        const setText = document.createElement('div');
        setText.className = 'flex-grow flex items-center gap-4';
        setText.innerHTML = `
            <span class="font-semibold text-lg text-gray-700 w-10 text-center">${mainSetIndex + 1}</span>
            <div class="flex gap-3 items-center">
                <span class="font-bold text-xl">${set.weight}</span><span class="text-gray-500 -ml-2">kg</span>
                <span class="font-bold text-xl">${set.reps}</span><span class="text-gray-500 -ml-2">회</span>
            </div>
            ${set.pr ? '<span class="pr-badge ml-3">PR</span>' : ''}
        `;

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'flex gap-2 items-center';

        const completeBtn = document.createElement('button');
        completeBtn.innerHTML = isCompleted ? '✓' : '완료';
        completeBtn.className = `complete-set-btn small-btn ${isCompleted ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`;
        completeBtn.dataset.setIndex = set.index;

        const editBtn = document.createElement('button');
        editBtn.textContent = '수정';
        editBtn.className = 'edit-set-btn small-btn bg-gray-200 hover:bg-gray-300';
        editBtn.dataset.setIndex = set.index;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.className = 'delete-set-btn small-btn delete-btn';
        deleteBtn.dataset.setIndex = set.index;

        buttonsDiv.appendChild(completeBtn);
        buttonsDiv.appendChild(editBtn);
        buttonsDiv.appendChild(deleteBtn);

        setElement.appendChild(setText);
        setElement.appendChild(buttonsDiv);
        
        return setElement;
    };

    const addSetToSession = (exerciseName, exerciseIndex, weight, reps) => {
        const newIndex = currentWorkoutSession.log.sets.length;
        
        const lastSetOfSameExercise = [...currentWorkoutSession.log.sets]
            .reverse()
            .find(s => s.exerciseIndex === exerciseIndex);

        const newSet = {
            index: newIndex,
            exerciseIndex: exerciseIndex,
            name: exerciseName,
            weight: weight !== undefined ? weight : (lastSetOfSameExercise ? lastSetOfSameExercise.weight : 0),
            reps: reps !== undefined ? reps : (lastSetOfSameExercise ? lastSetOfSameExercise.reps : 0),
            completed: false,
            pr: false
        };
        currentWorkoutSession.log.sets.push(newSet);
        return newIndex;
    };

    const completeSet = (setIndex) => {
        const set = currentWorkoutSession.log.sets[setIndex];
        if (!set) return;

        set.completed = !set.completed;

        if (set.completed) {
            set.pr = checkPR(set.name, set.weight, set.reps);
        } else {
            set.pr = false;
        }

        renderWorkoutSession();
        
        if (set.completed && !currentFloatingTimer) {
            const seconds = parseTimerInput(elements.timerInput.value);
            if (seconds > 0) {
                startFloatingTimer(seconds);
            }
        }
    };
    
    const checkPR = (exerciseName, weight, reps) => {
        if (weight <= 0 || reps <= 0) return false;
        
        const estimated1RM = calculate1RM(weight, reps);
        let isPR = false;
        let bestSet = { weight: 0, reps: 0, rm: 0 };

        Object.values(workoutLogs).flat().forEach(log => {
            log.sets.forEach(set => {
                if (set.name === exerciseName && set.weight > 0 && set.reps > 0) {
                    const setRM = calculate1RM(set.weight, set.reps);
                    if (setRM > bestSet.rm) {
                        bestSet = { weight: set.weight, reps: set.reps, rm: setRM };
                    }
                }
            });
        });
        
        currentWorkoutSession.log.sets.forEach(set => {
             if (set.name === exerciseName && set.completed && (set.weight > 0 && set.reps > 0)) {
                 const setRM = calculate1RM(set.weight, set.reps);
                 if (setRM > bestSet.rm) {
                     bestSet = { weight: set.weight, reps: set.reps, rm: setRM };
                 }
             }
        });

        if (estimated1RM > bestSet.rm) {
            isPR = true;
        }
        
        return isPR;
    };
    
    const calculate1RM = (weight, reps) => {
        if (reps == 1) return weight;
        if (reps < 1) return 0;
        return weight * (1 + reps / 30);
    };

    const showPRCelebration = (prs) => {
        elements.prList.innerHTML = prs.map(pr => 
            `<li class="text-xl font-semibold p-2 bg-yellow-100 rounded-md text-yellow-800">
                ${pr.name}: ${pr.weight}kg x ${pr.reps}회
            </li>`
        ).join('');
        openModal(elements.prCelebrationModal);
    };

    const saveWorkoutSession = () => {
        currentWorkoutSession.log.endTime = new Date().getTime();
        
        currentWorkoutSession.log.sets = currentWorkoutSession.log.sets.filter(set => set.completed);
        
        if (currentWorkoutSession.log.sets.length === 0) {
            showCustomConfirm("완료된 세트가 없습니다. 저장을 취소합니다.", () => {}, false);
            closeModal(elements.workoutSessionModal);
            return;
        }

        const prs = currentWorkoutSession.log.sets.filter(set => set.pr);
        if (prs.length > 0) {
            showPRCelebration(prs);
        }

        const dateStr = currentWorkoutSession.date;
        if (!workoutLogs[dateStr]) {
            workoutLogs[dateStr] = [];
        }
        workoutLogs[dateStr].push(currentWorkoutSession.log);
        saveToLocalStorage(WORKOUT_LOG_KEY, workoutLogs);

        showSummary();
        renderCalendar(currentYear, currentMonth);
        closeModal(elements.workoutSessionModal);
    };

    const showSummary = () => {
        const log = currentWorkoutSession.log;
        const duration = Math.round((log.endTime - log.startTime) / 60000);
        const totalVolume = calculateVolume(log.sets);

        elements.summaryModalTitle.textContent = `${new Date(log.startTime).toLocaleDateString()} 운동 요약`;
        elements.summaryTotalTime.textContent = `${duration}분`;
        elements.summaryTotalVolume.textContent = totalVolume || '0kg';
        
        const exercises = {};
        log.sets.forEach(set => {
            if (!exercises[set.name]) {
                exercises[set.name] = { sets: 0, totalWeight: 0, bestSet: { weight: 0, reps: 0 } };
            }
            exercises[set.name].sets++;
            exercises[set.name].totalWeight += set.weight * set.reps;
            if (set.weight > exercises[set.name].bestSet.weight || (set.weight === exercises[set.name].bestSet.weight && set.reps > exercises[set.name].bestSet.reps)) {
                exercises[set.name].bestSet = { weight: set.weight, reps: set.reps };
            }
        });

        elements.summaryExercises.innerHTML = Object.keys(exercises).map(name => `
            <li class="p-3 bg-gray-50 rounded-md">
                <h4 class="font-bold text-lg">${name}</h4>
                <p>총 볼륨: ${Math.round(exercises[name].totalWeight)}kg / ${exercises[name].sets}세트</p>
                <p>최고 세트: ${exercises[name].bestSet.weight}kg x ${exercises[name].bestSet.reps}회</p>
            </li>
        `).join('');

        openModal(elements.summaryModal);
    };
    
    const updateTimerDisplay = (totalSeconds) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        elements.timerInput.value = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        if(elements.clockSecondHand) {
            const angle = (totalSeconds % 60) * 6;
            elements.clockSecondHand.style.transform = `rotate(${angle}deg)`;
        }
        if(elements.timerDigitalDisplay) {
            elements.timerDigitalDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }
    };

    const parseTimerInput = (input) => {
        const parts = input.split(':').map(Number);
        if (parts.length === 2) {
            return (parts[0] * 60) + parts[1];
        } else if (parts.length === 1) {
            return parts[0];
        }
        return 0;
    };
    
    const adjustTimer = (seconds) => {
        let currentSeconds = parseTimerInput(elements.timerInput.value);
        currentSeconds = Math.max(0, currentSeconds + seconds);
        updateTimerDisplay(currentSeconds);
    };

    const startSessionTimer = () => {
        if (currentWorkoutSession.timerInterval) return;

        if (currentWorkoutSession.timerSeconds === 0) {
             currentWorkoutSession.timerSeconds = parseTimerInput(elements.timerInput.value);
        }
        
        if (currentWorkoutSession.timerSeconds <= 0) return;

        currentWorkoutSession.timerPaused = false;
        elements.timerStartBtn.disabled = true;
        elements.timerPauseBtn.disabled = false;

        currentWorkoutSession.timerInterval = setInterval(() => {
            currentWorkoutSession.timerSeconds--;
            updateTimerDisplay(currentWorkoutSession.timerSeconds);

            if (currentWorkoutSession.timerSeconds <= 0) {
                clearInterval(currentWorkoutSession.timerInterval);
                currentWorkoutSession.timerInterval = null;
                elements.timerStartBtn.disabled = false;
                elements.timerPauseBtn.disabled = true;
                playTimerEndSound();
            }
        }, 1000);
    };

    const pauseSessionTimer = () => {
        clearInterval(currentWorkoutSession.timerInterval);
        currentWorkoutSession.timerInterval = null;
        currentWorkoutSession.timerPaused = true;
        elements.timerStartBtn.disabled = false;
        elements.timerPauseBtn.disabled = true;
    };

    const resetSessionTimer = () => {
        clearInterval(currentWorkoutSession.timerInterval);
        currentWorkoutSession.timerInterval = null;
        currentWorkoutSession.timerPaused = false;
        currentWorkoutSession.timerSeconds = parseTimerInput(elements.timerInput.value);
        updateTimerDisplay(currentWorkoutSession.timerSeconds);
        elements.timerStartBtn.disabled = false;
        elements.timerPauseBtn.disabled = true;
    };
    
    const playTimerEndSound = () => {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, context.currentTime);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.5);
        } catch (e) {
            console.warn("Timer sound failed to play.", e);
        }
    };
    
    const startFloatingTimer = (seconds) => {
        if (currentFloatingTimer) {
            clearInterval(currentFloatingTimer);
        }
        
        floatingTimerSeconds = seconds;
        const totalSeconds = seconds;
        
        elements.floatingTimer.style.display = 'flex';
        
        const update = () => {
            const minutes = Math.floor(floatingTimerSeconds / 60);
            const secs = floatingTimerSeconds % 60;
            elements.floatingTimerDisplay.textContent = `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
            
            const progress = (totalSeconds - floatingTimerSeconds) / totalSeconds;
            if(elements.floatingTimerProgressCircle) {
                elements.floatingTimerProgressCircle.style.strokeDashoffset = circumference - progress * circumference;
            }

            if (floatingTimerSeconds <= 0) {
                clearInterval(currentFloatingTimer);
                currentFloatingTimer = null;
                playTimerEndSound();
                setTimeout(() => {
                    elements.floatingTimer.style.display = 'none';
                }, 2000);
            }
            floatingTimerSeconds--;
        };

        update();
        currentFloatingTimer = setInterval(update, 1000);
    };

    const openStatsModal = () => {
        populateExerciseSelectors(elements.statsPartSelector, elements.statsExerciseSelect, "가슴");
        elements.statsPartSelector.value = "가슴";
        elements.statsPartSelector.dispatchEvent(new Event('change'));
        
        const todayStr = today.toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        elements.statsStartDate.value = thirtyDaysAgo;
        elements.statsEndDate.value = todayStr;
        
        renderStatsChart();
        openModal(elements.statsModal);
    };

    const calculateStatsByPart = (part, startDate, endDate) => {
        const stats = { volume: 0, days: 0 };
        const logs = getLogsBetweenDates(startDate, endDate);
        
        logs.forEach(log => {
            const partSets = log.sets.filter(set => {
                if (set.weight <= 0) return false;
                const setPart = getPartForExercise(set.name);
                return setPart === part;
            });
            
            if (partSets.length > 0) {
                stats.days++;
                stats.volume += partSets.reduce((acc, set) => acc + (set.weight * set.reps), 0);
            }
        });
        return stats;
    };
    
    const getLogsBetweenDates = (startDate, endDate) => {
        return Object.keys(workoutLogs)
            .filter(date => date >= startDate && date <= endDate)
            .flatMap(date => workoutLogs[date]);
    };

    const renderStatsChart = () => {
        const part = elements.statsPartSelector.value;
        const exercise = elements.statsExerciseSelect.value;
        const startDate = elements.statsStartDate.value;
        const endDate = elements.statsEndDate.value;
        
        const logs = getLogsBetweenDates(startDate, endDate);
        const data = {
            labels: [],
            datasets: [
                {
                    label: '볼륨 (kg)',
                    data: [],
                    borderColor: BODY_PART_COLORS[part] || BODY_PART_COLORS['기타'],
                    backgroundColor: BODY_PART_COLORS[part] || BODY_PART_COLORS['기타'],
                    yAxisID: 'yVolume',
                },
                {
                    label: '최대 1RM (kg)',
                    data: [],
                    borderColor: '#4a5568',
                    backgroundColor: '#4a5568',
                    type: 'line',
                    yAxisID: 'y1RM',
                }
            ]
        };

        const dailyData = {};
        
        logs.forEach(log => {
            const date = new Date(log.startTime).toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { volume: 0, max1RM: 0 };
            }
            
            log.sets.forEach(set => {
                if (set.weight <= 0 || set.reps <= 0) return;
                
                const setPart = getPartForExercise(set.name);
                const exerciseMatches = (exercise === "") ? (setPart === part) : (set.name === exercise);

                if (exerciseMatches) {
                    dailyData[date].volume += set.weight * set.reps;
                    const set1RM = calculate1RM(set.weight, set.reps);
                    if (set1RM > dailyData[date].max1RM) {
                        dailyData[date].max1RM = set1RM;
                    }
                }
            });
        });

        const sortedDates = Object.keys(dailyData).sort();
        sortedDates.forEach(date => {
            if (dailyData[date].volume > 0 || dailyData[date].max1RM > 0) {
                data.labels.push(date);
                data.datasets[0].data.push(dailyData[date].volume);
                data.datasets[1].data.push(dailyData[date].max1RM > 0 ? dailyData[date].max1RM.toFixed(1) : null);
            }
        });
        
        if (currentChart) {
            currentChart.destroy();
        }
        
        if (data.labels.length === 0) {
            elements.statsChartCanvas.getContext('2d').clearRect(0, 0, elements.statsChartCanvas.width, elements.statsChartCanvas.height);
            return;
        }

        currentChart = new Chart(elements.statsChartCanvas, {
            type: 'bar',
            data: data,
            plugins: [ChartDataLabels],
            options: {
                responsive: true,
                plugins: {
                    datalabels: {
                        display: (context) => {
                            return context.datasetIndex === 1 || context.dataset.data[context.dataIndex] > 0;
                        },
                        align: 'top',
                        anchor: 'end',
                        formatter: (value, context) => {
                            if (context.datasetIndex === 1) return `${value}kg`;
                            if (context.datasetIndex === 0) {
                                const total = parseFloat(value);
                                if (total > 0) {
                                    return `${Math.round(total)}kg`;
                                } else {
                                    return '';
                                }
                            }
                            return '';
                        },
                        color: '#4a5568',
                        font: { weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: '날짜' }
                    },
                    yVolume: {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: '볼륨 (kg)' },
                        beginAtZero: true
                    },
                    y1RM: {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: '추정 1RM (kg)' },
                        beginAtZero: true,
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    };
    
    const showCustomConfirm = (message, callback, showCancel = true) => {
        elements.confirmModalText.textContent = message;
        elements.confirmModalNo.style.display = showCancel ? 'inline-block' : 'none';
        elements.confirmModalYes.textContent = showCancel ? '예' : '확인';
        
        openModal(elements.customConfirmModal);

        elements.confirmModalYes.onclick = () => {
            closeModal(elements.customConfirmModal);
            callback(true);
        };
        elements.confirmModalNo.onclick = () => {
            closeModal(elements.customConfirmModal);
            callback(false);
        };
    };

    const generateShades = (baseColorRgba, count) => {
        const shades = [];
        const rgba = baseColorRgba.match(/\d+/g);
        if (!rgba) return Array(count).fill(baseColorRgba);
        const [r, g, b] = rgba.slice(0, 3).map(Number);
        
        for (let i = 0; i < count; i++) {
            const factor = 1 - (i / (count + 1)) * 0.5;
            const newR = Math.max(0, Math.min(255, Math.floor(r * factor + (i * 10))));
            const newG = Math.max(0, Math.min(255, Math.floor(g * factor + (i * 10))));
            const newB = Math.max(0, Math.min(255, Math.floor(b * factor + (i * 10))));
            shades.push(`rgba(${newR}, ${newG}, ${newB}, 0.8)`);
        }
        return shades;
    };


    const init = () => {
        if (elements.floatingTimerProgressCircle) elements.floatingTimerProgressCircle.style.strokeDashoffset = circumference;
        
        Object.assign(routineTemplates, loadFromLocalStorage(ROUTINE_TEMPLATE_KEY, {}));
        Object.assign(workoutLogs, loadFromLocalStorage(WORKOUT_LOG_KEY, {}));
        Object.assign(customExercises, loadFromLocalStorage(EXERCISE_LIST_KEY, {}));
        mergeExercises();
        
        renderCalendar(currentYear, currentMonth);
        renderRoutineTemplateList();

        elements.prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar(currentYear, currentMonth);
        });

        elements.nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar(currentYear, currentMonth);
        });
        
        // [수정됨] todayBtn 클릭 시에도 today 변수의 시간을 초기화
        elements.todayBtn.addEventListener('click', () => {
            today = new Date();
            today.setHours(0, 0, 0, 0); // 시간 초기화
            currentYear = today.getFullYear();
            currentMonth = today.getMonth();
            renderCalendar(currentYear, currentMonth);
        });

        elements.dateSearchBtn.addEventListener('click', () => {
            const dateStr = elements.dateSearchInput.value;
            if (dateStr) {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    currentYear = date.getFullYear();
                    currentMonth = date.getMonth();
                    renderCalendar(currentYear, currentMonth);
                    setTimeout(() => {
                        const targetDay = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
                        if(targetDay) {
                            targetDay.classList.add('searched');
                            setTimeout(()=> targetDay.classList.remove('searched'), 1500);
                        }
                    }, 100);
                }
            }
        });

        elements.createNewTemplateBtn.addEventListener('click', () => openTemplateEditor());
        elements.openStatsModalBtn.addEventListener('click', openStatsModal);
        elements.backBtn.addEventListener('click', () => {
            console.log("Back to main page");
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'index.html';
            }
        });

        elements.dailyLogModalList.addEventListener('click', (e) => {
            const date = elements.dailyLogDate.value;
            
            if (e.target.id === 'start-routine-btn') {
                const templateId = prompt("시작할 루틴 템플릿 ID를 선택하세요 (임시):\n" + 
                    Object.keys(routineTemplates).map(id => `${id}: ${routineTemplates[id].title}`).join('\n') + 
                    "\n\n(템플릿 목록에서 '시작' 버튼을 누르는 것이 좋습니다.)");
                if (templateId && routineTemplates[templateId]) {
                    startWorkoutSession(date, templateId);
                } else if (templateId) {
                    alert("유효한 템플릿 ID가 아닙니다.");
                } else {
                    startWorkoutSession(date, null);
                }
            } else if (e.target.classList.contains('edit-log-btn')) {
                alert('로그 수정 기능은 준비 중입니다.');
            } else if (e.target.classList.contains('delete-log-btn')) {
                const logIndex = parseInt(e.target.dataset.logIndex);
                showCustomConfirm("이 운동 기록을 삭제하시겠습니까?", (confirm) => {
                    if (confirm) {
                        workoutLogs[date].splice(logIndex, 1);
                        if (workoutLogs[date].length === 0) {
                            delete workoutLogs[date];
                        }
                        saveToLocalStorage(WORKOUT_LOG_KEY, workoutLogs);
                        renderDailyLogModal(date);
                        renderCalendar(currentYear, currentMonth);
                    }
                });
            }
        });
        
        elements.routineTemplateList.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            if (!id) return;
            
            if (e.target.classList.contains('start-template-btn')) {
                const todayStr = new Date().toISOString().split('T')[0];
                showDailyLogModal(todayStr);
                startWorkoutSession(todayStr, id); 
            } else if (e.target.classList.contains('edit-template-btn')) {
                openTemplateEditor(id);
            }
        });

        elements.saveTemplateBtn.addEventListener('click', saveTemplate);
        elements.deleteTemplateBtn.addEventListener('click', () => {
            if (editingTemplateId) {
                showCustomConfirm("이 루틴 템플릿을 삭제하시겠습니까?", (confirm) => {
                    if (confirm) {
                        delete routineTemplates[editingTemplateId];
                        saveToLocalStorage(ROUTINE_TEMPLATE_KEY, routineTemplates);
                        renderRoutineTemplateList();
                        closeModal(elements.templateEditorModal);
                    }
                });
            }
        });

        elements.addUpdateExerciseBtn.addEventListener('click', () => {
            const name = elements.exerciseListSelect.value;
            const weight = elements.templateWeightInput.value || 0;
            const reps = elements.templateRepsInput.value || 0;
            const sets = elements.templateSetsInput.value || 1;

            if (!name) {
                showCustomConfirm("운동을 선택하세요.", () => {}, false);
                return;
            }

            const exerciseData = { name, weight, reps, sets };
            
            let currentExercises = [];
            if (editingTemplateId) {
                currentExercises = routineTemplates[editingTemplateId].exercises;
            } else {
                 currentExercises = Array.from(elements.templateExerciseList.querySelectorAll('.template-exercise-item'))
                    .map(el => {
                        const name = el.querySelector('.font-bold').textContent;
                        const detailsText = el.querySelector('.text-gray-600').textContent;
                        const details = detailsText.match(/(\S+)kg \/ (\S+)회 \/ (\S+)세트/);
                        return { name: name, weight: details[1], reps: details[2], sets: details[3] };
                    });
            }

            if (editingTemplateExerciseIndex !== null) {
                currentExercises[editingTemplateExerciseIndex] = exerciseData;
            } else {
                currentExercises.push(exerciseData);
            }
            
            if (!editingTemplateId) {
                renderTemplateExerciseList(currentExercises);
            } else {
                renderTemplateExerciseList(currentExercises);
            }

            resetTemplateForm();
        });

        elements.templateExerciseList.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-ex-btn')) {
                const index = parseInt(e.target.dataset.index);
                const template = editingTemplateId ? routineTemplates[editingTemplateId] : null;
                
                let exercise;
                if(template) {
                    exercise = template.exercises[index];
                } else {
                    const itemEl = e.target.closest('.template-exercise-item');
                    const name = itemEl.querySelector('.font-bold').textContent;
                    const details = itemEl.querySelector('.text-gray-600').textContent.match(/(\S+)kg \/ (\S+)회 \/ (\S+)세트/);
                    exercise = { name, weight: details[1], reps: details[2], sets: details[3] };
                }

                const part = getPartForExercise(exercise.name);
                
                populateExerciseSelectors(elements.exerciseCategorySelect, elements.exerciseListSelect, part);
                elements.exerciseCategorySelect.value = part;
                elements.exerciseListSelect.value = exercise.name;
                elements.templateWeightInput.value = exercise.weight;
                elements.templateRepsInput.value = exercise.reps;
                elements.templateSetsInput.value = exercise.sets;
                
                editingTemplateExerciseIndex = index;
                elements.addUpdateExerciseBtn.textContent = '운동 수정';
            } else if (e.target.classList.contains('delete-ex-btn')) {
                const index = parseInt(e.target.dataset.index);
                showCustomConfirm("이 운동을 루틴에서 삭제하시겠습니까?", (confirm) => {
                    if (confirm) {
                         const template = editingTemplateId ? routineTemplates[editingTemplateId] : null;
                         if (template) {
                             template.exercises.splice(index, 1);
                             renderTemplateExerciseList(template.exercises);
                         } else {
                             e.target.closest('.template-exercise-item').remove();
                         }
                    }
                });
            }
        });

        elements.hideSessionBtn.addEventListener('click', () => {
             showCustomConfirm("운동을 완료하지 않고 창을 닫으시겠습니까?\n(진행 내용이 사라집니다)", (confirm) => {
                 if(confirm) {
                    clearInterval(currentWorkoutSession.timerInterval);
                    closeModal(elements.workoutSessionModal);
                 }
             });
        });
        
        elements.saveSessionBtn.addEventListener('click', () => {
             showCustomConfirm("운동을 완료하고 저장하시겠습니까?", (confirm) => {
                 if(confirm) {
                    saveWorkoutSession();
                 }
             });
        });

        elements.workoutSessionList.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            const setIndex = target.dataset.setIndex;
            const exerciseIndex = target.dataset.exerciseIndex;

            if (target.classList.contains('complete-set-btn')) {
                completeSet(Number(setIndex));
            } else if (target.classList.contains('edit-set-btn')) {
                currentWorkoutSession.editingSetIndex = Number(setIndex);
                const set = currentWorkoutSession.log.sets[currentWorkoutSession.editingSetIndex];
                
                elements.addToSessionModalTitle.textContent = "세트 수정";
                elements.sessionWeightInput.value = set.weight;
                elements.sessionRepsInput.value = set.reps;
                elements.sessionSetsInput.value = 1;
                elements.sessionSetsInput.disabled = true;
                elements.saveToSessionBtn.textContent = "수정 완료";
                openModal(elements.addToSessionModal);
                
            } else if (target.classList.contains('delete-set-btn')) {
                 showCustomConfirm("이 세트를 삭제하시겠습니까?", (confirm) => {
                    if (confirm) {
                        currentWorkoutSession.log.sets.splice(Number(setIndex), 1);
                        currentWorkoutSession.log.sets.forEach((set, i) => set.index = i);
                        renderWorkoutSession();
                    }
                 });
            } else if (target.classList.contains('add-set-btn')) {
                const exName = target.dataset.exerciseName;
                addSetToSession(exName, Number(exerciseIndex));
                renderWorkoutSession();
            } else if (target.classList.contains('delete-exercise-btn')) {
                 showCustomConfirm("이 운동의 모든 세트를 삭제하시겠습니까?", (confirm) => {
                    if (confirm) {
                        const exIdx = Number(exerciseIndex);
                        currentWorkoutSession.log.sets = currentWorkoutSession.log.sets
                            .filter(set => set.exerciseIndex !== exIdx)
                            .map((set, i) => {
                                if (set.exerciseIndex > exIdx) {
                                    set.exerciseIndex--;
                                }
                                set.index = i;
                                return set;
                            });
                        renderWorkoutSession();
                    }
                 });
            }
        });
        
        elements.addExerciseToSessionBtn.addEventListener('click', () => {
            populateExerciseSelectors(elements.addExModalCategory, elements.addExModalList);
            openModal(elements.addExerciseModal);
        });

        elements.confirmAddExerciseBtn.addEventListener('click', () => {
            const exerciseName = elements.addExModalList.value;
            if (exerciseName) {
                const maxIndex = currentWorkoutSession.log.sets.length > 0 ?
                    Math.max(...currentWorkoutSession.log.sets.map(s => s.exerciseIndex)) : -1;
                
                currentWorkoutSession.editingSetIndex = null;
                elements.addToSessionModalTitle.textContent = "세션에 운동 추가";
                elements.sessionWeightInput.value = '';
                elements.sessionRepsInput.value = '';
                elements.sessionSetsInput.value = '3';
                elements.sessionSetsInput.disabled = false;
                elements.saveToSessionBtn.textContent = "추가";
                
                elements.saveToSessionBtn.dataset.exerciseName = exerciseName;
                elements.saveToSessionBtn.dataset.exerciseIndex = maxIndex + 1;
                
                openModal(elements.addToSessionModal);
                closeModal(elements.addExerciseModal);
            }
        });
        
        elements.saveToSessionBtn.addEventListener('click', () => {
            const weight = parseFloat(elements.sessionWeightInput.value) || 0;
            const reps = parseInt(elements.sessionRepsInput.value) || 0;
            const sets = parseInt(elements.sessionSetsInput.value) || 1;

            if (currentWorkoutSession.editingSetIndex !== null) {
                const set = currentWorkoutSession.log.sets[currentWorkoutSession.editingSetIndex];
                set.weight = weight;
                set.reps = reps;
                set.pr = checkPR(set.name, set.weight, set.reps);
            } else {
                const exerciseName = elements.saveToSessionBtn.dataset.exerciseName;
                const exerciseIndex = parseInt(elements.saveToSessionBtn.dataset.exerciseIndex);
                for(let i=0; i<sets; i++) {
                    addSetToSession(exerciseName, exerciseIndex, weight, reps);
                }
            }
            
            currentWorkoutSession.editingSetIndex = null;
            renderWorkoutSession();
            closeModal(elements.addToSessionModal);
        });

        elements.openAddExerciseModalBtn.addEventListener('click', () => {
            populateExerciseSelectors(elements.newExercisePart, elements.newExerciseName);
            openModal(elements.addExerciseModal);
        });
        elements.cancelAddExerciseBtn.addEventListener('click', () => closeModal(elements.addExerciseModal));
        elements.saveNewExerciseBtn.addEventListener('click', () => {
            const part = elements.newExercisePart.value;
            const name = elements.newExerciseName.value.trim();
            if (part && name) {
                if (!customExercises[part]) {
                    customExercises[part] = [];
                }
                if (customExercises[part].some(ex => ex.name === name) || exercisesData[part]?.some(ex => ex.name === name)) {
                    showCustomConfirm("이미 존재하는 운동입니다.", () => {}, false);
                    return;
                }
                customExercises[part].push({ name: name, image: null });
                saveToLocalStorage(EXERCISE_LIST_KEY, customExercises);
                mergeExercises();
                populateExerciseSelectors(elements.addExModalCategory, elements.addExModalList);
                populateExerciseSelectors(elements.exerciseCategorySelect, elements.exerciseListSelect);
                populateExerciseSelectors(elements.statsPartSelector, elements.statsExerciseSelect);
                
                closeModal(elements.addExerciseModal);
            } else {
                showCustomConfirm("부위와 운동 이름을 모두 입력하세요.", () => {}, false);
            }
        });

        [elements.statsPartSelector, elements.statsExerciseSelect, elements.statsStartDate, elements.statsEndDate].forEach(el => {
            el.addEventListener('change', renderStatsChart);
        });
        elements.statsResetBtn.addEventListener('click', () => {
            const todayStr = today.toISOString().split('T')[0];
            const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            elements.statsStartDate.value = thirtyDaysAgo;
            elements.statsEndDate.value = todayStr;
            renderStatsChart();
        });
        
        elements.timerStartBtn.addEventListener('click', startSessionTimer);
        elements.timerPauseBtn.addEventListener('click', pauseSessionTimer);
        elements.timerResetBtn.addEventListener('click', resetSessionTimer);
        elements.timerMinus10Btn.addEventListener('click', () => adjustTimer(-10));
        elements.timerPlus10Btn.addEventListener('click', () => adjustTimer(10));
        elements.timerMinus30Btn.addEventListener('click', () => adjustTimer(-30));
        elements.timerPlus30Btn.addEventListener('click', () => adjustTimer(30));
        
        elements.closeFloatingTimer.addEventListener('click', () => {
             clearInterval(currentFloatingTimer);
             currentFloatingTimer = null;
             elements.floatingTimer.style.display = 'none';
        });

        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
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

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                const modal = e.target;
                 if (modal.id === 'workout-session-modal') {
                    elements.hideSessionBtn.click();
                 } else if (modal.id !== 'custom-confirm-modal') {
                    closeModal(modal);
                 }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(closeModal);
            }
        });
        
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', e => e.preventDefault());
        });
        
        document.querySelectorAll('input, textarea, select').forEach(el => {
            el.style.fontSize = '16px';
        });

    };

    init();
});