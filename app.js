let tg = window.Telegram.WebApp;
tg.expand();

class MeditationApp {
    constructor() {
        this.selectedDuration = 5;
        this.selectedSound = 'silence';
        this.isActive = false;
        this.timer = null;
        this.progress = 0;
        this.audio = null;
        this.sounds = {
            'rain': 'sounds/rain.mp3',
            'forest': 'sounds/forest.mp3',
            'ocean': 'sounds/ocean.mp3',
            'silence': null
        };
        
        this.achievements = {
            'first_meditation': { title: 'Первая медитация', icon: '🎯' },
            'week_streak': { title: '7 дней подряд', icon: '🔥' },
            'hour_total': { title: 'Час медитации', icon: '⭐' }
            // ... другие достижения
        };
        
        // Добавляем техники дыхания
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
            }
        };
        
        this.initializeElements();
        this.initializeEventListeners();
        this.loadUserData();
        this.initializeReminders();
        this.initializeBreathing();
        this.initializeTabs();
    }
    
    initializeElements() {
        this.timeDisplay = document.querySelector('.time');
        this.progressCircle = document.querySelector('.progress-circle');
        this.startButton = document.querySelector('.start-btn');
        this.durationButtons = document.querySelectorAll('.duration-selector button');
        this.soundButtons = document.querySelectorAll('.sound-selector button');
    }
    
    initializeEventListeners() {
        this.durationButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.selectedDuration = parseInt(button.dataset.time);
                this.updateUI();
            });
        });
        
        this.soundButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.selectedSound = button.dataset.sound;
                this.updateUI();
            });
        });
        
        this.startButton.addEventListener('click', () => {
            if (this.isActive) {
                this.stopMeditation();
            } else {
                this.startMeditation();
            }
        });
    }
    
    startMeditation() {
        this.isActive = true;
        this.progress = 0;
        this.startButton.textContent = 'Остановить';
        
        const duration = this.selectedDuration * 60;
        let timeLeft = duration;
        
        this.timer = setInterval(() => {
            timeLeft--;
            this.progress = (duration - timeLeft) / duration * 100;
            
            this.updateUI();
            
            if (timeLeft <= 0) {
                this.completeMeditation();
            }
        }, 1000);
        
        // Запускаем звук
        if (this.selectedSound !== 'silence') {
            this.audio = new Audio(this.sounds[this.selectedSound]);
            this.audio.loop = true;
            this.audio.play();
        }
    }
    
    stopMeditation() {
        this.isActive = false;
        clearInterval(this.timer);
        this.startButton.textContent = 'Начать медитацию';
        this.progress = 0;
        this.updateUI();
        
        // Останавливаем звук
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
    }
    
    completeMeditation() {
        this.stopMeditation();
        this.updateStats();
        tg.showPopup({
            title: 'Медитация завершена',
            message: `Поздравляем! Вы завершили ${this.selectedDuration}-минутную медитацию.`,
            buttons: [{type: 'ok'}]
        });
    }
    
    updateUI() {
        // Обновляем прогресс-бар
        const degrees = this.progress * 3.6;
        this.progressCircle.style.background = 
            `conic-gradient(var(--tg-theme-button-color) ${degrees}deg, #eee ${degrees}deg)`;
        
        // Обновляем время
        const minutes = Math.floor(this.selectedDuration * (100 - this.progress) / 100);
        const seconds = Math.floor((this.selectedDuration * 60 * (100 - this.progress) / 100) % 60);
        this.timeDisplay.textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    loadUserData() {
        // Здесь можно добавить загрузку данных пользователя из localStorage или с сервера
    }
    
    updateStats() {
        // Здесь можно добавить сохранение статистики в localStorage или на сервер
    }

    initializeReminders() {
        // Проверяем разрешения на уведомления
        if ('Notification' in window) {
            Notification.requestPermission();
        }
    }

    setDailyReminder(hour, minute) {
        const now = new Date();
        const reminderTime = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hour,
            minute
        );

        // Сохраняем в localStorage
        localStorage.setItem('meditation_reminder', JSON.stringify({
            hour,
            minute,
            enabled: true
        }));

        // Отправляем на сервер для push-уведомлений
        this.saveReminderToServer(hour, minute);
    }

    checkAchievements() {
        const stats = this.loadUserStats();
        
        // Проверяем первую медитацию
        if (stats.totalSessions === 1) {
            this.unlockAchievement('first_meditation');
        }
        
        // Проверяем серию из 7 дней
        if (this.checkStreak(7)) {
            this.unlockAchievement('week_streak');
        }
        
        // Проверяем общее время
        if (stats.totalMinutes >= 60 && !stats.achievements.includes('hour_total')) {
            this.unlockAchievement('hour_total');
        }
    }

    unlockAchievement(achievementId) {
        const achievement = this.achievements[achievementId];
        
        // Показываем уведомление
        tg.showPopup({
            title: 'Новое достижение!',
            message: `${achievement.icon} ${achievement.title}`,
            buttons: [{type: 'ok'}]
        });
        
        // Сохраняем в статистику
        this.saveAchievement(achievementId);
    }

    initializeBreathing() {
        // ... implementation of initializeBreathing method
    }

    initializeTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }
    
    switchTab(tabId) {
        // Убираем активный класс у всех вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        // Активируем нужную вкладку
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }
    
    startBreathingExercise(technique) {
        const sequence = this.breathingTechniques[technique].sequence;
        let currentStep = 0;
        
        const runSequence = () => {
            if (currentStep >= sequence.length) {
                currentStep = 0;
            }
            
            const step = sequence[currentStep];
            this.updateBreathingUI(step.action, step.duration);
            
            setTimeout(() => {
                currentStep++;
                runSequence();
            }, step.duration * 1000);
        };
        
        runSequence();
    }
    
    updateBreathingUI(action, duration) {
        const text = document.querySelector('.breathing-text');
        const circle = document.querySelector('.breathing-circle');
        
        text.textContent = action;
        
        // Обновляем анимацию круга
        circle.style.animation = 
            action === 'Вдох' ? 'breathe-in 4s' :
            action === 'Выдох' ? 'breathe-out 4s' :
            'hold 4s';
    }
    
    // Методы для работы с календарем
    generateCalendar() {
        const calendar = document.querySelector('.calendar-grid');
        const today = new Date();
        const stats = this.loadUserStats();
        
        // Генерируем сетку календаря
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.classList.add(
                stats.meditationDays.includes(date.toISOString().split('T')[0])
                    ? 'has-meditation'
                    : 'no-meditation'
            );
            
            calendar.appendChild(dayElement);
        }
    }
    
    // Методы для работы с рейтингом
    async updateLeaderboard() {
        const leaderboard = document.querySelector('.leaderboard-list');
        const leaders = await this.fetchLeaderboard();
        
        leaderboard.innerHTML = leaders.map((user, index) => `
            <div class="leaderboard-item">
                <span class="rank">${index + 1}</span>
                <span class="name">${user.name}</span>
                <span class="score">${user.totalMinutes} мин</span>
            </div>
        `).join('');
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new MeditationApp();
}); 