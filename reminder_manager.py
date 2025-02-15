from datetime import datetime, time
from telegram.ext import ContextTypes
import pytz

class ReminderManager:
    def __init__(self):
        self.timezone = pytz.timezone('Europe/Moscow')

    async def set_daily_reminder(self, context: ContextTypes.DEFAULT_TYPE, user_id: int, hour: int):
        # Удаляем существующие напоминания
        self.remove_reminder(context, user_id)
        
        # Устанавливаем новое напоминание
        reminder_time = time(hour=hour, minute=0, tzinfo=self.timezone)
        context.job_queue.run_daily(
            self.send_reminder,
            time=reminder_time,
            data={'user_id': user_id},
            name=f'reminder_{user_id}'
        )

    def remove_reminder(self, context: ContextTypes.DEFAULT_TYPE, user_id: int):
        current_jobs = context.job_queue.get_jobs_by_name(f'reminder_{user_id}')
        for job in current_jobs:
            job.schedule_removal()

    async def send_reminder(self, context: ContextTypes.DEFAULT_TYPE):
        job = context.job
        user_id = job.data['user_id']
        
        await context.bot.send_message(
            chat_id=user_id,
            text="🧘‍♂️ Время для медитации!\n\n"
                 "Уделите несколько минут себе и своему внутреннему спокойствию."
        ) 