# User Manual and Role-Based Operations Guide

Welcome to the School ERP System. This guide provides role-specific instructions for administering, operating, and utilizing all modules of the platform.

---

## 1. System Access & Authentication

### 1.1 Logging In
1. Open your web browser and navigate to the application URL (e.g., `http://localhost:5000` or production domain).
2. Enter your registered email/username and password.
3. Click **Sign In**.
4. Upon successful authentication, you will be redirected to your role-specific dashboard.

### 1.2 Default Seed Credentials (Development & Demonstration)
| Role | Email / Username | Password | Default Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@erp.local` | `Admin@123` | Multi-Tenant Platform-wide |
| **School Admin (School A)** | `admin@dps.edu` | `Admin@123` | Delhi Public Model School |
| **School Admin (School B)** | `admin@stxaviers.edu` | `Admin@123` | St. Xavier International Academy |
| **Accountant** | `accountant@dps.edu` | `Admin@123` | School A Finance |
| **Teacher** | `teacher@dps.edu` | `Admin@123` | School A Academic Staff |

---

## 2. Super Admin Operations

Super Admins manage the platform across multiple school tenants.

### 2.1 Multi-Tenant Context Switching
1. Located in the top navigation bar, click the **Tenant Selector** dropdown.
2. Select the target school (e.g., *Delhi Public Model School* or *St. Xavier International Academy*).
3. The dashboard and all sub-modules immediately update to reflect the scoped data of the selected school.

### 2.2 Global System Auditing
1. Navigate to **Audit Trail** in the sidebar.
2. Filter logs by action type (`LOGIN`, `FEE_COLLECTION`, `FEE_REVERSAL`, `STUDENT_STATUS_CHANGE`, `ADMISSION_APPROVAL`).
3. View exact before/after JSON diffs, actor IP addresses, and timestamps.

---

## 3. School Admin & Principal Workflows

School Admins manage school-level settings, academic structure, and staff.

### 3.1 Academic Setup (Sessions, Classes, Sections, Subjects)
1. Go to **Academic Structure** in the sidebar.
2. **Academic Sessions**: Click *Add Session* to define academic years (e.g., `2026-2027` with start date `2026-04-01` and end date `2027-03-31`). Set the active session.
3. **Classes & Sections**: Create classes (e.g., *Grade 10*) and create sections (*A*, *B*) with assigned capacities.
4. **Subjects**: Define subjects with subject codes (e.g., `MATH101 - Mathematics`), theory/practical split, and maximum marks (e.g., 100).

### 3.2 Staff Management
1. Navigate to **Staff & HR**.
2. Click **Add Staff Member** and fill in Employee Code, Full Name, Designation, Department, Date of Joining, and Contact details.
3. Assign staff to roles (Teacher, Accountant, Librarian, Transport Manager).

---

## 4. Admissions Workflow

Admissions manages prospective student pipelines from enquiry through formal enrollment.

```
[Application Submitted] ➔ [Under Review] ➔ [Approved / Rejected] ➔ [1-Click Convert to Enrolled Student]
```

### 4.1 Reviewing and Processing Applications
1. Navigate to **Admissions**.
2. Applications are grouped by status (*Submitted*, *Under Review*, *Approved*, *Rejected*, *Enrolled*).
3. Click an applicant row to review submitted details and documents.
4. Click **Update Status** to advance the record from *Submitted* to *Under Review*.
5. Conduct entrance screening and mark as **Approved** or **Rejected** (with mandatory reason notes).

### 4.2 Converting Approved Applicants to Enrolled Students
1. Once marked **Approved**, an **Enroll Student** button becomes active.
2. Click **Enroll Student**, select target Class and Section, and confirm the assigned Admission Number.
3. The applicant record atomically transitions to **Enrolled**, and a complete Student Master record is created in the Student Information System (SIS).

---

## 5. Student Information System (SIS)

Manages the comprehensive 360-degree lifecycle of registered students.

### 5.1 Student Directory & Profile
1. Navigate to **Students**.
2. Use the search bar to filter by Admission Number, Name, Class, Section, or Status (*Active*, *Withdrawn*, *Transferred*).
3. Click a student to view their profile, emergency contacts, parent details, fee ledger, and attendance summary.

### 5.2 Status Transitions (Withdrawal / Transfer)
1. In the student profile, click **Change Status**.
2. Select new status: *Withdrawn* or *Transferred*.
3. Provide the mandatory exit reason (e.g., *Parent relocated to another state*).
4. Submitting records an immutable entry in the `audit_logs` table and locks the student from future fee generation.

---

## 6. Daily Attendance

### 6.1 Taking Daily Roster Attendance
1. Navigate to **Attendance**.
2. Select the **Class**, **Section**, and **Date**.
3. Click **Load Roster**.
4. By default, students are set to *Present*. Mark absent or late students using the radio toggle (*P*, *A*, *L*).
5. Click **Submit Attendance**.
   *Note: The system enforces unique constraints per student per date to prevent duplicate attendance records.*

### 6.2 Attendance Corrections
1. To correct an entry, select the date and reload the roster.
2. Toggle status to *Excused* or *Present* and provide a reason in the correction notes.
3. Click **Save Corrections**.

---

## 7. Fee Management & Cashiering

The Fees module handles billing, collection, printable receipts, and audited adjustments.

### 7.1 Fee Collection Workflow
1. Navigate to **Fees & Finance**.
2. Under **Collect Fee**, select the Student from the dropdown.
3. The system displays outstanding balances and fee schedule details.
4. Enter the amount to collect (supports partial or full payment).
5. Select Payment Mode (*Cash*, *Cheque*, *Bank Transfer*, *Online / UPI*).
6. Enter reference/cheque number (if applicable).
7. Click **Record Payment**.

### 7.2 Printable Fee Receipts
1. Upon recording payment, a unique receipt number (e.g., `RCP-2026-00001`) is generated.
2. Click **Print Receipt** next to the transaction.
3. The browser print modal displays a clean, printer-friendly receipt formatted with the school header, student admission number, payment breakdown, and cashier signature line.

### 7.3 Audited Reversals & Adjustments
1. If a cheque bounces or an entry error occurs, locate the receipt in **Transaction History**.
2. Click **Reverse Transaction**.
3. Enter the mandatory reason for reversal.
4. The system issues a compensating adjustment in the ledger; original transaction records are preserved for audit integrity.

---

## 8. Examinations, Grading & Report Cards

Supports CBSE 9-point grading (`A1`, `A2`, `B1`, `B2`, `C1`, `C2`, `D`, `E1`, `E2`), division computation, and printable report cards.

### 8.1 Entering Marks
1. Navigate to **Examinations**.
2. Select Exam Term (e.g., *Term 1 Final Examination*), Class, and Subject.
3. Enter marks for each student. The system enforces maximum marks limits (cannot enter marks greater than subject max marks).
4. Click **Save Marks**.

### 8.2 Generating & Printing Report Cards
1. Once marks for all subjects in an exam are submitted, click **View Report Cards**.
2. Select a student to generate their academic report card.
3. The report card automatically computes:
   - Subject-wise percentage and CBSE Grade.
   - Overall grand total, percentage, and division (*Distinction*, *First Division*, *Second Division*, *Third Division*, *Essential Repeat*).
4. Click **Print Report Card** to open the print layout.

---

## 9. Timetable & Period Scheduling

1. Navigate to **Timetable**.
2. Select **Class** and **Section**.
3. View the weekly grid (Monday through Saturday, Periods 1 to 8).
4. Click an open slot to assign Subject, Teacher, Room Number, Start Time, and End Time.
5. **Conflict Protection**: If the selected teacher is already scheduled for another class during that period, the system blocks the submission and displays an immediate conflict alert.

---

## 10. Auxiliary Modules

### 10.1 Library Management
- **Catalog Books**: Enter ISBN, Title, Author, Category, and Total Copies.
- **Issue Book**: Select student and book. Available copy count is automatically decremented.
- **Return Book**: Mark book as returned. Available copy count is restored.

### 10.2 Transport Management
- **Routes & Vehicles**: Create bus routes (e.g., *Route 101 - North Sector*), assign vehicle number and driver.
- **Passenger Allocation**: Enforce seating capacity limits to prevent overcrowding.

### 10.3 Notice Board
- **Publish Notices**: Create announcements with Title, Content, Audience (*All*, *Teachers*, *Students*, *Parents*), and Priority flag.
