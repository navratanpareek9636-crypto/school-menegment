# REST API Specification

## 1. Global API Standards

- **Base URL**: `/api`
- **Content-Type**: `application/json`
- **Authentication**: Bearer Token in `Authorization` header (`Bearer <JWT_TOKEN>`)
- **Tenant Context**: Automatically resolved from authenticated user's `school_id`. Superadmins may optionally specify `x-school-id` header to operate in the context of a specific tenant.
- **Error Format**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_ERROR",
    "message": "Human-readable explanation of error",
    "details": []
  }
}
```
- **Success Format**:
```json
{
  "success": true,
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

---

## 2. Authentication & Profile Routes

### `POST /api/auth/login`
- **Auth**: Public (Rate-limited: 5 attempts / 15m)
- **Request Body**:
  ```json
  { "username": "admin@dps.edu", "password": "SecurePassword123" }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOi...",
      "user": {
        "id": 1,
        "username": "admin@dps.edu",
        "fullName": "Principal Sharma",
        "role": "admin",
        "schoolId": 1,
        "schoolName": "Delhi Public Model School"
      }
    }
  }
  ```

### `GET /api/auth/me`
- **Auth**: Bearer Token
- **Response `200 OK`**: Current user profile and permission list.

### `POST /api/auth/logout`
- **Auth**: Bearer Token
- **Response `200 OK`**: Logs user logout audit event.

---

## 3. Academic Structure & School Setup

### `GET /api/schools`
- **Auth**: Superadmin
- **Response `200 OK`**: List of all schools in the multi-tenant system.

### `GET /api/academic/sessions`
- **Auth**: Authenticated User (Tenant Scoped)
- **Response `200 OK`**: List of academic sessions for the school.

### `POST /api/academic/sessions`
- **Auth**: `admin`, `principal`
- **Request**: `{ "name": "2026-2027", "startDate": "2026-04-01", "endDate": "2027-03-31", "isCurrent": 1 }`

### `GET /api/academic/classes`
- **Auth**: Authenticated User
- **Response `200 OK`**: Classes with associated sections and subjects.

### `POST /api/academic/classes`
- **Auth**: `admin`
- **Request**: `{ "name": "Grade 10", "code": "G10", "numericLevel": 10 }`

### `POST /api/academic/sections`
- **Auth**: `admin`
- **Request**: `{ "classId": 1, "name": "A", "capacity": 40, "classTeacherId": 2 }`

### `POST /api/academic/subjects`
- **Auth**: `admin`
- **Request**: `{ "classId": 1, "name": "Mathematics", "code": "MATH-10", "type": "theory", "maxMarks": 100 }`

---

## 4. Admissions Module

### `POST /api/admissions`
- **Auth**: `admission_staff`, `admin`, Public registration endpoint
- **Request**:
  ```json
  {
    "firstName": "Aarav",
    "lastName": "Sharma",
    "dateOfBirth": "2012-05-15",
    "gender": "male",
    "applyingForClassId": 1,
    "guardianName": "Rajesh Sharma",
    "guardianPhone": "+919876543210",
    "guardianEmail": "rajesh@example.com",
    "address": "42 MG Road, Jaipur",
    "rteCandidate": 0
  }
  ```
- **Response `201 Created`**: Returns generated application number (e.g. `APP-2026-0001`).

### `GET /api/admissions`
- **Auth**: `admin`, `admission_staff`
- **Query Params**: `?status=submitted&classId=1&page=1&limit=20`

### `PATCH /api/admissions/:id/status`
- **Auth**: `admin`, `admission_staff`
- **Request**: `{ "status": "approved | rejected | under_review", "rejectionReason": "..." }`

### `POST /api/admissions/:id/enroll`
- **Auth**: `admin`, `admission_staff`
- **Request**: `{ "sectionId": 1, "rollNo": 12, "admissionNumber": "SCH-ADM-2026-012" }`
- **Response `200 OK`**: Converts applicant to official student, creates enrollment record, logs audit event.

---

## 5. Student Information System (SIS)

### `GET /api/students`
- **Auth**: `admin`, `teacher`, `accountant`
- **Query Params**: `?classId=1&sectionId=1&search=Aarav&status=active`
- **Response `200 OK`**: Paginated list of student profiles with enrollment details.

### `GET /api/students/:id`
- **Auth**: `admin`, `teacher`, `accountant`, or self student/guardian
- **Response `200 OK`**: Detailed student profile, fee summary, attendance stats, guardian list.

### `PATCH /api/students/:id/status`
- **Auth**: `admin`, `principal`
- **Request**: `{ "status": "transferred | withdrawn | graduated", "reason": "Transfer certificate issued" }`

---

## 6. Attendance Module

### `POST /api/attendance/batch`
- **Auth**: `teacher`, `admin`
- **Request**:
  ```json
  {
    "classId": 1,
    "sectionId": 1,
    "date": "2026-10-11",
    "records": [
      { "studentId": 1, "status": "present", "remarks": "" },
      { "studentId": 2, "status": "absent", "remarks": "Sick leave" }
    ]
  }
  ```
- **Response `200 OK`**: Records daily attendance atomically; rejects duplicate submission on same date unless explicit correction mode is enabled.

### `GET /api/attendance/summary`
- **Auth**: `admin`, `teacher`, `principal`
- **Query Params**: `?classId=1&sectionId=1&month=2026-10`

---

## 7. Fees & Financial Accounting

### `POST /api/fees/structures`
- **Auth**: `admin`, `accountant`
- **Request**:
  ```json
  {
    "sessionId": 1,
    "classId": 1,
    "name": "Class 10 Standard Fee 2026-27",
    "frequency": "quarterly",
    "items": [
      { "feeHeadId": 1, "amount": 15000 },
      { "feeHeadId": 2, "amount": 2500 }
    ]
  }
  ```

### `POST /api/fees/allocate`
- **Auth**: `admin`, `accountant`
- **Request**: `{ "structureId": 1, "classId": 1, "dueDate": "2026-10-31" }`
- **Response `200 OK`**: Generates student fee allocations.

### `POST /api/fees/pay`
- **Auth**: `accountant`, `admin`
- **Request**:
  ```json
  {
    "allocationId": 10,
    "amountPaid": 8750.00,
    "paymentMode": "upi",
    "transactionReference": "UPI/2026/89123891",
    "idempotencyKey": "uuid-v4-client-nonce",
    "notes": "Q1 fee partial payment"
  }
  ```
- **Response `201 Created`**: Returns receipt number `REC-2026-0045`, updated remaining balance.

### `POST /api/fees/adjustments/reverse`
- **Auth**: `admin`, `accountant`
- **Request**:
  ```json
  {
    "paymentId": 45,
    "amount": 8750.00,
    "reason": "Payment credited to wrong student roll number; reversing with approval."
  }
  ```
- **Response `200 OK`**: Generates adjustment receipt, restores student fee balance, creates audit entry.

---

## 8. Examinations & Results

### `POST /api/exams`
- **Auth**: `admin`, `exam_controller`
- **Request**: `{ "name": "Mid-Term Examination 2026", "sessionId": 1, "startDate": "2026-10-20", "endDate": "2026-10-28" }`

### `POST /api/exams/:id/subjects`
- **Auth**: `admin`, `exam_controller`
- **Request**: `{ "classId": 1, "subjectId": 1, "examDate": "2026-10-20", "maxMarks": 100, "passingMarks": 33 }`

### `POST /api/exams/:id/marks`
- **Auth**: `teacher`, `exam_controller`
- **Request**:
  ```json
  {
    "examSubjectId": 5,
    "marks": [
      { "studentId": 1, "marksObtained": 88.5, "isAbsent": 0, "remarks": "Excellent" },
      { "studentId": 2, "marksObtained": 0, "isAbsent": 1, "remarks": "Medical leave" }
    ]
  }
  ```

### `PATCH /api/exams/:id/publish`
- **Auth**: `principal`, `admin`
- **Response `200 OK`**: Transitions exam state from `completed` to `published`, locking marks from unauthorized modification and releasing report cards to parents/students.

### `GET /api/exams/:id/report-cards/:studentId`
- **Auth**: `admin`, `teacher`, `parent`, `student`
- **Response `200 OK`**: Complete computed report card object with subject-wise marks, grades, percentage, overall division, and printable layout metadata.

---

## 9. Auxiliary Modules & Reporting

- `GET /api/staff`: Directory of teachers and staff with department and qualifications.
- `GET /api/timetable`: Weekly timetable grid with teacher double-booking conflict validation.
- `GET /api/library/books`: Book catalog, checkout (`POST /api/library/issue`), checkin (`POST /api/library/return`).
- `GET /api/transport/routes`: Bus routes, vehicle details, student allocations.
- `GET /api/notices`: Announcements with role filters.
- `GET /api/reports/reconciliation`: Reconciles fee collections against student balances and receipts.
- `GET /api/health`: Health status, database integrity, uptime.
