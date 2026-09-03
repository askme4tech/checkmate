from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
import database as db
from typing import List, Optional
from pydantic import BaseModel
import datetime
import io
import csv
import sys
import os
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from datetime import timedelta

# Auth Configuration
SECRET_KEY = "CHESS_ACADEMY_SUPER_SECRET_KEY"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password, hashed_password):
    if not hashed_password: return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Models for Auth
class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: str
    requires_password_change: bool = False

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

# Initialize database
db.init_db()

def get_db():
    session = db.SessionLocal()
    try:
        yield session
    finally:
        session.close()

def seed_admin_user():
    session = db.SessionLocal()
    try:
        admin = session.query(db.Staff).filter(db.Staff.email == "admin@chessacademy.com").first()
        if not admin:
            admin = db.Staff(
                email="admin@chessacademy.com",
                name="Admin User",
                role=db.RoleEnum.SUPER_ADMIN,
                hashed_password=get_password_hash("admin123")
            )
            session.add(admin)
            session.commit()
            print("Default admin user created: admin@chessacademy.com / admin123")
    finally:
        session.close()

seed_admin_user()

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

app = FastAPI(title="Checkmate Academy Management System")
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:8100", 
        "https://checkmatecbe.com", 
        "https://www.checkmatecbe.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = session.query(db.Staff).filter(db.Staff.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def require_roles(roles: list[db.RoleEnum]):
    def role_checker(current_user: db.Staff = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return current_user
    return role_checker

@app.post("/api/auth/login", response_model=Token)
def login(req: LoginRequest, session: Session = Depends(get_db)):
    user = session.query(db.Staff).filter(db.Staff.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}, expires_delta=access_token_expires
    )
    user.last_login_at = datetime.datetime.utcnow()
    session.commit()
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me")
def read_users_me(current_user: db.Staff = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role.value,
        "requires_password_change": current_user.requires_password_change
    }

@app.post("/api/auth/change-password")
def change_password(req: ChangePasswordRequest, session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.hashed_password = get_password_hash(req.new_password)
    current_user.requires_password_change = False
    session.commit()
    return {"message": "Password changed successfully"}

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204) # Suppress log spam

# --- User Management Endpoints ---

@app.get("/api/users")
def get_users(session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN]))):
    users = session.query(db.Staff).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role.value, "last_login_at": u.last_login_at} for u in users]

@app.post("/api/users")
def create_user(user_req: UserCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN]))):
    existing = session.query(db.Staff).filter(db.Staff.email == user_req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = db.Staff(
        name=user_req.name,
        email=user_req.email,
        role=db.RoleEnum(user_req.role),
        hashed_password=get_password_hash(user_req.password),
        requires_password_change=user_req.requires_password_change
    )
    session.add(new_user)
    session.commit()
    return {"message": "User created successfully"}

@app.put("/api/users/{user_id}")
def update_user(user_id: int, user_req: UserUpdate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN]))):
    user = session.query(db.Staff).filter(db.Staff.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_req.name: user.name = user_req.name
    if user_req.email: user.email = user_req.email
    if user_req.role: user.role = db.RoleEnum(user_req.role)
    if user_req.password: user.hashed_password = get_password_hash(user_req.password)
    
    session.commit()
    return {"message": "User updated successfully"}

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN]))):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = session.query(db.Staff).filter(db.Staff.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    session.delete(user)
    session.commit()
    return {"message": "User deleted"}

# --- Utility Functions ---
def calculate_age_category(dob: datetime.date) -> str:
    if dob is None:
        return "Unknown"
    today = datetime.date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 6: return "Under 6"
    if age < 8: return "Under 8"
    if age < 10: return "Under 10"
    if age < 12: return "Under 12"
    if age < 15: return "Under 15"
    if age < 18: return "Under 18"
    return "Adult"

def calculate_fee_status(student_id: int, session: Session) -> str:
    total_present = session.query(db.Attendance).filter(
        db.Attendance.student_id == student_id,
        db.Attendance.status == "Present"
    ).count()
    
    total_credited = session.query(func.sum(db.LedgerEntry.classes_added)).filter(
        db.LedgerEntry.student_id == student_id
    ).scalar() or 0
    
    if total_present >= total_credited:
        if total_present >= total_credited + 2:
            return "Overdue"
        return "Pending"
    elif total_credited - total_present <= 2:
        return "Upcoming Payment"
    return "Paid"

def calculate_attendance_risk(student_id: int, session: Session) -> str:
    total = session.query(db.Attendance).filter(db.Attendance.student_id == student_id).count()
    if total == 0: return "No Data"
    
    present = session.query(db.Attendance).filter(
        db.Attendance.student_id == student_id, 
        db.Attendance.status == "Present"
    ).count()
    
    ratio = present / total
    if ratio >= 0.8: return "Regular"
    if ratio >= 0.5: return "Moderate"
    return "Irregular"

# --- Pydantic Schemas ---

class CoachCreate(BaseModel):
    name: str
    email: str
    role: str = "Coach"

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

class StudentContactCreate(BaseModel):
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    address: str
    primary_contact: str
    whatsapp_number: Optional[str] = None
    secondary_contact: Optional[str] = None

class StudentCreate(BaseModel):
    name: str
    dob: Optional[datetime.date] = None
    joining_date: Optional[datetime.date] = None
    gender: Optional[str] = None
    education: Optional[str] = None
    t_shirt_size: Optional[str] = None
    fide_id: Optional[str] = None
    fide_rating: Optional[int] = None
    
    experience_category: Optional[str] = None
    learning_goal: Optional[str] = None
    level: Optional[str] = 'BEGINNER'
    
    medical_notes: Optional[str] = None
    preferred_language: Optional[str] = None
    transport_needed: bool = False
    tournament_interest: bool = False
    notes: Optional[str] = None
    contact: Optional[StudentContactCreate] = None
    batch_days: Optional[str] = None
    batch_timing: Optional[str] = None
    batch_ids: List[int]
    batch_schedule_ids: Optional[List[int]] = None

class ScheduleCreate(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str
    coach_id: Optional[int] = None

class BatchCreate(BaseModel):
    name: str
    schedules: List[ScheduleCreate] = []

class BulkCoachAssign(BaseModel):
    batch_ids: List[int]
    coach_id: int

class ExportRequest(BaseModel):
    student_ids: List[int]

class AttendanceMark(BaseModel):
    student_id: int
    batch_id: int
    batch_schedule_id: Optional[int] = None
    status: str
    date: Optional[str] = None

class FeeCreate(BaseModel):
    amount: float
    classes_credited: int = 12
    payment_mode: Optional[str] = "Manual"
    payment_date: Optional[datetime.date] = None

class TournamentCreate(BaseModel):
    name: str
    date: datetime.date
    status: str = "Completed"

class ParticipationCreate(BaseModel):
    student_id: int
    category: str
    points: float
    rank: Optional[int] = None
    performance_notes: Optional[str] = None

# --- API Endpoints ---
@app.post("/api/batches")
def create_batch(batch: BatchCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    db_batch = db.Batch(name=batch.name)
    session.add(db_batch)
    session.flush()
    for sch in batch.schedules:
        session.add(db.BatchSchedule(
            batch_id=db_batch.id,
            day_of_week=sch.day_of_week,
            start_time=sch.start_time,
            end_time=sch.end_time,
            coach_id=sch.coach_id
        ))
    session.commit()
    session.refresh(db_batch)
    return db_batch


@app.get("/api/coaches")
def get_coaches(session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    coaches = session.query(db.Staff).all()
    return [{"id": c.id, "name": c.name, "email": c.email, "role": c.role.value if c.role else "Coach"} for c in coaches]

@app.post("/api/coaches")
def create_coach(data: CoachCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    # RoleEnum in database.py
    new_coach = db.Staff(
        name=data.name,
        email=data.email,
        # role=data.role
    )
    session.add(new_coach)
    session.commit()
    return {"id": new_coach.id}

@app.get("/api/batches")
def get_batches(session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    batches = session.query(db.Batch).all()
    result = []
    day_map = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
    for b in batches:
        student_count = session.query(db.StudentBatch).filter(db.StudentBatch.batch_id == b.id).count()
        days_str = ", ".join([day_map.get(s.day_of_week, "") for s in b.schedules])
        timing_str = f"{b.schedules[0].start_time} - {b.schedules[0].end_time}" if b.schedules else "Not set"
        result.append({
            "id": b.id,
            "name": b.name,
            "days": days_str,
            "timing": timing_str,
            "schedules": [{"id": s.id, "day": s.day_of_week, "start": s.start_time, "end": s.end_time, "coach": s.coach_id} for s in b.schedules],
            "is_active": b.is_active if b.is_active is not None else True,
            "student_count": student_count
        })
    return result

@app.delete("/api/batches/{batch_id}")
def delete_batch(batch_id: int, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    # Remove student links first
    session.query(db.StudentBatch).filter(db.StudentBatch.batch_id == batch_id).delete()
    batch = session.query(db.Batch).filter(db.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    session.delete(batch)
    session.commit()
    return {"message": "Batch deleted"}

@app.patch("/api/batches/{batch_id}/toggle")
def toggle_batch(batch_id: int, session: Session = Depends(get_db)):
    batch = session.query(db.Batch).filter(db.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    batch.is_active = not batch.is_active
    session.commit()
    return {"id": batch.id, "is_active": batch.is_active}

@app.put("/api/batches/bulk-assign-coach")
def bulk_assign_coach(data: BulkCoachAssign, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    for batch_id in data.batch_ids:
        schedules = session.query(db.BatchSchedule).filter(db.BatchSchedule.batch_id == batch_id).all()
        for schedule in schedules:
            schedule.coach_id = data.coach_id
    session.commit()
    return {"message": "Coaches assigned successfully"}

@app.put("/api/batches/{batch_id}")
def update_batch(batch_id: int, b_data: dict, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    batch = session.query(db.Batch).filter(db.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if "name" in b_data: batch.name = b_data["name"]
    if "schedules" in b_data:
        session.query(db.BatchSchedule).filter(db.BatchSchedule.batch_id == batch_id).delete()
        for sch in b_data["schedules"]:
            session.add(db.BatchSchedule(
                batch_id=batch_id,
                day_of_week=sch.get("day_of_week"),
                start_time=sch.get("start_time"),
                end_time=sch.get("end_time"),
                coach_id=sch.get("coach_id")
            ))
    session.commit()
    return {"id": batch.id}



@app.post("/api/students")
def register_student(data: StudentCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    # Create Student
    db_student = db.Student(
        name=data.name,
        dob=data.dob,
        joining_date=data.joining_date,
        gender=data.gender,
        education=data.education,
        t_shirt_size=data.t_shirt_size,
        fide_id=data.fide_id,
        experience_category=data.experience_category,
        learning_goal=data.learning_goal,
        medical_notes=data.medical_notes,
        preferred_language=data.preferred_language,
        transport_needed=data.transport_needed,
        tournament_interest=data.tournament_interest
    )
    session.add(db_student)
    session.flush() # get student ID
    
    # Create Contact
    db_contact = db.StudentContact(**data.contact.model_dump(), student_id=db_student.id)
    session.add(db_contact)
    
    # Create Level
    db_level = db.StudentLevel(student_id=db_student.id, level=data.level)
    session.add(db_level)
    
    # Create Rating if provided
    if data.fide_rating:
        db_rating = db.StudentRating(student_id=db_student.id, rating_type="FIDE", rating_value=data.fide_rating)
        session.add(db_rating)
        
    # Link to selected Batches
    for b_id in data.batch_ids:
        db_sb = db.StudentBatch(student_id=db_student.id, batch_id=b_id)
        session.add(db_sb)
        
    # Link to selected Schedules
    if data.batch_schedule_ids:
        for bs_id in data.batch_schedule_ids:
            session.add(db.StudentSchedule(student_id=db_student.id, batch_schedule_id=bs_id))
        
    session.commit()
    session.refresh(db_student)
    return db_student

@app.get("/api/students")
def get_students(batch_id: Optional[int] = None, batch_schedule_id: Optional[int] = None, date: Optional[str] = None, session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    query = session.query(db.Student)
    if batch_schedule_id is not None:
        # Pull students that have this specific schedule, OR have the batch but NO specific schedules assigned (legacy)
        query = query.join(db.StudentBatch).filter(db.StudentBatch.batch_id == batch_id)
        query = query.filter(db.Student.status == "Active")
    elif batch_id is not None:
        query = query.join(db.StudentBatch).filter(db.StudentBatch.batch_id == batch_id)
        # Only load Active students for marking attendance
        query = query.filter(db.Student.status == "Active")
    if date is not None:
        try:
            parsed_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
            query = query.filter(db.Student.joining_date <= parsed_date)
        except ValueError:
            pass
            
    students = query.all()
    result = []
    for s in students:
        # Get latest academy rating
        latest_rating = session.query(db.StudentRating)\
            .filter(db.StudentRating.student_id == s.id)\
            .order_by(db.StudentRating.date_recorded.desc())\
            .first()
        
        # Get last attendance date
        last_att = session.query(db.Attendance)\
            .filter(db.Attendance.student_id == s.id, db.Attendance.status == "Present")\
            .order_by(db.Attendance.date.desc())\
            .first()

        total_credited = session.query(func.sum(db.LedgerEntry.classes_added)).filter(
            db.LedgerEntry.student_id == s.id
        ).scalar() or 0
        total_present = session.query(db.Attendance).filter(
            db.Attendance.student_id == s.id, db.Attendance.status == "Present"
        ).count()
        remaining_classes = total_credited - total_present

        s_dict = {
            "id": s.id,
            "name": s.name,
            "status": s.status or "Active",
            "age_category": calculate_age_category(s.dob),
            "fee_status": calculate_fee_status(s.id, session),
            "attendance_risk": calculate_attendance_risk(s.id, session),
            "remaining_classes": remaining_classes,
            "last_seen": last_att.date.strftime("%d %b %Y") if last_att else "Never",
            "level": s.levels[-1].level if s.levels else "Unknown",
            "experience": s.experience_category,
            "rating": latest_rating.rating_value if latest_rating else 1200,
            "batches": [sb.batch.name for sb in s.batches],
            "batch_schedule_ids": [ss.batch_schedule_id for ss in s.schedules],
            "whatsapp": s.contact.whatsapp_number if s.contact else ""
        }
        result.append(s_dict)
    return result


@app.patch("/api/students/{student_id}/toggle_status")
def toggle_student_status(student_id: int, session: Session = Depends(get_db)):
    student = session.query(db.Student).filter(db.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student.status = "Inactive" if student.status == "Active" else "Active"
    session.commit()
    return {"id": student.id, "status": student.status}

@app.get("/api/students/{student_id}/attendance_history")
def get_student_attendance_history(student_id: int, session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    fees = session.query(db.LedgerEntry).filter(
        db.LedgerEntry.student_id == student_id,
        db.LedgerEntry.transaction_type == "CHARGE"
    ).order_by(db.LedgerEntry.date.asc()).all()
    
    attendances = session.query(db.Attendance).filter(
        db.Attendance.student_id == student_id,
        db.Attendance.status == "Present"
    ).order_by(db.Attendance.date.asc()).all()
    
    blocks = []
    att_idx = 0
    for fee in fees:
        block_attendances = []
        for _ in range(fee.classes_added):
            if att_idx < len(attendances):
                a = attendances[att_idx]
                block_attendances.append({
                    "date": a.date.strftime("%d %b %Y"),
                    "day": a.date.strftime("%A"),
                    "batch": a.batch.name if a.batch else "Unknown"
                })
                att_idx += 1
            else:
                break
                
        blocks.append({
            "payment_date": fee.date.strftime("%d %b %Y") if fee.date else "Unknown",
            "amount": abs(fee.amount),
            "classes_credited": fee.classes_added,
            "attendances": block_attendances
        })
        
    # Any remaining attendances are unpaid (negative balance)
    unpaid_attendances = []
    while att_idx < len(attendances):
        a = attendances[att_idx]
        unpaid_attendances.append({
            "date": a.date.strftime("%d %b %Y"),
            "day": a.date.strftime("%A"),
            "batch": a.batch.name if a.batch else "Unknown"
        })
        att_idx += 1
        
    if unpaid_attendances or len(blocks) == 0:
        blocks.append({
            "payment_date": "Unpaid / Outstanding",
            "amount": 0,
            "classes_credited": 0,
            "attendances": unpaid_attendances
        })
        
    return blocks

@app.get("/api/students/{student_id}")
def get_single_student(student_id: int, session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    print(f"DEBUG: Fetching student ID {student_id}")
    student = session.query(db.Student).filter(db.Student.id == student_id).first()
    if not student:
        print(f"DEBUG: Student {student_id} not found in DB")
        raise HTTPException(status_code=404, detail=f"Student ID {student_id} not found")
        
    fee_status = calculate_fee_status(student.id, session)
    attendance_risk = calculate_attendance_risk(student.id, session)

    total_credited = session.query(func.sum(db.LedgerEntry.classes_added)).filter(
        db.LedgerEntry.student_id == student.id
    ).scalar() or 0
    total_present = session.query(db.Attendance).filter(
        db.Attendance.student_id == student.id, db.Attendance.status == "Present"
    ).count()
    remaining_classes = total_credited - total_present

    receipts = session.query(db.Receipt).filter(db.Receipt.student_id == student_id).order_by(db.Receipt.date.desc()).all()
    payments = [{
        "id": r.id,
        "amount": r.amount,
        "classes_credited": session.query(func.sum(db.LedgerEntry.classes_added)).filter(db.LedgerEntry.receipt_id == r.id).scalar() or 0,
        "payment_date": r.date.strftime("%Y-%m-%d") if r.date else None,
        "status": "Paid"
    } for r in receipts]

    assessments = session.query(db.Assessment).filter(db.Assessment.student_id == student_id).order_by(db.Assessment.date.desc()).all()
    level_progressions = session.query(db.LevelProgression).filter(db.LevelProgression.student_id == student_id).order_by(db.LevelProgression.date.desc()).all()
    coach_notes = session.query(db.CoachNote).filter(db.CoachNote.student_id == student_id).order_by(db.CoachNote.date.desc()).all()
    achievements = session.query(db.Achievement).filter(db.Achievement.student_id == student_id).order_by(db.Achievement.date.desc()).all()

    return {
        "name": student.name,
        "dob": student.dob,
        "joining_date": student.joining_date,
        "gender": student.gender,
        "education": student.education,
        "t_shirt_size": student.t_shirt_size,
        "fide_id": student.fide_id,
        "fide_rating": student.ratings[0].rating_value if student.ratings else None,
        "experience_category": student.experience_category,
        "learning_goal": student.learning_goal,
        "level": student.levels[-1].level if student.levels else "Unknown",
        "medical_notes": student.medical_notes,
        "preferred_language": student.preferred_language,
        "transport_needed": student.transport_needed,
        "tournament_interest": student.tournament_interest,
        "contact": {
            "father_name": student.contact.father_name if student.contact else "",
            "mother_name": student.contact.mother_name if student.contact else "",
            "primary_contact": student.contact.primary_contact if student.contact else "",
            "whatsapp_number": student.contact.whatsapp_number if student.contact else "",
            "address": student.contact.address if student.contact else ""
        },
        "batches": [sb.batch.name for sb in student.batches],
        "batch_ids": [sb.batch_id for sb in student.batches],
        "batch_schedule_ids": [ss.batch_schedule_id for ss in student.schedules],
        "payments": payments,
        "fee_status": fee_status,
        "attendance_risk": attendance_risk,
        "remaining_classes": remaining_classes,
        "assessments": [{"date": a.date, "tactics": a.tactics, "openings": a.openings, "endgames": a.endgames, "calculation": a.calculation, "strategy": a.strategy} for a in assessments],
        "level_progressions": [{"date": l.date, "old_level": l.old_level, "new_level": l.new_level} for l in level_progressions],
        "coach_notes": [{"date": n.date, "note": n.note, "visibility": n.visibility} for n in coach_notes],
        "achievements": [{"date": a.date, "title": a.title, "description": a.description, "level": a.level} for a in achievements]
    }

@app.put("/api/students/{student_id}")
def update_student(student_id: int, data: StudentCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    student = session.query(db.Student).filter(db.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404)
        
    student.name = data.name
    student.dob = data.dob
    student.joining_date = data.joining_date
    student.gender = data.gender
    student.education = data.education
    student.t_shirt_size = data.t_shirt_size
    student.fide_id = data.fide_id
    student.experience_category = data.experience_category
    student.learning_goal = data.learning_goal
    student.medical_notes = data.medical_notes
    student.preferred_language = data.preferred_language
    student.transport_needed = data.transport_needed
    student.tournament_interest = data.tournament_interest
    
    # Update Contact
    if student.contact:
        student.contact.father_name = data.contact.father_name
        student.contact.mother_name = data.contact.mother_name
        student.contact.primary_contact = data.contact.primary_contact
        student.contact.whatsapp_number = data.contact.whatsapp_number
        student.contact.address = data.contact.address
        
    # Check if level changed
    current_level = student.levels[-1].level if student.levels else None
    if current_level != data.level:
        session.add(db.StudentLevel(student_id=student.id, level=data.level))
        
    # Update Batch Assignments
    session.query(db.StudentBatch).filter(db.StudentBatch.student_id == student_id).delete()
    for b_id in data.batch_ids:
        session.add(db.StudentBatch(student_id=student.id, batch_id=b_id))
        
    # Update Schedule Assignments
    if data.batch_schedule_ids is not None:
        session.query(db.StudentSchedule).filter(db.StudentSchedule.student_id == student_id).delete()
        for bs_id in data.batch_schedule_ids:
            session.add(db.StudentSchedule(student_id=student.id, batch_schedule_id=bs_id))
        
    session.commit()
    return {"message": "Updated"}

@app.post("/api/attendance")
def mark_attendance(attendance: AttendanceMark, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    # Use the date provided by frontend, default to today if missing
    att_date = attendance.date if hasattr(attendance, 'date') and attendance.date else datetime.date.today()
    if isinstance(att_date, str):
        att_date = datetime.datetime.strptime(att_date, "%Y-%m-%d").date()

    # Upsert Logic: Check if record already exists for this student/batch/date
    existing = session.query(db.Attendance).filter(
        db.Attendance.student_id == attendance.student_id,
        db.Attendance.batch_id == attendance.batch_id,
        db.Attendance.date == att_date
    )
    if attendance.batch_schedule_id:
        existing = existing.filter(db.Attendance.batch_schedule_id == attendance.batch_schedule_id)
    existing = existing.first()

    if existing:
        existing.status = attendance.status
    else:
        db_att = db.Attendance(
            student_id=attendance.student_id,
            batch_id=attendance.batch_id,
            batch_schedule_id=attendance.batch_schedule_id,
            status=attendance.status,
            date=att_date
        )
        session.add(db_att)
    
    session.commit()
    
    # Return updated fee status for dashboard
    new_fee_status = calculate_fee_status(attendance.student_id, session)
    return {"message": "Attendance marked", "new_fee_status": new_fee_status}

@app.post("/api/students/{student_id}/fees")
def add_fee_payment(student_id: int, fee: FeeCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER]))):
    import uuid
    p_date = fee.payment_date or datetime.date.today()
    print(f"DEBUG: Recording payment — student={student_id}, amount={fee.amount}, date={p_date}")
    
    # 1. Create Receipt
    receipt_no = f"REC-{str(uuid.uuid4())[:8].upper()}"
    db_receipt = db.Receipt(
        receipt_number=receipt_no,
        student_id=student_id,
        amount=fee.amount,
        payment_mode=fee.payment_mode,
        date=p_date
    )
    session.add(db_receipt)
    session.flush() # To get receipt ID
    
    # 2. Add Ledger PAYMENT entry
    db_payment = db.LedgerEntry(
        student_id=student_id,
        transaction_type="PAYMENT",
        amount=fee.amount,
        classes_added=0,
        description="Fee Payment",
        date=p_date,
        receipt_id=db_receipt.id
    )
    session.add(db_payment)
    
    # 3. Add Ledger CHARGE entry (Class Credit)
    db_charge = db.LedgerEntry(
        student_id=student_id,
        transaction_type="CHARGE",
        amount=-fee.amount,
        classes_added=fee.classes_credited,
        description="Class Credit",
        date=p_date,
        receipt_id=db_receipt.id
    )
    session.add(db_charge)
    
    session.commit()
    return {"message": "Payment recorded"}

@app.post("/api/tournaments")
def create_tournament(t: TournamentCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    db_t = db.Tournament(**t.model_dump())
    session.add(db_t)
    session.commit()
    session.refresh(db_t)
    return db_t

@app.get("/api/tournaments")
def get_tournaments(session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    ts = session.query(db.Tournament).order_by(db.Tournament.date.desc()).all()
    result = []
    for t in ts:
        p_count = session.query(db.TournamentParticipation).filter(db.TournamentParticipation.tournament_id == t.id).count()
        avg_pts = session.query(func.avg(db.TournamentParticipation.points)).filter(db.TournamentParticipation.tournament_id == t.id).scalar() or 0
        result.append({
            "id": t.id,
            "name": t.name,
            "date": t.date.strftime("%d %b %Y"),
            "participant_count": p_count,
            "avg_points": float(avg_pts)
        })
    return result

@app.post("/api/tournaments/{tournament_id}/participations")
def add_participation(tournament_id: int, p: ParticipationCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    db_p = db.TournamentParticipation(**p.model_dump(), tournament_id=tournament_id)
    session.add(db_p)
    session.commit()
    return {"message": "Participation added"}

@app.delete("/api/tournaments/{tournament_id}")
def delete_tournament(tournament_id: int, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    # Delete participations first
    session.query(db.TournamentParticipation).filter(db.TournamentParticipation.tournament_id == tournament_id).delete()
    t = session.query(db.Tournament).filter(db.Tournament.id == tournament_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    session.delete(t)
    session.commit()
    return {"message": "Tournament deleted"}

@app.get("/api/fees")
def get_fees(session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    receipts = session.query(db.Receipt).order_by(db.Receipt.date.desc()).all()
    result = []
    for r in receipts:
        classes_credited = session.query(func.sum(db.LedgerEntry.classes_added)).filter(db.LedgerEntry.receipt_id == r.id).scalar() or 0
        result.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student.name,
            "amount": r.amount,
            "date": r.date.strftime("%Y-%m-%d") if r.date else None,
            "classes_credited": classes_credited
        })
    return result

@app.delete("/api/students/{student_id}")
def delete_student(student_id: int, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    student = session.query(db.Student).filter(db.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404)
    session.delete(student)
    session.commit()
    return {"message": "Deleted"}

@app.get("/api/analytics/performance")
def get_performance_analytics(session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    # 1. Average Academy Rating
    avg_rating = session.query(func.avg(db.StudentRating.rating_value)).scalar() or 1200
    
    # 2. Skill Assessment Heatmap (Averages)
    skills = session.query(
        func.avg(db.Assessment.tactics).label('tactics'),
        func.avg(db.Assessment.openings).label('openings'),
        func.avg(db.Assessment.endgames).label('endgames'),
        func.avg(db.Assessment.calculation).label('calculation'),
        func.avg(db.Assessment.strategy).label('strategy')
    ).first()

    return {
        "avg_rating": round(avg_rating, 0),
        "skill_heatmap": {
            "Tactics": round(skills.tactics or 0, 1),
            "Openings": round(skills.openings or 0, 1),
            "Endgames": round(skills.endgames or 0, 1),
            "Calculation": round(skills.calculation or 0, 1),
            "Strategy": round(skills.strategy or 0, 1)
        }
    }

@app.get("/api/students/{student_id}/performance")
def get_student_performance(student_id: int, session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    student = session.query(db.Student).filter(db.Student.id == student_id).first()
    if not student: raise HTTPException(404)

    # Historical Ratings
    ratings = session.query(db.StudentRating).filter(db.StudentRating.student_id == student_id).order_by(db.StudentRating.date_recorded).all()
    
    # Latest Assessment for Radar Chart
    latest_assessment = session.query(db.Assessment).filter(db.Assessment.student_id == student_id).order_by(db.Assessment.date.desc()).first()
    
    # Timeline
    timeline = session.query(db.LevelProgression).filter(db.LevelProgression.student_id == student_id).order_by(db.LevelProgression.date).all()

    return {
        "student": {
            "name": student.name,
            "level": student.experience_category,
            "age": (datetime.date.today() - student.dob).days // 365 if student.dob else "N/A"
        },
        "rating_history": [{"date": r.date_recorded.strftime("%b %Y"), "value": r.rating_value} for r in ratings],
        "skills": {
            "Tactics": latest_assessment.tactics if latest_assessment else 0,
            "Openings": latest_assessment.openings if latest_assessment else 0,
            "Endgames": latest_assessment.endgames if latest_assessment else 0,
            "Calculation": latest_assessment.calculation if latest_assessment else 0,
            "Strategy": latest_assessment.strategy if latest_assessment else 0
        },
        "timeline": [{"date": t.date.strftime("%d %b %Y"), "event": f"Promoted to {t.new_level}"} for t in timeline]
    }

@app.get("/api/analytics/dashboard")
def get_dashboard_analytics(session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    students = session.query(db.Student).all()
    
    age_dist = {}
    balance_dist = {str(i): 0 for i in range(13)} # 0 to 12 classes
    level_dist = {}
    consistency_dist = {"Regular": 0, "Moderate": 0, "Irregular": 0, "No Data": 0}
    pending_fees = 0
    overdue_fees = 0
    overdue_students_list = []
    upcoming_due_list = []

    active_students = [s for s in students if s.status == "Active"]
    inactive_count = len(students) - len(active_students)

    for s in active_students:
        age_cat = calculate_age_category(s.dob)
        age_dist[age_cat] = age_dist.get(age_cat, 0) + 1
        
        level = s.levels[-1].level if s.levels else "Unknown"
        level_dist[level] = level_dist.get(level, 0) + 1
        
        # Consistency distribution
        risk = calculate_attendance_risk(s.id, session)
        consistency_dist[risk] += 1

        fee_status = calculate_fee_status(s.id, session)
        if fee_status == "Pending":
            pending_fees += 1
        elif fee_status == "Overdue":
            overdue_fees += 1

        # Class Balance Distribution (Granular 0-12)
        total_credited = session.query(func.sum(db.LedgerEntry.classes_added)).filter(
            db.LedgerEntry.student_id == s.id
        ).scalar() or 0
        total_present = session.query(db.Attendance).filter(
            db.Attendance.student_id == s.id,
            db.Attendance.status == "Present"
        ).count()
        balance = total_credited - total_present
        
        # Lists for Action Required / Notifications
        s_info = {
            "id": s.id,
            "name": s.name,
            "parent_name": s.contact.father_name if s.contact and s.contact.father_name else (s.contact.mother_name if s.contact else "N/A"),
            "balance": balance,
            "classes_done": total_present % 12 if total_present % 12 != 0 else 12, # Simplified assumption of 12-class cycles
            "whatsapp": s.contact.whatsapp_number if s.contact else "N/A"
        }
        
        if balance < 0:
            overdue_students_list.append(s_info)
        elif balance >= 0 and balance <= 2:
            upcoming_due_list.append(s_info)

        # Map to 0-12 chart distribution
        chart_balance = str(min(12, max(0, balance)))
        balance_dist[chart_balance] += 1

    today = datetime.date.today()
    today_present = session.query(db.Attendance).filter(
        db.Attendance.date == today,
        db.Attendance.status == "Present"
    ).count()

    total_tournaments = session.query(db.Tournament).count()

    # Student Growth Calculation
    current_month = today.month
    current_year = today.year
    last_month = (today.replace(day=1) - datetime.timedelta(days=1)).month
    last_month_year = (today.replace(day=1) - datetime.timedelta(days=1)).year

    joined_this_month = session.query(db.Student).filter(
        func.extract('month', db.Student.joining_date) == current_month,
        func.extract('year', db.Student.joining_date) == current_year,
        db.Student.status == "Active"
    ).count()

    joined_last_month = session.query(db.Student).filter(
        func.extract('month', db.Student.joining_date) == last_month,
        func.extract('year', db.Student.joining_date) == last_month_year,
        db.Student.status == "Active"
    ).count()

    growth_trend = 0
    if joined_last_month > 0:
        growth_trend = ((joined_this_month - joined_last_month) / joined_last_month) * 100
    elif joined_this_month > 0:
        growth_trend = 100

    # Monthly Growth Data for Chart
    growth_data = {}
    for i in range(5, -1, -1): # Last 6 months
        month_date = today.replace(day=1) - datetime.timedelta(days=i*30)
        m = month_date.month
        y = month_date.year
        count = session.query(db.Student).filter(
            func.extract('month', db.Student.joining_date) == m,
            func.extract('year', db.Student.joining_date) == y,
            db.Student.status == "Active"
        ).count()
        growth_data[month_date.strftime("%b %Y")] = count

    # Today's batches — only show batches scheduled for today's day (0=Monday)
    today_dow = today.weekday()
    batches = session.query(db.Batch).filter(db.Batch.is_active == True).all()
    batch_sessions = []
    for b in batches:
        today_schedules = [s for s in b.schedules if s.day_of_week == today_dow]
        if today_schedules:
            student_count = session.query(db.StudentBatch).join(db.Student).filter(
                db.StudentBatch.batch_id == b.id,
                db.Student.status == "Active"
            ).count()
            for sch in today_schedules:
                timing = f"{sch.start_time} - {sch.end_time}"
                batch_sessions.append({"name": b.name, "timing": timing, "students": student_count})

    # Tournament Activity (Participation counts per month)
    tournament_activity = {}
    for i in range(5, -1, -1):
        month_date = today.replace(day=1) - datetime.timedelta(days=i*30)
        m = month_date.month
        y = month_date.year
        count = session.query(db.TournamentParticipation).join(db.Tournament).filter(
            func.extract('month', db.Tournament.date) == m,
            func.extract('year', db.Tournament.date) == y
        ).count()
        tournament_activity[month_date.strftime("%b %Y")] = count

    return {
        "age_distribution": age_dist,
        "balance_distribution": balance_dist,
        "level_distribution": level_dist,
        "consistency_distribution": consistency_dist,
        "total_students": len(active_students),
        "inactive_students": inactive_count,
        "today_attendance": today_present,
        "pending_fees": pending_fees + overdue_fees,
        "overdue_fees": overdue_fees,
        "total_tournaments": total_tournaments,
        "batch_sessions": batch_sessions,
        "student_growth_trend": round(growth_trend, 1),
        "growth": growth_data,
        "attendance_trend": "0% this week",
        "tournament_activity": tournament_activity,
        "upcoming_due_list": upcoming_due_list,
        "overdue_students_list": overdue_students_list
    }

@app.get("/api/attendance/summary")
def get_attendance_summary(session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    records = session.query(db.Attendance).order_by(db.Attendance.date.desc()).all()
    summary = {}
    for r in records:
        key = str(r.date)
        batch_name = r.batch.name if r.batch else "Unknown"
        batch_id = r.batch_id
        
        if key not in summary:
            summary[key] = {}
        if (batch_name, batch_id) not in summary[key]:
            summary[key][(batch_name, batch_id)] = {"present": 0, "absent": 0, "students": []}
            
        summary[key][(batch_name, batch_id)]["present"] += 1 if r.status == "Present" else 0
        summary[key][(batch_name, batch_id)]["absent"] += 1 if r.status == "Absent" else 0
            
        # Use a dict to store student info to ensure uniqueness per session
        if "student_map" not in summary[key][(batch_name, batch_id)]:
            summary[key][(batch_name, batch_id)]["student_map"] = {}
            
        summary[key][(batch_name, batch_id)]["student_map"][r.student_id] = {
            "id": r.student_id,
            "name": r.student.name,
            "status": r.status
        }
        
    result = []
    for date, batch_tuples in summary.items():
        for (batch_name, batch_id), data in batch_tuples.items():
            # Extract unique students from map
            unique_students = list(data["student_map"].values())
            present_count = len([s for s in unique_students if s["status"] == "Present"])
            absent_count = len([s for s in unique_students if s["status"] == "Absent"])
            
            result.append({
                "date": date,
                "batch": batch_name,
                "batch_id": batch_id,
                "present": present_count,
                "absent": absent_count,
                "total": len(unique_students),
                "pct": round((present_count / len(unique_students)) * 100) if unique_students else 0,
                "students": unique_students
            })
    return result

from fastapi.responses import StreamingResponse
import io, csv

@app.get("/api/export/students")
def export_students(session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    students = session.query(db.Student).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "DOB", "Gender", "Level", "Experience", "Fee Status", "Attendance Risk", "Phone", "Address"])
    for s in students:
        level = s.levels[-1].level if s.levels else "Unknown"
        contact = s.contact
        writer.writerow([s.id, s.name, s.dob, s.gender, level, s.experience_category,
                         calculate_fee_status(s.id, session), calculate_attendance_risk(s.id, session),
                         contact.primary_contact if contact else "", contact.address if contact else ""])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=students.csv"})

@app.post("/api/export/credit-details")
def export_credit_details(req: ExportRequest, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student", "Date", "Type", "Amount/Classes", "Status", "Covered Attendance Dates", "Running Balance"])
    
    for student_id in req.student_ids:
        student = session.query(db.Student).filter(db.Student.id == student_id).first()
        if not student: continue
        
        # Get all payments and attendance for student
        payments = session.query(db.LedgerEntry).filter(
            db.LedgerEntry.student_id == student_id,
            db.LedgerEntry.transaction_type == "CHARGE"
        ).order_by(db.LedgerEntry.date).all()
        
        attendances = session.query(db.Attendance).filter(
            db.Attendance.student_id == student_id,
            db.Attendance.status == "Present"
        ).order_by(db.Attendance.date).all()
        
        balance = 0
        prev_pay_date = None
        
        # 1. Handle attendance BEFORE any payment (absorbed/overdue)
        first_pay_date = payments[0].date if payments else datetime.date.max
        pre_att = [a.date for a in attendances if a.date <= first_pay_date]
        
        if not payments:
            for d in pre_att:
                balance -= 1
                writer.writerow([student.name, d, "Attendance", "", "Overdue", "", balance])
        else:
            # 2. Process payments and periods
            for i, payment in enumerate(payments):
                # If first payment, show what it covered (absorbed attendance)
                if i == 0:
                    covered = ", ".join([str(d) for d in pre_att])
                    balance += payment.classes_added
                    writer.writerow([student.name, payment.date, "Payment", abs(payment.amount), "Initial Payment", covered, balance])
                else:
                    # Attendance between last payment and this one
                    period_att = [a.date for a in attendances if prev_pay_date < a.date <= payment.date]
                    covered = ", ".join([str(d) for d in period_att])
                    balance = balance - len(period_att) + payment.classes_added
                    writer.writerow([student.name, payment.date, "Payment", abs(payment.amount), "Renewal", covered, balance])
                
                prev_pay_date = payment.date
            
            # 3. Handle attendance AFTER the last payment
            last_pay_date = payments[-1].payment_date
            post_att = [a.date for a in attendances if a.date > last_pay_date]
            for d in post_att:
                balance -= 1
                writer.writerow([student.name, d, "Attendance", "", "Post-Payment", "", balance])

    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=credit_report_detailed.csv"})

@app.get("/api/export/attendance")
def export_attendance(session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    records = session.query(db.Attendance).order_by(db.Attendance.date.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Student", "Batch", "Status"])
    for r in records:
        writer.writerow([r.date, r.student.name, r.batch.name if r.batch else "", r.status])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=attendance.csv"})

@app.get("/api/export/fees")
def export_fees(session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    receipts = session.query(db.Receipt).order_by(db.Receipt.date.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Student", "Amount", "Receipt Number"])
    for r in receipts:
        writer.writerow([r.date, r.student.name, r.amount, r.receipt_number])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=fees.csv"})

# --- Static Files & Routing ---
# app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/")
def serve_frontend():
    return {"message": "API is running. Please go to http://localhost:5173 for the React application."}

@app.get("/logo.jpeg")
def serve_logo():
    return FileResponse(resource_path("logo.jpeg"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)


# --- CRM Schemas ---
class FollowUpBase(BaseModel):
    date: datetime.date
    method: str
    outcome: str
    staff_id: Optional[int] = None
    next_follow_up_date: Optional[datetime.date] = None

class FollowUpCreate(FollowUpBase):
    pass

class FollowUpResponse(FollowUpBase):
    id: int
    enquiry_id: int
    class Config:
        from_attributes = True

class EnquiryBase(BaseModel):
    date: datetime.date
    parent_name: str
    student_name: str
    age: Optional[int] = None
    contact: str
    source: Optional[str] = None
    branch_id: Optional[int] = None
    status: str = "Open"
    handled_by: Optional[int] = None
    notes: Optional[str] = None

class EnquiryCreate(EnquiryBase):
    pass

class EnquiryResponse(EnquiryBase):
    id: int
    follow_ups: List[FollowUpResponse] = []
    class Config:
        from_attributes = True



# --- Progress Schemas ---
class AssessmentBase(BaseModel):
    date: datetime.date
    student_id: int
    tactics: int = 0
    openings: int = 0
    endgames: int = 0
    calculation: int = 0
    strategy: int = 0
    coach_id: Optional[int] = None

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentResponse(AssessmentBase):
    id: int
    class Config:
        from_attributes = True

class LevelProgressionBase(BaseModel):
    date: datetime.date
    student_id: int
    old_level: str
    new_level: str

class LevelProgressionCreate(LevelProgressionBase):
    pass

class LevelProgressionResponse(LevelProgressionBase):
    id: int
    class Config:
        from_attributes = True

class CoachNoteBase(BaseModel):
    date: datetime.date
    student_id: int
    staff_id: int
    note: str
    visibility: str = "Internal"

class CoachNoteCreate(CoachNoteBase):
    pass

class CoachNoteResponse(CoachNoteBase):
    id: int
    class Config:
        from_attributes = True

# --- CRM Endpoints ---

@app.post("/api/enquiries", response_model=EnquiryResponse)
def create_enquiry(enquiry: EnquiryCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    db_enquiry = db.Enquiry(**enquiry.dict())
    session.add(db_enquiry)
    session.commit()
    session.refresh(db_enquiry)
    return db_enquiry

@app.get("/api/enquiries", response_model=List[EnquiryResponse])
def get_enquiries(
    branch_id: Optional[int] = None,
    status: Optional[str] = None,
    handled_by: Optional[int] = None,
    session: Session = Depends(get_db)
):
    query = session.query(db.Enquiry)
    if branch_id:
        query = query.filter(db.Enquiry.branch_id == branch_id)
    if status:
        query = query.filter(db.Enquiry.status == status)
    if handled_by:
        query = query.filter(db.Enquiry.handled_by == handled_by)
    return query.all()

@app.post("/api/enquiries/{enquiry_id}/followups", response_model=FollowUpResponse)
def add_follow_up(enquiry_id: int, followup: FollowUpCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    db_enquiry = session.query(db.Enquiry).filter(db.Enquiry.id == enquiry_id).first()
    if not db_enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    
    db_followup = db.FollowUp(**followup.dict(), enquiry_id=enquiry_id)
    session.add(db_followup)
    
    # Auto-update enquiry status if needed based on outcome (optional logic)
    if followup.outcome.lower() == "converted":
        db_enquiry.status = "Converted"
    elif followup.outcome.lower() == "lost":
        db_enquiry.status = "Lost"
        
    session.commit()
    session.refresh(db_followup)
    return db_followup





# --- Progress Endpoints ---
@app.post("/api/students/{student_id}/assessments", response_model=AssessmentResponse)
def create_assessment(student_id: int, assessment: AssessmentCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    db_assessment = db.Assessment(**assessment.dict())
    session.add(db_assessment)
    session.commit()
    session.refresh(db_assessment)
    return db_assessment

@app.get("/api/students/{student_id}/assessments", response_model=List[AssessmentResponse])
def get_assessments(student_id: int, session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    return session.query(db.Assessment).filter(db.Assessment.student_id == student_id).all()

@app.post("/api/students/{student_id}/level-progressions", response_model=LevelProgressionResponse)
def create_level_progression(student_id: int, progression: LevelProgressionCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    prog_data = progression.dict()
    if 'student_id' not in prog_data or prog_data['student_id'] != student_id:
        prog_data['student_id'] = student_id
    db_progression = db.LevelProgression(**prog_data)
    session.add(db_progression)
    session.commit()
    session.refresh(db_progression)
    return db_progression

@app.get("/api/students/{student_id}/level-progressions", response_model=List[LevelProgressionResponse])
def get_level_progressions(student_id: int, session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    return session.query(db.LevelProgression).filter(db.LevelProgression.student_id == student_id).all()

@app.post("/api/students/{student_id}/notes", response_model=CoachNoteResponse)
def create_coach_note(student_id: int, note: CoachNoteCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    db_note = db.CoachNote(**note.dict())
    session.add(db_note)
    session.commit()
    session.refresh(db_note)
    return db_note

@app.get("/api/students/{student_id}/notes", response_model=List[CoachNoteResponse])
def get_coach_notes(student_id: int, session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    return session.query(db.CoachNote).filter(db.CoachNote.student_id == student_id).all()


# --- Achievement Schemas ---
class AchievementBase(BaseModel):
    date: datetime.date
    student_id: int
    title: str
    description: Optional[str] = None
    level: str = "Club" # Club, State, National, International

class AchievementCreate(AchievementBase):
    pass

class AchievementResponse(AchievementBase):
    id: int
    class Config:
        from_attributes = True


# --- Achievement Endpoints ---
@app.post("/api/students/{student_id}/achievements", response_model=AchievementResponse)
def create_achievement(student_id: int, achievement: AchievementCreate, session: Session = Depends(get_db), current_user: db.Staff = Depends(require_roles([db.RoleEnum.SUPER_ADMIN, db.RoleEnum.BRANCH_MANAGER, db.RoleEnum.COACH, db.RoleEnum.RECEPTION]))):
    db_ach = db.Achievement(**achievement.dict())
    session.add(db_ach)
    session.commit()
    session.refresh(db_ach)
    return db_ach

@app.get("/api/students/{student_id}/achievements", response_model=List[AchievementResponse])
def get_achievements(student_id: int, session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    return session.query(db.Achievement).filter(db.Achievement.student_id == student_id).all()

@app.get("/api/finance")
def get_finance_overview(session: Session = Depends(get_db), current_user: db.Staff = Depends(get_current_user)):
    # Calculate finance overview
    total_revenue = session.query(func.sum(db.Receipt.amount)).scalar() or 0
    fees = session.query(db.LedgerEntry).all()
    # Simple mock structure that the frontend might expect, or just return basic stats
    return {
        "total_revenue": total_revenue,
        "recent_transactions": [{"id": f.id, "amount": f.amount, "date": f.date, "type": f.type} for f in fees[:10]]
    }
