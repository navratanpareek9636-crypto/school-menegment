# Regulatory Compliance & Indian School Context Verification

## 1. Compliance Verification Baseline

- **Date Checked**: October 2026
- **Applicable Jurisdiction**: Republic of India (National Standards: CBSE, Ministry of Education, RTE Act 2009, DPDP Act 2023)
- **Status Summary**: Configurable schema and reporting adapters implemented. No unverified third-party claims or automated government server connections claimed.

---

## 2. Regulatory Areas & Implementation Mapping

### A. UDISE+ (Unified District Information System for Education Plus)
- **Official Requirement**: Ministry of Education guidelines require schools to maintain student demographic profiles mapped to standard social categories, mother tongue, CWSN (Children with Special Needs), and unique school identification.
- **System Implementation**:
  - `schools.udise_code`: Enforces 11-digit school identifier.
  - `students` schema fields:
    - `category_caste`: `General`, `OBC`, `SC`, `ST`
    - `bpl_status`: Below Poverty Line indicator
    - `cwsn_status`: Disability / Special needs tracking
    - `rte_student`: Right to Education Act quota tracking
    - `mother_tongue`: Regional language tracking
    - `aadhaar_enrolled`: Aadhaar enrollment flag without storing sensitive unhashed 12-digit Aadhaar numbers unnecessarily.
  - Export: UDISE+ compliant CSV export mapping under `/api/reports/udise-export`.
- **Verification Status**: **Verified Schema & Export Format** (Manual portal upload ready; automated API integration not claimed as government APIs require state-level departmental tokens).

---

### B. RTE Act 2009 (Section 12(1)(c) - 25% EWS/Disadvantaged Quota)
- **Official Requirement**: Private unaided schools must allocate at least 25% of entry-level seats to children from economically weaker sections and disadvantaged groups, exempt from standard tuition fees.
- **System Implementation**:
  - `admissions.rte_candidate`: Flagged during admission application.
  - `students.rte_student`: Automatically transferred to student profile upon enrollment.
  - `student_fee_allocations`: 100% tuition concession / waiver automatically applied for RTE-enrolled students.
  - Reporting: Dedicated RTE quota tracking report under `/api/reports/rte-quota`.
- **Verification Status**: **Verified Business Logic & Reporting**.

---

### C. Curriculum & Assessment (CBSE 9-Point Grading Standard)
- **Official Requirement**: Central Board of Secondary Education (CBSE) mandates a standardized grading system:
  - 91 - 100%: **A1** (Grade Point 10.0)
  - 81 - 90%: **A2** (Grade Point 9.0)
  - 71 - 80%: **B1** (Grade Point 8.0)
  - 61 - 70%: **B2** (Grade Point 7.0)
  - 51 - 60%: **C1** (Grade Point 6.0)
  - 41 - 50%: **C2** (Grade Point 5.0)
  - 33 - 40%: **D**  (Grade Point 4.0)
  - 21 - 32%: **E1** (Needs Improvement)
  - 0 - 20%: **E2** (Needs Improvement)
- **System Implementation**:
  - Implemented in `server/services/examService.js` via `calculateGrade(percentage)`.
  - Report cards render subject scores, computed grades, grade points, overall percentage, and passing status (passing threshold = 33%).
- **Verification Status**: **Verified Algorithm & Report Card Calculations**.

---

### D. Data Privacy & DPDP Act 2023 Compliance
- **Official Requirement**: Digital Personal Data Protection Act 2023 mandates protection of children's personal data, processing with verified parental consent, strict access control, and zero unnecessary data exposure.
- **System Implementation**:
  - Data Minimization: No full Aadhaar numbers stored in plaintext.
  - Role-Based Access: Student medical and contact details accessible only to authorized school administrators and guardians.
  - Audit Trail: Any modification of student personal records is logged in `audit_logs`.
  - Immutable Financial History: Ledger changes tracked with authorized user identity.
- **Verification Status**: **Verified Architectural Safeguards**.

---

## 3. Unresolved Questions & Legal Disclaimers

1. **State-Specific Board Variations**: Individual state boards (e.g. Maharashtra SSC, Tamil Nadu State Board) follow varying passing mark rules and term structures.
   - *Resolution*: The system provides configurable passing marks (`passing_marks` on `exam_subjects`) and configurable fee heads rather than hardcoded assumptions.
2. **Third-Party API Claims**: The system explicitly disclaims direct programmatic synchronization with government portals (e.g. state RTE portals or UDISE+ servers) unless official API credentials and certificates are provided by the school administration.
