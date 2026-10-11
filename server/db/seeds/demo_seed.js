const { getDb, transaction, run, query, queryOne } = require('../../config/database');
const { hashPassword } = require('../../services/authService');
const { runMigrations } = require('../migrator');

function seedDatabase(customDb = null) {
  const db = customDb || getDb();
  console.log('Ensuring migrations are up to date before seeding...');
  runMigrations(db);

  console.log('Seeding demo data into database...');

  return transaction(() => {
    // 1. Seed Superadmin
    const superadminExists = queryOne('SELECT id FROM users WHERE username = ?', ['superadmin']);
    if (!superadminExists) {
      const { salt, hash } = hashPassword('SuperAdmin@2026');
      run(`
        INSERT INTO users (username, email, password_hash, password_salt, full_name, role, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['superadmin', 'superadmin@schoolerp.internal', hash, salt, 'Global Super Administrator', 'superadmin', 'active']);
    }

    // 2. Seed School A: Delhi Public Model School
    let schoolA = queryOne('SELECT id FROM schools WHERE code = ?', ['DPMS-01']);
    if (!schoolA) {
      run(`
        INSERT INTO schools (code, name, affiliation_number, udise_code, email, phone, address, city, state, postal_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'DPMS-01',
        'Delhi Public Model School',
        'CBSE-AFF-2026-091',
        '07010100101',
        'contact@dpms-jaipur.edu.in',
        '+91 141 2780001',
        'Sector 4, Vidhyadhar Nagar',
        'Jaipur',
        'Rajasthan',
        '302039'
      ]);
      schoolA = queryOne('SELECT id FROM schools WHERE code = ?', ['DPMS-01']);
    }
    const schoolAId = schoolA.id;

    // 3. Seed School B: St. Xavier's International Academy (for tenant testing)
    let schoolB = queryOne('SELECT id FROM schools WHERE code = ?', ['SXIA-02']);
    if (!schoolB) {
      run(`
        INSERT INTO schools (code, name, affiliation_number, udise_code, email, phone, address, city, state, postal_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'SXIA-02',
        'St. Xavier International Academy',
        'CBSE-AFF-2026-092',
        '07010100202',
        'info@stxaviers-academy.edu.in',
        '+91 141 2780002',
        'C-Scheme, Ashok Nagar',
        'Jaipur',
        'Rajasthan',
        '302001'
      ]);
      schoolB = queryOne('SELECT id FROM schools WHERE code = ?', ['SXIA-02']);
    }
    const schoolBId = schoolB.id;

    // 4. Seed Academic Sessions
    let sessionA = queryOne('SELECT id FROM academic_sessions WHERE school_id = ? AND name = ?', [schoolAId, '2026-2027']);
    if (!sessionA) {
      run(`
        INSERT INTO academic_sessions (school_id, name, start_date, end_date, is_current)
        VALUES (?, ?, ?, ?, ?)
      `, [schoolAId, '2026-2027', '2026-04-01', '2027-03-31', 1]);
      sessionA = queryOne('SELECT id FROM academic_sessions WHERE school_id = ? AND name = ?', [schoolAId, '2026-2027']);
    }

    let sessionB = queryOne('SELECT id FROM academic_sessions WHERE school_id = ? AND name = ?', [schoolBId, '2026-2027']);
    if (!sessionB) {
      run(`
        INSERT INTO academic_sessions (school_id, name, start_date, end_date, is_current)
        VALUES (?, ?, ?, ?, ?)
      `, [schoolBId, '2026-2027', '2026-04-01', '2027-03-31', 1]);
      sessionB = queryOne('SELECT id FROM academic_sessions WHERE school_id = ? AND name = ?', [schoolBId, '2026-2027']);
    }

    // 5. Seed School A Users
    const usersA = [
      { username: 'admin.dpms@schoolerp.internal', email: 'admin.dpms@schoolerp.internal', pass: 'Admin@2026', name: 'Dr. Ramesh Sharma (Admin)', role: 'admin' },
      { username: 'principal.dpms@schoolerp.internal', email: 'principal.dpms@schoolerp.internal', pass: 'Principal@2026', name: 'Mrs. Sunita Mehra (Principal)', role: 'principal' },
      { username: 'teacher.sharma@schoolerp.internal', email: 'teacher.sharma@schoolerp.internal', pass: 'Teacher@2026', name: 'Vikram Sharma (Maths Teacher)', role: 'teacher' },
      { username: 'teacher.verma@schoolerp.internal', email: 'teacher.verma@schoolerp.internal', pass: 'Teacher@2026', name: 'Pooja Verma (Science Teacher)', role: 'teacher' },
      { username: 'accountant.dpms@schoolerp.internal', email: 'accountant.dpms@schoolerp.internal', pass: 'Accountant@2026', name: 'Manoj Joshi (Accountant)', role: 'accountant' },
      { username: 'admissions.dpms@schoolerp.internal', email: 'admissions.dpms@schoolerp.internal', pass: 'Staff@2026', name: 'Sneha Kapur (Admission Staff)', role: 'admission_staff' },
      { username: 'student.aarav@schoolerp.internal', email: 'student.aarav@schoolerp.internal', pass: 'Student@2026', name: 'Aarav Sharma (Student)', role: 'student' },
      { username: 'parent.rajesh@schoolerp.internal', email: 'parent.rajesh@schoolerp.internal', pass: 'Parent@2026', name: 'Rajesh Sharma (Guardian)', role: 'parent' }
    ];

    for (const u of usersA) {
      const exists = queryOne('SELECT id FROM users WHERE username = ?', [u.username]);
      if (!exists) {
        const { salt, hash } = hashPassword(u.pass);
        run(`
          INSERT INTO users (school_id, username, email, password_hash, password_salt, full_name, role, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [schoolAId, u.username, u.email, hash, salt, u.name, u.role, 'active']);
      }
    }

    // Seed School B Admin
    const userB = queryOne('SELECT id FROM users WHERE username = ?', ['admin.sxia@schoolerp.internal']);
    if (!userB) {
      const { salt, hash } = hashPassword('Admin@2026');
      run(`
        INSERT INTO users (school_id, username, email, password_hash, password_salt, full_name, role, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [schoolBId, 'admin.sxia@schoolerp.internal', 'admin.sxia@schoolerp.internal', hash, salt, 'Fr. George Thomas (Admin)', 'admin', 'active']);
    }

    // 6. Seed Classes and Sections for School A
    const classesData = [
      { name: 'Grade 9', code: 'G9', level: 9 },
      { name: 'Grade 10', code: 'G10', level: 10 },
      { name: 'Grade 11', code: 'G11', level: 11 },
      { name: 'Grade 12', code: 'G12', level: 12 }
    ];

    for (const c of classesData) {
      let cls = queryOne('SELECT id FROM classes WHERE school_id = ? AND code = ?', [schoolAId, c.code]);
      if (!cls) {
        run('INSERT INTO classes (school_id, name, code, numeric_level) VALUES (?, ?, ?, ?)', [schoolAId, c.name, c.code, c.level]);
        cls = queryOne('SELECT id FROM classes WHERE school_id = ? AND code = ?', [schoolAId, c.code]);
      }

      // Add Section A and Section B
      ['A', 'B'].forEach(secName => {
        const sec = queryOne('SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = ?', [schoolAId, cls.id, secName]);
        if (!sec) {
          run('INSERT INTO sections (school_id, class_id, name, capacity) VALUES (?, ?, ?, ?)', [schoolAId, cls.id, secName, 40]);
        }
      });
    }

    // 7. Seed Subjects for Grade 10
    const grade10 = queryOne('SELECT id FROM classes WHERE school_id = ? AND code = ?', [schoolAId, 'G10']);
    const subjectsData = [
      { name: 'Mathematics', code: 'MATH-10', type: 'theory', max: 100 },
      { name: 'Science', code: 'SCI-10', type: 'both', max: 100 },
      { name: 'Social Studies', code: 'SST-10', type: 'theory', max: 100 },
      { name: 'English Core', code: 'ENG-10', type: 'theory', max: 100 },
      { name: 'Hindi Course A', code: 'HIN-10', type: 'theory', max: 100 }
    ];

    for (const s of subjectsData) {
      const exists = queryOne('SELECT id FROM subjects WHERE school_id = ? AND class_id = ? AND code = ?', [schoolAId, grade10.id, s.code]);
      if (!exists) {
        run('INSERT INTO subjects (school_id, class_id, name, code, type, max_marks) VALUES (?, ?, ?, ?, ?, ?)', [
          schoolAId, grade10.id, s.name, s.code, s.type, s.max
        ]);
      }
    }

    // 8. Seed Admissions (demonstrating all lifecycle states)
    const admissionsData = [
      { appNo: 'APP-2026-001', first: 'Aarav', last: 'Sharma', dob: '2011-04-12', gender: 'male', status: 'enrolled', rte: 0, guardian: 'Rajesh Sharma', phone: '+919829011111' },
      { appNo: 'APP-2026-002', first: 'Diya', last: 'Patel', dob: '2011-08-23', gender: 'female', status: 'enrolled', rte: 0, guardian: 'Amit Patel', phone: '+919829022222' },
      { appNo: 'APP-2026-003', first: 'Kabir', last: 'Singh', dob: '2011-02-14', gender: 'male', status: 'enrolled', rte: 1, guardian: 'Surjit Singh', phone: '+919829033333' },
      { appNo: 'APP-2026-004', first: 'Ananya', last: 'Iyer', dob: '2011-11-05', gender: 'female', status: 'approved', rte: 0, guardian: 'Natarajan Iyer', phone: '+919829044444' },
      { appNo: 'APP-2026-005', first: 'Rohan', last: 'Verma', dob: '2011-06-18', gender: 'male', status: 'under_review', rte: 0, guardian: 'Suresh Verma', phone: '+919829055555' },
      { appNo: 'APP-2026-006', first: 'Manish', last: 'Kumar', dob: '2008-01-01', gender: 'male', status: 'rejected', rte: 0, guardian: 'K. Kumar', phone: '+919829066666', reason: 'Age exceeds class limit per board criteria' },
      { appNo: 'APP-2026-007', first: 'Meera', last: 'Chauhan', dob: '2011-09-30', gender: 'female', status: 'submitted', rte: 1, guardian: 'Vikram Chauhan', phone: '+919829077777' }
    ];

    for (const adm of admissionsData) {
      const exists = queryOne('SELECT id FROM admissions WHERE school_id = ? AND application_no = ?', [schoolAId, adm.appNo]);
      if (!exists) {
        run(`
          INSERT INTO admissions (school_id, session_id, application_no, first_name, last_name, date_of_birth, gender,
            applying_for_class_id, guardian_name, guardian_phone, address, rte_candidate, status, rejection_reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          schoolAId, sessionA.id, adm.appNo, adm.first, adm.last, adm.dob, adm.gender,
          grade10.id, adm.guardian, adm.phone, 'Jaipur City, Rajasthan', adm.rte, adm.status, adm.reason || null
        ]);
      }
    }

    // 9. Seed Students & Enrollments for School A
    const secA = queryOne('SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = ?', [schoolAId, grade10.id, 'A']);
    const studentsSeed = [
      { admNo: 'DPMS-ADM-2026-01', first: 'Aarav', last: 'Sharma', dob: '2011-04-12', gender: 'male', blood: 'B+', phone: '+919829011111', rte: 0, roll: 1 },
      { admNo: 'DPMS-ADM-2026-02', first: 'Diya', last: 'Patel', dob: '2011-08-23', gender: 'female', blood: 'O+', phone: '+919829022222', rte: 0, roll: 2 },
      { admNo: 'DPMS-ADM-2026-03', first: 'Kabir', last: 'Singh', dob: '2011-02-14', gender: 'male', blood: 'A+', phone: '+919829033333', rte: 1, roll: 3 },
      { admNo: 'DPMS-ADM-2026-04', first: 'Ishaan', last: 'Gupta', dob: '2011-07-19', gender: 'male', blood: 'AB+', phone: '+919829044444', rte: 0, roll: 4 },
      { admNo: 'DPMS-ADM-2026-05', first: 'Rhea', last: 'Nair', dob: '2011-03-25', gender: 'female', blood: 'O-', phone: '+919829055555', rte: 0, roll: 5 }
    ];

    for (const s of studentsSeed) {
      let stu = queryOne('SELECT id FROM students WHERE school_id = ? AND admission_number = ?', [schoolAId, s.admNo]);
      if (!stu) {
        run(`
          INSERT INTO students (school_id, admission_number, first_name, last_name, date_of_birth, gender,
            blood_group, primary_phone, residential_address, emergency_contact_name, emergency_contact_phone, rte_student, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          schoolAId, s.admNo, s.first, s.last, s.dob, s.gender,
          s.blood, s.phone, 'Jaipur City, Rajasthan', 'Guardian ' + s.last, s.phone, s.rte, 'active'
        ]);
        stu = queryOne('SELECT id FROM students WHERE school_id = ? AND admission_number = ?', [schoolAId, s.admNo]);

        // Enroll student
        run(`
          INSERT INTO enrollments (school_id, student_id, session_id, class_id, section_id, roll_no, enrolled_date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [schoolAId, stu.id, sessionA.id, grade10.id, secA.id, s.roll, '2026-04-05', 'active']);
      }
    }

    // 10. Seed Attendance for today and recent dates
    const adminUser = queryOne('SELECT id FROM users WHERE username = ?', ['admin.dpms@schoolerp.internal']);
    const enrolledStudents = query('SELECT student_id FROM enrollments WHERE school_id = ? AND class_id = ?', [schoolAId, grade10.id]);
    const attendanceDates = ['2026-10-09', '2026-10-10', '2026-10-11'];

    for (const date of attendanceDates) {
      for (const [idx, enr] of enrolledStudents.entries()) {
        const attExists = queryOne('SELECT id FROM attendance WHERE school_id = ? AND student_id = ? AND attendance_date = ?', [
          schoolAId, enr.student_id, date
        ]);
        if (!attExists) {
          const status = (idx === 1 && date === '2026-10-10') ? 'absent' : (idx === 3 && date === '2026-10-11') ? 'late' : 'present';
          run(`
            INSERT INTO attendance (school_id, session_id, class_id, section_id, student_id, attendance_date, status, remarks, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [schoolAId, sessionA.id, grade10.id, secA.id, enr.student_id, date, status, status === 'absent' ? 'Sick' : '', adminUser.id]);
        }
      }
    }

    // 11. Seed Fee Heads & Structure
    const feeHeads = [
      { name: 'Tuition Fee', code: 'TUIT' },
      { name: 'Annual Development', code: 'DEV' },
      { name: 'Laboratory & Computer Fee', code: 'LAB' },
      { name: 'Library & Sports Fee', code: 'LIB' }
    ];

    for (const fh of feeHeads) {
      const exists = queryOne('SELECT id FROM fee_heads WHERE school_id = ? AND code = ?', [schoolAId, fh.code]);
      if (!exists) {
        run('INSERT INTO fee_heads (school_id, name, code) VALUES (?, ?, ?)', [schoolAId, fh.name, fh.code]);
      }
    }

    let feeStruct = queryOne('SELECT id FROM fee_structures WHERE school_id = ? AND name = ?', [schoolAId, 'Grade 10 Q1 Fee 2026-27']);
    if (!feeStruct) {
      run(`
        INSERT INTO fee_structures (school_id, session_id, class_id, name, frequency, total_amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [schoolAId, sessionA.id, grade10.id, 'Grade 10 Q1 Fee 2026-27', 'quarterly', 18500.00]);
      feeStruct = queryOne('SELECT id FROM fee_structures WHERE school_id = ? AND name = ?', [schoolAId, 'Grade 10 Q1 Fee 2026-27']);

      const tuitHead = queryOne('SELECT id FROM fee_heads WHERE school_id = ? AND code = ?', [schoolAId, 'TUIT']);
      const devHead = queryOne('SELECT id FROM fee_heads WHERE school_id = ? AND code = ?', [schoolAId, 'DEV']);
      run('INSERT INTO fee_structure_items (structure_id, fee_head_id, amount) VALUES (?, ?, ?)', [feeStruct.id, tuitHead.id, 14000.00]);
      run('INSERT INTO fee_structure_items (structure_id, fee_head_id, amount) VALUES (?, ?, ?)', [feeStruct.id, devHead.id, 4500.00]);
    }

    // Allocate Fees & Record Payments
    for (const [idx, enr] of enrolledStudents.entries()) {
      let alloc = queryOne('SELECT id FROM student_fee_allocations WHERE school_id = ? AND student_id = ? AND structure_id = ?', [
        schoolAId, enr.student_id, feeStruct.id
      ]);
      if (!alloc) {
        const isRte = idx === 2; // Kabir Singh is RTE
        const gross = 18500.00;
        const discount = isRte ? 18500.00 : 0.00;
        const net = gross - discount;
        const status = isRte ? 'paid' : (idx === 0 ? 'paid' : idx === 1 ? 'partial' : 'unpaid');

        run(`
          INSERT INTO student_fee_allocations (school_id, student_id, session_id, structure_id, gross_amount, discount_amount, net_payable, due_date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [schoolAId, enr.student_id, sessionA.id, feeStruct.id, gross, discount, net, '2026-10-31', status]);
        alloc = queryOne('SELECT id FROM student_fee_allocations WHERE school_id = ? AND student_id = ? AND structure_id = ?', [
          schoolAId, enr.student_id, feeStruct.id
        ]);

        // Record payment for Aarav (full payment) and Diya (partial payment)
        if (idx === 0) {
          run(`
            INSERT INTO fee_payments (school_id, allocation_id, receipt_number, payment_date, amount_paid, payment_mode, transaction_reference, collected_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [schoolAId, alloc.id, 'REC-2026-DPMS-0001', '2026-10-06', 18500.00, 'upi', 'UPI/DPMS/98112', adminUser.id, 'Full payment via UPI']);
        } else if (idx === 1) {
          run(`
            INSERT INTO fee_payments (school_id, allocation_id, receipt_number, payment_date, amount_paid, payment_mode, transaction_reference, collected_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [schoolAId, alloc.id, 'REC-2026-DPMS-0002', '2026-10-07', 10000.00, 'cash', 'CASH/COUNTER/01', adminUser.id, 'Partial Q1 payment']);
        }
      }
    }

    // 12. Seed Exams, Marks & Published Report Cards
    let exam = queryOne('SELECT id FROM exams WHERE school_id = ? AND name = ?', [schoolAId, 'Mid-Term Assessment 2026']);
    if (!exam) {
      run(`
        INSERT INTO exams (school_id, session_id, name, start_date, end_date, status, published_at, published_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [schoolAId, sessionA.id, 'Mid-Term Assessment 2026', '2026-09-15', '2026-09-24', 'published', '2026-10-01 10:00:00', adminUser.id]);
      exam = queryOne('SELECT id FROM exams WHERE school_id = ? AND name = ?', [schoolAId, 'Mid-Term Assessment 2026']);

      // Add Exam Subjects
      const mathSub = queryOne('SELECT id FROM subjects WHERE school_id = ? AND code = ?', [schoolAId, 'MATH-10']);
      const sciSub = queryOne('SELECT id FROM subjects WHERE school_id = ? AND code = ?', [schoolAId, 'SCI-10']);

      run(`
        INSERT INTO exam_subjects (exam_id, class_id, subject_id, exam_date, max_marks, passing_marks)
        VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)
      `, [
        exam.id, grade10.id, mathSub.id, '2026-09-16', 100.0, 33.0,
        exam.id, grade10.id, sciSub.id, '2026-09-18', 100.0, 33.0
      ]);

      const mathExamSub = queryOne('SELECT id FROM exam_subjects WHERE exam_id = ? AND subject_id = ?', [exam.id, mathSub.id]);
      const sciExamSub = queryOne('SELECT id FROM exam_subjects WHERE exam_id = ? AND subject_id = ?', [exam.id, sciSub.id]);

      // Seed Marks
      const marksSample = [
        { math: 92.5, sci: 88.0 }, // Aarav: A1, A2
        { math: 78.0, sci: 82.5 }, // Diya: B1, A2
        { math: 85.0, sci: 91.0 }, // Kabir: A2, A1
        { math: 64.0, sci: 70.0 }, // Ishaan: B2, B2
        { math: 95.0, sci: 96.0 }  // Rhea: A1, A1
      ];

      enrolledStudents.forEach((enr, i) => {
        const m = marksSample[i] || { math: 75.0, sci: 75.0 };
        run('INSERT INTO marks (school_id, exam_subject_id, student_id, marks_obtained, grade, entered_by) VALUES (?, ?, ?, ?, ?, ?)', [
          schoolAId, mathExamSub.id, enr.student_id, m.math, m.math >= 91 ? 'A1' : m.math >= 81 ? 'A2' : m.math >= 71 ? 'B1' : 'B2', adminUser.id
        ]);
        run('INSERT INTO marks (school_id, exam_subject_id, student_id, marks_obtained, grade, entered_by) VALUES (?, ?, ?, ?, ?, ?)', [
          schoolAId, sciExamSub.id, enr.student_id, m.sci, m.sci >= 91 ? 'A1' : m.sci >= 81 ? 'A2' : m.sci >= 71 ? 'B1' : 'B2', adminUser.id
        ]);
      });
    }

    // 13. Seed Staff Profiles
    const staffUser1 = queryOne('SELECT id FROM users WHERE username = ?', ['teacher.sharma@schoolerp.internal']);
    if (staffUser1) {
      const exists = queryOne('SELECT id FROM staff WHERE school_id = ? AND employee_code = ?', [schoolAId, 'EMP-MATH-01']);
      if (!exists) {
        run(`
          INSERT INTO staff (school_id, user_id, employee_code, department, designation, joining_date, qualification, salary_amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [schoolAId, staffUser1.id, 'EMP-MATH-01', 'Mathematics', 'Senior PGT Teacher', '2020-07-01', 'M.Sc. Mathematics, B.Ed.', 58000.00]);
      }
    }

    // 14. Seed Library Books
    const booksSample = [
      { isbn: '978-0132350884', title: 'Clean Code: A Handbook of Agile Software Craftsmanship', author: 'Robert C. Martin', cat: 'Computer Science', copies: 5 },
      { isbn: '978-8120305960', title: 'Concepts of Physics (Vol 1)', author: 'H.C. Verma', cat: 'Physics', copies: 10 },
      { isbn: '978-9351761655', title: 'Mathematics for Class 10', author: 'R.D. Sharma', cat: 'Mathematics', copies: 12 },
      { isbn: '978-0143428589', title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', cat: 'Biography', copies: 4 }
    ];

    for (const b of booksSample) {
      const exists = queryOne('SELECT id FROM books WHERE school_id = ? AND title = ?', [schoolAId, b.title]);
      if (!exists) {
        run('INSERT INTO books (school_id, isbn, title, author, category, total_copies, available_copies) VALUES (?, ?, ?, ?, ?, ?, ?)', [
          schoolAId, b.isbn, b.title, b.author, b.cat, b.copies, b.copies
        ]);
      }
    }

    // 15. Seed Transport
    let route = queryOne('SELECT id FROM transport_routes WHERE school_id = ? AND route_name = ?', [schoolAId, 'Route 4 - Mansarovar to Vidhyadhar Nagar']);
    if (!route) {
      run(`
        INSERT INTO transport_routes (school_id, route_name, vehicle_number, driver_name, driver_phone, capacity)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [schoolAId, 'Route 4 - Mansarovar to Vidhyadhar Nagar', 'RJ-14-PA-4421', 'Kalyan Singh', '+91 9414002233', 35]);
      route = queryOne('SELECT id FROM transport_routes WHERE school_id = ? AND route_name = ?', [schoolAId, 'Route 4 - Mansarovar to Vidhyadhar Nagar']);

      run(`
        INSERT INTO transport_stops (route_id, stop_name, pickup_time, drop_time, monthly_fare)
        VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)
      `, [
        route.id, 'Mansarovar Metro Station', '07:15 AM', '02:30 PM', 1200.00,
        route.id, 'Civil Lines Circle', '07:35 AM', '02:10 PM', 1000.00
      ]);
    }

    // 16. Seed Notices
    const noticeExists = queryOne('SELECT id FROM notices WHERE school_id = ? AND title = ?', [schoolAId, 'Annual Sports Meet 2026 Notification']);
    if (!noticeExists) {
      run(`
        INSERT INTO notices (school_id, title, content, target_audience, posted_by, publish_date, is_urgent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        schoolAId,
        'Annual Sports Meet 2026 Notification',
        'The Annual Inter-House Athletic Meet will be held on 24th October 2026. All students participating in track events should submit entries to their physical education instructors.',
        'all',
        adminUser.id,
        '2026-10-10',
        0
      ]);
    }

    console.log('Seed data successfully applied for School A and School B!');
    return true;
  });
}

if (require.main === module) {
  try {
    seedDatabase();
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

module.exports = { seedDatabase };
