let tg = window.Telegram.WebApp;
tg.expand();

class MeditationApp {
    constructor() {
        this.duration = 20;
        this.maxDuration = 60;
        this.isActive = false;
        this.isDragging = false;
        this.currentSound = 'silence';
        this.sounds = {
            rain: new Audio('https://raw.githubusercontent.com/AlexGyver/SoundLibrary/main/ambient/rain.mp3'),
            forest: new Audio('https://raw.githubusercontent.com/AlexGyver/SoundLibrary/main/ambient/forest.mp3'),
            ocean: new Audio('https://raw.githubusercontent.com/AlexGyver/SoundLibrary/main/ambient/ocean.mp3')
        };
        
        // Добавляем звуки для дыхательных техник
        this.breathingSounds = {
            inhale: new Audio('https://raw.githubusercontent.com/AlexGyver/SoundLibrary/main/effects/inhale.mp3'),
            exhale: new Audio('https://raw.githubusercontent.com/AlexGyver/SoundLibrary/main/effects/exhale.mp3'),
            hold: new Audio('https://raw.githubusercontent.com/AlexGyver/SoundLibrary/main/effects/hold.mp3')
        };
        
        // Загружаем статистику
        this.stats = this.loadStats();
        
        // Достижения
        this.achievements = {
            first_session: {
                id: 'first_session',
                title: 'Первый шаг',
                description: 'Завершите первую медитацию',
                icon: '🎯',
                unlocked: false
            },
            daily_streak_7: {
                id: 'daily_streak_7',
                title: 'Неделя практики',
                description: '7 дней подряд',
                icon: '🔥',
                unlocked: false
            },
            total_hours_10: {
                id: 'total_hours_10',
                title: 'Путь к просветлению',
                description: '10 часов медитации',
                icon: '⭐',
                unlocked: false
            },
            morning_person: {
                id: 'morning_person',
                title: 'Ранняя птичка',
                description: '5 медитаций до 8 утра',
                icon: '🌅',
                unlocked: false
            },
            night_owl: {
                id: 'night_owl',
                title: 'Ночная сова',
                description: '5 медитаций после 22:00',
                icon: '🌙',
                unlocked: false
            }
        };

        this.startAngle = -90;
        this.currentAngle = 0;

        // Предзагрузка всех звуков с обработкой ошибок
        [...Object.values(this.sounds), ...Object.values(this.breathingSounds)].forEach(sound => {
            sound.load();
            
            // Устанавливаем громкость
            sound.volume = 0.7;
            
            // Зацикливаем только фоновые звуки
            if (Object.values(this.sounds).includes(sound)) {
                sound.loop = true;
            }

            // Обработка ошибок загрузки
            sound.onerror = () => {
                console.error('Ошибка загрузки звука:', sound.src);
                tg.showPopup({
                    title: 'Ошибка загрузки',
                    message: 'Не удалось загрузить звуковой файл. Проверьте подключение к интернету.',
                    buttons: [{type: 'ok'}]
                });
            };
        });

        this.hasInteracted = false;
        this.isPaused = false;
        this.currentBreathingTechnique = null;
        this.breathingInterval = null;

        // Техники дыхания
        this.breathingTechniques = {
            '4-4-4-4': {
                name: 'Квадратное дыхание',
                sequence: [
                    { action: 'Вдох', duration: 4 },
                    { action: 'Задержка', duration: 4 },
                    { action: 'Выдох', duration: 4 },
                    { action: 'Задержка', duration: 4 }
                ]
            },
            '4-7-8': {
                name: 'Техника 4-7-8',
                sequence: [
                    { action: 'Вдох', duration: 4 },
                    { action: 'Задержка', duration: 7 },
                    { action: 'Выдох', duration: 8 }
                ]
            },
            'box': {
                name: 'Коробочное дыхание',
                sequence: [
                    { action: 'Вдох', duration: 5 },
                    { action: 'Задержка', duration: 5 },
                    { action: 'Выдох', duration: 5 },
                    { action: 'Задержка', duration: 5 }
                ]
            }
        };

        this.initializeElements();
        this.initializeEventListeners();
        this.updateUI(0);
    }

    initializeElements() {
        this.timer = document.querySelector('.timer');
        this.handle = document.querySelector('.handle');
        this.timeDisplay = document.querySelector('.time');
        this.startButton = document.querySelector('.start');
        this.soundOptions = document.querySelectorAll('.sound-option');
        this.ringProgress = document.querySelector('.ring-progress');
        this.pauseButton = document.querySelector('.pause');
        this.breathingButton = document.querySelector('.breathing-techniques-btn');
        this.breathingModal = document.querySelector('.breathing-modal');
        this.breathingText = document.querySelector('.breathing-text');
    }

    initializeEventListeners() {
        // Обработка перетаскивания
        this.handle.addEventListener('mousedown', this.startDragging.bind(this));
        this.handle.addEventListener('touchstart', this.startDragging.bind(this));
        
        document.addEventListener('mousemove', this.handleDrag.bind(this));
        document.addEventListener('touchmove', this.handleDrag.bind(this));
        
        document.addEventListener('mouseup', this.stopDragging.bind(this));
        document.addEventListener('touchend', this.stopDragging.bind(this));

        // Обработка звуков - разрешаем менять во время медитации
        this.soundOptions.forEach(option => {
            option.addEventListener('click', () => {
                const sound = option.dataset.sound;
                this.changeSound(sound);
            });
        });

        // Обработка старта/остановки
        this.startButton.addEventListener('click', () => {
            if (this.isActive) {
                this.stopMeditation();
            } else {
                this.startMeditation();
            }
        });

        // Обработка паузы
        this.pauseButton.addEventListener('click', () => {
            this.togglePause();
        });

        // Обработка техник дыхания
        this.breathingButton.addEventListener('click', () => {
            this.breathingModal.classList.add('visible');
        });

        // Закрытие модального окна по клику на фон
        this.breathingModal.addEventListener('click', (e) => {
            if (e.target === this.breathingModal) {
                this.breathingModal.classList.remove('visible');
            }
        });

        // Закрытие по кнопке
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.breathingModal.classList.remove('visible');
        });

        // Выбор техники дыхания
        document.querySelectorAll('.breathing-list button').forEach(button => {
            button.addEventListener('click', () => {
                const technique = button.dataset.technique;
                this.startBreathingTechnique(technique);
                this.breathingModal.classList.remove('visible');
                
                // Визуальная обратная связь
                button.classList.add('active');
                setTimeout(() => button.classList.remove('active'), 200);
            });
        });

        // Добавляем обработчик для кнопки сброса
        document.querySelector('.reset').addEventListener('click', () => {
            this.stopMeditation();
        });
    }

    startDragging(e) {
        if (!this.isActive) {
            this.isDragging = true;
            e.preventDefault();
        }
    }

    handleDrag(e) {
        if (this.isDragging && !this.isActive) {
            if (!this.hasInteracted) {
                this.hasInteracted = true;
                this.timer.classList.add('active');
                this.timeDisplay.classList.remove('infinity');
            }
            
            e.preventDefault();
            
            const rect = this.timer.getBoundingClientRect();
            const center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            let angle = Math.atan2(clientY - center.y, clientX - center.x) * 180 / Math.PI;
            angle = (angle + 90 + 360) % 360;

            this.duration = Math.round((angle / 360) * this.maxDuration);
            if (this.duration < 1) this.duration = 1;
            if (this.duration > this.maxDuration) this.duration = this.maxDuration;

            this.updateUI(angle, true);
        }
    }

    stopDragging() {
        this.isDragging = false;
    }

    updateUI(angle, isCountdown = false) {
        // Обновляем время
        if (!this.hasInteracted && !this.isActive) {
            this.timeDisplay.textContent = '∞';
            this.timeDisplay.classList.add('infinity');
        } else if (!this.isActive) {
            this.timeDisplay.classList.remove('infinity');
            this.timeDisplay.textContent = this.duration;
        } else {
            const minutes = Math.floor(this.remainingTime / 60);
            const seconds = this.remainingTime % 60;
            this.timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Обновляем кольцо прогресса
        const circumference = 283;
        const offset = circumference - ((angle / 360) * circumference);
        this.ringProgress.style.strokeDashoffset = offset;

        // Обновляем маркер
        if (isCountdown) {
            this.handle.style.transition = 'transform 1s linear';
        } else {
            this.handle.style.transition = 'transform 0.1s ease';
        }
        this.handle.style.transform = `rotate(${angle}deg)`;
    }

    startMeditation() {
        this.isActive = true;
        
        // Анимируем смену кнопок
        this.startButton.classList.add('hiding');
        setTimeout(() => {
            this.startButton.classList.add('hidden');
            document.querySelector('.meditation-controls').classList.remove('hidden');
            setTimeout(() => {
                document.querySelector('.meditation-controls').classList.add('visible');
            }, 50);
        }, 300);

        this.remainingTime = this.duration * 60;
        this.startAngle = (this.duration / this.maxDuration) * 360;
        this.playSound();

        // Запускаем таймер
        this.startTimer();
    }

    startTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setInterval(() => {
            if (!this.isPaused) {
                this.remainingTime--;
                
                const progress = this.remainingTime / (this.duration * 60);
                const angle = this.startAngle * progress;
                
                this.updateUI(angle, true);

                if (this.remainingTime <= 0) {
                    this.completeMeditation();
                }
            }
        }, 1000);
    }

    stopMeditation() {
        this.isActive = false;
        this.isPaused = false; // Сбрасываем состояние паузы
        
        // Анимируем возврат кнопок
        document.querySelector('.meditation-controls').classList.remove('visible');
        setTimeout(() => {
            document.querySelector('.meditation-controls').classList.add('hidden');
            this.startButton.classList.remove('hidden', 'hiding');
        }, 300);

        clearInterval(this.timer);
        this.timer = null;
        this.stopSound();
        this.updateUI(0);
        this.stopBreathingTechnique();
    }

    completeMeditation() {
        this.stopMeditation();
        this.updateStats();
        this.checkAchievements();
        
        // Показываем уведомление
        tg.showPopup({
            title: 'Медитация завершена',
            message: `Отличная работа! Вы медитировали ${this.duration} минут.`,
            buttons: [{type: 'ok'}]
        });
    }

    changeSound(sound) {
        const previousSound = this.currentSound;
        this.currentSound = sound;

        // Останавливаем предыдущий звук
        if (previousSound !== 'silence' && this.sounds[previousSound]) {
            this.sounds[previousSound].pause();
            this.sounds[previousSound].currentTime = 0;
        }

        // Запускаем новый звук, если медитация активна
        if (this.isActive && sound !== 'silence') {
            this.playSound();
        }

        // Обновляем только визуальное состояние кнопок
        this.soundOptions.forEach(option => {
            option.classList.toggle('active', option.dataset.sound === sound);
        });
    }

    playSound() {
        if (this.currentSound !== 'silence' && this.sounds[this.currentSound]) {
            const sound = this.sounds[this.currentSound];
            
            // Пробуем воспроизвести звук после взаимодействия пользователя
            const playPromise = sound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error('Ошибка воспроизведения звука:', error);
                    
                    if (error.name === 'NotAllowedError') {
                        // Запрашиваем разрешение на воспроизведение
                        tg.showPopup({
                            title: 'Требуется разрешение',
                            message: 'Для воспроизведения звука необходимо взаимодействие. Нажмите на любой элемент страницы.',
                            buttons: [{
                                type: 'ok',
                                text: 'Понятно'
                            }]
                        });
                        
                        // Добавляем обработчик для первого взаимодействия
                        const unlockAudio = () => {
                            sound.play().catch(console.error);
                            document.removeEventListener('click', unlockAudio);
                        };
                        document.addEventListener('click', unlockAudio);
                    }
                });
            }
        }
    }

    stopSound() {
        Object.values(this.sounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
    }

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        
        // Обновляем статистику
        this.stats.totalMinutes += this.duration;
        this.stats.lastMeditation = today;
        
        if (!this.stats.meditationDays.includes(today)) {
            this.stats.meditationDays.push(today);
        }

        // Считаем дни подряд
        this.stats.streak = this.calculateStreak();
        
        // Сохраняем статистику
        this.saveStats();
        
        // Обновляем отображение
        document.querySelectorAll('.stat-value')[0].textContent = this.stats.streak;
        document.querySelectorAll('.stat-value')[1].textContent = this.stats.totalMinutes;
    }

    calculateStreak() {
        const today = new Date();
        let streak = 0;
        let currentDate = today;

        while (this.stats.meditationDays.includes(currentDate.toISOString().split('T')[0])) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }

        return streak;
    }

    checkAchievements() {
        // Проверяем каждое достижение
        if (!this.achievements.first_session.unlocked) {
            this.unlockAchievement('first_session');
        }

        if (this.stats.streak >= 7 && !this.achievements.daily_streak_7.unlocked) {
            this.unlockAchievement('daily_streak_7');
        }

        if (this.stats.totalMinutes >= 600 && !this.achievements.total_hours_10.unlocked) {
            this.unlockAchievement('total_hours_10');
        }

        const hour = new Date().getHours();
        if (hour < 8) {
            this.stats.morningMeditations = (this.stats.morningMeditations || 0) + 1;
            if (this.stats.morningMeditations >= 5 && !this.achievements.morning_person.unlocked) {
                this.unlockAchievement('morning_person');
            }
        }

        if (hour >= 22) {
            this.stats.nightMeditations = (this.stats.nightMeditations || 0) + 1;
            if (this.stats.nightMeditations >= 5 && !this.achievements.night_owl.unlocked) {
                this.unlockAchievement('night_owl');
            }
        }
    }

    unlockAchievement(id) {
        const achievement = this.achievements[id];
        achievement.unlocked = true;

        // Показываем уведомление
        tg.showPopup({
            title: 'Новое достижение!',
            message: `${achievement.icon} ${achievement.title}\n${achievement.description}`,
            buttons: [{type: 'ok'}]
        });

        // Сохраняем достижения
        this.saveAchievements();
    }

    loadStats() {
        const defaultStats = {
            totalMinutes: 0,
            streak: 0,
            meditationDays: [],
            lastMeditation: null,
            morningMeditations: 0,
            nightMeditations: 0
        };

        const saved = localStorage.getItem('meditation_stats');
        return saved ? JSON.parse(saved) : defaultStats;
    }

    saveStats() {
        localStorage.setItem('meditation_stats', JSON.stringify(this.stats));
    }

    saveAchievements() {
        localStorage.setItem('meditation_achievements', JSON.stringify(this.achievements));
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.pauseButton.textContent = this.isPaused ? 'Продолжить' : 'Пауза';
        
        if (this.isPaused) {
            this.stopSound();
        } else {
            this.playSound();
        }
    }

    startBreathingTechnique(techniqueId) {
        if (this.breathingInterval) {
            clearInterval(this.breathingInterval);
        }

        const technique = this.breathingTechniques[techniqueId];
        let stepIndex = 0;
        let timeLeft = technique.sequence[0].duration;

        // Показываем начальное состояние и проигрываем звук
        const firstStep = technique.sequence[0];
        this.breathingText.textContent = `${firstStep.action} (${timeLeft})`;
        this.breathingText.classList.add('visible');
        this.playBreathingSound(firstStep.action);

        this.breathingInterval = setInterval(() => {
            if (!this.isPaused) {
                timeLeft--;

                if (timeLeft < 0) {
                    stepIndex = (stepIndex + 1) % technique.sequence.length;
                    timeLeft = technique.sequence[stepIndex].duration;
                    
                    // Проигрываем звук при смене фазы
                    const step = technique.sequence[stepIndex];
                    this.playBreathingSound(step.action);
                }

                const step = technique.sequence[stepIndex];
                this.breathingText.textContent = `${step.action} (${timeLeft})`;
            }
        }, 1000);

        this.currentBreathingTechnique = techniqueId;
    }

    playBreathingSound(action) {
        // Останавливаем все звуки дыхания
        Object.values(this.breathingSounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });

        // Проигрываем нужный звук
        switch(action.toLowerCase()) {
            case 'вдох':
                this.breathingSounds.inhale.play().catch(console.error);
                break;
            case 'выдох':
                this.breathingSounds.exhale.play().catch(console.error);
                break;
            case 'задержка':
                this.breathingSounds.hold.play().catch(console.error);
                break;
        }
    }

    stopBreathingTechnique() {
        if (this.breathingInterval) {
            clearInterval(this.breathingInterval);
            this.breathingInterval = null;
        }
        this.breathingText.classList.remove('visible');
        
        // Останавливаем все звуки дыхания
        Object.values(this.breathingSounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new MeditationApp();
}); 