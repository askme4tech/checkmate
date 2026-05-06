from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Date, Boolean, DateTime
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import datetime

Base = declarative_base()

class Coach(Base):
    __tablename__ = 'coaches'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)

class Student(Base):
    __tablename__ = 'students'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    dob = Column(Date)
    gender = Column(String)
    education = Column(String)
    t_shirt_size = Column(String)
    fide_id = Column(String, nullable=True) # Yes/No ID string
    
    # Categories & Status
    experience_category = Column(String) # New, School Player, Tournament Player, etc.
    learning_goal = Column(String) # Hobby, Competitive, State Level...
    status = Column(String, default="Active") # Active/Inactive
    joining_date = Column(Date, default=datetime.date.today)
    
    # Auto-calculated / Derived logic fields (stored or dynamically computed)
    attendance_risk = Column(String, default="Regular")
    fee_status = Column(String, default="Paid")
    performance_category = Column(String, default="Consistent")
    
    # Extra fields
    medical_notes = Column(String, nullable=True)
    preferred_language = Column(String, nullable=True)
    transport_needed = Column(Boolean, default=False)
    tournament_interest = Column(Boolean, default=False)
    
    # Relationships
    contact = relationship("StudentContact", back_populates="student", uselist=False, cascade="all, delete-orphan")
    batches = relationship("StudentBatch", back_populates="student", cascade="all, delete-orphan")
    levels = relationship("StudentLevel", back_populates="student", cascade="all, delete-orphan")
    ratings = relationship("StudentRating", back_populates="student", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    fees = relationship("Fee", back_populates="student", cascade="all, delete-orphan")

class StudentContact(Base):
    __tablename__ = 'student_contacts'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    
    father_name = Column(String, nullable=True)
    mother_name = Column(String, nullable=True)
    address = Column(String)
    primary_contact = Column(String)
    secondary_contact = Column(String, nullable=True)
    
    student = relationship("Student", back_populates="contact")

class Batch(Base):
    __tablename__ = 'batches'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    days = Column(String)
    timing = Column(String)
    is_active = Column(Boolean, default=True)
    
    student_links = relationship("StudentBatch", back_populates="batch", cascade="all, delete-orphan")

class StudentBatch(Base):
    __tablename__ = 'student_batches'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    batch_id = Column(Integer, ForeignKey('batches.id'))
    
    student = relationship("Student", back_populates="batches")
    batch = relationship("Batch", back_populates="student_links")

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
    date = Column(Date, default=datetime.date.today)
    status = Column(String) # Present, Absent
    
    student = relationship("Student", back_populates="attendances")

class Fee(Base):
    __tablename__ = 'fees'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    payment_date = Column(Date, default=datetime.date.today)
    amount = Column(Float)
    classes_credited = Column(Integer, default=12)
    status = Column(String) # Paid, Pending, Overdue
    
    student = relationship("Student", back_populates="fees")

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

# Database Setup
import os

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

SQLALCHEMY_DATABASE_URL = DATABASE_URL or "sqlite:///./chess_academy.db"

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    print("Database schema updated successfully in chess_academy.db!")
