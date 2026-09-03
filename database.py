from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Date, Boolean, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import datetime
import enum

Base = declarative_base()

class RoleEnum(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    BRANCH_MANAGER = "BRANCH_MANAGER"
    RECEPTION = "RECEPTION"
    COACH = "COACH"
    READER = "READER"

class Branch(Base):
    __tablename__ = 'branches'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    manager_id = Column(Integer, ForeignKey('staff.id', use_alter=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    staff = relationship("Staff", back_populates="branch", foreign_keys="[Staff.branch_id]")
    students = relationship("Student", back_populates="primary_branch")
    batches = relationship("Batch", back_populates="branch")

class Staff(Base):
    __tablename__ = 'staff'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    name = Column(String)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.COACH)
    branch_id = Column(Integer, ForeignKey('branches.id'), nullable=True)
    is_system_user = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    requires_password_change = Column(Boolean, default=False)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    branch = relationship("Branch", back_populates="staff", foreign_keys=[branch_id])

class AcademySetting(Base):
    __tablename__ = 'academy_settings'
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
    data_type = Column(String) # STRING, INTEGER, BOOLEAN, JSON
    label = Column(String)
    group = Column(String)
    branch_id = Column(Integer, ForeignKey('branches.id'), nullable=True)
    updated_by = Column(Integer, ForeignKey('staff.id'), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AcademyEvent(Base):
    __tablename__ = 'academy_events'
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True)
    entity_type = Column(String)
    entity_id = Column(Integer)
    description = Column(String)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    performed_by = Column(Integer, ForeignKey('staff.id'), nullable=True)
    branch_id = Column(Integer, ForeignKey('branches.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Student(Base):
    __tablename__ = 'students'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    dob = Column(Date)
    gender = Column(String)
    education = Column(String)
    t_shirt_size = Column(String)
    fide_id = Column(String, nullable=True)
    
    # Categories & Status
    experience_category = Column(String)
    learning_goal = Column(String)
    status = Column(String, default="Active")
    joining_date = Column(Date, default=datetime.date.today)
    
    # Extra fields
    medical_notes = Column(String, nullable=True)
    preferred_language = Column(String, nullable=True)
    transport_needed = Column(Boolean, default=False)
    tournament_interest = Column(Boolean, default=False)
    
    # Phase 1: Link to branch
    primary_branch_id = Column(Integer, ForeignKey('branches.id'), nullable=True)

    # Relationships
    primary_branch = relationship("Branch", back_populates="students")
    contact = relationship("StudentContact", back_populates="student", uselist=False, cascade="all, delete-orphan")
    batches = relationship("StudentBatch", back_populates="student", cascade="all, delete-orphan")
    schedules = relationship("StudentSchedule", back_populates="student", cascade="all, delete-orphan")
    levels = relationship("StudentLevel", back_populates="student", cascade="all, delete-orphan")
    ratings = relationship("StudentRating", back_populates="student", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    receipts = relationship("Receipt", back_populates="student", cascade="all, delete-orphan")
    ledger_entries = relationship("LedgerEntry", back_populates="student", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="student", cascade="all, delete-orphan")
    notes = relationship("CoachNote", back_populates="student", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="student", cascade="all, delete-orphan")
    progression = relationship("LevelProgression", back_populates="student", cascade="all, delete-orphan")

class StudentContact(Base):
    __tablename__ = 'student_contacts'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    
    father_name = Column(String, nullable=True)
    mother_name = Column(String, nullable=True)
    address = Column(String)
    primary_contact = Column(String)
    whatsapp_number = Column(String, nullable=True)
    secondary_contact = Column(String, nullable=True)
    
    student = relationship("Student", back_populates="contact")

class Batch(Base):
    __tablename__ = 'batches'
    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey('branches.id'), nullable=True) # Phase 1
    name = Column(String, index=True)
    is_active = Column(Boolean, default=True)
    
    branch = relationship("Branch", back_populates="batches")
    student_links = relationship("StudentBatch", back_populates="batch", cascade="all, delete-orphan")
    schedules = relationship("BatchSchedule", back_populates="batch", cascade="all, delete-orphan")

class BatchSchedule(Base):
    __tablename__ = 'batch_schedules'
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey('batches.id'))
    day_of_week = Column(Integer) # 0=Monday, 6=Sunday
    start_time = Column(String) # e.g. "18:00"
    end_time = Column(String) # e.g. "19:00"
    coach_id = Column(Integer, ForeignKey('staff.id'), nullable=True)
    
    batch = relationship("Batch", back_populates="schedules")
    coach = relationship("Staff")

class StudentBatch(Base):
    __tablename__ = 'student_batches'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    batch_id = Column(Integer, ForeignKey('batches.id'))
    
    student = relationship("Student", back_populates="batches")
    batch = relationship("Batch", back_populates="student_links")

class StudentSchedule(Base):
    __tablename__ = 'student_schedules'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    batch_schedule_id = Column(Integer, ForeignKey('batch_schedules.id'))
    
    student = relationship("Student", back_populates="schedules")
    batch_schedule = relationship("BatchSchedule")

class StudentLevel(Base):
    __tablename__ = 'student_levels'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    level = Column(String) # Beginner, Intermediate, Advanced
    date_achieved = Column(Date, default=datetime.date.today)
    notes = Column(String, nullable=True)
    
    student = relationship("Student", back_populates="levels")

class StudentRating(Base):
    __tablename__ = 'student_ratings'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    rating_type = Column(String) # FIDE, Rapid, Blitz, Academy
    rating_value = Column(Integer)
    date_recorded = Column(Date, default=datetime.date.today)
    
    student = relationship("Student", back_populates="ratings")

class Attendance(Base):
    __tablename__ = 'attendance'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    batch_id = Column(Integer, ForeignKey('batches.id'))
    batch_schedule_id = Column(Integer, ForeignKey('batch_schedules.id'), nullable=True)
    date = Column(Date, default=datetime.date.today)
    status = Column(String) # Present, Absent
    marked_by = Column(Integer, ForeignKey('staff.id'), nullable=True)
    
    student = relationship("Student", back_populates="attendances")
    batch = relationship("Batch")
    batch_schedule = relationship("BatchSchedule")

class Receipt(Base):
    __tablename__ = 'receipts'
    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String, unique=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    amount = Column(Float)
    payment_mode = Column(String) # Cash, UPI, Card, Bank Transfer
    date = Column(Date, default=datetime.date.today)
    received_by = Column(Integer, ForeignKey('staff.id'), nullable=True)
    branch_id = Column(Integer, ForeignKey('branches.id'), nullable=True)
    
    student = relationship("Student", back_populates="receipts")
    ledger_entries = relationship("LedgerEntry", back_populates="receipt")

class LedgerEntry(Base):
    __tablename__ = 'ledger_entries'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    transaction_type = Column(String) # CHARGE, PAYMENT, REFUND
    amount = Column(Float) # Positive for PAYMENT/REFUND, Negative for CHARGE
    classes_added = Column(Integer, default=0) # e.g. 12 when purchasing a package
    description = Column(String)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    receipt_id = Column(Integer, ForeignKey('receipts.id'), nullable=True)
    branch_id = Column(Integer, ForeignKey('branches.id'), nullable=True)
    
    student = relationship("Student", back_populates="ledger_entries")
    receipt = relationship("Receipt", back_populates="ledger_entries")

class Tournament(Base):
    __tablename__ = 'tournaments'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    date = Column(Date)
    status = Column(String)

class TournamentParticipation(Base):
    __tablename__ = 'tournament_participations'
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey('tournaments.id'))
    student_id = Column(Integer, ForeignKey('students.id'))
    category = Column(String) # Under 9, Under 11 etc.
    points = Column(Float, default=0.0)
    rank = Column(Integer, nullable=True)
    performance_notes = Column(String, nullable=True)

class Assessment(Base):
    __tablename__ = 'assessments'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    date = Column(Date, default=datetime.date.today)
    tactics = Column(Integer)  # 1-10
    openings = Column(Integer)
    endgames = Column(Integer)
    calculation = Column(Integer)
    strategy = Column(Integer)
    coach_id = Column(Integer, ForeignKey('staff.id')) # Replaced Coach with Staff
    student = relationship("Student", back_populates="assessments")

class LevelProgression(Base):
    __tablename__ = 'level_progression'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    old_level = Column(String)
    new_level = Column(String)
    date = Column(Date, default=datetime.date.today)
    student = relationship("Student", back_populates="progression")

class CoachNote(Base):
    __tablename__ = 'coach_notes'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    coach_id = Column(Integer, ForeignKey('staff.id')) # Replaced Coach with Staff
    note = Column(String)
    category = Column(String) # Strength, Weakness, Observation
    date = Column(Date, default=datetime.date.today)
    student = relationship("Student", back_populates="notes")

class Achievement(Base):
    __tablename__ = 'achievements'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    title = Column(String)
    description = Column(String)
    type = Column(String) # Medal, Certificate, Trophy
    image_url = Column(String, nullable=True)
    date = Column(Date, default=datetime.date.today)
    student = relationship("Student", back_populates="achievements")

# Database Setup
import os
import sys
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def _default_sqlite_path() -> Path:
    # Keep DB external from bundled app: next to the EXE in frozen mode.
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent / "chess_academy.db"
    # In dev mode, keep DB in project folder.
    return Path(__file__).resolve().parent / "chess_academy.db"

SQLALCHEMY_DATABASE_URL = DATABASE_URL or f"sqlite:///{_default_sqlite_path().as_posix()}"

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)



class Enquiry(Base):
    __tablename__ = 'enquiries'
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, default=datetime.date.today)
    parent_name = Column(String)
    student_name = Column(String)
    age = Column(Integer, nullable=True)
    contact = Column(String)
    source = Column(String, nullable=True)
    branch_id = Column(Integer, ForeignKey('branches.id'), nullable=True)
    status = Column(String, default="Open") # Open, Converted, Lost
    handled_by = Column(Integer, ForeignKey('staff.id'), nullable=True)
    notes = Column(String, nullable=True)
    
    branch = relationship("Branch")
    handler = relationship("Staff")
    follow_ups = relationship("FollowUp", back_populates="enquiry", cascade="all, delete-orphan")

class FollowUp(Base):
    __tablename__ = 'follow_ups'
    id = Column(Integer, primary_key=True, index=True)
    enquiry_id = Column(Integer, ForeignKey('enquiries.id'))
    date = Column(Date, default=datetime.date.today)
    method = Column(String) # Call, WhatsApp, Visit
    outcome = Column(String)
    staff_id = Column(Integer, ForeignKey('staff.id'), nullable=True)
    next_follow_up_date = Column(Date, nullable=True)
    
    enquiry = relationship("Enquiry", back_populates="follow_ups")
    staff = relationship("Staff")

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    print("Database schema updated successfully in chess_academy.db!")
