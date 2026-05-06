from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import database as db
from typing import List, Optional
from pydantic import BaseModel
import datetime

# Initialize database
db.init_db()

app = FastAPI(title="Checkmate Academy Management System")

def get_db():
    session = db.SessionLocal()
    try:
        yield session
    finally:
        session.close()

# --- Utility Functions ---
def calculate_age_category(dob: datetime.date) -> str:
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
    # Logic: 12 classes per fee payment
    # Total attendances present
    total_present = session.query(db.Attendance).filter(
        db.Attendance.student_id == student_id,
        db.Attendance.status == "Present"
    ).count()
    
    # Total classes credited via fees paid
    total_credited = session.query(func.sum(db.Fee.classes_credited)).filter(
        db.Fee.student_id == student_id,
        db.Fee.status == "Paid"
    ).scalar() or 0
    
    # If they attended more classes than paid for, they are unpaid
    if total_present >= total_credited:
        if total_present >= total_credited + 2:
            return "Overdue"
        return "Pending"
    elif total_credited - total_present <= 2:
        return "Upcoming Payment" # Warn if 2 or less classes left
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
class StudentContactCreate(BaseModel):
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    address: str
    primary_contact: str
    secondary_contact: Optional[str] = None

class StudentCreate(BaseModel):
    name: str
    dob: datetime.date
    joining_date: datetime.date
    gender: str
    education: str
    t_shirt_size: str
    fide_id: Optional[str] = None
    fide_rating: Optional[int] = None
    
    experience_category: str
    learning_goal: str
    level: str # initial level
    
    medical_notes: Optional[str] = None
    preferred_language: Optional[str] = None
    transport_needed: bool = False
    tournament_interest: bool = False
    
    contact: StudentContactCreate
    batch_days: Optional[str] = None
    batch_timing: Optional[str] = None
    batch_ids: List[int]

class BatchCreate(BaseModel):
    name: str
    days: str
    timing: str

class AttendanceMark(BaseModel):
    student_id: int
    batch_id: int
    status: str

class FeeCreate(BaseModel):
    amount: float
    classes_credited: int = 12
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
def create_batch(batch: BatchCreate, session: Session = Depends(get_db)):
    db_batch = db.Batch(**batch.model_dump())
    session.add(db_batch)
    session.commit()
    session.refresh(db_batch)
    return db_batch

@app.get("/api/batches")
def get_batches(session: Session = Depends(get_db)):
    batches = session.query(db.Batch).all()
    result = []
    for b in batches:
        student_count = session.query(db.StudentBatch).filter(db.StudentBatch.batch_id == b.id).count()
        result.append({
            "id": b.id,
            "name": b.name,
            "days": b.days,
            "timing": b.timing,
            "is_active": b.is_active if b.is_active is not None else True,
            "student_count": student_count
        })
    return result

@app.delete("/api/batches/{batch_id}")
def delete_batch(batch_id: int, session: Session = Depends(get_db)):
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



@app.post("/api/students")
def register_student(data: StudentCreate, session: Session = Depends(get_db)):
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
        
    # Auto-generate or link Batch based on Checkboxes
    if data.batch_days and data.batch_timing:
        batch = session.query(db.Batch).filter(
            db.Batch.days == data.batch_days,
            db.Batch.timing == data.batch_timing
        ).first()
        if not batch:
            batch_name = f"{data.level} ({data.batch_days})"
            batch = db.Batch(name=batch_name, days=data.batch_days, timing=data.batch_timing)
            session.add(batch)
            session.flush()
            
        db_sb = db.StudentBatch(student_id=db_student.id, batch_id=batch.id)
        session.add(db_sb)
        
    # Fallback to map predefined Batches if any exist
    for b_id in data.batch_ids:
        db_sb = db.StudentBatch(student_id=db_student.id, batch_id=b_id)
        session.add(db_sb)
        
    session.commit()
    session.refresh(db_student)
    return db_student

@app.get("/api/students")
def get_students(session: Session = Depends(get_db)):
    students = session.query(db.Student).all()
    result = []
    for s in students:
        s_dict = {
            "id": s.id,
            "name": s.name,
            "age_category": calculate_age_category(s.dob),
            "fee_status": calculate_fee_status(s.id, session),
            "attendance_risk": calculate_attendance_risk(s.id, session),
            "level": s.levels[-1].level if s.levels else "Unknown",
            "experience": s.experience_category,
            "batches": [sb.batch.name for sb in s.batches]
        }
        result.append(s_dict)
    return result

@app.get("/api/students/{student_id}")
def get_single_student(student_id: int, session: Session = Depends(get_db)):
    print(f"DEBUG: Fetching student ID {student_id}")
    student = session.query(db.Student).filter(db.Student.id == student_id).first()
    if not student:
        print(f"DEBUG: Student {student_id} not found in DB")
        raise HTTPException(status_code=404, detail=f"Student ID {student_id} not found")
        
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
            "address": student.contact.address if student.contact else ""
        },
        "batches": [sb.batch.name for sb in student.batches]
    }

@app.put("/api/students/{student_id}")
def update_student(student_id: int, data: StudentCreate, session: Session = Depends(get_db)):
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
        student.contact.address = data.contact.address
        
    # Check if level changed
    current_level = student.levels[-1].level if student.levels else None
    if current_level != data.level:
        session.add(db.StudentLevel(student_id=student.id, level=data.level))
        
    # Ignore batch updates for MVP Edit to prevent complex logic
    
    session.commit()
    return {"message": "Updated"}

@app.post("/api/attendance")
def mark_attendance(attendance: AttendanceMark, session: Session = Depends(get_db)):
    db_att = db.Attendance(
        student_id=attendance.student_id,
        batch_id=attendance.batch_id,
        status=attendance.status,
        date=datetime.date.today()
    )
    session.add(db_att)
    session.commit()
    
    # Return updated fee status for dashboard
    new_fee_status = calculate_fee_status(attendance.student_id, session)
    return {"message": "Attendance marked", "new_fee_status": new_fee_status}

@app.post("/api/students/{student_id}/fees")
def add_fee_payment(student_id: int, fee: FeeCreate, session: Session = Depends(get_db)):
    p_date = fee.payment_date or datetime.date.today()
    print(f"DEBUG: Recording payment — student={student_id}, amount={fee.amount}, date={p_date}")
    db_fee = db.Fee(
        student_id=student_id, 
        amount=fee.amount, 
        classes_credited=fee.classes_credited, 
        status="Paid",
        payment_date=p_date
    )
    session.add(db_fee)
    session.commit()
    return {"message": "Payment recorded"}

@app.post("/api/tournaments")
def create_tournament(t: TournamentCreate, session: Session = Depends(get_db)):
    db_t = db.Tournament(**t.model_dump())
    session.add(db_t)
    session.commit()
    session.refresh(db_t)
    return db_t

@app.get("/api/tournaments")
def get_tournaments(session: Session = Depends(get_db)):
    ts = session.query(db.Tournament).order_by(db.Tournament.date.desc()).all()
    result = []
    for t in ts:
        avg_pts = session.query(func.avg(db.TournamentParticipation.points)).filter(db.TournamentParticipation.tournament_id == t.id).scalar() or 0
        result.append({
            "id": t.id,
            "name": t.name,
            "date": t.date.strftime("%d %b %Y"),
            "participant_count": count,
            "avg_points": float(avg_pts)
        })
    return result

@app.post("/api/tournaments/{tournament_id}/participations")
def add_participation(tournament_id: int, p: ParticipationCreate, session: Session = Depends(get_db)):
    db_p = db.TournamentParticipation(**p.model_dump(), tournament_id=tournament_id)
    session.add(db_p)
    session.commit()
    return {"message": "Participation added"}

@app.delete("/api/tournaments/{tournament_id}")
def delete_tournament(tournament_id: int, session: Session = Depends(get_db)):
    # Delete participations first
    session.query(db.TournamentParticipation).filter(db.TournamentParticipation.tournament_id == tournament_id).delete()
    t = session.query(db.Tournament).filter(db.Tournament.id == tournament_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    session.delete(t)
    session.commit()
    return {"message": "Tournament deleted"}

@app.get("/api/fees")
def get_fees(session: Session = Depends(get_db)):
    fees = session.query(db.Fee).order_by(db.Fee.payment_date.desc()).all()
    result = []
    for f in fees:
        result.append({
            "id": f.id,
            "student_name": f.student.name,
            "amount": f.amount,
            "date": f.payment_date.strftime("%d %b %Y") if f.payment_date else "—",
            "classes_credited": f.classes_credited
        })
    return result

@app.delete("/api/students/{student_id}")
def delete_student(student_id: int, session: Session = Depends(get_db)):
    student = session.query(db.Student).filter(db.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404)
    session.delete(student)
    session.commit()
    return {"message": "Deleted"}

@app.get("/api/analytics/dashboard")
def get_dashboard_analytics(session: Session = Depends(get_db)):
    students = session.query(db.Student).all()
    
    age_dist = {}
    gender_dist = {}
    level_dist = {}
    pending_fees = 0
    overdue_fees = 0

    consistency_dist = {"Regular": 0, "Moderate": 0, "Irregular": 0, "No Data": 0}

    for s in students:
        age_cat = calculate_age_category(s.dob)
        age_dist[age_cat] = age_dist.get(age_cat, 0) + 1
        gender_dist[s.gender] = gender_dist.get(s.gender, 0) + 1
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
        func.extract('year', db.Student.joining_date) == current_year
    ).count()

    joined_last_month = session.query(db.Student).filter(
        func.extract('month', db.Student.joining_date) == last_month,
        func.extract('year', db.Student.joining_date) == last_month_year
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
            func.extract('year', db.Student.joining_date) == y
        ).count()
        growth_data[month_date.strftime("%b %Y")] = count

    # Today's batches — only show batches scheduled for today's day
    today_abbr = today.strftime("%a")
    batches = session.query(db.Batch).filter(db.Batch.is_active == True).all()
    batch_sessions = []
    for b in batches:
        batch_days = [d.strip() for d in (b.days or "").split(",")]
        if today_abbr in batch_days:
            student_count = session.query(db.StudentBatch).filter(db.StudentBatch.batch_id == b.id).count()
            batch_sessions.append({"name": b.name, "timing": b.timing, "students": student_count})

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
        "gender_distribution": gender_dist,
        "level_distribution": level_dist,
        "consistency_distribution": consistency_dist,
        "total_students": len(students),
        "today_attendance": today_present,
        "pending_fees": pending_fees + overdue_fees,
        "overdue_fees": overdue_fees,
        "total_tournaments": total_tournaments,
        "batch_sessions": batch_sessions,
        "student_growth_trend": round(growth_trend, 1),
        "growth": growth_data,
        "attendance_trend": "0% this week",
        "tournament_activity": tournament_activity
    }

@app.get("/api/attendance/summary")
def get_attendance_summary(session: Session = Depends(get_db)):
    records = session.query(db.Attendance).order_by(db.Attendance.date.desc()).all()
    summary = {}
    for r in records:
        key = str(r.date)
        batch_name = r.batch.name if r.batch else "Unknown"
        if key not in summary:
            summary[key] = {}
        if batch_name not in summary[key]:
            summary[key][batch_name] = {"present": 0, "absent": 0, "students": []}
        if r.status == "Present":
            summary[key][batch_name]["present"] += 1
        else:
            summary[key][batch_name]["absent"] += 1
        summary[key][batch_name]["students"].append({
            "name": r.student.name,
            "status": r.status
        })
    result = []
    for date, batches in summary.items():
        for batch, data in batches.items():
            total = data["present"] + data["absent"]
            result.append({
                "date": date,
                "batch": batch,
                "present": data["present"],
                "absent": data["absent"],
                "total": total,
                "pct": round((data["present"] / total) * 100) if total > 0 else 0,
                "students": data["students"]
            })
    return result

from fastapi.responses import StreamingResponse
import io, csv

@app.get("/api/export/students")
def export_students(session: Session = Depends(get_db)):
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

@app.get("/api/export/attendance")
def export_attendance(session: Session = Depends(get_db)):
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
def export_fees(session: Session = Depends(get_db)):
    fees = session.query(db.Fee).order_by(db.Fee.payment_date.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Student", "Amount", "Classes Credited"])
    for f in fees:
        writer.writerow([f.payment_date, f.student.name, f.amount, f.classes_credited])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=fees.csv"})

# --- Static Files & Routing ---
# app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/")
def serve_frontend():
    return FileResponse("index.html")

# Serve specific static files explicitly — no wildcard to conflict with API routes
@app.get("/styles.css")
def serve_css():
    return FileResponse("styles.css")

@app.get("/app.js")
def serve_js():
    return FileResponse("app.js")

@app.get("/logo.jpeg")
def serve_logo():
    return FileResponse("logo.jpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
