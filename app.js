let tg = window.Telegram.WebApp;
tg.expand();

class MeditationApp {
    constructor() {
        this.selectedDuration = 5;
        this.selectedSound = 'silence';
        this.isActive = false;
        this.timer = null;
        this.progress = 0;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.loadUserData();
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
    }
    
    stopMeditation() {
        this.isActive = false;
        clearInterval(this.timer);
        this.startButton.textContent = 'Начать медитацию';
        this.progress = 0;
        this.updateUI();
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
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new MeditationApp();
});