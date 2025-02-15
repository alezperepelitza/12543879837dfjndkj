from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, JobQueue
import os
import asyncio
from datetime import datetime, timedelta
from meditation_timer import MeditationTimer

class MeditationBot:
    def __init__(self):
        self.active_sessions = {}  # Хранение активных медитаций
        self.user_stats = {}      # Статистика пользователей
        self.available_sounds = {
            'rain': 'Дождь 🌧',
            'forest': 'Лес 🌲',
            'ocean': 'Океан 🌊',
            'silence': 'Тишина 🕊'
        }
        self.meditation_times = [
            5, 10, 15, 20, 30
        ]  # Доступное время для медитации в минутах
        self.reminders = {}  # Хранение напоминаний пользователей
        self.stars = {}      # Система звезд

    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        keyboard = [
            [InlineKeyboardButton("Начать медитацию 🧘", callback_data='start_meditation')],
            [InlineKeyboardButton("Мой прогресс 📊", callback_data='show_progress')],
            [InlineKeyboardButton("Настройка напоминаний ⏰", callback_data='set_reminder')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            "Добро пожаловать в бот для медитации! 🌟\n"
            "Выберите действие:",
            reply_markup=reply_markup
        )

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        user_id = update.effective_user.id
        
        if query.data == 'start_meditation':
            await self.show_duration_selection(update, context)
        elif query.data.startswith('duration_'):
            duration = int(query.data.split('_')[1])
            await self.show_sound_selection(update, context, duration)
        elif query.data.startswith('sound_'):
            sound = query.data.split('_')[1]
            duration = context.user_data.get('selected_duration', 5)
            await self.start_meditation_session(update, context, duration, sound)
        elif query.data == 'show_progress':
            await self.show_user_progress(update, context)
        elif query.data == 'set_reminder':
            await self.show_reminder_settings(update, context)
        elif query.data == 'back_to_menu':
            await self.show_main_menu(update, context)
        elif query.data == 'stop_meditation':
            await self.stop_meditation(update, context)
        
        await query.answer()

    async def show_duration_selection(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        keyboard = []
        row = []
        for i, time in enumerate(self.meditation_times):
            row.append(InlineKeyboardButton(f"{time} мин", callback_data=f'duration_{time}'))
            if (i + 1) % 3 == 0 or i == len(self.meditation_times) - 1:
                keyboard.append(row)
                row = []
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.callback_query.edit_message_text(
            "Выберите длительность медитации:",
            reply_markup=reply_markup
        )

    async def show_sound_selection(self, update: Update, context: ContextTypes.DEFAULT_TYPE, duration: int):
        context.user_data['selected_duration'] = duration
        keyboard = []
        for sound_id, sound_name in self.available_sounds.items():
            keyboard.append([InlineKeyboardButton(sound_name, callback_data=f'sound_{sound_id}')])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.callback_query.edit_message_text(
            f"Выберите звуковое сопровождение для {duration}-минутной медитации:",
            reply_markup=reply_markup
        )

    async def start_meditation_session(self, update: Update, context: ContextTypes.DEFAULT_TYPE, duration: int, sound: str):
        user_id = update.effective_user.id
        timer = MeditationTimer(duration, user_id)
        self.active_sessions[user_id] = {
            'timer': timer,
            'sound': sound
        }
        
        progress_message = await update.callback_query.edit_message_text(
            self.format_meditation_message(0, duration),
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("Остановить ⏹", callback_data='stop_meditation')
            ]])
        )
        
        context.user_data['progress_message'] = progress_message
        timer.start()
        
        try:
            if hasattr(context, 'job_queue') and context.job_queue:
                context.job_queue.run_repeating(
                    self.update_progress_bar,
                    interval=1,
                    first=1,
                    data={'user_id': user_id, 'message_id': progress_message.message_id},
                    name=f'meditation_{user_id}'
                )
        except Exception as e:
            print(f"Ошибка при установке job_queue: {e}")
            # Можно добавить альтернативную логику обновления прогресса

    def format_meditation_message(self, progress: float, duration: int) -> str:
        bar_length = 20
        filled_length = int(bar_length * progress / 100)
        bar = '█' * filled_length + '▒' * (bar_length - filled_length)
        return f"Медитация {duration} минут\n\n" \
               f"Прогресс: [{bar}] {progress:.1f}%\n\n" \
               f"Оставайтесь в покое и следите за своим дыханием 🧘‍♂️"

    async def update_progress_bar(self, context: ContextTypes.DEFAULT_TYPE):
        job = context.job
        user_id = job.data['user_id']
        message_id = job.data['message_id']
        
        if user_id not in self.active_sessions:
            job.schedule_removal()
            return
        
        session = self.active_sessions[user_id]
        timer = session['timer']
        progress = timer.get_progress_percentage()
        
        if progress >= 100:
            await self.finish_meditation(context, user_id)
            job.schedule_removal()
            return
        
        try:
            await context.bot.edit_message_text(
                self.format_meditation_message(progress, timer.duration.minutes),
                chat_id=user_id,
                message_id=message_id,
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("Остановить ⏹", callback_data='stop_meditation')
                ]])
            )
        except Exception:
            pass

    async def finish_meditation(self, context: ContextTypes.DEFAULT_TYPE, user_id: int):
        if user_id not in self.user_stats:
            self.user_stats[user_id] = {'completed': 0, 'total_minutes': 0, 'stars': 0}
        
        session = self.active_sessions[user_id]
        timer = session['timer']
        duration = timer.duration.minutes
        
        stats = self.user_stats[user_id]
        stats['completed'] += 1
        stats['total_minutes'] += duration
        new_stars = duration // 5  # 1 звезда за каждые 5 минут
        stats['stars'] += new_stars
        
        await context.bot.send_message(
            user_id,
            f"🎉 Поздравляем! Медитация завершена!\n\n"
            f"✨ Получено звезд: {new_stars}\n"
            f"⭐️ Всего звезд: {stats['stars']}\n\n"
            f"Хотите начать новую медитацию?",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("Новая медитация 🧘", callback_data='start_meditation')
            ]])
        )
        
        del self.active_sessions[user_id]

    async def show_user_progress(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        stats = self.user_stats.get(user_id, {'completed': 0, 'total_minutes': 0, 'stars': 0})
        
        await update.callback_query.edit_message_text(
            f"📊 Ваша статистика:\n\n"
            f"🧘 Завершено медитаций: {stats['completed']}\n"
            f"⏱ Общее время: {stats['total_minutes']} минут\n"
            f"⭐️ Заработано звезд: {stats['stars']}\n",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("Назад в меню", callback_data='back_to_menu')
            ]])
        )

    async def show_reminder_settings(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        keyboard = [
            [InlineKeyboardButton("Каждый день в 9:00", callback_data='reminder_daily_9')],
            [InlineKeyboardButton("Каждый день в 20:00", callback_data='reminder_daily_20')],
            [InlineKeyboardButton("Отключить напоминания", callback_data='reminder_off')],
            [InlineKeyboardButton("Назад в меню", callback_data='back_to_menu')]
        ]
        
        await update.callback_query.edit_message_text(
            "⏰ Настройка напоминаний\n"
            "Выберите удобное время для напоминаний о медитации:",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def show_main_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        keyboard = [
            [InlineKeyboardButton("Начать медитацию 🧘", callback_data='start_meditation')],
            [InlineKeyboardButton("Мой прогресс 📊", callback_data='show_progress')],
            [InlineKeyboardButton("Настройка напоминаний ⏰", callback_data='set_reminder')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.callback_query.edit_message_text(
            "Выберите действие:",
            reply_markup=reply_markup
        )

    async def stop_meditation(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        if user_id in self.active_sessions:
            session = self.active_sessions[user_id]
            timer = session['timer']
            timer.stop()
            
            try:
                if hasattr(context, 'job_queue') and context.job_queue:
                    current_jobs = context.job_queue.get_jobs_by_name(f'meditation_{user_id}')
                    for job in current_jobs:
                        job.schedule_removal()
            except Exception as e:
                print(f"Ошибка при удалении job: {e}")
            
            del self.active_sessions[user_id]
            
            await update.callback_query.edit_message_text(
                "Медитация остановлена. Хотите начать заново?",
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("Новая медитация 🧘", callback_data='start_meditation'),
                    InlineKeyboardButton("В главное меню ↩️", callback_data='back_to_menu')
                ]])
            )

def run_bot():
    # Замените 'YOUR_BOT_TOKEN' на ваш токен от BotFather
    bot_token = os.getenv('BOT_TOKEN', '8088995194:AAFZCd-1mJwLti808p85ZoSUP1mj9854cYg')
    
    # Создаем экземпляр бота
    meditation_bot = MeditationBot()
    
    # Создаем приложение с поддержкой job_queue
    application = (
        Application.builder()
        .token(bot_token)
        .concurrent_updates(True)
        .build()
    )
    
    # Регистрация обработчиков
    application.add_handler(CommandHandler("start", meditation_bot.start))
    application.add_handler(CallbackQueryHandler(meditation_bot.handle_callback))
    
    # Запуск бота
    print("Запуск бота...")
    application.run_polling(drop_pending_updates=True)

if __name__ == '__main__':
    try:
        run_bot()
    except KeyboardInterrupt:
        print("\nБот остановлен пользователем") 