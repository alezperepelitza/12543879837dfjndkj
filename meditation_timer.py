from datetime import datetime, timedelta
import asyncio

class MeditationTimer:
    def __init__(self, duration_minutes: int, user_id: int):
        self.duration = timedelta(minutes=duration_minutes)
        self.user_id = user_id
        self.start_time = None
        self.is_active = False
        self.remaining_time = self.duration

    def start(self):
        self.start_time = datetime.now()
        self.is_active = True

    def stop(self):
        self.is_active = False
        if self.start_time:
            elapsed = datetime.now() - self.start_time
            self.remaining_time = max(timedelta(0), self.duration - elapsed)
        return self.remaining_time

    def get_remaining_time(self) -> timedelta:
        if not self.is_active:
            return self.remaining_time
        
        elapsed = datetime.now() - self.start_time
        return max(timedelta(0), self.duration - elapsed)

    def get_progress_percentage(self) -> float:
        remaining = self.get_remaining_time()
        total_seconds = self.duration.total_seconds()
        remaining_seconds = remaining.total_seconds()
        return ((total_seconds - remaining_seconds) / total_seconds) * 100 