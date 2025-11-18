document.addEventListener('DOMContentLoaded', () => {
    
    // (수정) 'file://' 프로토콜 감지
    if (window.location.protocol === 'file:') {
        const errorDiv = document.getElementById('file-load-error');
        if (errorDiv) {
            errorDiv.classList.remove('hidden');
        }
        console.error("오류: file:// 프로토콜에서는 스크립트(exercises.js 등)가 로드되지 않습니다. Live Server와 같은 웹 서버 환경에서 실행해야 합니다.");
        // 'file://' 환경에서는 스크립트 실행을 중단하여 추가 오류 방지
        return; 
    }

    // (수정) '운동 추가/수정 모달'의 ID를 상수로 정의합니다.
    // 만약 회원님의 실제 모달 ID가 다르다면, 이 값만 수정하시면 됩니다.
    const ADD_EXERCISE_MODAL_ID = 'add-exercise-modal';

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
        
        // (수정) 'addExerciseModal'은 ID로 찾도록 유지합니다.
        // 이 모달은 원본 HTML에 존재해야 합니다.
        addExerciseModal: document.getElementById(ADD_EXERCISE_MODAL_ID),
        
        workoutSessionList: document.getElementById('workout-session-list'),
        totalWorkoutTimer: document.getElementById('total-workout-timer'),
        restTimerDisplay: document.getElementById('rest-timer-display'),
        restTimerProgress: document.getElementById('rest-timer-progress'),
        timerStartStopBtn: document.getElementById('timer-start-stop-btn'),
        timerResetBtn: document.getElementById('timer-reset-btn'),
        timerMinus30: document.getElementById('timer-minus-30'),
        timerPlus30: document.getElementById('timer-plus-30'),
        timerMinus10: document.getElementById('timer-minus-10'),
        timerPlus10: document.getElementById('timer-plus-10'),
        hideSessionBtn: document.getElementById('hide-session-btn'),
        addExerciseToSessionBtn: document.getElementById('add-exercise-to-session-btn'),
        saveSessionBtn: document.getElementById('save-session-btn'),
        workoutSessionTitle: document.getElementById('workout-session-title'),
        
        // (수정) bodyPartSelect, exerciseSelect 등은 여기서 찾지 않습니다.
        // 해당 모달이 열릴 때 찾도록 변경합니다.
        
        confirmModal: document.getElementById('custom-confirm-modal'),
        confirmModalText: document.getElementById('confirm-modal-text'),
        confirmModalYes: document.getElementById('confirm-modal-yes'),
        confirmModalNo: document.getElementById('confirm-modal-no'),
    };

    let currentView = 'calendar';
    let currentDate = new Date();
    let workoutLogs = {}; // { 'YYYY-MM-DD': { routineName: '...', exercises: [...] } }
    let routineTemplates = []; // [ { id: '...', name: '...', exercises: [...] } ]
    
    let currentWorkoutSession = null; // { routineId: '...', routineName: '...', date: 'YYYY-MM-DD', exercises: [...] }
    let totalWorkoutTimerInterval = null;
    let totalWorkoutSeconds = 0;
    let restTimerInterval = null;
    let restSeconds = 0;
    const DEFAULT_REST_TIME = 90; // 기본 휴식 시간 (초)
    let restTimerRunning = false;
    
    let currentEditingExerciseId = null; // (요청사항 6)

    // ===================================================================
    // (수정) '운동 추가/수정 모달' 내부의 요소들을 저장할 변수
    // ===================================================================
    let modalElements = {
        bodyPartSelect: null,
        exerciseSelect: null,
        customExerciseInput: null,
        saveExerciseBtn: null,
        cancelAddExerciseBtn: null,
        modalTitle: null
    };

    // ===================================================================
    // 모달 관련 함수 (open/close)
    // ===================================================================
    const openModal = (modal) => {
        if (!modal) return;
        modal.style.display = 'flex';
        const maxZ = Math.max(0, ...Array.from(document.querySelectorAll('.modal-overlay'))
                            .map(m => parseInt(m.style.zIndex || '0')));
        modal.style.zIndex = maxZ + 10;
    };

    const closeModal = (modal) => {
        if (!modal) return;
        modal.style.display = 'none';
        modal.style.zIndex = 'auto';
    };

    // ===================================================================
    // 타이머 관련 함수
    // ===================================================================
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const updateTotalWorkoutTimer = () => {
        if (elements.totalWorkoutTimer) {
            elements.totalWorkoutTimer.textContent = formatTime(totalWorkoutSeconds);
        }
        updateFloatingTimerDisplay();
    };

    const startTotalWorkoutTimer = () => {
        if (totalWorkoutTimerInterval) return;
        totalWorkoutTimerInterval = setInterval(() => {
            totalWorkoutSeconds++;
            updateTotalWorkoutTimer();
        }, 1000);
    };

    const stopTotalWorkoutTimer = () => {
        clearInterval(totalWorkoutTimerInterval);
        totalWorkoutTimerInterval = null;
    };
    
    const setRestTimerProgress = (percent) => {
        if (!elements.restTimerProgress) return;
        const radius = 90;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;
        elements.restTimerProgress.style.strokeDasharray = `${circumference} ${circumference}`;
        elements.restTimerProgress.style.strokeDashoffset = offset;
    };

    const startRestTimer = () => {
        if (restTimerInterval) {
            clearInterval(restTimerInterval);
        }
        
        restSeconds = DEFAULT_REST_TIME;
        if (elements.restTimerDisplay) {
            elements.restTimerDisplay.textContent = formatTime(restSeconds);
        }
        setRestTimerProgress(100);
        restTimerRunning = true;
        if (elements.timerStartStopBtn) {
            elements.timerStartStopBtn.textContent = '일시정지';
        }

        restTimerInterval = setInterval(() => {
            restSeconds--;
            if (elements.restTimerDisplay) {
                elements.restTimerDisplay.textContent = formatTime(restSeconds);
            }
            const progress = (restSeconds / DEFAULT_REST_TIME) * 100;
            setRestTimerProgress(progress);

            if (restSeconds <= 0) {
                clearInterval(restTimerInterval);
                restTimerInterval = null;
                restTimerRunning = false;
                if (elements.timerStartStopBtn) {
                    elements.timerStartStopBtn.textContent = '시작';
                }
                setRestTimerProgress(0);
            }
        }, 1000);
    };
    
    const stopRestTimer = () => {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        restTimerRunning = false;
        if (elements.timerStartStopBtn) {
            elements.timerStartStopBtn.textContent = '시작';
        }
    }

    const updateFloatingTimerDisplay = () => {
        if (elements.floatingTimerDisplay) {
            elements.floatingTimerDisplay.textContent = formatTime(totalWorkoutSeconds);
        }
    };

    // ===================================================================
    // 운동 세션 렌더링
    // ===================================================================

    const startWorkoutSession = (sessionData) => {
        currentWorkoutSession = sessionData;
        
        const date = new Date(currentWorkoutSession.date);
        const dateString = `${date.getMonth() + 1}월 ${date.getDate()}일`;
        if (elements.workoutSessionTitle) {
            elements.workoutSessionTitle.textContent = `${dateString} - ${currentWorkoutSession.routineName}`;
        }
        
        totalWorkoutSeconds = 0;
        updateTotalWorkoutTimer();
        startTotalWorkoutTimer();
        
        restSeconds = 0;
        if (elements.restTimerDisplay) {
            elements.restTimerDisplay.textContent = formatTime(restSeconds);
        }
        setRestTimerProgress(0);

        renderWorkoutSessionList();
        openModal(elements.workoutSessionModal);
        if (elements.floatingTimer) {
            elements.floatingTimer.style.display = 'none';
        }
    };

    const renderWorkoutSessionList = () => {
        if (!elements.workoutSessionList) return;
        
        if (!currentWorkoutSession) {
            elements.workoutSessionList.innerHTML = '<p>운동 세션 정보가 없습니다.</p>';
            return;
        }

        elements.workoutSessionList.innerHTML = '';
        
        currentWorkoutSession.exercises.forEach(exercise => {
            const exerciseEl = document.createElement('div');
            exerciseEl.className = 'bg-white p-4 rounded-lg shadow-sm';
            exerciseEl.dataset.exerciseId = exercise.id;

            // --- 요청사항 3 & 6 ---
            const headerHtml = `
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <h3 class="text-xl font-bold workout-name-clickable" data-exercise-id="${exercise.id}" title="운동 이름 클릭 시 수정">
                            ${exercise.name}
                        </h3>
                        <div class="flex items-center gap-2">
                            <button class="adjust-set-btn" data-exercise-id="${exercise.id}" data-action="decrease" title="세트 줄이기">-</button>
                            <span class="text-lg font-medium">${exercise.sets.length}세트</span>
                            <button class="adjust-set-btn" data-exercise-id="${exercise.id}" data-action="increase" title="세트 추가">+</button>
                        </div>
                    </div>
                </div>
            `;

            const setsHeaderHtml = `
                <div class="grid grid-cols-6 gap-2 items-center mb-2 px-2 text-sm font-semibold text-gray-600">
                    <div class="col-span-1 text-center">세트</div>
                    <div class="col-span-2 text-center">무게 (kg)</div>
                    <div class="col-span-2 text-center">횟수</div>
                    <div class="col-span-1 text-center">완료</div>
                </div>
            `;
            
            exerciseEl.innerHTML = headerHtml + setsHeaderHtml;

            const setsContainer = document.createElement('div');
            setsContainer.className = 'space-y-2';

            exercise.sets.forEach((set, index) => {
                setsContainer.appendChild(createSetRowElement(set, exercise.id, index + 1));
            });

            exerciseEl.appendChild(setsContainer);
            
            // --- 요청사항 4 ---
            const footerHtml = `
                <div class="exercise-footer-controls">
                    <button class="complete-all-sets-btn" data-exercise-id="${exercise.id}">전체 완료</button>
                    <button class="delete-exercise-btn" data-exercise-id="${exercise.id}">운동 삭제</button>
                </div>
            `;
            exerciseEl.insertAdjacentHTML('beforeend', footerHtml);

            elements.workoutSessionList.appendChild(exerciseEl);
        });
    };

    const createSetRowElement = (set, exerciseId, setNumber) => {
        const setRow = document.createElement('div');
        setRow.className = `set-row grid grid-cols-6 gap-2 items-center p-2 rounded-md ${set.completed ? 'completed-set' : ''}`;
        setRow.dataset.setId = set.id;
        setRow.dataset.exerciseId = exerciseId;
        
        const completedClass = set.completed ? 'bg-blue-500 text-white' : 'bg-gray-200';
        
        // --- 요청사항 5 (메모 버튼 제거됨) ---
        setRow.innerHTML = `
            <div class="col-span-1 text-center">
                <span class="font-bold text-lg">${setNumber}</span>
            </div>
            <div class="col-span-2">
                <input type="number" class="set-input set-weight-input" value="${set.weight || ''}" placeholder="-" data-field="weight">
            </div>
            <div class="col-span-2">
                <input type="number" class="set-input set-reps-input" value="${set.reps || ''}" placeholder="-" data-field="reps">
            </div>
            <div class="col-span-1 flex justify-center">
                <button class="set-complete-btn ${completedClass}" data-set-id="${set.id}" data-exercise-id="${exerciseId}" title="세트 완료/취소">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;
        return setRow;
    };


    // ===================================================================
    // (수정) 운동 추가/수정 모달 관련 (요청사항 6)
    // ===================================================================
    
    // (수정) 'exercises.js' 로드 확인
    const checkExercisesData = () => {
        if (typeof exercisesData === 'undefined') {
            console.error("오류: 'exercises.js' 파일이 로드되지 않았거나 'exercisesData' 변수가 없습니다.");
            // (필요시 사용자에게 오류 알림)
            // alert("운동 데이터를 불러오는 데 실패했습니다.");
            return false;
        }
        return true;
    };
    
    const populateBodyPartSelect = () => {
        if (!modalElements.bodyPartSelect || !checkExercisesData()) return;
        
        modalElements.bodyPartSelect.innerHTML = '';
        Object.keys(exercisesData).forEach(part => {
            modalElements.bodyPartSelect.add(new Option(part, part));
        });
    };
    
    const populateExerciseSelect = (part) => {
        if (!modalElements.exerciseSelect || !checkExercisesData()) return;

        modalElements.exerciseSelect.innerHTML = '';
        if (exercisesData[part]) {
            exercisesData[part].forEach(exercise => {
                modalElements.exerciseSelect.add(new Option(exercise.name, exercise.name));
            });
        }
        modalElements.exerciseSelect.add(new Option('직접입력', '직접입력'));
    };

    const openAddExerciseModal = (exerciseId = null) => {
        // (수정) 모달 내부의 요소들을 이 시점에 찾습니다.
        if (!elements.addExerciseModal) {
             console.error(`오류: ID가 '${ADD_EXERCISE_MODAL_ID}'인 모달을 찾을 수 없습니다.`);
             return;
        }
        
        // (수정) 모달 요소들을 modalElements 객체에 할당
        modalElements.bodyPartSelect = elements.addExerciseModal.querySelector('#body-part-select');
        modalElements.exerciseSelect = elements.addExerciseModal.querySelector('#exercise-select');
        modalElements.customExerciseInput = elements.addExerciseModal.querySelector('#custom-exercise-input');
        modalElements.saveExerciseBtn = elements.addExerciseModal.querySelector('#save-exercise-btn');
        modalElements.cancelAddExerciseBtn = elements.addExerciseModal.querySelector('#cancel-add-exercise-btn');
        modalElements.modalTitle = elements.addExerciseModal.querySelector('h2'); // 모달 제목

        // (수정) 요소들이 하나라도 없는지 확인
        if (!modalElements.bodyPartSelect || !modalElements.exerciseSelect || !modalElements.customExerciseInput || !modalElements.saveExerciseBtn || !modalElements.cancelAddExerciseBtn || !modalElements.modalTitle) {
            console.error(`오류: '${ADD_EXERCISE_MODAL_ID}' 모달 내부에 필요한 요소들(body-part-select 등)이 없습니다.`);
            return;
        }
        
        // (수정) 모달 요소 이벤트 리스너가 중복 등록되지 않도록 초기화 (단순한 방법)
        // (더 좋은 방법은 init 시점에 한 번만 등록하는 것이지만, 이 방법이 더 안전합니다.)
        modalElements.saveExerciseBtn.onclick = handleSaveExerciseFromModal;
        modalElements.cancelAddExerciseBtn.onclick = () => {
             closeModal(elements.addExerciseModal);
             currentEditingExerciseId = null;
        };
        modalElements.bodyPartSelect.onchange = () => {
            populateExerciseSelect(modalElements.bodyPartSelect.value);
            modalElements.customExerciseInput.style.display = 'none';
        };
         modalElements.exerciseSelect.onchange = () => {
            if (modalElements.exerciseSelect.value === '직접입력') {
                modalElements.customExerciseInput.style.display = 'block';
            } else {
                modalElements.customExerciseInput.style.display = 'none';
            }
        };

        // (수정) 폼을 채우기 전에 운동 목록을 먼저 로드
        populateBodyPartSelect();
        
        currentEditingExerciseId = exerciseId;
        
        if (exerciseId) {
            // --- 수정 모드 ---
            modalElements.modalTitle.textContent = '운동 수정';
            modalElements.saveExerciseBtn.textContent = '수정하기';

            const exercise = currentWorkoutSession.exercises.find(ex => ex.id === exerciseId);
            if (exercise) {
                modalElements.bodyPartSelect.value = exercise.part;
                populateExerciseSelect(exercise.part); // 부위에 맞는 운동 목록 로드
                
                const exerciseExists = Array.from(modalElements.exerciseSelect.options).some(opt => opt.value === exercise.name);
                
                if (exerciseExists) {
                    modalElements.exerciseSelect.value = exercise.name;
                    modalElements.customExerciseInput.style.display = 'none';
                    modalElements.customExerciseInput.value = '';
                } else {
                    modalElements.exerciseSelect.value = '직접입력';
                    modalElements.customExerciseInput.style.display = 'block';
                    modalElements.customExerciseInput.value = exercise.name;
                }
            }
        } else {
            // --- 추가 모드 ---
            modalElements.modalTitle.textContent = '운동 추가';
            modalElements.saveExerciseBtn.textContent = '추가하기';

            modalElements.bodyPartSelect.value = '가슴'; // 기본값
            populateExerciseSelect('가슴');
            modalElements.exerciseSelect.value = '';
            modalElements.customExerciseInput.style.display = 'none';
            modalElements.customExerciseInput.value = '';
        }
        
        openModal(elements.addExerciseModal);
    };

    const handleSaveExerciseFromModal = () => {
        // (수정) modalElements 객체에서 요소들을 가져옵니다.
        if (!modalElements.bodyPartSelect || !modalElements.exerciseSelect || !modalElements.customExerciseInput) return;

        const part = modalElements.bodyPartSelect.value;
        let name = modalElements.exerciseSelect.value;

        if (name === '직접입력') {
            name = modalElements.customExerciseInput.value.trim();
            if (!name) {
                console.error('운동 이름을 입력해주세요.');
                return;
            }
        }

        if (currentEditingExerciseId) {
            // --- 수정 로직 ---
            const exercise = currentWorkoutSession.exercises.find(ex => ex.id === currentEditingExerciseId);
            if (exercise) {
                exercise.name = name;
                exercise.part = part;
            }
        } else {
            // --- 추가 로직 ---
            const newExercise = {
                id: crypto.randomUUID(),
                name: name,
                part: part,
                sets: [
                    { id: crypto.randomUUID(), weight: '', reps: '', completed: false }
                ]
            };
            currentWorkoutSession.exercises.push(newExercise);
        }

        currentEditingExerciseId = null;
        renderWorkoutSessionList();
        closeModal(elements.addExerciseModal);
    };


    // ===================================================================
    // 이벤트 리스너 초기화
    // ===================================================================
    const initEventListeners = () => {
        
        // ... (기존 캘린더, 뒤로가기 등 리스너) ...
        // (캘린더 관련 리스너들은 여기에 존재한다고 가정합니다)
        // elements.prevMonthBtn?.addEventListener('click', ...);
        // elements.nextMonthBtn?.addEventListener('click', ...);
        // elements.todayBtn?.addEventListener('click', ...);
        // elements.calendarBody?.addEventListener('click', ...);

        // 운동 세션 모달 내 리스너 (이벤트 위임)
        if (elements.workoutSessionList) {
            elements.workoutSessionList.addEventListener('click', (e) => {
                
                // --- 요청사항 1 & 2: 세트 완료 버튼 ---
                if (e.target.closest('.set-complete-btn')) {
                    const btn = e.target.closest('.set-complete-btn');
                    const setId = btn.dataset.setId;
                    const exerciseId = btn.dataset.exerciseId;
                    
                    if (!currentWorkoutSession) return;
                    const exercise = currentWorkoutSession.exercises.find(ex => ex.id === exerciseId);
                    if (!exercise) return;
                    const set = exercise.sets.find(s => s.id === setId);
                    if (!set) return;

                    if (set.completed) {
                        // --- 2. 토글 OFF (완료 -> 미완료) ---
                        set.completed = false;
                        btn.classList.remove('bg-blue-500', 'text-white');
                        btn.classList.add('bg-gray-200');
                        btn.closest('.set-row').classList.remove('completed-set');
                        
                        if (restTimerInterval) {
                            stopRestTimer();
                            restSeconds = 0;
                            if (elements.restTimerDisplay) {
                                elements.restTimerDisplay.textContent = formatTime(restSeconds);
                            }
                            setRestTimerProgress(0);
                        }
                        
                    } else {
                        // --- 2. 토글 ON (미완료 -> 완료) ---
                        set.completed = true;
                        btn.classList.add('bg-blue-500', 'text-white');
                        btn.classList.remove('bg-gray-200');
                        btn.closest('.set-row').classList.add('completed-set');
                        
                        // --- 1. 총 운동 시간 (멈추지 않음) ---
                        startRestTimer();
                    }
                }
                
                // --- 요청사항 3: 세트 수 조절 (+/-) 버튼 ---
                else if (e.target.closest('.adjust-set-btn')) {
                    const btn = e.target.closest('.adjust-set-btn');
                    const exerciseId = btn.dataset.exerciseId;
                    const action = btn.dataset.action;
                    handleAdjustSet(exerciseId, action);
                }
                
                // --- 요청사항 4: 전체 완료 버튼 ---
                else if (e.target.closest('.complete-all-sets-btn')) {
                    const btn = e.target.closest('.complete-all-sets-btn');
                    const exerciseId = btn.dataset.exerciseId;
                    handleCompleteAllSets(exerciseId);
                }

                // --- 요청사항 6: 운동 이름 클릭 (수정) ---
                else if (e.target.closest('.workout-name-clickable')) {
                    const title = e.target.closest('.workout-name-clickable');
                    const exerciseId = title.dataset.exerciseId;
                    openAddExerciseModal(exerciseId); // ID 전달 (수정 모드)
                }
                
                else if (e.target.closest('.delete-exercise-btn')) {
                    // (운동 삭제 로직...)
                }
            });
            
            elements.workoutSessionList.addEventListener('input', (e) => {
                if (e.target.classList.contains('set-input')) {
                    const input = e.target;
                    const field = input.dataset.field;
                    const setRow = input.closest('.set-row');
                    const setId = setRow.dataset.setId;
                    const exerciseId = setRow.dataset.exerciseId;

                    if (!currentWorkoutSession) return;
                    const exercise = currentWorkoutSession.exercises.find(ex => ex.id === exerciseId);
                    if (!exercise) return;
                    const set = exercise.sets.find(s => s.id === setId);
                    if (!set) return;

                    set[field] = input.value;
                }
            });
        } 

        // "운동 완료 및 저장" 버튼
        elements.saveSessionBtn?.addEventListener('click', () => {
            // --- 요청사항 1 ---
            stopTotalWorkoutTimer();
            stopRestTimer();
            
            if (elements.floatingTimer) {
                elements.floatingTimer.style.display = 'none';
            }
            
            if (currentWorkoutSession) {
                currentWorkoutSession.totalWorkoutTime = totalWorkoutSeconds;
            }
            
            // saveWorkoutLogs();
            closeModal(elements.workoutSessionModal);
            // renderCalendar();
        });
        
        elements.hideSessionBtn?.addEventListener('click', () => {
            if (elements.workoutSessionModal) {
                elements.workoutSessionModal.style.display = 'none';
            }
            if (elements.floatingTimer) {
                elements.floatingTimer.style.display = 'flex';
            }
            updateFloatingTimerDisplay();
        });

        elements.floatingTimer?.addEventListener('click', (e) => {
            if (e.target.id === 'close-floating-timer') return;
            if (elements.workoutSessionModal) {
                elements.workoutSessionModal.style.display = 'flex';
            }
            if (elements.floatingTimer) {
                elements.floatingTimer.style.display = 'none';
            }
        });

        elements.closeFloatingTimer?.addEventListener('click', (e) => {
            e.stopPropagation();
            // (확인 모달 로직...)
        });

        // 휴식 타이머 컨트롤
        elements.timerStartStopBtn?.addEventListener('click', () => {
            if (restTimerRunning) {
                stopRestTimer();
            } else {
                startRestTimer();
            }
        });

        elements.timerResetBtn?.addEventListener('click', () => {
            stopRestTimer();
            restSeconds = DEFAULT_REST_TIME;
            if (elements.restTimerDisplay) {
                elements.restTimerDisplay.textContent = formatTime(restSeconds);
            }
            setRestTimerProgress(100);
        });
        
        const adjustRestTime = (amount) => {
            restSeconds += amount;
            if (restSeconds < 0) restSeconds = 0;
            if (elements.restTimerDisplay) {
                elements.restTimerDisplay.textContent = formatTime(restSeconds);
            }
            const progress = (restSeconds / DEFAULT_REST_TIME) * 100;
            setRestTimerProgress(progress > 100 ? 100 : progress);
        };
        
        elements.timerMinus30?.addEventListener('click', () => adjustRestTime(-30));
        elements.timerPlus30?.addEventListener('click', () => adjustRestTime(30));
        elements.timerMinus10?.addEventListener('click', () => adjustRestTime(-10));
        elements.timerPlus10?.addEventListener('click', () => adjustRestTime(10));


        // "운동 추가" (세션 모달 하단) 버튼
        // --- 요청사항 6 ---
        elements.addExerciseToSessionBtn?.addEventListener('click', () => {
            openAddExerciseModal(null); // null 전달 (추가 모드)
        });

        // (수정) '운동 추가/수정 모달'의 버튼 리스너들은
        // 'openAddExerciseModal' 함수 내부에서 등록하도록 변경되었습니다.
        // (initEventListeners에서는 더 이상 등록하지 않습니다.)
    };
    
    // ===================================================================
    // 새롭게 추가된 헬퍼 함수 (요청사항 3, 4)
    // ===================================================================

    const handleAdjustSet = (exerciseId, action) => {
        if (!currentWorkoutSession) return;
        const exercise = currentWorkoutSession.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return;

        if (action === 'increase') {
            const lastSet = exercise.sets[exercise.sets.length - 1] || {};
            const newSet = {
                id: crypto.randomUUID(),
                weight: lastSet.weight || '',
                reps: lastSet.reps || '',
                completed: false,
            };
            exercise.sets.push(newSet);
        } else if (action === 'decrease') {
            if (exercise.sets.length > 1) {
                exercise.sets.pop();
            } else {
                console.log("최소 1세트가 필요합니다.");
            }
        }
        renderWorkoutSessionList();
    };

    const handleCompleteAllSets = (exerciseId) => {
        if (!currentWorkoutSession) return;
        const exercise = currentWorkoutSession.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return;

        const allCompleted = exercise.sets.every(set => set.completed);
        const newCompletedState = !allCompleted;

        exercise.sets.forEach(set => {
            set.completed = newCompletedState;
        });
        renderWorkoutSessionList();
    };
    

    // ===================================================================
    // 초기화 함수
    // ===================================================================
    const init = () => {
        // (수정) exercises.js가 로드되었는지 확인
        if (!checkExercisesData()) {
            // (선택) exercisesData가 없으면 캘린더 렌더링도 막을 수 있습니다.
            // 하지만 지금은 file:// 감지 로직이 return 하므로 괜찮습니다.
        }
        
        // (중요) 캘린더 렌더링 함수가 여기에 있어야 합니다.
        // (회원님의 원본 코드에 renderCalendar()가 있다고 가정합니다)
        // renderCalendar(currentDate); 
        
        // (중요) 템플릿 렌더링 함수가 여기에 있어야 합니다.
        // (회원님의 원본 코드에 renderTemplateList()가 있다고 가정합니다)
        // renderTemplateList();
        
        // (수정) populate... 함수들을 init()에서 호출하지 않습니다.
        // openAddExerciseModal 함수 내부에서 호출하도록 변경되었습니다.
        
        initEventListeners();
        
        // (테스트 코드 - 실제 사용 시 주석 처리)
        /*
        const testSession = {
            routineId: 'temp1',
            routineName: '테스트 세션',
            date: new Date().toISOString().split('T')[0],
            exercises: [
                { id: 'ex1', name: '벤치 프레스', part: '가슴', sets: [ { id: 's1', weight: '60', reps: '10', completed: false } ]},
                { id: 'ex2', name: '랫풀다운', part: '등', sets: [ { id: 's4', weight: '50', reps: '12', completed: false } ]}
            ]
        };
        startWorkoutSession(testSession);
        */
    };

    // --- 앱 시작 ---
    init();
});