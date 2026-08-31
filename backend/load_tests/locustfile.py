import json
import random
from locust import HttpUser, task, between

class ExamPlatformStudentUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """
        Authenticate as Student and obtain JWT token on test startup.
        """
        response = self.client.post("/auth/login", json={
            "email": "student@example.com",
            "password": "StudentPassword123!"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {token}"}
            self.session_id = None
        else:
            self.headers = {}
            self.session_id = None

    @task(3)
    def check_current_user_profile(self):
        if self.headers:
            self.client.get("/users/me", headers=self.headers, name="/users/me")

    @task(2)
    def start_or_check_exam_session(self):
        if self.headers:
            response = self.client.post("/exam-sessions/start", json={"exam_id": 1}, headers=self.headers, name="/exam-sessions/start")
            if response.status_code == 201:
                self.session_id = response.json().get("session_id")

    @task(4)
    def submit_answer(self):
        if self.headers and self.session_id:
            self.client.post(
                f"/exam-sessions/{self.session_id}/answers",
                json={
                    "question_id": random.choice([1, 2]),
                    "selected_option_id": 1,
                    "answer_text": "Sample load test answer text."
                },
                headers=self.headers,
                name="/exam-sessions/[id]/answers"
            )

    @task(1)
    def check_time_remaining(self):
        if self.headers and self.session_id:
            self.client.get(
                f"/exam-sessions/{self.session_id}/time-remaining",
                headers=self.headers,
                name="/exam-sessions/[id]/time-remaining"
            )
