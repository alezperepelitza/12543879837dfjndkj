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
            rain: new Audio('sounds/rain.mp3'),
            forest: new Audio('sounds/forest.mp3'),
            ocean: new Audio('sounds/ocean.mp3')
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
    }

    initializeEventListeners() {
        // Обработка перетаскивания
        this.handle.addEventListener('mousedown', this.startDragging.bind(this));
        this.handle.addEventListener('touchstart', this.startDragging.bind(this));
        
        document.addEventListener('mousemove', this.handleDrag.bind(this));
        document.addEventListener('touchmove', this.handleDrag.bind(this));
        
        document.addEventListener('mouseup', this.stopDragging.bind(this));
        document.addEventListener('touchend', this.stopDragging.bind(this));

        // Обработка звуков
        this.soundOptions.forEach(option => {
            option.addEventListener('click', () => {
                if (!this.isActive) {
                    const sound = option.dataset.sound;
                    this.changeSound(sound);
                }
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
    }

    startDragging(e) {
        if (!this.isActive) {
            this.isDragging = true;
            e.preventDefault();
        }
    }

    handleDrag(e) {
        if (this.isDragging && !this.isActive) {
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

            this.updateUI(angle);
        }
    }

    stopDragging() {
        this.isDragging = false;
    }

    updateUI(angle) {
        // Обновляем время
        this.timeDisplay.textContent = this.duration;

        // Обновляем кольцо прогресса
        const circumference = 283;
        const offset = circumference - ((angle / 360) * circumference);
        this.ringProgress.style.strokeDashoffset = offset;

        // Обновляем маркер
        this.handle.style.transform = `rotate(${angle}deg)`;

        // Обновляем активный звук
        this.soundOptions.forEach(option => {
            option.classList.toggle('active', option.dataset.sound === this.currentSound);
        });
    }

    startMeditation() {
        this.isActive = true;
        this.startButton.textContent = 'Остановить';
        this.remainingTime = this.duration * 60;
        this.playSound();

        this.timer = setInterval(() => {
            this.remainingTime--;
            
            const minutes = Math.floor(this.remainingTime / 60);
            const seconds = this.remainingTime % 60;
            this.timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            const progress = this.remainingTime / (this.duration * 60);
            const angle = progress * 360;
            this.updateUI(angle);

            if (this.remainingTime <= 0) {
                this.completeMeditation();
            }
        }, 1000);
    }

    stopMeditation() {
        this.isActive = false;
        this.startButton.textContent = 'Начать медитацию';
        clearInterval(this.timer);
        this.stopSound();
        this.updateUI(0);
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
        this.stopSound();
        this.currentSound = sound;
        if (this.isActive) {
            this.playSound();
        }
        this.updateUI(0);
    }

    playSound() {
        if (this.currentSound !== 'silence' && this.sounds[this.currentSound]) {
            this.sounds[this.currentSound].loop = true;
            this.sounds[this.currentSound].play().catch(console.error);
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
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new MeditationApp();
}); 