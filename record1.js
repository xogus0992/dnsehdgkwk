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
        workoutSessionTitle: document.getElementById('workout-session-title'),
        timerInput: document.getElementById('timer-input'),
        timerMinus10Btn: document.getElementById('timer-minus-10'), 
        timerPlus10Btn: document.getElementById('timer-plus-10'),  
        timerMinus30Btn: document.getElementById('timer-minus-30'), 
        timerPlus30Btn: document.getElementById('timer-plus-30'),  
        dailyLogDate: document.getElementById('daily-log-date'), 
        timerDigitalDisplay: document.getElementById('timer-digital-display'),
        clockSecondHand: document.getElementById('clock-second-hand'),
        workoutSessionList: document.getElementById('workout-session-list'),
        hideSessionBtn: document.getElementById('hide-session-btn'),
        addExerciseToSessionBtn: document.getElementById('add-exercise-to-session-btn'),
        saveSessionBtn: document.getElementById('save-session-btn'),
        addToSessionModalTitle: document.getElementById('add-to-session-modal-title'),
        sessionExCategorySelect: document.getElementById('session-ex-category-select'),
        sessionExListSelect: document.getElementById('session-ex-list-select'),
        sessionWeightInput: document.getElementById('session-weight-input'),
        sessionRepsInput: document.getElementById('session-reps-input'),
        sessionSetsInput: document.getElementById('session-sets-input'),
        saveToSessionBtn: document.getElementById('save-to-session-btn'),
        openAddExerciseModalBtn: document.getElementById('open-add-exercise-modal-btn'),
        newExercisePart: document.getElementById('new-exercise-part'),
        newExerciseName: document.getElementById('new-exercise-name'),
        saveNewExerciseBtn: document.getElementById('save-new-exercise-btn'),
        cancelAddExerciseBtn: document.getElementById('cancel-add-exercise-btn'),
        summaryContent: document.getElementById('summary-content'),
        closeSummaryBtn: document.getElementById('close-summary-btn'),
        confirmMessage: document.getElementById('confirm-message'),
        confirmOkBtn: document.getElementById('confirm-ok-btn'),
        confirmCancelBtn: document.getElementById('confirm-cancel-btn'),
    };
    const adjustTimerInput = (seconds) => {
            const currentValue = parseInt(elements.timerInput.value, 10) || 0;
            let newValue = currentValue + seconds;
            if (newValue < 0) newValue = 0; // 0초 미만으로 내려가지 않도록
            elements.timerInput.value = newValue;
        };

        if (elements.timerMinus10Btn) elements.timerMinus10Btn.addEventListener('click', () => adjustTimerInput(-10));
        if (elements.timerPlus10Btn) elements.timerPlus10Btn.addEventListener('click', () => adjustTimerInput(10));
        if (elements.timerMinus30Btn) elements.timerMinus30Btn.addEventListener('click', () => adjustTimerInput(-30));
        if (elements.timerPlus30Btn) elements.timerPlus30Btn.addEventListener('click', () => adjustTimerInput(30));
    
    const ROUTINE_TEMPLATE_KEY = 'my_fitness_templates_v15';
    // 웜업 관련 키워드 제거
    const LOG_KEY = 'my_fitness_logs_v18'; 
    const CUSTOM_EXERCISES_KEY = 'my_fitness_custom_exercises_v9';
    const PR_KEY = 'my_fitness_prs_v10_1rm';

    let routineTemplates = [], workoutLogs = {}, customExercises = {}, personalRecords = {}, combinedExercises = {};
    let calendarDate = new Date();
    let selectedDate = new Date().toLocaleDateString('en-CA');
    let statsChart = null, currentEditingTemplate = { id: null, exercises: [] };
    let currentWorkoutSession = { log: null, originalLogIndex: null, originalTemplateExercises: null };
    let currentlyEditingExerciseIndex = null, sessionEditingExIndex = null; 
    let timerInterval = null, clickTimer = null, confirmCallback = null;
    const floatingTimerProgressCircle = elements.floatingTimerProgress;
    const circumference = floatingTimerProgressCircle ? 2 * Math.PI * floatingTimerProgressCircle.r.baseVal.value : 0;

    const BODY_PART_COLORS = {
        "가슴": 'rgba(239, 68, 68, 0.8)',      // red-500
        "등": 'rgba(59, 130, 246, 0.8)',     // blue-500
        "어깨": 'rgba(245, 158, 11, 0.8)',   // amber-500
        "하체": 'rgba(16, 185, 129, 0.8)',   // green-500
        "팔": 'rgba(139, 92, 246, 0.8)',    // violet-500
        "복근/코어": 'rgba(249, 115, 22, 0.8)', // orange-500
        "전체": 'rgba(107, 114, 128, 0.8)'   // gray-500
    };
    Chart.register(ChartDataLabels);

    const saveToLocalStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));
    const loadFromLocalStorage = (key, defaultValue) => { try { return JSON.parse(localStorage.getItem(key)) || defaultValue; } catch { return defaultValue; } };

    const mergeExercises = () => {
        if (typeof exercisesData === 'undefined' || typeof bodyPartImages === 'undefined') return;
        combinedExercises = {};
        Object.keys(exercisesData).forEach(part => {
            combinedExercises[part] = exercisesData[part].map(e => ({ name: e.name, image: e.image || bodyPartImages[part] || '', part }));
        });
        Object.keys(customExercises).forEach(part => {
            if (!combinedExercises[part]) combinedExercises[part] = [];
            combinedExercises[part].push(...customExercises[part].map(e => ({ name: e.name, image: bodyPartImages[part] || '', custom: true, part })));
        });
    };
    
    const getPartForExercise = (exerciseName) => {
        for (const part in combinedExercises) {
            if (combinedExercises[part].some(e => e.name === exerciseName)) {
                return part;
            }
        }
        return "전체";
    }

    const formatDate = (d) => new Date(d).toLocaleDateString('en-CA');
    const openModal = (el) => el?.classList.add('open');
    const closeModal = (el) => el?.classList.remove('open');
    
    const showConfirm = (message, onConfirm) => {
        elements.confirmMessage.textContent = message;
        confirmCallback = onConfirm;
        openModal(elements.customConfirmModal);
    };

    const calculate1RM = (weight, reps) => {
        if (reps <= 0) return 0;
        if (reps === 1) return weight;
        return weight * (1 + reps / 30);
    };

    const checkAndUpdatePRs = (sessionLog) => {
        let newPRs = [];
        sessionLog.sets.forEach(set => {
            // 웜업 체크(!set.isWarmup) 제거
            if (set.completed && set.reps > 0) {
                const estimated1RM = calculate1RM(set.weight, set.reps);
                if (!personalRecords[set.name] || estimated1RM > personalRecords[set.name].max1RM) {
                    personalRecords[set.name] = { max1RM: estimated1RM };
                    newPRs.push({ name: set.name, value: estimated1RM });
                }
            }
        });

        if (newPRs.length > 0) {
            saveToLocalStorage(PR_KEY, personalRecords);
            elements.prList.innerHTML = newPRs.map(pr => 
                `<div class="flex justify-between items-center text-lg">
                    <span class="font-bold">${pr.name}</span>
                    <span class="text-blue-500 font-semibold">${pr.value.toFixed(1)}kg (1RM)</span>
                </div>`
            ).join('');
            openModal(elements.prCelebrationModal);
        }
    };

    const updateStatsView = () => {
        const activePartBtn = document.querySelector('#stats-part-selector .active');
        const selectedExercise = elements.statsExerciseSelect.value;
        
        let type = '전체';
        let value = '전체';

        if (selectedExercise) {
            type = 'exercise';
            value = selectedExercise;
        } else if (activePartBtn) {
            type = 'part';
            value = activePartBtn.dataset.part;
        }
        
        renderStatsGraph({
            type: type,
            value: value,
            startDate: elements.statsStartDate.value,
            endDate: elements.statsEndDate.value,
        });
    };

    const renderStatsGraph = ({ type, value, startDate = null, endDate = null }) => {
        if (statsChart) statsChart.destroy();

        let relevantDates = Object.keys(workoutLogs).filter(date => {
            return (workoutLogs[date] || []).some(log =>
                (log.sets || []).some(set => {
                    // 웜업 체크(set.isWarmup) 제거
                    if (!set.completed) return false;
                    const part = getPartForExercise(set.name);
                    if (type === '전체') return true;
                    if (type === 'part') return part === value;
                    if (type === 'exercise') return set.name === value;
                    return false;
                })
            );
        }).sort();

        let datesToProcess;
        if (startDate && endDate) {
            datesToProcess = relevantDates.filter(date => date >= startDate && date <= endDate);
        } else {
            datesToProcess = relevantDates.slice(-10);
        }

        const datasets = [];
        const labels = datesToProcess.map(d => d.substring(5));

        if (type === '전체') {
            const partVolumes = {};
            datesToProcess.forEach((date, dateIndex) => {
                (workoutLogs[date] || []).forEach(log => {
                    (log.sets || []).forEach(set => {
                        // 웜업 체크(!set.isWarmup) 제거
                        if (set.completed) {
                            const part = getPartForExercise(set.name);
                            if (!partVolumes[part]) {
                                partVolumes[part] = Array(datesToProcess.length).fill(0);
                            }
                            partVolumes[part][dateIndex] += set.weight * set.reps;
                        }
                    });
                });
            });

            Object.keys(partVolumes).forEach(part => {
                if (partVolumes[part].reduce((a, b) => a + b, 0) > 0) {
                    datasets.push({
                        label: part,
                        data: partVolumes[part],
                        backgroundColor: BODY_PART_COLORS[part] || BODY_PART_COLORS['전체'],
                    });
                }
            });
        } else if (type === 'part') {
            const exercisesInPart = combinedExercises[value].map(e => e.name);
            const exerciseVolumes = {};
            datesToProcess.forEach((date, dateIndex) => {
                (workoutLogs[date] || []).forEach(log => {
                    (log.sets || []).forEach(set => {
                        // 웜업 체크(!set.isWarmup) 제거
                        if (set.completed && exercisesInPart.includes(set.name)) {
                            if (!exerciseVolumes[set.name]) {
                                exerciseVolumes[set.name] = Array(datesToProcess.length).fill(0);
                            }
                            exerciseVolumes[set.name][dateIndex] += set.weight * set.reps;
                        }
                    });
                });
            });
            const baseColor = BODY_PART_COLORS[value] || BODY_PART_COLORS['전체'];
            const shades = generateShades(baseColor, Object.keys(exerciseVolumes).length);
            let i = 0;
            Object.keys(exerciseVolumes).forEach(exerciseName => {
                if (exerciseVolumes[exerciseName].reduce((a, b) => a + b, 0) > 0) {
                    datasets.push({
                        label: exerciseName,
                        data: exerciseVolumes[exerciseName],
                        backgroundColor: shades[i++] || baseColor,
                    });
                }
            });
        } else { // 'exercise'
            const data = datesToProcess.map(date => {
                let dailyVol = 0;
                (workoutLogs[date] || []).forEach(log => {
                    (log.sets || []).forEach(set => {
                        // 웜업 체크(!set.isWarmup) 제거
                        if (set.completed && set.name === value) {
                            dailyVol += set.weight * set.reps;
                        }
                    });
                });
                return dailyVol;
            });
            datasets.push({
                label: value,
                data: data,
                backgroundColor: BODY_PART_COLORS[getPartForExercise(value)] || BODY_PART_COLORS['전체'],
            });
        }
        
        statsChart = new Chart(elements.statsChartCanvas, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        formatter: (value, context) => {
                             const datasetArray = [];
                             context.chart.data.datasets.forEach((dataset) => {
                                 const val = dataset.data[context.dataIndex];
                                 if(val > 0) datasetArray.push(val);
                             });
                             const total = datasetArray.reduce((a, b) => a + b, 0);
                             if (value === datasetArray[datasetArray.length - 1] && total > 0) { 
                                return `${Math.round(total)}kg`;
                             } else {
                                return '';
                             }
                        },
                        color: '#4a5568',
                        font: { weight: 'bold' }
                    },
                    legend: {
                        display: (type === '전체' || type === 'part') && datasets.length > 1,
                    }
                },
                scales: {
                    x: { stacked: true },
                    y: { 
                        stacked: true, 
                        beginAtZero: true,
                        grace: '20%'
                    }
                }
            }
        });
    };
    
     const initializeStatsView = () => {
        elements.statsPartSelector.innerHTML = Object.keys(BODY_PART_COLORS).filter(p => p !== '전체').map(part => `<button class="stats-selector-btn" data-part="${part}">${part}</button>`).join('');
        elements.statsExerciseSelect.innerHTML = '<option value="">-- 부위 먼저 선택 --</option>';
        elements.statsStartDate.value = '';
        elements.statsEndDate.value = '';
        renderStatsGraph({ type: '전체', value: '전체' });
    };

    const renderCalendar = () => {
        const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
        elements.calendarTitle.textContent = `${year}년 ${month + 1}월`;
        elements.calendarBody.innerHTML = '';
        const firstDay = new Date(year, month, 1).getDay(), lastDate = new Date(year, month + 1, 0).getDate();
        const todayStr = formatDate(new Date());

        for (let i = 0; i < firstDay; i++) elements.calendarBody.appendChild(document.createElement('div'));
        for (let d = 1; d <= lastDate; d++) {
            const dateStr = formatDate(new Date(year, month, d));
            const dayEl = document.createElement('div');
            let totalVolume = 0;
            if (workoutLogs[dateStr]?.length > 0) {
                // 웜업 체크(!s.isWarmup) 제거
                workoutLogs[dateStr].forEach(log => (log.sets || []).forEach(s => { if(s.completed) totalVolume += (s.weight || 0) * (s.reps || 0)}));
            }
            
            let dayClasses = 'calendar-day';
            if(workoutLogs[dateStr]?.length > 0) dayClasses += ' has-log';
            if(dateStr === todayStr) dayClasses += ' today';
            if(dateStr === selectedDate) dayClasses += ' selected';
            if(dateStr > todayStr) dayClasses += ' future';

            dayEl.className = dayClasses;
            dayEl.dataset.date = dateStr;
            dayEl.innerHTML = `<div class="day-number">${d}</div>` + (totalVolume > 0 ? `<div class="day-volume">${totalVolume.toLocaleString()}kg</div>` : '');
            elements.calendarBody.appendChild(dayEl);
        }
    };
    
    // ( ... 이하 생략 ... )
    // ( ...
    //  ... 웜업과 관련 없는 기존 코드는 동일하게 유지됩니다 ...
    // ... )

    // ( ... )
    // ( ... )
    // ( ... )
    
    const renderDailyLog = () => {
        elements.dailyLogModalTitle.textContent = `${selectedDate} 운동 기록`;
        const logs = workoutLogs[selectedDate] || [];
        if (logs.length === 0) {
            elements.dailyLogModalList.innerHTML = '<p class="text-gray-500">이 날짜에 저장된 운동 기록이 없습니다.</p>';
            openModal(elements.dailyLogModal);
            return;
        }

        elements.dailyLogModalList.innerHTML = logs.map((log, logIdx) => {
            const exercisesHtml = log.exercises.map((ex, exIdx) => {
                const setsForExercise = (log.sets || []).filter(s => s.exerciseIndex === exIdx);
                // 웜업 관련 클래스 및 텍스트(s.isWarmup) 제거
                const setsHtml = setsForExercise.map(s => `
                    <li class="flex justify-between items-center">
                        <span>
                            <span class="font-bold inline-block w-12">${s.setNumber + '세트'}</span>
                            ${s.weight}kg × ${s.reps}회
                        </span>
                        <span class="font-bold text-lg ${s.completed ? 'text-green-500' : 'text-gray-300'}">✓</span>
                    </li>
                `).join('');
                
                // 웜업 세트 카운트(warmupsDone) 제거
                return `
                    <div class="mb-3">
                        <h5 class="font-bold text-lg">${ex.name}</h5>
                        <ul class="space-y-1 mt-1 pl-2">${setsHtml}</ul>
                    </div>`;
            }).join('');

            return `
                <div class="mb-3 pb-3 border-b">
                    <div class="flex justify-between items-start">
                        <h4 class="font-bold text-xl">${log.title}</h4>
                        <div class="flex gap-2">
                            <button class="text-btn text-red-500 delete-log-btn" data-log-index="${logIdx}">삭제</button>
                        </div>
                    </div>
                    <div class="mt-2">${exercisesHtml}</div>
                </div>`;
        }).join('');
        openModal(elements.dailyLogModal);
    };

    const createLogFromTemplate = (template) => {
        const newLog = {
            id: template.id,
            title: template.title,
            exercises: JSON.parse(JSON.stringify(template.exercises)),
            sets: []
        };
        
        // 웜업 세트 생성 로직 제거

        // 본 세트 생성
        newLog.exercises.forEach((ex, exIndex) => {
            for (let i = 0; i < ex.sets; i++) {
                newLog.sets.push({
                    name: ex.name,
                    exerciseIndex: exIndex,
                    setNumber: i + 1,
                    weight: ex.weight,
                    reps: ex.reps,
                    completed: false,
                    // isWarmup: false 제거
                });
            }
        });
        return newLog;
    };
    
    // ( ... )

    const renderWorkoutSession = () => {
        if (!currentWorkoutSession.log) return;
        elements.workoutSessionTitle.textContent = currentWorkoutSession.log.title;
        elements.workoutSessionList.innerHTML = '';
        
        currentWorkoutSession.log.exercises.forEach((ex, exIndex) => {
            const container = document.createElement('div');
            container.className = 'mb-4 border-b pb-3';
            container.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <h4 class="text-xl font-bold">${ex.name}</h4>
                    <div>
                        <button class="session-action-btn complete-all-btn" data-exercise-index="${exIndex}">전체완료</button>
                        <button class="session-action-btn edit-ex-btn" data-exercise-index="${exIndex}">편집</button>
                        <button class="session-action-btn delete-ex-btn" data-exercise-index="${exIndex}">삭제</button>
                    </div>
                </div>`;

            const setsForExercise = currentWorkoutSession.log.sets.filter(s => s.exerciseIndex === exIndex);
            
            // 웜업 세트 렌더링 로직(warmupSets) 제거
            
            // 본 세트 렌더링 (isWarmup, isFirstMainSet 파라미터 제거)
            setsForExercise.forEach((set, setIndex) => {
                const setDiv = createSetElement(set, setIndex === 0, exIndex);
                container.appendChild(setDiv);
            });
            
            elements.workoutSessionList.appendChild(container);
        });
    };

    // createSetElement 파라미터에서 isWarmup, isFirstMainSet 제거
    const createSetElement = (set, isFirstSet = false, exerciseIndex = -1) => {
        const setDiv = document.createElement('div');
        // 웜업 클래스(warmup-set-text) 제거
        setDiv.className = `flex items-center justify-between mb-2 p-2 rounded-lg transition-colors duration-300`;
        
        const setIndex = currentWorkoutSession.log.sets.indexOf(set);
        let actionButtonHtml = '';

        // 웜업 버튼 관련 if (isWarmup) 로직 제거
        
        // 웜업 추가 버튼(warmupBtnHtml) 제거, 정렬용 placeholder만 남김
        actionButtonHtml = `
            <div class="w-20"></div> 
            <button class="session-action-btn ${set.completed ? 'bg-blue-500 text-white' : 'bg-gray-300 hover:bg-gray-400'} set-complete-btn" data-set-index="${setIndex}">✓</button>
        `;

        setDiv.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-bold text-lg w-12 text-center text-gray-500">${set.setNumber}</span>
                <input type="number" class="session-set-input weight-input" value="${set.weight}" data-set-index="${setIndex}">
                <span class="text-gray-600">kg</span>
                <input type="number" class="session-set-input reps-input" value="${set.reps}" data-set-index="${setIndex}">
                <span class="text-gray-600">회</span>
            </div>
            <div class="flex gap-2">
                ${actionButtonHtml}
            </div>
        `;
        return setDiv;
    };
    
    // ( ... )

    const bindEventListeners = () => {
        // ( ... )
        // ( ... 캘린더, 모달 버튼 등 기존 리스너 ... )
        // ( ... )
        
        elements.workoutSessionList.addEventListener('click', e => {
            const deleteWarmupBtn = e.target.closest('.delete-warmup-btn');
            const addWarmupBtn = e.target.closest('.add-warmup-btn');
            const completeBtn = e.target.closest('.set-complete-btn');
            const completeAllBtn = e.target.closest('.complete-all-btn');
            const editBtn = e.target.closest('.edit-ex-btn');
            const deleteBtn = e.target.closest('.delete-ex-btn');

            // 웜업 삭제 버튼 핸들러 제거
            
            // 웜업 추가 버튼 핸들러 제거

            if (completeBtn) {
                const setIndex = Number(completeBtn.dataset.setIndex);
                const set = currentWorkoutSession.log.sets[setIndex];
                set.completed = !set.completed;
                if(set.completed) { // 웜업 체크 제거
                    startTimer(); 
                }
                renderWorkoutSession();
            } else if (completeAllBtn) {
                const exIndex = Number(completeAllBtn.dataset.exerciseIndex);
                currentWorkoutSession.log.sets.forEach(set => {
                    // 웜업 체크 제거
                    if(set.exerciseIndex === exIndex) set.completed = true;
                });
                renderWorkoutSession();
            } else if (editBtn) {
                openAddToSessionModal(Number(editBtn.dataset.exerciseIndex));
            } else if (deleteBtn) {
                const exIndex = Number(deleteBtn.dataset.exerciseIndex);
                showConfirm("이 운동을 세션에서 삭제하시겠습니까?", () => {
                    const exercises = currentWorkoutSession.log.exercises;
                    let sets = currentWorkoutSession.log.sets;
                    exercises.splice(exIndex, 1);
                    currentWorkoutSession.log.sets = sets.filter(s => s.exerciseIndex !== exIndex);
                    // Re-index sets
                    currentWorkoutSession.log.sets.forEach(s => {
                        if (s.exerciseIndex > exIndex) {
                            s.exerciseIndex--;
                        }
                    });
                    renderWorkoutSession();
                });
            }
        });

        // ( ... )
        
        elements.saveToSessionBtn.addEventListener('click', () => {
            const name = elements.sessionExListSelect.value;
            const weight = Number(elements.sessionWeightInput.value) || 0;
            const reps = Number(elements.sessionRepsInput.value) || 0;
            const setsCount = Number(elements.sessionSetsInput.value) || 0;

            if (!name || setsCount <= 0) return alert('운동과 세트 수를 올바르게 입력해주세요.');
            
            const exIndexToModify = (sessionEditingExIndex !== null) ? sessionEditingExIndex : currentWorkoutSession.log.exercises.length;

            if (sessionEditingExIndex !== null) {
                // 기존 세트 삭제 (웜업/본세트 구분 없음)
                currentWorkoutSession.log.sets = currentWorkoutSession.log.sets.filter(s => s.exerciseIndex !== sessionEditingExIndex);
                currentWorkoutSession.log.exercises[sessionEditingExIndex] = { name, weight, reps, sets: setsCount };
            } else {
                currentWorkoutSession.log.exercises.push({ name, weight, reps, sets: setsCount });
            }

            // 세트 추가 (isWarmup: false 제거)
            for (let i = 0; i < setsCount; i++) {
                currentWorkoutSession.log.sets.push({
                    name,
                    exerciseIndex: exIndexToModify,
                    setNumber: i + 1,
                    weight,
                    reps,
                    completed: false
                });
            }
            
            renderWorkoutSession();
            closeModal(elements.addToSessionModal);
            sessionEditingExIndex = null;
        });
        
        // ( ... 나머지 모든 이벤트 리스너 ... )
    };

    // ( ... )
    
    // ( ... )
    // ( init 함수 및 나머지 코드 ... )
    // ( ... )

    const init = () => {
        if (floatingTimerProgressCircle) floatingTimerProgressCircle.style.strokeDashoffset = circumference;
        Object.assign(routineTemplates, loadFromLocalStorage(ROUTINE_TEMPLATE_KEY, []));
        Object.assign(workoutLogs, loadFromLocalStorage(LOG_KEY, {}));
        Object.assign(customExercises, loadFromLocalStorage(CUSTOM_EXERCISES_KEY, {}));
        Object.assign(personalRecords, loadFromLocalStorage(PR_KEY, {}));
        
        mergeExercises();
        renderCalendar();
        renderRoutineTemplates();
        initializeStatsView();
        bindEventListeners();
    };

    init();
});
