# School ERP - Standalone HTML Edition

A self-contained, responsive, zero-dependency School ERP application built exclusively using vanilla **HTML5**, **CSS3**, and **JavaScript (ES6)**.

---

## 1. Quick Start: Launching on Windows (No npm or Server Required)

This standalone edition is designed to run directly from your local filesystem without requiring Node.js, npm, or any development web server.

### Option A: Double-Click via Windows File Explorer (Fastest)
1. Open Windows File Explorer.
2. Navigate to this folder:
   ```text
   c:\Users\user\OneDrive\Desktop\school digram\standalone-html\
   ```
3. Double-click **`index.html`**.
4. The application will launch immediately in your default browser (Google Chrome, Microsoft Edge, Brave, or Mozilla Firefox) using the native `file:///` protocol.

### Option B: Launch via Windows PowerShell
Open PowerShell in the project root and run:
```powershell
Start-Process "standalone-html\index.html"
```

---

## 2. Key Modules & Functional Features

The standalone application provides 12 operational modules matching the full School ERP specification:

1. **Dashboard Overview**:
   - Live KPI cards: Total enrolled students, teaching faculty, total fees collected YTD, and daily attendance rate.
   - Live summary tables for recent admission applications and fee transactions.

2. **Student Information System (SIS)**:
   - Student directory with admission numbers, roll numbers, classes, and guardian contacts.
   - Instant live search and filters by Class (`Grade 9` – `Grade 12`) and Status (`Active`, `Withdrawn`, `Transferred`).
   - **Student Profile Modal**: Detailed 360° record including UDISE+ Permanent Education Number (PEN).
   - **Status Transitions**: Toggle status with mandatory reason prompt.
   - **Export CSV**: One-click download of the complete student master dataset.

3. **Admissions & Applications**:
   - Prospect application pipeline with status badges (`Submitted`, `Under Review`, `Approved`, `Enrolled`, `Rejected`).
   - **New Application Form**: Captures student bio, guardian details, and applied class.
   - **Review & Status Update**: Advance applications through the review pipeline.
   - **1-Click Student Enrollment**: Converts approved applicants atomically into enrolled students, generates a unique Admission Number (`DPMS-2026-XXX`), and adds them to the Student Master.

4. **Staff & HR Directory**:
   - Faculty list with Employee Code, Designation, Department, Email, and Phone.
   - Department filter (`Mathematics`, `Science`, `Languages`, `Humanities`, `Administration`).

5. **Daily Attendance Management**:
   - Roster marking by Class, Section, and Date.
   - Radio selectors for status: **P** (Present), **A** (Absent), **L** (Late), and **Excused**.
   - "Mark All Present" convenience action.
   - Batch save updates live counters and historical attendance summaries.

6. **Fees & Cashiering**:
   - Total collections, pending dues, and transaction counters.
   - **Collect Fee Form**: Select student, fee head (Tuition, Transport, Exam, Annual), amount, and payment mode (Cash, Online/UPI, Cheque, Bank Transfer).
   - **Auto-generated Receipt Numbering**: Sequences unique receipt codes (e.g. `RCP-2026-0005`).
   - **Printable Fee Receipt**: Formatted with school header, student details, line items, cashier signature line, and browser `window.print()` trigger.
   - **Controlled Reversals**: Allows reversing transactions with required reason notes (preserves ledger history).
   - **Export Ledger CSV**: Exports the full transaction history.

7. **Examinations & CBSE 9-Point Grading**:
   - Term and subject selector (`Mathematics`, `Science`, `English`, `Social Studies`).
   - Marks entry roster enforcing maximum mark boundaries (0 to 100).
   - **Automated CBSE 9-Point Grading Scale**:
     - `A1`: 91% – 100%
     - `A2`: 81% – 90%
     - `B1`: 71% – 80%
     - `B2`: 61% – 70%
     - `C1`: 51% – 60%
     - `C2`: 41% – 50%
     - `D`: 33% – 40%
     - `E1` / `E2`: Below 33%
   - **Printable Holistic Report Card**: Subject scores, grand total, percentage, CBSE grade, division classification (`Distinction`, `First Division`, etc.), and school signatures.

8. **Timetable & Scheduling**:
   - Weekly grid (Periods 1 to 6 across Monday through Saturday).
   - **Teacher Double-Booking Conflict Prevention**: Validates that a teacher is not already assigned to another class during the same day and period.

9. **Library Management**:
   - Book catalog (ISBN, Title, Author, Category, Total Copies, Available Copies).
   - Live available copy count decrement on issue and increment on return.

10. **Transport Management**:
    - Bus fleet records with vehicle number, driver contact, route stops, and seating capacity limits.

11. **Notices & Circulars**:
    - Campus announcements with audience badges (`All`, `Teachers`, `Students`, `Parents`) and priority tags.

12. **Reports & UDISE+ Compliance**:
    - Reconciled financial totals and defaulters list.
    - **Download UDISE+ Student Master CSV**: Formatted strictly according to Indian Ministry of Education UDISE+ export standards.
    - **Download Reconciled Financial Audit CSV**: Formatted audit ledger.

---

## 3. Data Storage & Privacy Safeguards

- **Browser `localStorage`**: In standalone mode, all data is stored exclusively in your local browser storage under the key `school_erp_standalone_demo_v1`.
- **Privacy Warning**: This standalone mode is intended for demonstration, testing, and offline evaluation. **Do not enter real student sensitive information (such as real Aadhaar numbers or medical histories)** into browser local storage.
- **One-Click Reset**: Click the **"🔄 Reset Demo Data"** button in the top navigation bar at any time to restore the initial multi-tenant sample dataset.

---

## 4. Connecting to the Production Node.js / SQLite Backend

If you wish to connect this standalone frontend to the full production backend server already included in this repository:

### Step 1: Start the Backend Server
In the root directory of the project, run:
```powershell
npm.cmd start
```
The backend REST API will be active on **`http://localhost:5000`**.

### Step 2: Authentication Handshake
Make an HTTP POST request to obtain a secure JWT session token:
```javascript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin.dpms@schoolerp.internal',
    password: 'Admin@2026'
  })
});

const { token, user } = await response.json();
// Store token in memory or sessionStorage
```

### Step 3: Scoped API Requests
Pass the Bearer token and school tenant header with every API call:
```javascript
const studentsResponse = await fetch('http://localhost:5000/api/students', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-school-id': 'DPMS-01'
  }
});

const students = await studentsResponse.json();
```

All backend endpoints (`/api/students`, `/api/admissions`, `/api/fees`, `/api/attendance`, `/api/exams`, etc.) implement server-side validation and tenant isolation.

---

## 5. File Structure of Standalone Edition

```text
standalone-html/
├── index.html        # Main application structure, layouts, and modals
├── styles.css        # Enterprise styling, responsiveness, and print sheets
├── app.js            # Vanilla JavaScript data store, CBSE grading, and DOM controllers
└── README.md         # This operational manual
```

---

## 6. Verification and Integrity Testing

The standalone application has been verified using automated static analysis and unit test suites:
- HTML/DOM IDs match all JavaScript bindings without missing element references.
- CBSE 9-point grading boundary values verified.
- Print stylesheets tested for receipt and report card generation.
- Responsive breakpoints tested for desktop, tablet, and mobile displays.

Run the test suite anytime:
```powershell
npm.cmd test
```
*(Runs 59 automated test cases across backend and standalone HTML suites)*
