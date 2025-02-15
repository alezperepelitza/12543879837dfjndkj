let tg = window.Telegram.WebApp;
tg.expand();

class MeditationApp {
    constructor() {
        this.selectedDuration = 5;
        this.maxDuration = 60; // максимум 60 минут
        this.isDragging = false;
        this.startAngle = -90; // начинаем с верхней точки
        this.selectedSound = 'silence';
        this.isActive = false;
        this.timer = null;
        this.progress = 0;
        this.audio = null;
        this.sounds = {
            'rain': { url: 'sounds/rain.mp3', volume: 0.5 },
            'forest': { url: 'sounds/forest.mp3', volume: 0.5 },
            'ocean': { url: 'sounds/ocean.mp3', volume: 0.5 },
            'silence': null
        };
        
        this.activeSound = null;
        this.activeAmbient = null;
        this.activeBackground = null;
        this.volume = 0.5;
        
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
        
        this.quotes = [
            { text: "Дыши и отпускай", author: "Будда" },
            { text: "Настоящее — единственное время, которое имеет значение", author: "Тич Нат Хан" },
            { text: "В тишине рождается мудрость", author: "Конфуций" },
            // Добавьте больше цитат
        ];
        
        this.showRandomQuote();
        
        this.initializeElements();
        this.initializeEventListeners();
        this.loadUserData();
        this.initializeReminders();
        this.initializeBreathing();
        this.initializeTabs();
        this.initializeSoundControls();
        this.initializeCircleSelector();
        this.uiSounds = {
            tick: new Audio('sounds/ui/tick.mp3'),
            complete: new Audio('sounds/ui/complete.mp3'),
            achievement: new Audio('sounds/ui/achievement.mp3')
        };
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
    
    initializeSoundControls() {
        // Инициализация регулятора громкости
        const volumeControl = document.querySelector('.volume-control input');
        volumeControl.addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });
        
        // Предзагрузка звуков
        this.preloadSounds();
    }
    
    preloadSounds() {
        // Создаем скрытые аудио элементы для каждого звука
        for (const type in this.sounds) {
            for (const sound in this.sounds[type]) {
                if (this.sounds[type][sound]) {
                    const audio = new Audio();
                    audio.src = this.sounds[type][sound].url;
                    audio.preload = 'auto';
                    this.sounds[type][sound].audio = audio;
                }
            }
        }
    }
    
    setVolume(value) {
        this.volume = value;
        
        // Обновляем громкость активных звуков
        if (this.activeAmbient) {
            this.activeAmbient.volume = value * this.sounds.ambient[this.selectedSound].volume;
        }
        if (this.activeBackground) {
            this.activeBackground.volume = value * this.sounds.background.meditation1.volume;
        }
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
        
        // Запускаем звуки
        this.startSounds();
    }
    
    startSounds() {
        this.stopSounds();
        
        if (this.selectedSound !== 'silence') {
            try {
                const sound = this.sounds[this.selectedSound];
                this.activeSound = new Audio(sound.url);
                this.activeSound.loop = true;
                this.activeSound.volume = sound.volume;
                
                const playPromise = this.activeSound.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log('Ошибка воспроизведения:', error);
                        tg.showPopup({
                            title: 'Внимание',
                            message: 'Не удалось воспроизвести звук. Попробуйте еще раз.',
                            buttons: [{type: 'ok'}]
                        });
                    });
                }
            } catch (error) {
                console.log('Ошибка инициализации звука:', error);
            }
        }
    }
    
    stopSounds() {
        if (this.activeAmbient) {
            this.activeAmbient.pause();
            this.activeAmbient = null;
        }
        if (this.activeBackground) {
            this.activeBackground.pause();
            this.activeBackground = null;
        }
    }
    
    stopMeditation() {
        this.isActive = false;
        clearInterval(this.timer);
        this.startButton.textContent = 'Начать медитацию';
        this.progress = 0;
        this.updateUI();
        
        // Останавливаем звуки
        this.stopSounds();
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
        // Обновляем отображение времени с анимацией
        const minutes = Math.floor(this.selectedDuration);
        const timeDisplay = document.querySelector('.time');
        
        // Анимируем изменение числа
        const currentValue = parseInt(timeDisplay.textContent);
        const diff = minutes - currentValue;
        
        if (diff !== 0) {
            const step = diff > 0 ? 1 : -1;
            let current = currentValue;
            
            const animate = () => {
                current += step;
                timeDisplay.textContent = String(current).padStart(2, '0');
                
                if ((step > 0 && current < minutes) || (step < 0 && current > minutes)) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        }
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
        
        // Создаем красивую анимацию достижения
        const overlay = document.createElement('div');
        overlay.className = 'achievement-overlay';
        overlay.innerHTML = `
            <div class="achievement-popup">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <h3>Новое достижение!</h3>
                    <p>${achievement.title}</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 3000);
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

    // Добавляем обработку видимости страницы
    initializeVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.activeAmbient) {
                // Сохраняем состояние воспроизведения
                this.wasPlaying = !this.activeAmbient.paused;
                this.activeAmbient.pause();
            } else if (!document.hidden && this.wasPlaying) {
                // Возобновляем воспроизведение
                this.activeAmbient.play().catch(() => {
                    console.log('Не удалось возобновить воспроизведение');
                });
            }
        });
    }

    initializeCircleSelector() {
        const circle = document.querySelector('.progress-circle');
        const marker = document.querySelector('.time-marker');
        
        // Обработка начала перетаскивания
        marker.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            document.addEventListener('mousemove', this.handleDrag);
            document.addEventListener('mouseup', this.stopDrag);
        });
        
        // Обработка касания для мобильных устройств
        marker.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            document.addEventListener('touchmove', this.handleDrag);
            document.addEventListener('touchend', this.stopDrag);
        });
        
        // Обработка клика по кругу
        circle.addEventListener('click', (e) => {
            if (!this.isActive) {
                const rect = circle.getBoundingClientRect();
                const x = e.clientX - (rect.left + rect.width / 2);
                const y = e.clientY - (rect.top + rect.height / 2);
                this.updateTimeFromPosition(x, y);
            }
        });
    }
    
    handleDrag = (e) => {
        if (this.isDragging && !this.isActive) {
            const circle = document.querySelector('.progress-circle');
            const rect = circle.getBoundingClientRect();
            
            // Получаем координаты касания или мыши
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const x = clientX - (rect.left + rect.width / 2);
            const y = clientY - (rect.top + rect.height / 2);
            
            this.updateTimeFromPosition(x, y);
        }
    }
    
    stopDrag = () => {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.stopDrag);
        document.removeEventListener('touchmove', this.handleDrag);
        document.removeEventListener('touchend', this.stopDrag);
    }
    
    updateTimeFromPosition(x, y) {
        // Вычисляем угол
        let angle = Math.atan2(y, x) * 180 / Math.PI;
        angle = (angle - this.startAngle + 360) % 360;
        
        // Конвертируем угол в минуты (0-360° = 0-60 минут)
        this.selectedDuration = Math.round(angle / 6);
        if (this.selectedDuration < 1) this.selectedDuration = 1;
        if (this.selectedDuration > this.maxDuration) this.selectedDuration = this.maxDuration;
        
        // Обновляем UI с анимацией
        this.updateUI();
        this.updateMarkerPosition(angle);
        
        // Обновляем градиент
        const gradient = document.querySelector('.circle-gradient');
        const percentage = (this.selectedDuration / this.maxDuration) * 100;
        gradient.style.background = `conic-gradient(
            from -90deg,
            var(--tg-theme-button-color) ${percentage}%,
            transparent ${percentage}%
        )`;
    }
    
    updateMarkerPosition(angle) {
        const marker = document.querySelector('.time-marker');
        const radius = 125; // Половина ширины круга
        
        // Вычисляем позицию маркера
        const radian = (angle + this.startAngle) * Math.PI / 180;
        const x = Math.cos(radian) * radius;
        const y = Math.sin(radian) * radius;
        
        // Обновляем позицию маркера
        marker.style.transform = `translate(${x}px, ${y}px)`;
    }

    showRandomQuote() {
        const quote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
        const quoteElement = document.createElement('div');
        quoteElement.className = 'meditation-quote';
        quoteElement.innerHTML = `
            <p class="quote-text">${quote.text}</p>
            <p class="quote-author">— ${quote.author}</p>
        `;
        
        document.querySelector('.timer-display').appendChild(quoteElement);
    }

    createParticles() {
        const container = document.querySelector('.particles');
        
        const createParticle = () => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.width = Math.random() * 10 + 5 + 'px';
            particle.style.height = particle.style.width;
            particle.style.animation = `float ${Math.random() * 2 + 2}s ease-out`;
            
            container.appendChild(particle);
            setTimeout(() => particle.remove(), 4000);
        };

        if (this.isActive) {
            createParticle();
            setTimeout(() => this.createParticles(), Math.random() * 1000 + 500);
        }
    }

    playUISound(sound) {
        if (this.uiSounds[sound]) {
            this.uiSounds[sound].currentTime = 0;
            this.uiSounds[sound].play().catch(() => {});
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new MeditationApp();
}); 