"""create examination platform schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-27 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create Users Table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('student', 'examiner', 'admin', name='user_role', native_enum=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # Create Question Bank Table
    op.create_table(
        'question_bank',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('question_type', sa.Enum('MCQ', 'multi_select', 'short_answer', 'long_answer', 'image_upload', name='question_type', native_enum=False), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=True),
        sa.Column('difficulty', sa.String(length=50), nullable=True),
        sa.Column('model_answer', sa.Text(), nullable=True),
        sa.Column('marks', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('negative_marks', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_question_bank_id'), 'question_bank', ['id'], unique=False)

    # Create Options Table
    op.create_table(
        'options',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('option_text', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['question_id'], ['question_bank.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_options_id'), 'options', ['id'], unique=False)

    # Create Exams Table
    op.create_table(
        'exams',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('question_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('randomization_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('negative_marking_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('proctoring_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('gaze_sensitivity', sa.String(length=50), nullable=False, server_default="'medium'"),
        sa.Column('max_tab_switch_warnings', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_exams_id'), 'exams', ['id'], unique=False)

    # Create Exam Questions Table
    op.create_table(
        'exam_questions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('exam_id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('question_order', sa.Integer(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['question_bank.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_exam_questions_id'), 'exam_questions', ['id'], unique=False)

    # Create Exam Sessions Table
    op.create_table(
        'exam_sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('exam_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('session_token', sa.String(length=255), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum('active', 'submitted', 'expired', name='session_status', native_enum=False), nullable=False),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_exam_sessions_id'), 'exam_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_exam_sessions_session_token'), 'exam_sessions', ['session_token'], unique=True)

    # Create Answers Table
    op.create_table(
        'answers',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('selected_option_id', sa.Integer(), nullable=True),
        sa.Column('answer_text', sa.Text(), nullable=True),
        sa.Column('image_path', sa.String(length=512), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['selected_option_id'], ['options.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['question_id'], ['question_bank.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['session_id'], ['exam_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_answers_id'), 'answers', ['id'], unique=False)

    # Create Results Table
    op.create_table(
        'results',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('max_score', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('evaluation_type', sa.Enum('auto', 'ai', 'examiner', name='evaluation_type', native_enum=False), nullable=False),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['question_id'], ['question_bank.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['session_id'], ['exam_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_results_id'), 'results', ['id'], unique=False)

    # Create Proctor Events Table
    op.create_table(
        'proctor_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.Enum('face_absent', 'multiple_faces', 'gaze_away', 'tab_switch', 'window_blur', 'window_focus', name='proctor_event_type', native_enum=False), nullable=False),
        sa.Column('event_timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False, server_default="'low'"),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('suspicion_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('snapshot_path', sa.String(length=512), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['exam_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_proctor_events_id'), 'proctor_events', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_proctor_events_id'), table_name='proctor_events')
    op.drop_table('proctor_events')
    op.drop_index(op.f('ix_results_id'), table_name='results')
    op.drop_table('results')
    op.drop_index(op.f('ix_answers_id'), table_name='answers')
    op.drop_table('answers')
    op.drop_index(op.f('ix_exam_sessions_session_token'), table_name='exam_sessions')
    op.drop_index(op.f('ix_exam_sessions_id'), table_name='exam_sessions')
    op.drop_table('exam_sessions')
    op.drop_index(op.f('ix_exam_questions_id'), table_name='exam_questions')
    op.drop_table('exam_questions')
    op.drop_index(op.f('ix_exams_id'), table_name='exams')
    op.drop_table('exams')
    op.drop_index(op.f('ix_options_id'), table_name='options')
    op.drop_table('options')
    op.drop_index(op.f('ix_question_bank_id'), table_name='question_bank')
    op.drop_table('question_bank')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
