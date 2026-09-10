import sys
import os
from datetime import datetime, timedelta, timezone
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(__file__))

from app.database.database import SessionLocal, engine
from app.models import Base, User, UserRole
from app.models.exam import Exam, ExamQuestion
from app.models.question import QuestionBank, Option, QuestionType
from app.models.session import ExamSession, SessionStatus
from app.core.security import hash_password


def seed_dbms():
    print("Ensuring database schema...")
    Base.metadata.create_all(bind=engine)

    # Safe column migration for SQLite
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE exam_sessions ADD COLUMN suspicion_score FLOAT DEFAULT 0.0"))
            conn.commit()
            print("Added suspicion_score column to exam_sessions.")
        except Exception:
            pass

    db = SessionLocal()

    try:
        # 1. Ensure Examiner exists
        examiner = db.query(User).filter(User.role == UserRole.EXAMINER).first()
        if not examiner:
            examiner = User(
                name="Prof. Sarah Jenkins (DBMS)",
                email="examiner@example.com",
                password_hash=hash_password("ExaminerPassword123!"),
                role=UserRole.EXAMINER,
                is_approved=True
            )
            db.add(examiner)
            db.commit()
            db.refresh(examiner)
            print("Created Examiner user.")

        # 2. Ensure Student exists
        student = db.query(User).filter(User.email == "student@example.com").first()
        if not student:
            student = User(
                name="John Doe (Candidate)",
                email="student@example.com",
                password_hash=hash_password("StudentPassword123!"),
                role=UserRole.STUDENT,
                is_approved=True
            )
            db.add(student)
            db.commit()
            db.refresh(student)
            print("Created Student user.")

        # 3. Create or get DBMS Exam
        exam_title = "Database Management Systems (DBMS) Comprehensive Assessment"
        exam = db.query(Exam).filter(Exam.title == exam_title).first()
        if not exam:
            exam = Exam(
                title=exam_title,
                subject="Database Management Systems",
                duration_minutes=45,
                question_count=6,
                randomization_enabled=True,
                negative_marking_enabled=True,
                proctoring_enabled=True,
                gaze_sensitivity="medium",
                max_tab_switch_warnings=3,
                created_by=examiner.id
            )
            db.add(exam)
            db.commit()
            db.refresh(exam)
            print(f"Created Exam: {exam.title} (ID: {exam.id})")
        else:
            print(f"Exam already exists: {exam.title} (ID: {exam.id})")

        # 4. Define 6 comprehensive DBMS questions
        dbms_questions_spec = [
            {
                "question_text": "Which of the following ACID properties ensures that concurrent execution of transactions leaves the database in the same state as if the transactions were executed serially without interference?",
                "question_type": QuestionType.MCQ,
                "marks": 2.0,
                "negative_marks": 0.5,
                "model_answer": "Isolation guarantees that concurrent transaction execution results in a system state that would be obtained if transactions were executed serially.",
                "options": [
                    ("Atomicity", False),
                    ("Consistency", False),
                    ("Isolation", True),
                    ("Durability", False)
                ]
            },
            {
                "question_text": "In Relational Database normalization, a relation is in Boyce-Codd Normal Form (BCNF) if and only if for every non-trivial functional dependency X -> Y:",
                "question_type": QuestionType.MCQ,
                "marks": 2.0,
                "negative_marks": 0.5,
                "model_answer": "A relation is in BCNF if for every non-trivial functional dependency X -> Y, X is a superkey of the relation.",
                "options": [
                    ("X is a Superkey", True),
                    ("Y is a Prime Attribute", False),
                    ("X is a Candidate Key and Y is not prime", False),
                    ("Every non-prime attribute is fully functionally dependent on the primary key", False)
                ]
            },
            {
                "question_text": "Which of the following SQL statements belong to the Data Definition Language (DDL)? (Select all that apply)",
                "question_type": QuestionType.MULTI_SELECT,
                "marks": 3.0,
                "negative_marks": 0.0,
                "model_answer": "CREATE, ALTER, and DROP are DDL commands because they define and modify the schema structure.",
                "options": [
                    ("CREATE TABLE", True),
                    ("ALTER TABLE", True),
                    ("DROP INDEX", True),
                    ("SELECT * FROM employees", False),
                    ("UPDATE users SET status = 'active'", False)
                ]
            },
            {
                "question_text": "Explain the difference between a Primary Key and a Unique Key in relational database management systems.",
                "question_type": QuestionType.SHORT_ANSWER,
                "marks": 5.0,
                "negative_marks": 0.0,
                "model_answer": "A Primary Key uniquely identifies each record in a table and cannot accept NULL values; each table can only have one primary key. A Unique Key also ensures uniqueness of column values, but allows one (or more depending on the RDBMS) NULL value, and multiple Unique Keys can exist on a single table.",
                "options": []
            },
            {
                "question_text": "Describe the Three Classic Concurrency Anomalies in database transactions: Dirty Read, Non-Repeatable Read, and Phantom Read. Explain how Transaction Isolation Levels prevent each anomaly.",
                "question_type": QuestionType.LONG_ANSWER,
                "marks": 10.0,
                "negative_marks": 0.0,
                "model_answer": "1. Dirty Read: Transaction reads uncommitted data written by a concurrent transaction. Prevented by Read Committed. 2. Non-Repeatable Read: Transaction re-reads the same row and finds modified values committed by another transaction. Prevented by Repeatable Read. 3. Phantom Read: Transaction re-executes a range query and discovers new rows inserted by another committed transaction. Prevented by Serializable isolation level using two-phase locking (2PL) or multi-version concurrency control (MVCC).",
                "options": []
            },
            {
                "question_text": "Draw an Entity-Relationship (ER) Diagram on paper for a University Course Registration System with Entities: Student, Course, Instructor, and Department. Indicate Primary Keys, Foreign Keys, and Cardinalities (1:1, 1:N, M:N). Upload a clear photo or scan of your handwritten diagram.",
                "question_type": QuestionType.IMAGE_UPLOAD,
                "marks": 10.0,
                "negative_marks": 0.0,
                "model_answer": "Handwritten ER diagram clearly showing Student, Course, Instructor, Department with rectangle entity boxes, diamond relationship shapes, underlined primary key attributes, and proper cardinality notations (Student M:N Course, Instructor 1:N Course, Department 1:N Instructor).",
                "options": []
            }
        ]

        created_question_ids = []
        for i, q_spec in enumerate(dbms_questions_spec):
            # Check if exists by question_text
            q = db.query(QuestionBank).filter(QuestionBank.question_text == q_spec["question_text"]).first()
            if not q:
                q = QuestionBank(
                    question_text=q_spec["question_text"],
                    question_type=q_spec["question_type"],
                    subject="Database Management Systems",
                    difficulty="Medium",
                    marks=q_spec["marks"],
                    negative_marks=q_spec["negative_marks"],
                    model_answer=q_spec["model_answer"],
                    created_by=examiner.id
                )
                db.add(q)
                db.commit()
                db.refresh(q)

                for opt_text, is_corr in q_spec["options"]:
                    opt = Option(
                        question_id=q.id,
                        option_text=opt_text,
                        is_correct=is_corr
                    )
                    db.add(opt)
                db.commit()
                print(f"Added DBMS Question #{q.id} ({q.question_type})")
            else:
                print(f"DBMS Question #{q.id} already exists.")

            created_question_ids.append(q.id)

            # Link question to exam if not linked
            link = db.query(ExamQuestion).filter(
                ExamQuestion.exam_id == exam.id,
                ExamQuestion.question_id == q.id
            ).first()
            if not link:
                link = ExamQuestion(
                    exam_id=exam.id,
                    question_id=q.id,
                    question_order=i + 1
                )
                db.add(link)
                db.commit()

        # Update exam question_count
        exam.question_count = len(created_question_ids)
        db.commit()

        # 5. Create or reset Active Session #1 for student so they can test immediately
        session = db.query(ExamSession).filter(
            ExamSession.exam_id == exam.id,
            ExamSession.student_id == student.id
        ).first()

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=45)

        if not session:
            session = ExamSession(
                id=1,
                exam_id=exam.id,
                student_id=student.id,
                session_token="sess_dbms_sample_01",
                started_at=now,
                expires_at=expires_at,
                status=SessionStatus.ACTIVE,
                suspicion_score=0.0
            )
            db.add(session)
            db.commit()
            db.refresh(session)
            print(f"Created active Exam Session #{session.id} for student {student.email}.")
        else:
            session.status = SessionStatus.ACTIVE
            session.expires_at = expires_at
            session.suspicion_score = 0.0
            db.commit()
            print(f"Reset active Exam Session #{session.id} with 45 minutes remaining.")

        print("\n========================================================")
        print("  DBMS SAMPLE TEST SUCCESSFULLY SEEDED!")
        print("========================================================")
        print(f"  Exam Title   : {exam.title}")
        print(f"  Exam ID      : {exam.id}")
        print(f"  Duration     : {exam.duration_minutes} Minutes")
        print(f"  Questions    : {len(created_question_ids)} items (MCQ, MSQ, Short, Long, Image)")
        print(f"  Sample Session ID : {session.id}")
        print(f"  Student Login: {student.email} / StudentPassword123!")
        print(f"  Direct Link  : http://localhost:3000/exam/{session.id}")
        print("========================================================\n")

    finally:
        db.close()


if __name__ == "__main__":
    seed_dbms()
