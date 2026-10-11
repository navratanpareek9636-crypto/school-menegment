/**
 * School ERP - Standalone Edition Application Script
 * Vanilla JavaScript implementation running 100% locally in browser.
 * Relies exclusively on localStorage for demo state; zero external network required.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'school_erp_standalone_demo_v1';

  // ==========================================
  // 1. INITIAL SEED DATA
  // ==========================================
  const INITIAL_DATA = {
    'school-1': {
      info: {
        id: 'school-1',
        name: 'Delhi Public Model School',
        code: 'DPMS-01',
        affiliation: 'CBSE / State Board Affiliated',
        address: 'Sector 14, Urban Estate, New Delhi'
      },
      students: [
        { id: 'std-1', admNo: 'DPMS-2026-001', firstName: 'Aarav', lastName: 'Sharma', class: 'Grade 10', section: 'A', rollNo: '101', dob: '2010-05-15', gender: 'Male', guardianName: 'Rajesh Sharma', guardianPhone: '+91 98765 43210', status: 'active', pen: 'PEN202600101', rteCategory: 'General' },
        { id: 'std-2', admNo: 'DPMS-2026-002', firstName: 'Diya', lastName: 'Patel', class: 'Grade 10', section: 'A', rollNo: '102', dob: '2010-08-22', gender: 'Female', guardianName: 'Suresh Patel', guardianPhone: '+91 98765 43211', status: 'active', pen: 'PEN202600102', rteCategory: 'OBC' },
        { id: 'std-3', admNo: 'DPMS-2026-003', firstName: 'Ishaan', lastName: 'Verma', class: 'Grade 10', section: 'B', rollNo: '103', dob: '2010-02-10', gender: 'Male', guardianName: 'Anil Verma', guardianPhone: '+91 98765 43212', status: 'active', pen: 'PEN202600103', rteCategory: 'General' },
        { id: 'std-4', admNo: 'DPMS-2026-004', firstName: 'Ananya', lastName: 'Iyer', class: 'Grade 9', section: 'A', rollNo: '901', dob: '2011-11-04', gender: 'Female', guardianName: 'Raman Iyer', guardianPhone: '+91 98765 43213', status: 'active', pen: 'PEN202600104', rteCategory: 'General' },
        { id: 'std-5', admNo: 'DPMS-2026-005', firstName: 'Rohan', lastName: 'Gupta', class: 'Grade 9', section: 'A', rollNo: '902', dob: '2011-07-19', gender: 'Male', guardianName: 'Manoj Gupta', guardianPhone: '+91 98765 43214', status: 'withdrawn', pen: 'PEN202600105', rteCategory: 'EWS' }
      ],
      admissions: [
        { id: 'adm-101', appNo: 'APP-2026-081', firstName: 'Kabir', lastName: 'Mehta', applyingFor: 'Grade 10', dob: '2010-09-12', guardian: 'Vikram Mehta', phone: '+91 98111 22334', appliedDate: '2026-03-01', status: 'approved', notes: 'Documents verified and cleared entrance test' },
        { id: 'adm-102', appNo: 'APP-2026-082', firstName: 'Tara', lastName: 'Chawla', applyingFor: 'Grade 9', dob: '2011-03-18', guardian: 'Pooja Chawla', phone: '+91 98222 33445', appliedDate: '2026-03-04', status: 'under_review', notes: 'Transfer certificate awaited from previous school' },
        { id: 'adm-103', appNo: 'APP-2026-083', firstName: 'Arjun', lastName: 'Reddy', applyingFor: 'Grade 11', dob: '2009-12-05', guardian: 'Sanjay Reddy', phone: '+91 98333 44556', appliedDate: '2026-03-07', status: 'submitted', notes: 'Online enquiry submitted' }
      ],
      staff: [
        { id: 'stf-1', empCode: 'EMP-1001', name: 'Dr. Ramesh Kumar', designation: 'Principal', department: 'Administration', email: 'principal@dpms.edu', phone: '+91 98765 00001', status: 'active' },
        { id: 'stf-2', empCode: 'EMP-1002', name: 'Mrs. Sunita Sharma', designation: 'Senior Teacher', department: 'Mathematics', email: 'sunita.math@dpms.edu', phone: '+91 98765 00002', status: 'active' },
        { id: 'stf-3', empCode: 'EMP-1003', name: 'Mr. Amitav Sen', designation: 'Senior Teacher', department: 'Science', email: 'amitav.sci@dpms.edu', phone: '+91 98765 00003', status: 'active' },
        { id: 'stf-4', empCode: 'EMP-1004', name: 'Ms. Priya Menon', designation: 'Teacher', department: 'Languages', email: 'priya.eng@dpms.edu', phone: '+91 98765 00004', status: 'active' },
        { id: 'stf-5', empCode: 'EMP-1005', name: 'Mr. Devendra Joshi', designation: 'Chief Accountant', department: 'Administration', email: 'accounts@dpms.edu', phone: '+91 98765 00005', status: 'active' }
      ],
      attendance: {
        '2026-03-10': {
          'std-1': { status: 'P', remarks: '' },
          'std-2': { status: 'P', remarks: '' },
          'std-3': { status: 'L', remarks: 'Late by 15 mins' },
          'std-4': { status: 'P', remarks: '' },
          'std-5': { status: 'A', remarks: 'Medical leave' }
        }
      },
      fees: [
        { id: 'txn-1', receiptNo: 'RCP-2026-0001', studentId: 'std-1', studentName: 'Aarav Sharma', feeHead: 'Tuition Fee', amount: 12500, mode: 'Online / UPI', ref: 'UPI-984210', date: '2026-03-01', status: 'paid', reversalReason: null },
        { id: 'txn-2', receiptNo: 'RCP-2026-0002', studentId: 'std-2', studentName: 'Diya Patel', feeHead: 'Tuition Fee', amount: 12500, mode: 'Bank Transfer', ref: 'NEFT-55129', date: '2026-03-02', status: 'paid', reversalReason: null },
        { id: 'txn-3', receiptNo: 'RCP-2026-0003', studentId: 'std-3', studentName: 'Ishaan Verma', feeHead: 'Transport Fee', amount: 3500, mode: 'Cash', ref: 'CASH-002', date: '2026-03-05', status: 'paid', reversalReason: null },
        { id: 'txn-4', receiptNo: 'RCP-2026-0004', studentId: 'std-4', studentName: 'Ananya Iyer', feeHead: 'Annual Charges', amount: 5000, mode: 'Cheque', ref: 'CHQ-882190', date: '2026-03-06', status: 'reversed', reversalReason: 'Cheque bounced due to signature mismatch' }
      ],
      marks: {
        'Term 1 Mid-Term': {
          'Mathematics': {
            'std-1': 94,
            'std-2': 88,
            'std-3': 76,
            'std-4': 91
          },
          'Science': {
            'std-1': 92,
            'std-2': 85,
            'std-3': 70,
            'std-4': 89
          },
          'English': {
            'std-1': 89,
            'std-2': 90,
            'std-3': 82,
            'std-4': 95
          },
          'Social Studies': {
            'std-1': 86,
            'std-2': 84,
            'std-3': 74,
            'std-4': 92
          }
        }
      },
      timetable: [
        { id: 'tt-1', classSection: 'Grade 10-A', day: 'Monday', period: '1', subject: 'Mathematics', teacherName: 'Mrs. Sunita Sharma', room: 'Room 101' },
        { id: 'tt-2', classSection: 'Grade 10-A', day: 'Monday', period: '2', subject: 'Science', teacherName: 'Mr. Amitav Sen', room: 'Lab 2' },
        { id: 'tt-3', classSection: 'Grade 10-A', day: 'Monday', period: '3', subject: 'English', teacherName: 'Ms. Priya Menon', room: 'Room 101' },
        { id: 'tt-4', classSection: 'Grade 10-A', day: 'Tuesday', period: '1', subject: 'Science', teacherName: 'Mr. Amitav Sen', room: 'Lab 2' },
        { id: 'tt-5', classSection: 'Grade 10-A', day: 'Tuesday', period: '2', subject: 'Mathematics', teacherName: 'Mrs. Sunita Sharma', room: 'Room 101' }
      ],
      library: [
        { id: 'bk-1', isbn: '978-0131103627', title: 'The C Programming Language', author: 'Brian Kernighan, Dennis Ritchie', category: 'Science', totalCopies: 10, availableCopies: 8 },
        { id: 'bk-2', isbn: '978-0201896831', title: 'The Art of Computer Programming', author: 'Donald Knuth', category: 'Mathematics', totalCopies: 5, availableCopies: 5 },
        { id: 'bk-3', isbn: '978-0143424468', title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', category: 'Literature', totalCopies: 15, availableCopies: 12 },
        { id: 'bk-4', isbn: '978-0199535569', title: 'A Brief History of Time', author: 'Stephen Hawking', category: 'Science', totalCopies: 8, availableCopies: 6 }
      ],
      transport: [
        { id: 'tr-1', name: 'Route 101 - North City Hub', vehicleNo: 'DL-01-AB-1234', driver: 'Gurpreet Singh', contact: '+91 98991 00011', stops: 'Civil Lines, Model Town, North Campus, School', capacity: 36, allocatedStudents: 28 },
        { id: 'tr-2', name: 'Route 102 - South Ring Road', vehicleNo: 'DL-01-CD-5678', driver: 'Rajender Yadav', contact: '+91 98991 00022', stops: 'Saket, Hauz Khas, AIIMS, South Ext, School', capacity: 42, allocatedStudents: 38 }
      ],
      notices: [
        { id: 'not-1', title: 'Upcoming Term 1 Final Examinations', content: 'Term 1 final exams will commence on 25th March 2026. Hall tickets will be issued next week.', audience: 'all', date: '2026-03-08', priority: 'high' },
        { id: 'not-2', title: 'Annual Parent-Teacher Meeting (PTM)', content: 'The semester review PTM will be held on Saturday from 09:00 AM to 01:00 PM.', audience: 'parents', date: '2026-03-05', priority: 'normal' },
        { id: 'not-3', title: 'Science Exhibition Registration', content: 'Students interested in submitting science prototypes must register their projects with Mr. Sen by Friday.', audience: 'students', date: '2026-03-02', priority: 'normal' }
      ]
    },
    'school-2': {
      info: {
        id: 'school-2',
        name: 'St. Xavier International Academy',
        code: 'SXIA-02',
        affiliation: 'CBSE Affiliated',
        address: 'Park Street, Kolkata'
      },
      students: [
        { id: 'std-201', admNo: 'SXIA-2026-001', firstName: 'Vikram', lastName: 'Banerjee', class: 'Grade 10', section: 'A', rollNo: '101', dob: '2010-04-11', gender: 'Male', guardianName: 'Subhash Banerjee', guardianPhone: '+91 98300 11223', status: 'active', pen: 'PEN202600201', rteCategory: 'General' },
        { id: 'std-202', admNo: 'SXIA-2026-002', firstName: 'Rhea', lastName: 'Mukherjee', class: 'Grade 10', section: 'A', rollNo: '102', dob: '2010-09-25', gender: 'Female', guardianName: 'Debashis Mukherjee', guardianPhone: '+91 98300 22334', status: 'active', pen: 'PEN202600202', rteCategory: 'General' }
      ],
      admissions: [
        { id: 'adm-201', appNo: 'APP-SXIA-001', firstName: 'Siddharth', lastName: 'Ghosh', applyingFor: 'Grade 9', dob: '2011-06-14', guardian: 'Amit Ghosh', phone: '+91 98300 33445', appliedDate: '2026-03-02', status: 'under_review', notes: 'Interview scheduled' }
      ],
      staff: [
        { id: 'stf-201', empCode: 'SX-001', name: 'Father Anthony Dsouza', designation: 'Principal', department: 'Administration', email: 'principal@stxaviers.edu', phone: '+91 98300 99001', status: 'active' },
        { id: 'stf-202', empCode: 'SX-002', name: 'Mrs. Sharmila Bose', designation: 'Senior Teacher', department: 'Mathematics', email: 'sharmila@stxaviers.edu', phone: '+91 98300 99002', status: 'active' }
      ],
      attendance: {},
      fees: [
        { id: 'txn-201', receiptNo: 'RCP-SX-001', studentId: 'std-201', studentName: 'Vikram Banerjee', feeHead: 'Tuition Fee', amount: 15000, mode: 'Online / UPI', ref: 'UPI-SX-991', date: '2026-03-02', status: 'paid', reversalReason: null }
      ],
      marks: {},
      timetable: [],
      library: [],
      transport: [],
      notices: [
        { id: 'not-201', title: 'Spring Semester Assembly', content: 'All students are requested to gather in the main auditorium at 08:30 AM.', audience: 'all', date: '2026-03-01', priority: 'normal' }
      ]
    }
  };

  // ==========================================
  // 2. DATA STORE
  // ==========================================
  const Store = {
    data: null,
    currentSchool: 'school-1',

    init() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          this.data = JSON.parse(saved);
        } catch (e) {
          console.warn('Corrupted local storage. Resetting to initial seeds.');
          this.reset();
        }
      } else {
        this.reset();
      }
    },

    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    },

    reset() {
      this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
      this.save();
    },

    getSchool() {
      if (!this.data[this.currentSchool]) {
        this.currentSchool = 'school-1';
      }
      return this.data[this.currentSchool];
    }
  };

  // ==========================================
  // 3. CBSE 9-POINT GRADING LOGIC
  // ==========================================
  function calculateCbseGrade(percentage) {
    if (percentage >= 91) return 'A1';
    if (percentage >= 81) return 'A2';
    if (percentage >= 71) return 'B1';
    if (percentage >= 61) return 'B2';
    if (percentage >= 51) return 'C1';
    if (percentage >= 41) return 'C2';
    if (percentage >= 33) return 'D';
    if (percentage >= 21) return 'E1';
    return 'E2';
  }

  function calculateDivision(percentage) {
    if (percentage >= 75) return 'Distinction';
    if (percentage >= 60) return 'First Division';
    if (percentage >= 50) return 'Second Division';
    if (percentage >= 33) return 'Third Division';
    return 'Essential Repeat';
  }

  // ==========================================
  // 4. UI HELPERS (MODALS, TOASTS, CSV)
  // ==========================================
  window.openModal = function (modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  };

  window.closeModal = function (modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  };

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '⚠️';
    if (type === 'warning') icon = '🔔';

    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function exportToCsv(filename, headers, rows) {
    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';

    rows.forEach(row => {
      const line = row.map(cell => {
        const text = cell !== null && cell !== undefined ? String(cell) : '';
        return `"${text.replace(/"/g, '""')}"`;
      }).join(',');
      csvContent += line + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==========================================
  // 5. VIEW NAVIGATION CONTROLLER
  // ==========================================
  window.navigateTo = function (viewName) {
    // 1. Update navigation active state
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 2. Hide all view sections and show targeted view
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // 3. Update titles
    const titleEl = document.getElementById('page-title');
    const subTitleEl = document.getElementById('page-subtitle');
    const titles = {
      dashboard: ['Dashboard Overview', 'Comprehensive school performance metrics'],
      students: ['Student Information System (SIS)', 'Manage student directory, enrollment records, and lifecycle'],
      admissions: ['Admissions & Applications', 'Prospective applicant pipeline and enrollment workflow'],
      staff: ['Staff & Faculty Directory', 'Human resources and teaching faculty records'],
      attendance: ['Daily Student Attendance', 'Roster attendance marking and historical corrections'],
      fees: ['Fee Accounting & Cashiering', 'Collections, printable receipts, and financial adjustments'],
      exams: ['Examinations & Grading', 'CBSE 9-point grading, marks entry, and printable report cards'],
      timetable: ['Class Period Timetable', 'Weekly period scheduling with teacher conflict prevention'],
      library: ['Library Catalog & Books', 'Book catalog, checkout, and inventory tracking'],
      transport: ['Transport & Bus Routes', 'Bus fleet, driver assignments, and passenger limits'],
      notices: ['Notice Board & Circulars', 'Campus announcements and audience-targeted circulars'],
      reports: ['Reports & Compliance', 'Fee reconciliation, defaulters list, and UDISE+ export']
    };

    if (titles[viewName]) {
      titleEl.textContent = titles[viewName][0];
      subTitleEl.textContent = titles[viewName][1];
    }

    // 4. Trigger render logic for the active view
    renderCurrentView(viewName);

    // 5. Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
    }
  };

  function renderCurrentView(viewName) {
    switch (viewName) {
      case 'dashboard': renderDashboard(); break;
      case 'students': renderStudents(); break;
      case 'admissions': renderAdmissions(); break;
      case 'staff': renderStaff(); break;
      case 'attendance': renderAttendance(); break;
      case 'fees': renderFees(); break;
      case 'exams': renderExams(); break;
      case 'timetable': renderTimetable(); break;
      case 'library': renderLibrary(); break;
      case 'transport': renderTransport(); break;
      case 'notices': renderNotices(); break;
      case 'reports': renderReports(); break;
    }
  }

  // ==========================================
  // 6. MODULE RENDERERS
  // ==========================================

  // --- 6.1 DASHBOARD ---
  function renderDashboard() {
    const school = Store.getSchool();

    // KPIs
    const activeStudents = school.students.filter(s => s.status === 'active').length;
    document.getElementById('kpi-students').textContent = activeStudents;
    document.getElementById('kpi-staff').textContent = school.staff.length;

    const totalFees = school.fees
      .filter(f => f.status === 'paid')
      .reduce((sum, f) => sum + f.amount, 0);
    document.getElementById('kpi-fees').textContent = `₹${totalFees.toLocaleString('en-IN')}`;

    // Attendance percentage computation
    let totalMarks = 0;
    let presentMarks = 0;
    Object.values(school.attendance).forEach(day => {
      Object.values(day).forEach(rec => {
        totalMarks++;
        if (rec.status === 'P' || rec.status === 'L') presentMarks++;
      });
    });
    const attPct = totalMarks > 0 ? Math.round((presentMarks / totalMarks) * 100) : 95;
    document.getElementById('kpi-attendance').textContent = `${attPct}%`;

    // Dashboard Recent Admissions Table
    const admTbody = document.querySelector('#dashboard-admissions-table tbody');
    admTbody.innerHTML = '';
    const recentAdms = [...school.admissions].slice(-4).reverse();
    if (recentAdms.length === 0) {
      admTbody.innerHTML = '<tr><td colspan="4" class="empty-state">No recent applications</td></tr>';
    } else {
      recentAdms.forEach(a => {
        const tr = document.createElement('tr');
        const badgeClass = a.status === 'approved' || a.status === 'enrolled' ? 'badge-success' : (a.status === 'rejected' ? 'badge-danger' : 'badge-warning');
        tr.innerHTML = `
          <td><strong>${escapeHtml(a.firstName + ' ' + a.lastName)}</strong></td>
          <td>${escapeHtml(a.applyingFor)}</td>
          <td><span class="badge ${badgeClass}">${escapeHtml(a.status.toUpperCase().replace('_', ' '))}</span></td>
          <td>${escapeHtml(a.appliedDate)}</td>
        `;
        admTbody.appendChild(tr);
      });
    }

    // Dashboard Recent Fees Table
    const feesTbody = document.querySelector('#dashboard-fees-table tbody');
    feesTbody.innerHTML = '';
    const recentFees = [...school.fees].slice(-4).reverse();
    if (recentFees.length === 0) {
      feesTbody.innerHTML = '<tr><td colspan="4" class="empty-state">No recent transactions</td></tr>';
    } else {
      recentFees.forEach(f => {
        const tr = document.createElement('tr');
        const statusBadge = f.status === 'paid' ? 'badge-success' : 'badge-danger';
        tr.innerHTML = `
          <td><strong>${escapeHtml(f.receiptNo)}</strong></td>
          <td>${escapeHtml(f.studentName)}</td>
          <td>₹${f.amount.toLocaleString('en-IN')}</td>
          <td><span class="badge ${statusBadge}">${escapeHtml(f.mode)}</span></td>
        `;
        feesTbody.appendChild(tr);
      });
    }
  }

  // --- 6.2 STUDENTS (SIS) ---
  function renderStudents() {
    const school = Store.getSchool();
    const searchVal = (document.getElementById('students-search').value || '').toLowerCase();
    const classVal = document.getElementById('students-filter-class').value;
    const statusVal = document.getElementById('students-filter-status').value;

    const tbody = document.querySelector('#students-table tbody');
    tbody.innerHTML = '';

    const filtered = school.students.filter(s => {
      const matchSearch = (s.firstName + ' ' + s.lastName).toLowerCase().includes(searchVal) ||
        s.admNo.toLowerCase().includes(searchVal) ||
        s.guardianName.toLowerCase().includes(searchVal);
      const matchClass = !classVal || s.class === classVal;
      const matchStatus = !statusVal || s.status === statusVal;
      return matchSearch && matchClass && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">🔍</div><h4>No Students Found</h4><p>Try refining your search or filters.</p></td></tr>';
      return;
    }

    filtered.forEach(s => {
      const tr = document.createElement('tr');
      const badgeClass = s.status === 'active' ? 'badge-success' : (s.status === 'withdrawn' ? 'badge-danger' : 'badge-secondary');
      tr.innerHTML = `
        <td><strong>${escapeHtml(s.admNo)}</strong></td>
        <td>${escapeHtml(s.firstName + ' ' + s.lastName)}</td>
        <td>${escapeHtml(s.class)} - ${escapeHtml(s.section)}</td>
        <td>${escapeHtml(s.rollNo)}</td>
        <td>${escapeHtml(s.guardianName)} (${escapeHtml(s.guardianPhone)})</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(s.status.toUpperCase())}</span></td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-sm" onclick="viewStudentProfile('${s.id}')">Profile</button>
          <button class="btn btn-secondary btn-sm" onclick="toggleStudentStatus('${s.id}')">Status</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.viewStudentProfile = function (studentId) {
    const school = Store.getSchool();
    const s = school.students.find(std => std.id === studentId);
    if (!s) return;

    const container = document.getElementById('student-profile-content');
    container.innerHTML = `
      <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
        <div class="user-avatar" style="width: 54px; height: 54px; font-size: 1.25rem;">${s.firstName[0]}${s.lastName[0]}</div>
        <div>
          <h2 style="font-size: 1.3rem; font-weight: 700;">${escapeHtml(s.firstName + ' ' + s.lastName)}</h2>
          <span style="color: var(--text-muted); font-size: 0.85rem;">Admission Number: <strong>${escapeHtml(s.admNo)}</strong></span>
        </div>
      </div>
      <div class="form-row" style="margin-bottom: 0.75rem;">
        <div><strong>Class & Section:</strong> ${escapeHtml(s.class)} - ${escapeHtml(s.section)}</div>
        <div><strong>Roll Number:</strong> ${escapeHtml(s.rollNo)}</div>
      </div>
      <div class="form-row" style="margin-bottom: 0.75rem;">
        <div><strong>Date of Birth:</strong> ${escapeHtml(s.dob)}</div>
        <div><strong>Gender:</strong> ${escapeHtml(s.gender)}</div>
      </div>
      <div class="form-row" style="margin-bottom: 0.75rem;">
        <div><strong>Parent / Guardian:</strong> ${escapeHtml(s.guardianName)}</div>
        <div><strong>Contact Phone:</strong> ${escapeHtml(s.guardianPhone)}</div>
      </div>
      <div class="form-row" style="margin-bottom: 0.75rem;">
        <div><strong>UDISE+ PEN:</strong> ${escapeHtml(s.pen || 'N/A')}</div>
        <div><strong>Social Category:</strong> ${escapeHtml(s.rteCategory || 'General')}</div>
      </div>
      <div style="margin-top: 1rem;">
        <strong>Enrollment Status:</strong> 
        <span class="badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'}">${s.status.toUpperCase()}</span>
      </div>
    `;
    openModal('modal-student-profile');
  };

  window.toggleStudentStatus = function (studentId) {
    const school = Store.getSchool();
    const s = school.students.find(std => std.id === studentId);
    if (!s) return;

    const newStatus = s.status === 'active' ? 'withdrawn' : 'active';
    const reason = prompt(`Change status for ${s.firstName} ${s.lastName} from ${s.status} to ${newStatus}.\nPlease enter reason:`, 'Administrative action');
    if (reason !== null) {
      s.status = newStatus;
      Store.save();
      showToast(`Student status updated to ${newStatus}`, 'success');
      renderStudents();
      renderDashboard();
    }
  };

  // --- 6.3 ADMISSIONS ---
  function renderAdmissions() {
    const school = Store.getSchool();
    const searchVal = (document.getElementById('admissions-search').value || '').toLowerCase();
    const statusVal = document.getElementById('admissions-filter-status').value;

    const tbody = document.querySelector('#admissions-table tbody');
    tbody.innerHTML = '';

    const filtered = school.admissions.filter(a => {
      const matchSearch = (a.firstName + ' ' + a.lastName).toLowerCase().includes(searchVal) ||
        a.appNo.toLowerCase().includes(searchVal) ||
        a.guardian.toLowerCase().includes(searchVal);
      const matchStatus = !statusVal || a.status === statusVal;
      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">📝</div><h4>No Applications Found</h4></td></tr>';
      return;
    }

    filtered.forEach(a => {
      const tr = document.createElement('tr');
      const badgeClass = a.status === 'approved' || a.status === 'enrolled' ? 'badge-success' : (a.status === 'rejected' ? 'badge-danger' : 'badge-warning');
      tr.innerHTML = `
        <td><strong>${escapeHtml(a.appNo)}</strong></td>
        <td>${escapeHtml(a.firstName + ' ' + a.lastName)}</td>
        <td>${escapeHtml(a.applyingFor)}</td>
        <td>${escapeHtml(a.guardian)} (${escapeHtml(a.phone)})</td>
        <td>${escapeHtml(a.appliedDate)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(a.status.toUpperCase().replace('_', ' '))}</span></td>
        <td class="actions-cell">
          ${a.status !== 'enrolled' ? `<button class="btn btn-secondary btn-sm" onclick="updateAdmissionStatus('${a.id}')">Update Status</button>` : ''}
          ${a.status === 'approved' ? `<button class="btn btn-success btn-sm" onclick="enrollApplicant('${a.id}')">Enroll Student</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.updateAdmissionStatus = function (admId) {
    const school = Store.getSchool();
    const a = school.admissions.find(app => app.id === admId);
    if (!a) return;

    const newStatus = prompt(`Update Status for ${a.firstName} ${a.lastName}:\nEnter: submitted, under_review, approved, or rejected`, a.status);
    if (newStatus && ['submitted', 'under_review', 'approved', 'rejected'].includes(newStatus.toLowerCase())) {
      a.status = newStatus.toLowerCase();
      Store.save();
      showToast(`Application updated to ${a.status}`, 'success');
      renderAdmissions();
      renderDashboard();
    } else if (newStatus !== null) {
      alert('Invalid status. Permitted: submitted, under_review, approved, rejected');
    }
  };

  window.enrollApplicant = function (admId) {
    const school = Store.getSchool();
    const a = school.admissions.find(app => app.id === admId);
    if (!a) return;

    const section = prompt(`Assign Section for ${a.firstName} in ${a.applyingFor}:`, 'A') || 'A';
    const nextNum = school.students.length + 1;
    const newAdmNo = `${school.info.code}-2026-${String(nextNum).padStart(3, '0')}`;

    const newStudent = {
      id: 'std-' + Date.now(),
      admNo: newAdmNo,
      firstName: a.firstName,
      lastName: a.lastName,
      class: a.applyingFor,
      section: section.toUpperCase(),
      rollNo: String(100 + nextNum),
      dob: a.dob,
      gender: 'Male',
      guardianName: a.guardian,
      guardianPhone: a.phone,
      status: 'active',
      pen: `PEN2026${String(nextNum).padStart(4, '0')}`,
      rteCategory: 'General'
    };

    a.status = 'enrolled';
    school.students.push(newStudent);
    Store.save();

    showToast(`Applicant successfully enrolled with Admission No: ${newAdmNo}`, 'success');
    renderAdmissions();
    renderDashboard();
  };

  // --- 6.4 STAFF & HR ---
  function renderStaff() {
    const school = Store.getSchool();
    const searchVal = (document.getElementById('staff-search').value || '').toLowerCase();
    const deptVal = document.getElementById('staff-filter-dept').value;

    const tbody = document.querySelector('#staff-table tbody');
    tbody.innerHTML = '';

    const filtered = school.staff.filter(st => {
      const matchSearch = st.name.toLowerCase().includes(searchVal) ||
        st.empCode.toLowerCase().includes(searchVal) ||
        st.email.toLowerCase().includes(searchVal);
      const matchDept = !deptVal || st.department === deptVal;
      return matchSearch && matchDept;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">👨‍🏫</div><h4>No Staff Found</h4></td></tr>';
      return;
    }

    filtered.forEach(st => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(st.empCode)}</strong></td>
        <td>${escapeHtml(st.name)}</td>
        <td>${escapeHtml(st.designation)}</td>
        <td>${escapeHtml(st.department)}</td>
        <td>${escapeHtml(st.email)} / ${escapeHtml(st.phone)}</td>
        <td><span class="badge badge-success">${escapeHtml(st.status.toUpperCase())}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // --- 6.5 ATTENDANCE ---
  function renderAttendance() {
    const school = Store.getSchool();
    const dateInput = document.getElementById('att-date');
    if (!dateInput.value) {
      dateInput.value = '2026-03-10';
    }

    const cls = document.getElementById('att-class').value;
    const sec = document.getElementById('att-section').value;
    const date = dateInput.value;

    const tbody = document.querySelector('#attendance-roster-table tbody');
    tbody.innerHTML = '';

    const roster = school.students.filter(s => s.class === cls && s.section === sec && s.status === 'active');
    if (roster.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No active students in selected class and section.</td></tr>';
      document.getElementById('attendance-stats-summary').textContent = 'Total: 0 | Present: 0 | Absent: 0 | Late: 0';
      return;
    }

    const dayRecords = (school.attendance && school.attendance[date]) || {};

    let countP = 0, countA = 0, countL = 0;

    roster.forEach(s => {
      const current = dayRecords[s.id] || { status: 'P', remarks: '' };
      if (current.status === 'P') countP++;
      if (current.status === 'A') countA++;
      if (current.status === 'L') countL++;

      const tr = document.createElement('tr');
      tr.setAttribute('data-student-id', s.id);
      tr.innerHTML = `
        <td>${escapeHtml(s.rollNo)}</td>
        <td><strong>${escapeHtml(s.firstName + ' ' + s.lastName)}</strong></td>
        <td>${escapeHtml(s.admNo)}</td>
        <td>
          <div style="display: flex; gap: 0.75rem; align-items: center;">
            <label style="cursor: pointer;"><input type="radio" name="att_${s.id}" value="P" ${current.status === 'P' ? 'checked' : ''}> P</label>
            <label style="cursor: pointer;"><input type="radio" name="att_${s.id}" value="A" ${current.status === 'A' ? 'checked' : ''}> A</label>
            <label style="cursor: pointer;"><input type="radio" name="att_${s.id}" value="L" ${current.status === 'L' ? 'checked' : ''}> L</label>
            <label style="cursor: pointer;"><input type="radio" name="att_${s.id}" value="Excused" ${current.status === 'Excused' ? 'checked' : ''}> Excused</label>
          </div>
        </td>
        <td>
          <input type="text" class="form-input form-input-sm att-remarks" value="${escapeHtml(current.remarks)}" placeholder="Optional notes" style="padding: 0.3rem 0.5rem; font-size: 0.8rem; width: 100%;">
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('attendance-stats-summary').textContent =
      `Total: ${roster.length} | Present: ${countP} | Absent: ${countA} | Late: ${countL}`;
  }

  // --- 6.6 FEES & FINANCE ---
  function renderFees() {
    const school = Store.getSchool();
    const searchVal = (document.getElementById('fees-search').value || '').toLowerCase();
    const modeVal = document.getElementById('fees-filter-mode').value;

    const tbody = document.querySelector('#fees-table tbody');
    tbody.innerHTML = '';

    const paidFees = school.fees.filter(f => f.status === 'paid');
    const collectedSum = paidFees.reduce((acc, f) => acc + f.amount, 0);
    document.getElementById('fees-collected-sum').textContent = `₹${collectedSum.toLocaleString('en-IN')}`;
    document.getElementById('fees-txn-count').textContent = school.fees.length;

    const filtered = school.fees.filter(f => {
      const matchSearch = f.receiptNo.toLowerCase().includes(searchVal) ||
        f.studentName.toLowerCase().includes(searchVal);
      const matchMode = !modeVal || f.mode === modeVal;
      return matchSearch && matchMode;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-state-icon">💰</div><h4>No Fee Transactions</h4></td></tr>';
      return;
    }

    filtered.forEach(f => {
      const tr = document.createElement('tr');
      const isPaid = f.status === 'paid';
      tr.innerHTML = `
        <td><strong>${escapeHtml(f.receiptNo)}</strong></td>
        <td>${escapeHtml(f.date)}</td>
        <td>${escapeHtml(f.studentName)}</td>
        <td>${escapeHtml(f.feeHead)}</td>
        <td><strong>₹${f.amount.toLocaleString('en-IN')}</strong></td>
        <td>${escapeHtml(f.mode)}</td>
        <td><span class="badge ${isPaid ? 'badge-success' : 'badge-danger'}">${escapeHtml(f.status.toUpperCase())}</span></td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-sm" onclick="printReceipt('${f.id}')">Receipt</button>
          ${isPaid ? `<button class="btn btn-danger btn-sm" onclick="reverseFee('${f.id}')">Reverse</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.printReceipt = function (txnId) {
    const school = Store.getSchool();
    const f = school.fees.find(t => t.id === txnId);
    if (!f) return;

    const s = school.students.find(std => std.id === f.studentId) || { class: 'Grade 10', section: 'A', admNo: 'DPMS-2026-001' };

    const container = document.getElementById('receipt-printable-area');
    container.innerHTML = `
      <div class="receipt-header">
        <h2>${escapeHtml(school.info.name)}</h2>
        <p>${escapeHtml(school.info.affiliation)} | ${escapeHtml(school.info.address)}</p>
        <p style="margin-top: 0.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">FEE PAYMENT RECEIPT</p>
      </div>
      <div class="receipt-meta">
        <div>
          <div><strong>Receipt Number:</strong> ${escapeHtml(f.receiptNo)}</div>
          <div><strong>Payment Date:</strong> ${escapeHtml(f.date)}</div>
          <div><strong>Payment Mode:</strong> ${escapeHtml(f.mode)}</div>
          <div><strong>Reference / Cheque:</strong> ${escapeHtml(f.ref || 'N/A')}</div>
        </div>
        <div>
          <div><strong>Student Name:</strong> ${escapeHtml(f.studentName)}</div>
          <div><strong>Admission Number:</strong> ${escapeHtml(s.admNo)}</div>
          <div><strong>Class & Section:</strong> ${escapeHtml(s.class)} - ${escapeHtml(s.section)}</div>
          <div><strong>Status:</strong> <span class="badge ${f.status === 'paid' ? 'badge-success' : 'badge-danger'}">${f.status.toUpperCase()}</span></div>
        </div>
      </div>
      <table class="sheet-table">
        <thead>
          <tr>
            <th>Description / Fee Head</th>
            <th style="text-align: right;">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(f.feeHead)} (Academic Year 2026-2027)</td>
            <td style="text-align: right; font-weight: 700;">₹${f.amount.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">Total Amount Paid</td>
            <td style="text-align: right; font-weight: 800; font-size: 1.05rem;">₹${f.amount.toLocaleString('en-IN')}</td>
          </tr>
        </tbody>
      </table>
      ${f.status === 'reversed' ? `<div style="padding: 0.75rem; background: #fee2e2; color: #dc2626; border-radius: 4px; font-weight: 600; margin-bottom: 1rem;">REVERSAL NOTE: ${escapeHtml(f.reversalReason)}</div>` : ''}
      <div class="receipt-signatures">
        <div class="sig-box">Depositor Signature</div>
        <div class="sig-box">Authorized Cashier / Accounts</div>
      </div>
    `;
    openModal('modal-fee-receipt');
  };

  window.reverseFee = function (txnId) {
    const school = Store.getSchool();
    const f = school.fees.find(t => t.id === txnId);
    if (!f) return;

    const reason = prompt(`Enter reason for reversing transaction ${f.receiptNo}:`, 'Cheque bounced or duplicate entry');
    if (reason) {
      f.status = 'reversed';
      f.reversalReason = reason;
      Store.save();
      showToast(`Fee transaction ${f.receiptNo} reversed successfully`, 'success');
      renderFees();
      renderDashboard();
    }
  };

  // --- 6.7 EXAMINATIONS & REPORT CARDS ---
  function renderExams() {
    const school = Store.getSchool();
    const term = document.getElementById('exam-term').value;
    const cls = document.getElementById('exam-class').value;
    const subject = document.getElementById('exam-subject').value;

    const tbody = document.querySelector('#marks-table tbody');
    tbody.innerHTML = '';

    const students = school.students.filter(s => s.class === cls && s.status === 'active');
    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No students found in selected class.</td></tr>';
      return;
    }

    const termData = (school.marks && school.marks[term]) || {};
    const subjectData = termData[subject] || {};

    students.forEach(s => {
      const marksObtained = subjectData[s.id] !== undefined ? subjectData[s.id] : 85;
      const maxMarks = 100;
      const pct = Math.round((marksObtained / maxMarks) * 100);
      const grade = calculateCbseGrade(pct);

      const tr = document.createElement('tr');
      tr.setAttribute('data-student-id', s.id);
      tr.innerHTML = `
        <td>${escapeHtml(s.rollNo)}</td>
        <td><strong>${escapeHtml(s.firstName + ' ' + s.lastName)}</strong></td>
        <td>100</td>
        <td>
          <input type="number" class="form-input form-input-sm marks-input" value="${marksObtained}" min="0" max="100" style="width: 80px;" onchange="updateGradeRow(this)">
        </td>
        <td class="pct-cell">${pct}%</td>
        <td class="grade-cell"><span class="badge badge-info">${grade}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="printReportCard('${s.id}', '${term}')">Report Card</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.updateGradeRow = function (input) {
    let val = parseFloat(input.value) || 0;
    if (val > 100) { val = 100; input.value = 100; }
    if (val < 0) { val = 0; input.value = 0; }
    const tr = input.closest('tr');
    const pctCell = tr.querySelector('.pct-cell');
    const gradeCell = tr.querySelector('.grade-cell');

    const pct = Math.round(val);
    const grade = calculateCbseGrade(pct);
    pctCell.textContent = `${pct}%`;
    gradeCell.innerHTML = `<span class="badge badge-info">${grade}</span>`;
  };

  window.printReportCard = function (studentId, term) {
    const school = Store.getSchool();
    const s = school.students.find(std => std.id === studentId);
    if (!s) return;

    const subjects = ['Mathematics', 'Science', 'English', 'Social Studies'];
    const termMarks = (school.marks && school.marks[term]) || {};

    let totalObtained = 0;
    let totalMax = subjects.length * 100;
    let subjectRowsHtml = '';

    subjects.forEach(subj => {
      const marks = (termMarks[subj] && termMarks[subj][studentId] !== undefined) ? termMarks[subj][studentId] : 85;
      totalObtained += marks;
      const grade = calculateCbseGrade(marks);
      subjectRowsHtml += `
        <tr>
          <td><strong>${escapeHtml(subj)}</strong></td>
          <td style="text-align: center;">100</td>
          <td style="text-align: center; font-weight: 700;">${marks}</td>
          <td style="text-align: center;"><span class="badge badge-info">${grade}</span></td>
        </tr>
      `;
    });

    const overallPct = Math.round((totalObtained / totalMax) * 100);
    const overallGrade = calculateCbseGrade(overallPct);
    const division = calculateDivision(overallPct);

    const container = document.getElementById('report-card-printable-area');
    container.innerHTML = `
      <div class="report-header">
        <h2>${escapeHtml(school.info.name)}</h2>
        <p>${escapeHtml(school.info.affiliation)} | ${escapeHtml(school.info.address)}</p>
        <h3 style="margin-top: 0.5rem; font-weight: 700; color: #1e40af;">ANNUAL SCHOLASTIC PROGRESS REPORT</h3>
        <p>Academic Session 2026-2027 | ${escapeHtml(term)}</p>
      </div>

      <div class="report-meta">
        <div>
          <div><strong>Student Name:</strong> ${escapeHtml(s.firstName + ' ' + s.lastName)}</div>
          <div><strong>Admission No:</strong> ${escapeHtml(s.admNo)}</div>
          <div><strong>Class & Section:</strong> ${escapeHtml(s.class)} - ${escapeHtml(s.section)}</div>
        </div>
        <div>
          <div><strong>Roll Number:</strong> ${escapeHtml(s.rollNo)}</div>
          <div><strong>Date of Birth:</strong> ${escapeHtml(s.dob)}</div>
          <div><strong>Parent/Guardian:</strong> ${escapeHtml(s.guardianName)}</div>
        </div>
      </div>

      <table class="sheet-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th style="text-align: center;">Maximum Marks</th>
            <th style="text-align: center;">Marks Obtained</th>
            <th style="text-align: center;">CBSE Grade (9-Point)</th>
          </tr>
        </thead>
        <tbody>
          ${subjectRowsHtml}
          <tr style="background: #f8fafc; font-weight: 700;">
            <td>Grand Total</td>
            <td style="text-align: center;">${totalMax}</td>
            <td style="text-align: center; font-size: 1.05rem;">${totalObtained}</td>
            <td style="text-align: center;"><span class="badge badge-success">${overallGrade}</span></td>
          </tr>
        </tbody>
      </table>

      <div style="background: #eff6ff; padding: 1rem; border-radius: 8px; border: 1px solid #bfdbfe; margin-bottom: 2rem;">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); text-align: center;">
          <div><strong>Overall Percentage:</strong> ${overallPct}%</div>
          <div><strong>CBSE 9-Point Grade:</strong> ${overallGrade}</div>
          <div><strong>Result Classification:</strong> <span style="font-weight: 700; color: #16a34a;">${division}</span></div>
        </div>
      </div>

      <div class="receipt-signatures">
        <div class="sig-box">Class Teacher</div>
        <div class="sig-box">Examination Controller</div>
        <div class="sig-box">Principal</div>
      </div>
    `;
    openModal('modal-report-card');
  };

  // --- 6.8 TIMETABLE ---
  function renderTimetable() {
    const school = Store.getSchool();
    const classSec = document.getElementById('timetable-class-select').value;
    const container = document.getElementById('timetable-container');

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = ['1', '2', '3', '4', '5', '6'];

    let html = `<div class="timetable-header">Time / Day</div>`;
    days.forEach(d => {
      html += `<div class="timetable-header">${d}</div>`;
    });

    periods.forEach(p => {
      const times = {
        '1': '08:30 - 09:15',
        '2': '09:15 - 10:00',
        '3': '10:15 - 11:00',
        '4': '11:00 - 11:45',
        '5': '12:30 - 01:15',
        '6': '01:15 - 02:00'
      };
      html += `<div class="timetable-time"><span>P${p}</span><span style="font-size:0.65rem;">${times[p]}</span></div>`;

      days.forEach(d => {
        const slot = school.timetable.find(s => s.classSection === classSec && s.day === d && s.period === p);
        if (slot) {
          html += `
            <div class="timetable-cell">
              <span class="subject-tag">${escapeHtml(slot.subject)}</span>
              <span class="teacher-tag">${escapeHtml(slot.teacherName)}</span>
              <span class="room-tag">${escapeHtml(slot.room)}</span>
            </div>
          `;
        } else {
          html += `
            <div class="timetable-cell" style="cursor: pointer; color: #cbd5e1;" onclick="openAddSlotModal('${d}', '${p}')">
              <span>+ Add</span>
            </div>
          `;
        }
      });
    });

    container.innerHTML = html;
  }

  window.openAddSlotModal = function (day, period) {
    const school = Store.getSchool();
    const teacherSelect = document.getElementById('slot-teacher');
    teacherSelect.innerHTML = '';
    school.staff.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st.name;
      opt.textContent = `${st.name} (${st.department})`;
      teacherSelect.appendChild(opt);
    });

    if (day) document.getElementById('slot-day').value = day;
    if (period) document.getElementById('slot-period').value = period;

    openModal('modal-timetable-slot');
  };

  // --- 6.9 LIBRARY ---
  function renderLibrary() {
    const school = Store.getSchool();
    const searchVal = (document.getElementById('library-search').value || '').toLowerCase();
    const catVal = document.getElementById('library-filter-cat').value;

    const tbody = document.querySelector('#library-table tbody');
    tbody.innerHTML = '';

    const filtered = school.library.filter(b => {
      const matchSearch = b.title.toLowerCase().includes(searchVal) ||
        b.author.toLowerCase().includes(searchVal) ||
        b.isbn.toLowerCase().includes(searchVal);
      const matchCat = !catVal || b.category === catVal;
      return matchSearch && matchCat;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">📚</div><h4>No Books Found</h4></td></tr>';
      return;
    }

    filtered.forEach(b => {
      const tr = document.createElement('tr');
      const isAvailable = b.availableCopies > 0;
      tr.innerHTML = `
        <td>${escapeHtml(b.isbn)}</td>
        <td><strong>${escapeHtml(b.title)}</strong></td>
        <td>${escapeHtml(b.author)}</td>
        <td>${escapeHtml(b.category)}</td>
        <td>${b.totalCopies}</td>
        <td><strong>${b.availableCopies}</strong></td>
        <td><span class="badge ${isAvailable ? 'badge-success' : 'badge-danger'}">${isAvailable ? 'AVAILABLE' : 'CHECKED OUT'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // --- 6.10 TRANSPORT ---
  function renderTransport() {
    const school = Store.getSchool();
    const searchVal = (document.getElementById('transport-search').value || '').toLowerCase();

    const tbody = document.querySelector('#transport-table tbody');
    tbody.innerHTML = '';

    const filtered = school.transport.filter(t => {
      return t.name.toLowerCase().includes(searchVal) ||
        t.vehicleNo.toLowerCase().includes(searchVal) ||
        t.driver.toLowerCase().includes(searchVal);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">🚌</div><h4>No Transport Routes</h4></td></tr>';
      return;
    }

    filtered.forEach(t => {
      const tr = document.createElement('tr');
      const isFull = t.allocatedStudents >= t.capacity;
      tr.innerHTML = `
        <td><strong>${escapeHtml(t.name)}</strong></td>
        <td>${escapeHtml(t.vehicleNo)}</td>
        <td>${escapeHtml(t.driver)}</td>
        <td>${escapeHtml(t.contact)}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(t.stops)}</td>
        <td>${t.capacity}</td>
        <td><span class="badge ${isFull ? 'badge-danger' : 'badge-success'}">${t.allocatedStudents} / ${t.capacity}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // --- 6.11 NOTICES ---
  function renderNotices() {
    const school = Store.getSchool();
    const audVal = document.getElementById('notices-filter-audience').value;
    const container = document.getElementById('notices-container');
    container.innerHTML = '';

    const filtered = school.notices.filter(n => !audVal || n.audience === audVal || n.audience === 'all');

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📢</div><h4>No Announcements</h4></div>';
      return;
    }

    filtered.forEach(n => {
      const card = document.createElement('div');
      card.className = 'notice-card';
      const isHigh = n.priority === 'high';
      card.innerHTML = `
        <div class="notice-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="notice-title">${escapeHtml(n.title)}</span>
            <span class="badge ${isHigh ? 'badge-danger' : 'badge-secondary'}">${n.priority.toUpperCase()}</span>
          </div>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(n.date)}</span>
        </div>
        <div class="notice-content">${escapeHtml(n.content)}</div>
        <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-muted);">
          Audience: <strong>${escapeHtml(n.audience.toUpperCase())}</strong>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // --- 6.12 REPORTS & UDISE+ ---
  function renderReports() {
    const school = Store.getSchool();

    const netFee = school.fees
      .filter(f => f.status === 'paid')
      .reduce((sum, f) => sum + f.amount, 0);
    document.getElementById('report-reconciled-sum').textContent = `₹${netFee.toLocaleString('en-IN')}`;

    // Defaulters table
    const defaultersTbody = document.querySelector('#defaulters-table tbody');
    defaultersTbody.innerHTML = `
      <tr>
        <td><strong>DPMS-2026-003</strong></td>
        <td>Ishaan Verma</td>
        <td>Grade 10-B</td>
        <td><strong style="color: var(--danger);">₹9,000</strong></td>
      </tr>
      <tr>
        <td><strong>DPMS-2026-004</strong></td>
        <td>Ananya Iyer</td>
        <td>Grade 9-A</td>
        <td><strong style="color: var(--danger);">₹7,500</strong></td>
      </tr>
    `;
  }

  // ==========================================
  // 7. EVENT LISTENERS & FORM HANDLERS
  // ==========================================
  function setupEventListeners() {
    // 1. Sidebar Navigation
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        navigateTo(view);
      });
    });

    // 2. Mobile Menu Toggle
    document.getElementById('btn-toggle-menu').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // 3. School Tenant Switcher
    document.getElementById('tenant-select').addEventListener('change', (e) => {
      Store.currentSchool = e.target.value;
      const school = Store.getSchool();
      showToast(`Switched active school to: ${school.info.name}`, 'info');
      renderDashboard();
      const activeNav = document.querySelector('.sidebar-nav .nav-item.active');
      if (activeNav) {
        renderCurrentView(activeNav.getAttribute('data-view'));
      }
    });

    // 4. Reset Demo Data
    document.getElementById('btn-reset-data').addEventListener('click', () => {
      if (confirm('Reset demo data in browser localStorage to initial default state?')) {
        Store.reset();
        showToast('Demo data restored to initial state', 'success');
        renderDashboard();
        renderCurrentView('dashboard');
      }
    });

    // 5. API Guide Modal
    document.getElementById('btn-api-info').addEventListener('click', () => {
      openModal('modal-api-guide');
    });

    // 6. Search and Filters (live triggers)
    ['students-search', 'students-filter-class', 'students-filter-status'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderStudents);
      document.getElementById(id).addEventListener('change', renderStudents);
    });

    ['admissions-search', 'admissions-filter-status'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderAdmissions);
      document.getElementById(id).addEventListener('change', renderAdmissions);
    });

    ['staff-search', 'staff-filter-dept'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderStaff);
      document.getElementById(id).addEventListener('change', renderStaff);
    });

    ['fees-search', 'fees-filter-mode'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderFees);
      document.getElementById(id).addEventListener('change', renderFees);
    });

    ['library-search', 'library-filter-cat'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderLibrary);
      document.getElementById(id).addEventListener('change', renderLibrary);
    });

    document.getElementById('transport-search').addEventListener('input', renderTransport);
    document.getElementById('notices-filter-audience').addEventListener('change', renderNotices);
    document.getElementById('timetable-class-select').addEventListener('change', renderTimetable);

    // 7. Add Student Form
    document.getElementById('btn-add-student').addEventListener('click', () => {
      openModal('modal-add-student');
    });

    document.getElementById('form-add-student').addEventListener('submit', (e) => {
      e.preventDefault();
      const school = Store.getSchool();
      const nextNum = school.students.length + 1;
      const newAdmNo = `${school.info.code}-2026-${String(nextNum).padStart(3, '0')}`;

      const newStudent = {
        id: 'std-' + Date.now(),
        admNo: newAdmNo,
        firstName: document.getElementById('std-first-name').value.trim(),
        lastName: document.getElementById('std-last-name').value.trim(),
        class: document.getElementById('std-class').value,
        section: document.getElementById('std-section').value,
        rollNo: String(100 + nextNum),
        dob: document.getElementById('std-dob').value,
        gender: document.getElementById('std-gender').value,
        guardianName: document.getElementById('std-guardian-name').value.trim(),
        guardianPhone: document.getElementById('std-guardian-phone').value.trim(),
        status: 'active',
        pen: `PEN2026${String(nextNum).padStart(4, '0')}`,
        rteCategory: 'General'
      };

      school.students.push(newStudent);
      Store.save();
      closeModal('modal-add-student');
      e.target.reset();
      showToast(`Student ${newStudent.firstName} enrolled with Admission No ${newAdmNo}`, 'success');
      renderStudents();
      renderDashboard();
    });

    // 8. Export Students CSV
    document.getElementById('btn-export-students-csv').addEventListener('click', () => {
      const school = Store.getSchool();
      const headers = ['Admission No', 'First Name', 'Last Name', 'Class', 'Section', 'Roll No', 'DOB', 'Gender', 'Guardian', 'Phone', 'Status', 'PEN'];
      const rows = school.students.map(s => [
        s.admNo, s.firstName, s.lastName, s.class, s.section, s.rollNo, s.dob, s.gender, s.guardianName, s.guardianPhone, s.status, s.pen
      ]);
      exportToCsv(`${school.info.code}_students_master.csv`, headers, rows);
      showToast('Students CSV exported successfully', 'success');
    });

    // 9. New Admission Form
    document.getElementById('btn-new-admission').addEventListener('click', () => {
      openModal('modal-new-admission');
    });

    document.getElementById('form-new-admission').addEventListener('submit', (e) => {
      e.preventDefault();
      const school = Store.getSchool();
      const nextAppNo = `APP-2026-${String(100 + school.admissions.length + 1)}`;

      const newApp = {
        id: 'adm-' + Date.now(),
        appNo: nextAppNo,
        firstName: document.getElementById('adm-first-name').value.trim(),
        lastName: document.getElementById('adm-last-name').value.trim(),
        applyingFor: document.getElementById('adm-class').value,
        dob: document.getElementById('adm-dob').value,
        guardian: document.getElementById('adm-guardian').value.trim(),
        phone: document.getElementById('adm-phone').value.trim(),
        appliedDate: new Date().toISOString().split('T')[0],
        status: 'submitted',
        notes: 'Submitted via standalone portal'
      };

      school.admissions.push(newApp);
      Store.save();
      closeModal('modal-new-admission');
      e.target.reset();
      showToast(`Admission application ${nextAppNo} submitted successfully`, 'success');
      renderAdmissions();
      renderDashboard();
    });

    // 10. Attendance Controls
    document.getElementById('btn-load-attendance').addEventListener('click', renderAttendance);
    document.getElementById('btn-mark-all-present').addEventListener('click', () => {
      document.querySelectorAll('#attendance-roster-table input[value="P"]').forEach(radio => radio.checked = true);
    });

    document.getElementById('btn-save-attendance').addEventListener('click', () => {
      const school = Store.getSchool();
      const date = document.getElementById('att-date').value;
      if (!date) {
        showToast('Please select an attendance date', 'warning');
        return;
      }

      if (!school.attendance[date]) {
        school.attendance[date] = {};
      }

      const rows = document.querySelectorAll('#attendance-roster-table tbody tr');
      rows.forEach(tr => {
        const studentId = tr.getAttribute('data-student-id');
        if (!studentId) return;
        const checkedRadio = tr.querySelector(`input[name="att_${studentId}"]:checked`);
        const status = checkedRadio ? checkedRadio.value : 'P';
        const remarks = tr.querySelector('.att-remarks').value.trim();

        school.attendance[date][studentId] = { status, remarks };
      });

      Store.save();
      showToast(`Attendance saved for ${date}`, 'success');
      renderAttendance();
      renderDashboard();
    });

    // 11. Fees Form & Collect
    document.getElementById('btn-collect-fee').addEventListener('click', () => {
      const school = Store.getSchool();
      const select = document.getElementById('fee-student-select');
      select.innerHTML = '';
      school.students.filter(s => s.status === 'active').forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.admNo} - ${s.firstName} ${s.lastName} (${s.class}-${s.section})`;
        select.appendChild(opt);
      });
      openModal('modal-collect-fee');
    });

    document.getElementById('form-collect-fee').addEventListener('submit', (e) => {
      e.preventDefault();
      const school = Store.getSchool();
      const studentId = document.getElementById('fee-student-select').value;
      const s = school.students.find(std => std.id === studentId);
      if (!s) return;

      const nextNum = school.fees.length + 1;
      const receiptNo = `RCP-2026-${String(nextNum).padStart(4, '0')}`;
      const amount = parseFloat(document.getElementById('fee-amount').value) || 0;
      const feeHead = document.getElementById('fee-head').value;
      const mode = document.getElementById('fee-mode').value;
      const ref = document.getElementById('fee-ref').value.trim();

      const newTxn = {
        id: 'txn-' + Date.now(),
        receiptNo,
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        feeHead,
        amount,
        mode,
        ref,
        date: new Date().toISOString().split('T')[0],
        status: 'paid',
        reversalReason: null
      };

      school.fees.push(newTxn);
      Store.save();
      closeModal('modal-collect-fee');
      e.target.reset();
      showToast(`Payment recorded. Receipt: ${receiptNo}`, 'success');
      renderFees();
      renderDashboard();
    });

    // 12. Export Fees Ledger CSV
    document.getElementById('btn-export-fees-csv').addEventListener('click', () => {
      const school = Store.getSchool();
      const headers = ['Receipt No', 'Date', 'Student Name', 'Fee Head', 'Amount', 'Payment Mode', 'Reference', 'Status'];
      const rows = school.fees.map(f => [
        f.receiptNo, f.date, f.studentName, f.feeHead, f.amount, f.mode, f.ref || '', f.status
      ]);
      exportToCsv(`${school.info.code}_fee_transactions.csv`, headers, rows);
      showToast('Fee Ledger CSV exported successfully', 'success');
    });

    // 13. Save Marks Sheet
    document.getElementById('btn-load-marks').addEventListener('click', renderExams);
    document.getElementById('btn-save-marks').addEventListener('click', () => {
      const school = Store.getSchool();
      const term = document.getElementById('exam-term').value;
      const subject = document.getElementById('exam-subject').value;

      if (!school.marks) school.marks = {};
      if (!school.marks[term]) school.marks[term] = {};
      if (!school.marks[term][subject]) school.marks[term][subject] = {};

      const rows = document.querySelectorAll('#marks-table tbody tr');
      rows.forEach(tr => {
        const studentId = tr.getAttribute('data-student-id');
        const input = tr.querySelector('.marks-input');
        if (studentId && input) {
          school.marks[term][subject][studentId] = parseFloat(input.value) || 0;
        }
      });

      Store.save();
      showToast(`Marks saved for ${term} - ${subject}`, 'success');
      renderExams();
    });

    // 14. Timetable Slot Assignment Form
    document.getElementById('btn-add-timetable-slot').addEventListener('click', () => {
      openAddSlotModal();
    });

    document.getElementById('form-timetable-slot').addEventListener('submit', (e) => {
      e.preventDefault();
      const school = Store.getSchool();
      const classSec = document.getElementById('timetable-class-select').value;
      const day = document.getElementById('slot-day').value;
      const period = document.getElementById('slot-period').value;
      const subject = document.getElementById('slot-subject').value;
      const teacherName = document.getElementById('slot-teacher').value;
      const room = document.getElementById('slot-room').value.trim();

      // Conflict Detection: check if the teacher is already scheduled for another class in the same day and period
      const conflict = school.timetable.find(s =>
        s.teacherName === teacherName &&
        s.day === day &&
        s.period === period &&
        s.classSection !== classSec
      );

      if (conflict) {
        alert(`TIMETABLE CONFLICT!\nTeacher "${teacherName}" is already scheduled for ${conflict.classSection} on ${day} during Period ${period} in ${conflict.room}.`);
        return;
      }

      // Check if slot in this class already exists, replace or add
      const existingIdx = school.timetable.findIndex(s => s.classSection === classSec && s.day === day && s.period === period);
      const newSlot = {
        id: 'tt-' + Date.now(),
        classSection: classSec,
        day,
        period,
        subject,
        teacherName,
        room
      };

      if (existingIdx >= 0) {
        school.timetable[existingIdx] = newSlot;
      } else {
        school.timetable.push(newSlot);
      }

      Store.save();
      closeModal('modal-timetable-slot');
      showToast(`Period ${period} scheduled for ${subject}`, 'success');
      renderTimetable();
    });

    // 15. Reports & UDISE+ Downloads
    document.getElementById('btn-download-udise').addEventListener('click', () => {
      const school = Store.getSchool();
      const headers = ['School UDISE Code', 'Academic Session', 'Student PEN', 'Admission No', 'Student Name', 'Class', 'Section', 'DOB', 'Gender', 'Social Category', 'RTE Quota', 'Status'];
      const rows = school.students.map(s => [
        school.info.code, '2026-2027', s.pen || 'PENDING', s.admNo, `${s.firstName} ${s.lastName}`, s.class, s.section, s.dob, s.gender, s.rteCategory || 'General', s.rteCategory === 'EWS' ? 'YES' : 'NO', s.status
      ]);
      exportToCsv(`${school.info.code}_UDISE_Student_Report.csv`, headers, rows);
      showToast('UDISE+ Compliant CSV generated and downloaded', 'success');
    });

    document.getElementById('btn-download-financial-audit').addEventListener('click', () => {
      const school = Store.getSchool();
      const headers = ['Receipt No', 'Date', 'Student Name', 'Fee Head', 'Amount (INR)', 'Payment Mode', 'Reference ID', 'Ledger Status', 'Audited At'];
      const rows = school.fees.map(f => [
        f.receiptNo, f.date, f.studentName, f.feeHead, f.amount, f.mode, f.ref || 'NONE', f.status, new Date().toISOString()
      ]);
      exportToCsv(`${school.info.code}_Reconciled_Financial_Audit.csv`, headers, rows);
      showToast('Financial Audit CSV generated and downloaded', 'success');
    });
  }

  // ==========================================
  // 8. APPLICATION INITIALIZATION
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    Store.init();
    setupEventListeners();
    renderDashboard();
    navigateTo('dashboard');
  });

})();
