import json
from datetime import datetime
from typing import Dict, Any

class UserDataManager:
    def __init__(self, filename: str = 'user_data.json'):
        self.filename = filename
        self.data = self.load_data()

    def load_data(self) -> Dict[str, Any]:
        try:
            with open(self.filename, 'r', encoding='utf-8') as file:
                return json.load(file)
        except FileNotFoundError:
            return {}

    def save_data(self):
        with open(self.filename, 'w', encoding='utf-8') as file:
            json.dump(self.data, file, ensure_ascii=False, indent=2)

    def update_user_stats(self, user_id: int, meditation_duration: int):
        user_id_str = str(user_id)
        if user_id_str not in self.data:
            self.data[user_id_str] = {
                'completed_meditations': 0,
                'total_minutes': 0,
                'stars': 0,
                'last_meditation': None
            }

        self.data[user_id_str]['completed_meditations'] += 1
        self.data[user_id_str]['total_minutes'] += meditation_duration
        self.data[user_id_str]['stars'] += meditation_duration // 5
        self.data[user_id_str]['last_meditation'] = datetime.now().isoformat()
        
        self.save_data()

    def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        return self.data.get(str(user_id), {
            'completed_meditations': 0,
            'total_minutes': 0,
            'stars': 0,
            'last_meditation': None
        }) 