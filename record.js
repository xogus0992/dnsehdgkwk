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
    const LOG_KEY = 'my_fitness_logs_v18_warmup'; // Key updated for new structure
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
            if (set.completed && set.reps > 0 && !set.isWarmup) {
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
                    if (!set.completed || set.isWarmup) return false;
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
                        if (set.completed && !set.isWarmup) {
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
                        if (set.completed && !set.isWarmup && exercisesInPart.includes(set.name)) {
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
                        if (set.completed && !set.isWarmup && set.name === value) {
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
                workoutLogs[dateStr].forEach(log => (log.sets || []).forEach(s => { if(s.completed && !s.isWarmup) totalVolume += (s.weight || 0) * (s.reps || 0)}));
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

    const renderRoutineTemplates = () => {
        elements.routineTemplateList.innerHTML = !routineTemplates?.length ? '<p class="text-gray-500 text-sm">템플릿이 없습니다.</p>' :
            routineTemplates.map(t => `
                <div class="p-4 border rounded-lg mb-2" data-id="${t.id}">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-lg">${t.title}</span>
                        <div class="flex items-center gap-2">
                            <button class="start-routine-btn text-green-500 font-bold hover:text-green-600 transition" data-id="${t.id}">▶ 시작</button>
                            <button class="edit-template-btn text-btn hover:text-blue-500 transition" data-id="${t.id}">편집</button>
                            <button class="delete-template-btn text-btn text-red-500 hover:text-red-600 transition" data-id="${t.id}">삭제</button>
                        </div>
                    </div>
                    <div class="mt-2 space-y-1 text-gray-600">${t.exercises.map(ex => `<div class="flex justify-between"><span>${ex.name}</span><span>${ex.weight}kg x ${ex.reps}회 x ${ex.sets}세트</span></div>`).join('')}</div>
                </div>
            `).join('');
    };
    
    const openDailyLogModal = (date) => {
        elements.dailyLogModalTitle.textContent = `${date} 운동 기록`;
        const logs = workoutLogs[date] || [];
        elements.dailyLogModalList.innerHTML = logs.length === 0 ? '<p class="text-gray-500">기록이 없습니다.</p>' :
            logs.map((log, logIdx) => {
                const exercisesHtml = (log.exercises || []).map((ex, exIdx) => {
                    const setsForExercise = (log.sets || []).filter(s => s.exerciseIndex === exIdx);
                    const setsHtml = setsForExercise.map(s => `
                        <li class="flex justify-between items-center ${s.isWarmup ? 'warmup-set-text' : ''}">
                            <span>
                                <span class="font-bold inline-block w-12">${s.isWarmup ? '웜업' : s.setNumber + '세트'}</span>
                                ${s.weight}kg × ${s.reps}회
                            </span>
                            <span class="font-bold text-lg ${s.completed ? 'text-green-500' : 'text-gray-300'}">✓</span>
                        </li>
                    `).join('');
                    
                    const warmupsDone = setsForExercise.filter(s => s.isWarmup && s.completed).length;
                    
                    return `
                        <div class="mb-3">
                            <h5 class="font-bold text-lg">${ex.name} ${warmupsDone > 0 ? `<span class="text-sm font-normal text-blue-500">(웜업 ${warmupsDone}세트)</span>` : ''}</h5>
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
            id: template.id, title: template.title,
            exercises: JSON.parse(JSON.stringify(template.exercises)),
            sets: []
        };
        newLog.exercises.forEach((ex, exIndex) => {
            for (let i = 0; i < ex.sets; i++) {
                newLog.sets.push({
                    name: ex.name, exerciseIndex: exIndex, setNumber: i + 1,
                    weight: ex.weight, reps: ex.reps, completed: false, isWarmup: false
                });
            }
        });
        return newLog;
    }

    const openWorkoutSessionModal = (logTemplate, originalLogIndex = null) => {
        if (currentWorkoutSession.log) {
            showConfirm("진행 중인 운동이 있습니다. 이어서 하시겠습니까?", () => {
                reOpenWorkoutSessionModal();
            });
            return;
        }
        const log = createLogFromTemplate(logTemplate);
        currentWorkoutSession = { 
            log: log, 
            originalLogIndex,
            originalTemplateExercises: JSON.stringify(log.exercises),
        };
        renderWorkoutSession();
        openModal(elements.workoutSessionModal);
    };

    const reOpenWorkoutSessionModal = () => {
        if (currentWorkoutSession.log) {
            elements.floatingTimer.classList.add('hidden');
            openModal(elements.workoutSessionModal);
        }
    };

    const hideWorkoutSessionModal = () => {
        closeModal(elements.workoutSessionModal);
        if (currentWorkoutSession.log) {
            elements.floatingTimer.classList.remove('hidden');
        }
    };

    const cancelWorkoutSession = () => {
        clearInterval(timerInterval);
        currentWorkoutSession = { log: null, originalLogIndex: null, originalTemplateExercises: null };
        elements.floatingTimer.classList.add('hidden');
        elements.timerDigitalDisplay.textContent = '00:00';
        if (elements.clockSecondHand) elements.clockSecondHand.style.transform = 'rotate(0deg)';
        if (floatingTimerProgressCircle) floatingTimerProgressCircle.style.strokeDashoffset = circumference;
    };
    
    const renderWorkoutSession = () => {
        elements.workoutSessionTitle.textContent = currentWorkoutSession.log.title || '루틴';
        elements.workoutSessionList.innerHTML = '';
        currentWorkoutSession.log.exercises.forEach((ex, exIndex) => {
            const container = document.createElement('div');
            container.className = 'border-b border-gray-200 pb-4 mb-4';
            container.innerHTML = `<div class="flex justify-between items-center mb-3">
                <p class="text-2xl font-bold text-gray-800">${ex.name}</p>
                <div class="flex items-center gap-2">
                    <button class="complete-all-sets-btn bg-gray-200 hover:bg-gray-300 text-xs px-2 py-1 rounded-md font-semibold transition" data-exercise-index="${exIndex}">전체 완료</button>
                    <button class="icon-btn edit-session-ex-btn" data-exercise-index="${exIndex}">✏️</button>
                    <button class="icon-btn delete-session-ex-btn text-red-500 font-bold" data-exercise-index="${exIndex}">×</button>
                </div>
            </div>`;

            const setsForExercise = currentWorkoutSession.log.sets.filter(s => s.exerciseIndex === exIndex);
            
            // Render warm-up sets first
            setsForExercise.filter(s => s.isWarmup).forEach(set => {
                const setDiv = createSetElement(set, true);
                container.appendChild(setDiv);
            });

            // Render main sets
            const mainSets = setsForExercise.filter(s => !s.isWarmup);
            mainSets.forEach((set, mainSetIndex) => {
                const setDiv = createSetElement(set, false, mainSetIndex === 0, exIndex);
                container.appendChild(setDiv);
            });
            
            elements.workoutSessionList.appendChild(container);
        });
    };

    const createSetElement = (set, isWarmup, isFirstMainSet = false, exerciseIndex = -1) => {
        const setDiv = document.createElement('div');
        setDiv.className = `flex items-center justify-between mb-2 p-2 rounded-lg transition-colors duration-300 ${isWarmup ? 'warmup-set-text' : ''}`;
        const setIndex = currentWorkoutSession.log.sets.indexOf(set);
        
        let actionButtonHtml = '';
        if (isWarmup) {
            actionButtonHtml = `<button class="session-action-btn delete-warmup-btn" data-set-index="${setIndex}">×</button>`;
        } else {
             const warmupBtnHtml = isFirstMainSet 
                ? `<button class="session-action-btn add-warmup-btn" data-exercise-index="${exerciseIndex}">웜업</button>` 
                : `<div class="w-20"></div>`; // Placeholder to align buttons
            
            actionButtonHtml = `
                ${warmupBtnHtml}
                <button class="session-action-btn ${set.completed ? 'bg-blue-500 text-white' : 'bg-gray-300 hover:bg-gray-400'} set-complete-btn" data-set-index="${setIndex}">✓</button>
            `;
        }

        setDiv.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-bold text-lg w-12 text-center ${isWarmup ? '' : 'text-gray-500'}">${isWarmup ? '웜업' : `${set.setNumber}`}</span>
                <input type="number" class="session-set-input weight-input" value="${set.weight}" data-set-index="${setIndex}"> <span class="text-gray-600">kg</span>
                <input type="number" class="session-set-input reps-input" value="${set.reps}" data-set-index="${setIndex}"> <span class="text-gray-600">회</span>
            </div>
            <div class="flex items-center gap-2">
                ${actionButtonHtml}
            </div>
        `;
        return setDiv;
    };
    
    const openWorkoutSummaryModal = (log) => {
        let totalVolume = 0;
        const allExercisesFlat = Object.values(combinedExercises).flat();
        let html = (log.exercises || []).map(ex => {
            let exerciseVolume = 0;
            const completedSets = (log.sets || []).filter(s => s.name === ex.name && s.completed && !s.isWarmup);
            completedSets.forEach(s => exerciseVolume += (s.weight || 0) * (s.reps || 0));
            totalVolume += exerciseVolume;
            const exerciseInfo = allExercisesFlat.find(e => e.name === ex.name);
            return `<div class="summary-item p-2 border-b"><img src="${exerciseInfo?.image || ''}" alt="${ex.name}" onerror="this.style.display='none'">
                <div><p class="font-bold text-lg">${ex.name}</p><p class="text-gray-600">${completedSets.length} / ${ex.sets} 세트 (볼륨: ${exerciseVolume.toLocaleString()}kg)</p></div></div>`;
        }).join('');
        elements.summaryContent.innerHTML = `<div class="text-center mb-3"><h4 class="font-bold">총 볼륨</h4><p class="text-3xl font-bold text-blue-600">${totalVolume.toLocaleString()} kg</p></div>` + html;
        openModal(elements.summaryModal);
    };
    
    const openTemplateEditorModal = (templateId) => {
        currentEditingTemplate.id = templateId;
        if (templateId) {
            const template = routineTemplates.find(t => t.id === templateId);
            elements.templateModalTitle.textContent = "루틴 편집";
            elements.templateTitleInput.value = template?.title || '';
            currentEditingTemplate.exercises = JSON.parse(JSON.stringify(template?.exercises || []));
        } else {
            elements.templateModalTitle.textContent = "새 루틴 만들기";
            elements.templateTitleInput.value = "";
            currentEditingTemplate.exercises = [];
            currentEditingTemplate.id = null;
        }
        populateExerciseSelectors(elements.exerciseCategorySelect, elements.exerciseListSelect);
        renderTemplateExerciseList();
        resetExerciseInputs(elements.templateWeightInput, elements.templateRepsInput, elements.templateSetsInput, elements.addUpdateExerciseBtn);
        openModal(elements.templateEditorModal);
    };

    const openAddToSessionModal = (exIndex = null) => {
        sessionEditingExIndex = exIndex;
        populateExerciseSelectors(elements.sessionExCategorySelect, elements.sessionExListSelect);
        if (exIndex !== null) {
            const ex = currentWorkoutSession.log.exercises[exIndex];
            elements.addToSessionModalTitle.textContent = "운동 편집";
            elements.sessionWeightInput.value = ex.weight;
            elements.sessionRepsInput.value = ex.reps;
            elements.sessionSetsInput.value = ex.sets;
            elements.saveToSessionBtn.textContent = "수정";
        } else {
            elements.addToSessionModalTitle.textContent = "세션에 운동 추가";
            elements.sessionWeightInput.value = '';
            elements.sessionRepsInput.value = '';
            elements.sessionSetsInput.value = '';
            elements.saveToSessionBtn.textContent = "추가";
        }
        openModal(elements.addToSessionModal);
    };

    const populateExerciseSelectors = (categorySelect, listSelect) => {
        const parts = Object.keys(combinedExercises);
        categorySelect.innerHTML = parts.map(p => `<option value="${p}">${p}</option>`).join('');
        const updateList = () => {
            const selectedPart = categorySelect.value;
            listSelect.innerHTML = (combinedExercises[selectedPart] || []).map(e => `<option value="${e.name}">${e.name}</option>`).join('');
        };
        categorySelect.onchange = updateList;
        updateList();
    };

    const resetExerciseInputs = (weightInput, repsInput, setsInput, button) => {
        weightInput.value = ''; repsInput.value = ''; setsInput.value = '';
        if(button) button.textContent = '운동 추가';
        currentlyEditingExerciseIndex = null;
    };

    const renderTemplateExerciseList = () => {
        elements.templateExerciseList.innerHTML = !currentEditingTemplate.exercises?.length ? '<p class="text-gray-500">운동을 추가해주세요.</p>' :
            currentEditingTemplate.exercises.map((ex, idx) => `
                <div class="flex justify-between items-center p-2 border-b">
                    <span>${ex.name} (${ex.weight}kg x ${ex.reps}회 x ${ex.sets}세트)</span>
                    <div>
                        <button class="edit-exercise-btn text-btn hover:text-blue-500 transition" data-index="${idx}">편집</button>
                        <button class="delete-template-ex-btn text-red-500 font-bold" data-index="${idx}">×</button>
                    </div>
                </div>
            `).join('');
    };
    
     const bindEventListeners = () => {
        elements.backBtn.addEventListener('click', () => history.back());
        elements.prevMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
        elements.nextMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });
        elements.todayBtn.addEventListener('click', () => { calendarDate = new Date(); selectedDate = formatDate(new Date()); renderCalendar(); });
        elements.dateSearchBtn.addEventListener('click', () => elements.dateSearchInput.showPicker?.());
        elements.dateSearchInput.addEventListener('change', (e) => { const d = new Date(e.target.value); if (!isNaN(d)) { calendarDate = d; selectedDate = e.target.value; renderCalendar(); } });
        elements.calendarBody.addEventListener('click', (e) => {
            const dayEl = e.target.closest('.calendar-day');
            if (!dayEl?.dataset.date || dayEl.classList.contains('future')) return;
            clearTimeout(clickTimer);
            if (e.detail === 1) clickTimer = setTimeout(() => { selectedDate = dayEl.dataset.date; renderCalendar(); }, 220);
            else if (e.detail === 2) { selectedDate = dayEl.dataset.date; renderCalendar(); openDailyLogModal(selectedDate); }
        });

        document.querySelectorAll('.modal-overlay').forEach(m => {
            m.addEventListener('click', (e) => {
                if (e.target !== m) return;
                if (m.id === 'workout-session-modal' && currentWorkoutSession.log) {
                    hideWorkoutSessionModal();
                } else if (m.id !== 'workout-session-modal') {
                    closeModal(m);
                }
            });
        });
        document.querySelectorAll('.close-modal-btn').forEach(b => b.addEventListener('click', (e) => closeModal(e.target.closest('.modal-overlay'))));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('.modal-overlay.open:not(#workout-session-modal)')) { document.querySelector('.modal-overlay.open:not(#workout-session-modal)').classList.remove('open'); }});
        
        elements.closeSummaryBtn.addEventListener('click', () => closeModal(elements.summaryModal));
        elements.openStatsModalBtn.addEventListener('click', () => { initializeStatsView(); openModal(elements.statsModal); });
        elements.closePrModal.addEventListener('click', () => closeModal(elements.prCelebrationModal));


        [elements.statsStartDate, elements.statsEndDate].forEach(el => el.addEventListener('change', updateStatsView));
        elements.statsResetBtn.addEventListener('click', () => {
            elements.statsStartDate.value = '';
            elements.statsEndDate.value = '';
            updateStatsView();
        });

        elements.statsPartSelector.addEventListener('click', e => {
            const target = e.target.closest('.stats-selector-btn');
            if (!target) return;
            
            if(target.classList.contains('active')) {
                target.classList.remove('active');
                 elements.statsExerciseSelect.innerHTML = '<option value="">-- 부위 먼저 선택 --</option>';
            } else {
                document.querySelectorAll('#stats-part-selector .stats-selector-btn').forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                const part = target.dataset.part;
                elements.statsExerciseSelect.innerHTML = `<option value="">-- 전체 부위 --</option>` + (combinedExercises[part] || []).map(ex => `<option value="${ex.name}">${ex.name}</option>`).join('');
            }
            updateStatsView();
        });
        elements.statsExerciseSelect.addEventListener('change', updateStatsView);

        elements.routineTemplateList.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            const templateId = btn?.closest('[data-id]')?.dataset.id;
            if (!templateId) return;
            if (btn.classList.contains('edit-template-btn')) openTemplateEditorModal(templateId);
            else if (btn.classList.contains('start-routine-btn')) {
                const templ = routineTemplates.find(t => t.id === templateId);
                if (templ) openWorkoutSessionModal(templ);
            } else if (btn.classList.contains('delete-template-btn')) {
                 showConfirm("이 루틴을 삭제하시겠습니까?", () => {
                    routineTemplates = routineTemplates.filter(t => t.id !== templateId);
                    saveToLocalStorage(ROUTINE_TEMPLATE_KEY, routineTemplates);
                    renderRoutineTemplates();
                });
            }
        });
        elements.createNewTemplateBtn.addEventListener('click', () => openTemplateEditorModal(null));

        const setupEnterKeyFlow = (weightId, repsId, setsId, buttonId) => {
            const weightInput = document.getElementById(weightId);
            const repsInput = document.getElementById(repsId);
            const setsInput = document.getElementById(setsId);
            const button = document.getElementById(buttonId);

            weightInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); repsInput.focus(); } });
            repsInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); setsInput.focus(); } });
            setsInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); button.click(); } });
        };
        setupEnterKeyFlow('template-weight-input', 'template-reps-input', 'template-sets-input', 'add-update-exercise-btn');
        setupEnterKeyFlow('session-weight-input', 'session-reps-input', 'session-sets-input', 'save-to-session-btn');


        elements.addUpdateExerciseBtn.addEventListener('click', () => {
            const name = elements.exerciseListSelect.value;
            const weight = Number(elements.templateWeightInput.value) || 0;
            const reps = Number(elements.templateRepsInput.value) || 0;
            const sets = Number(elements.templateSetsInput.value) || 0;
            if (!name || sets <= 0) return alert('운동을 선택하고 세트 수를 입력해주세요.');
            const exObj = { name, weight, reps, sets };
            if (currentlyEditingExerciseIndex !== null) currentEditingTemplate.exercises[currentlyEditingExerciseIndex] = exObj;
            else currentEditingTemplate.exercises.push(exObj);
            renderTemplateExerciseList();
            resetExerciseInputs(elements.templateWeightInput, elements.templateRepsInput, elements.templateSetsInput, elements.addUpdateExerciseBtn);
        });
        elements.templateExerciseList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-exercise-btn');
            const delBtn = e.target.closest('.delete-template-ex-btn');
            if (editBtn) {
                const idx = Number(editBtn.dataset.index);
                const ex = currentEditingTemplate.exercises[idx];
                elements.templateWeightInput.value = ex.weight;
                elements.templateRepsInput.value = ex.reps;
                elements.templateSetsInput.value = ex.sets;
                elements.addUpdateExerciseBtn.textContent = '운동 수정';
                currentlyEditingExerciseIndex = idx;
            } else if (delBtn) {
                const idx = Number(delBtn.dataset.index);
                showConfirm("이 운동을 루틴에서 삭제하시겠습니까?", () => {
                    currentEditingTemplate.exercises.splice(idx, 1);
                    renderTemplateExerciseList();
                });
            }
        });
        elements.saveTemplateBtn.addEventListener('click', () => {
            let title = elements.templateTitleInput.value.trim();
            if (!title) {
                const partsInRoutine = new Set();
                currentEditingTemplate.exercises.forEach(ex => {
                    for (const part in combinedExercises) {
                        if (combinedExercises[part].some(e => e.name === ex.name)) {
                            partsInRoutine.add(part); break;
                        }
                    }
                });
                title = [...partsInRoutine].join(', ') || '나의 루틴';
            }
            if (currentEditingTemplate.id) {
                const index = routineTemplates.findIndex(t => t.id === currentEditingTemplate.id);
                if (index > -1) routineTemplates[index] = { ...routineTemplates[index], title, exercises: currentEditingTemplate.exercises };
            } else {
                routineTemplates.push({ id: Date.now().toString(), title, exercises: currentEditingTemplate.exercises });
            }
            saveToLocalStorage(ROUTINE_TEMPLATE_KEY, routineTemplates);
            renderRoutineTemplates();
            closeModal(elements.templateEditorModal);
        });
        
        elements.openAddExerciseModalBtn.addEventListener('click', () => {
             populateExerciseSelectors(elements.newExercisePart, elements.newExerciseName);
             openModal(elements.addExerciseModal);
        });
        elements.cancelAddExerciseBtn.addEventListener('click', () => closeModal(elements.addExerciseModal));
        elements.saveNewExerciseBtn.addEventListener('click', () => {
            const part = elements.newExercisePart.value, name = elements.newExerciseName.value.trim();
            if (!name) return alert('운동 이름을 입력하세요.');
            if (Object.values(combinedExercises).flat().some(e => e.name === name)) return alert('이미 존재하는 운동명입니다.');
            if (!customExercises[part]) customExercises[part] = [];
            customExercises[part].push({ name });
            saveToLocalStorage(CUSTOM_EXERCISES_KEY, customExercises);
            mergeExercises();
            closeModal(elements.addExerciseModal);
        });
        
        elements.addExerciseToSessionBtn.addEventListener('click', () => openAddToSessionModal(null));
        elements.saveToSessionBtn.addEventListener('click', () => {
            const name = elements.sessionExListSelect.value;
            const weight = Number(elements.sessionWeightInput.value) || 0;
            const reps = Number(elements.sessionRepsInput.value) || 0;
            const setsCount = Number(elements.sessionSetsInput.value) || 0;
            if (!name || setsCount <= 0) return alert('운동과 세트 수를 올바르게 입력해주세요.');

            const exIndexToModify = (sessionEditingExIndex !== null) ? sessionEditingExIndex : currentWorkoutSession.log.exercises.length;
            
            if (sessionEditingExIndex !== null) {
                 currentWorkoutSession.log.sets = currentWorkoutSession.log.sets.filter(s => s.exerciseIndex !== sessionEditingExIndex);
                 currentWorkoutSession.log.exercises[sessionEditingExIndex] = { name, weight, reps, sets: setsCount };
            } else {
                 currentWorkoutSession.log.exercises.push({ name, weight, reps, sets: setsCount });
            }

            for (let i = 0; i < setsCount; i++) {
                currentWorkoutSession.log.sets.push({ name, exerciseIndex: exIndexToModify, setNumber: i + 1, weight, reps, completed: false, isWarmup: false });
            }
            renderWorkoutSession();
            closeModal(elements.addToSessionModal);
        });

        elements.workoutSessionList.addEventListener('click', e => {
            const completeBtn = e.target.closest('.set-complete-btn');
            const completeAllBtn = e.target.closest('.complete-all-sets-btn');
            const editBtn = e.target.closest('.edit-session-ex-btn');
            const deleteBtn = e.target.closest('.delete-session-ex-btn');
            const addWarmupBtn = e.target.closest('.add-warmup-btn');
            const deleteWarmupBtn = e.target.closest('.delete-warmup-btn');

            if (addWarmupBtn) {
                const exIndex = Number(addWarmupBtn.dataset.exerciseIndex);
                
                // 이 운동의 첫 번째 '본 세트'를 찾습니다.
                const firstMainSet = currentWorkoutSession.log.sets.find(s => s.exerciseIndex === exIndex && !s.isWarmup);

                // 웜업 세트에 복사할 기본 데이터를 준비합니다.
                // (본 세트가 있으면 그걸 쓰고, 없으면 운동 정보에서 가져옵니다)
                const baseSetData = firstMainSet || currentWorkoutSession.log.exercises[exIndex];

                const newWarmupSet = {
                    name: baseSetData.name, // 'name'이 누락되지 않도록
                    exerciseIndex: exIndex,
                    weight: baseSetData.weight || 0,
                    reps: baseSetData.reps || 10,
                    isWarmup: true,
                    completed: false,
                    setNumber: 0 // 웜업 세트는 0번
                };

                if (firstMainSet) {
                    // 본 세트가 있으면, 그 앞에 끼워넣습니다.
                    const firstSetIndex = currentWorkoutSession.log.sets.indexOf(firstMainSet);
                    currentWorkoutSession.log.sets.splice(firstSetIndex, 0, newWarmupSet);
                } else {
                    // 본 세트가 아예 없으면, 그냥 이 운동의 세트 중 맨 앞에 추가합니다.
                    // (이미 웜업 세트만 있는 경우, 그 맨 앞에 추가됩니다)
                    const firstSetOfThisExercise = currentWorkoutSession.log.sets.findIndex(s => s.exerciseIndex === exIndex);
                    if (firstSetOfThisExercise > -1) {
                        currentWorkoutSession.log.sets.splice(firstSetOfThisExercise, 0, newWarmupSet);
                    } else {
                        // 이 운동의 세트가 아예 0개면, 그냥 push 합니다.
                        currentWorkoutSession.log.sets.push(newWarmupSet);
                    }
                }
                
                renderWorkoutSession();
            }
            else if (deleteWarmupBtn) {
                const setIndex = Number(deleteWarmupBtn.dataset.setIndex);
                currentWorkoutSession.log.sets.splice(setIndex, 1);
                renderWorkoutSession();
            }
            else if (completeBtn) {
                const setIndex = Number(completeBtn.dataset.setIndex);
                const set = currentWorkoutSession.log.sets[setIndex];
                set.completed = !set.completed;
                if(set.completed && !set.isWarmup) { startTimer(); }
                renderWorkoutSession();
            } else if (completeAllBtn) {
                const exIndex = Number(completeAllBtn.dataset.exerciseIndex);
                currentWorkoutSession.log.sets.forEach(set => {
                    if(set.exerciseIndex === exIndex && !set.isWarmup) set.completed = true;
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
        
        elements.workoutSessionList.addEventListener('input', e => {
            const target = e.target;
            const setIndex = Number(target.dataset.setIndex);
            if(isNaN(setIndex)) return;
            const set = currentWorkoutSession.log.sets[setIndex];
            if (target.classList.contains('weight-input')) set.weight = Number(target.value);
            if (target.classList.contains('reps-input')) set.reps = Number(target.value);
        });

        elements.hideSessionBtn.addEventListener('click', () => {
             showConfirm("진행중인 운동을 종료하시겠습니까?", () => {
                closeModal(elements.workoutSessionModal);
                cancelWorkoutSession();
             });
        });
        
        elements.timerMinus30Btn.addEventListener('click', () => {
            let currentVal = parseInt(elements.timerInput.value);
            elements.timerInput.value = Math.max(0, currentVal - 30);
        });

        elements.timerPlus30Btn.addEventListener('click', () => {
            let currentVal = parseInt(elements.timerInput.value);
            elements.timerInput.value = currentVal + 30;
        });

        elements.floatingTimer.addEventListener('click', reOpenWorkoutSessionModal);
        elements.closeFloatingTimer.addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirm("진행중인 운동을 종료하시겠습니까?", cancelWorkoutSession);
        });

        elements.confirmCancelBtn.addEventListener('click', () => closeModal(elements.customConfirmModal));
        elements.confirmOkBtn.addEventListener('click', () => {
            if(confirmCallback) confirmCallback();
            closeModal(elements.customConfirmModal);
        });

        elements.saveSessionBtn.addEventListener('click', () => {
            const { log, originalLogIndex } = currentWorkoutSession;
            checkAndUpdatePRs(log);

            const isModified = JSON.stringify(log.exercises) !== currentWorkoutSession.originalTemplateExercises;

            if (isModified && log.id) {
                showConfirm("루틴이 변경되었습니다. 원본 루틴에 이 변경사항을 저장하시겠습니까?", () => {
                    const templateIndex = routineTemplates.findIndex(t => t.id === log.id);
                    if (templateIndex > -1) {
                        routineTemplates[templateIndex].exercises = log.exercises;
                        saveToLocalStorage(ROUTINE_TEMPLATE_KEY, routineTemplates);
                        renderRoutineTemplates();
                    }
                });
            }

            if (originalLogIndex !== null && workoutLogs[selectedDate]?.[originalLogIndex]) workoutLogs[selectedDate][originalLogIndex] = log;
            else {
                if (!workoutLogs[selectedDate]) workoutLogs[selectedDate] = [];
                workoutLogs[selectedDate].push(log);
            }
            saveToLocalStorage(LOG_KEY, workoutLogs);
            renderCalendar();
            closeModal(elements.workoutSessionModal);
            openWorkoutSummaryModal(log);
            cancelWorkoutSession();
        });
        
        elements.dailyLogModalList.addEventListener('click', e => {
             const delBtn = e.target.closest('.delete-log-btn');
             if (delBtn) {
                 const idx = Number(delBtn.dataset.logIndex);
                 showConfirm('이 기록을 삭제하시겠습니까?', () => {
                     workoutLogs[selectedDate].splice(idx, 1);
                     if (workoutLogs[selectedDate].length === 0) delete workoutLogs[selectedDate];
                     saveToLocalStorage(LOG_KEY, workoutLogs);
                     renderCalendar();
                     closeModal(elements.dailyLogModal);
                 });
             }
        });

        let isDragging = false, offsetX, offsetY;
        elements.floatingTimer.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - elements.floatingTimer.offsetLeft;
            offsetY = e.clientY - elements.floatingTimer.offsetTop;
            elements.floatingTimer.classList.add('dragging');
            elements.floatingTimer.style.cursor = 'grabbing';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            elements.floatingTimer.style.left = `${e.clientX - offsetX}px`;
            elements.floatingTimer.style.top = `${e.clientY - offsetY}px`;
        });
        document.addEventListener('mouseup', () => {
            isDragging = false;
            elements.floatingTimer.classList.remove('dragging');
            elements.floatingTimer.style.cursor = 'pointer';
        });
    };
    
    const startTimer = () => {
        clearInterval(timerInterval);
        const totalSeconds = Number(elements.timerInput.value) || 60;
        let remaining = totalSeconds;
        const hand = elements.clockSecondHand;
        
        if (floatingTimerProgressCircle) floatingTimerProgressCircle.style.strokeDasharray = `${circumference} ${circumference}`;

        const updateDisplay = () => {
            if (remaining < 0) return;
            const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
            const seconds = String(remaining % 60).padStart(2, '0');
            const timeString = `${minutes}:${seconds}`;
            elements.timerDigitalDisplay.textContent = timeString;
            elements.floatingTimerDisplay.textContent = timeString;

            const degrees = ((totalSeconds - remaining) / totalSeconds) * 360;
            if (hand) hand.style.transform = `rotate(${degrees}deg)`;

            if (floatingTimerProgressCircle) {
                const offset = circumference - (remaining / totalSeconds) * circumference;
                floatingTimerProgressCircle.style.strokeDashoffset = offset;
            }
        };
        updateDisplay();
        timerInterval = setInterval(() => {
            remaining--;
            updateDisplay();
            if (remaining < 0) {
                clearInterval(timerInterval);
                elements.timerDigitalDisplay.classList.add('text-red-500');
                elements.floatingTimerDisplay.parentElement.classList.add('animate-pulse');
                setTimeout(() => {
                    elements.timerDigitalDisplay.classList.remove('text-red-500');
                    elements.floatingTimerDisplay.parentElement.classList.remove('animate-pulse');
                    if (hand) hand.style.transform = 'rotate(0deg)';
                }, 2000);
            }
        }, 1000);
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
        if (floatingTimerProgressCircle) floatingTimerProgressCircle.style.strokeDashoffset = circumference;
        Object.assign(routineTemplates, loadFromLocalStorage(ROUTINE_TEMPLATE_KEY, []));
        Object.assign(workoutLogs, loadFromLocalStorage(LOG_KEY, {}));
        Object.assign(customExercises, loadFromLocalStorage(CUSTOM_EXERCISES_KEY, {}));
        Object.assign(personalRecords, loadFromLocalStorage(PR_KEY, {}));
        mergeExercises();
        renderCalendar();
        renderRoutineTemplates();
        bindEventListeners();
        populateExerciseSelectors(elements.newExercisePart, elements.newExerciseName);
    };

    init();
});
