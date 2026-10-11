const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run, transaction } = require('../config/database');
const { calculateGrade, calculateDivision } = require('../services/examService');
const { logAudit } = require('../services/auditService');

router.use(requireAuth, requireSchool);

/**
 * GET /api/exams - List exams
 */
router.get('/', (req, res) => {
  const exams = query(`
    SELECT e.*, s.name as session_name, u.full_name as published_by_name
    FROM exams e
    JOIN academic_sessions s ON e.session_id = s.id
    LEFT JOIN users u ON e.published_by = u.id
    WHERE e.school_id = ?
    ORDER BY e.start_date DESC
  `, [req.schoolId]);

  res.json({ success: true, data: exams });
});

/**
 * POST /api/exams - Create exam
 */
router.post('/', requireRole(['admin', 'principal']), (req, res) => {
  const { name, sessionId, startDate, endDate } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'name, startDate, and endDate are required' }
    });
  }

  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const active = queryOne('SELECT id FROM academic_sessions WHERE school_id = ? AND is_current = 1', [req.schoolId]);
    targetSessionId = active?.id || 1;
  }

  run(`
    INSERT INTO exams (school_id, session_id, name, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, 'draft')
  `, [req.schoolId, targetSessionId, name, startDate, endDate]);

  const created = queryOne('SELECT * FROM exams WHERE school_id = ? AND name = ?', [req.schoolId, name]);
  logAudit(req.schoolId, req.user.id, 'CREATE_EXAM', 'exams', created.id, null, created, req);

  res.status(201).json({ success: true, data: created });
});

/**
 * GET /api/exams/:id - Exam details with subject timetable
 */
router.get('/:id', (req, res) => {
  const examId = Number(req.params.id);
  const exam = queryOne('SELECT * FROM exams WHERE school_id = ? AND id = ?', [req.schoolId, examId]);

  if (!exam) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
  }

  const subjects = query(`
    SELECT es.*, c.name as class_name, sub.name as subject_name, sub.code as subject_code
    FROM exam_subjects es
    JOIN classes c ON es.class_id = c.id
    JOIN subjects sub ON es.subject_id = sub.id
    WHERE es.exam_id = ?
    ORDER BY es.exam_date ASC
  `, [examId]);

  res.json({ success: true, data: { ...exam, subjects } });
});

/**
 * POST /api/exams/:id/subjects - Schedule subject for exam
 */
router.post('/:id/subjects', requireRole(['admin', 'principal']), (req, res) => {
  const examId = Number(req.params.id);
  const { classId, subjectId, examDate, maxMarks = 100, passingMarks = 33 } = req.body;

  if (!classId || !subjectId || !examDate) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'classId, subjectId, and examDate are required' }
    });
  }

  const existing = queryOne(`
    SELECT id FROM exam_subjects
    WHERE exam_id = ? AND class_id = ? AND subject_id = ?
  `, [examId, classId, subjectId]);

  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'This subject is already scheduled for this exam' }
    });
  }

  run(`
    INSERT INTO exam_subjects (exam_id, class_id, subject_id, exam_date, max_marks, passing_marks)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [examId, classId, subjectId, examDate, Number(maxMarks), Number(passingMarks)]);

  const created = queryOne(`
    SELECT * FROM exam_subjects
    WHERE exam_id = ? AND class_id = ? AND subject_id = ?
  `, [examId, classId, subjectId]);

  res.status(201).json({ success: true, data: created });
});

/**
 * GET /api/exams/:id/marks - Get marks for exam subject
 */
router.get('/:id/marks', (req, res) => {
  const { examSubjectId } = req.query;

  if (!examSubjectId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'examSubjectId query parameter is required' }
    });
  }

  const examSub = queryOne(`
    SELECT es.*, c.id as class_id, c.name as class_name, s.name as subject_name
    FROM exam_subjects es
    JOIN classes c ON es.class_id = c.id
    JOIN subjects s ON es.subject_id = s.id
    WHERE es.id = ?
  `, [examSubjectId]);

  if (!examSub) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam subject not found' } });
  }

  // Get enrolled students and their entered marks
  const records = query(`
    SELECT
      s.id as student_id,
      s.first_name,
      s.last_name,
      s.admission_number,
      e.roll_no,
      sec.name as section_name,
      m.id as mark_id,
      m.marks_obtained,
      m.is_absent,
      m.grade,
      m.remarks
    FROM enrollments e
    JOIN students s ON e.student_id = s.id
    JOIN sections sec ON e.section_id = sec.id
    LEFT JOIN marks m ON m.student_id = s.id AND m.exam_subject_id = ? AND m.school_id = ?
    WHERE e.school_id = ? AND e.class_id = ? AND e.status = 'active'
    ORDER BY sec.name ASC, e.roll_no ASC, s.first_name ASC
  `, [examSubjectId, req.schoolId, req.schoolId, examSub.class_id]);

  res.json({
    success: true,
    data: {
      examSubject: examSub,
      records
    }
  });
});

/**
 * POST /api/exams/:id/marks - Batch enter marks with validation
 */
router.post('/:id/marks', requireRole(['teacher', 'admin', 'principal']), (req, res) => {
  const examId = Number(req.params.id);
  const { examSubjectId, marks } = req.body;

  if (!examSubjectId || !Array.isArray(marks) || marks.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'examSubjectId and non-empty marks array are required' }
    });
  }

  const exam = queryOne('SELECT * FROM exams WHERE school_id = ? AND id = ?', [req.schoolId, examId]);
  if (!exam) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
  }

  // If exam is published, only admin or principal can correct marks
  if (exam.status === 'published' && !['admin', 'principal'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: { code: 'EXAM_LOCKED', message: 'Exam is published. Only Principal or Admin can edit marks after publication.' }
    });
  }

  const examSub = queryOne('SELECT * FROM exam_subjects WHERE id = ? AND exam_id = ?', [examSubjectId, examId]);
  if (!examSub) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam subject not found' } });
  }

  // Validation: Ensure marks obtained do not exceed maxMarks
  for (const entry of marks) {
    if (!entry.isAbsent && entry.marksObtained !== undefined) {
      const score = Number(entry.marksObtained);
      if (isNaN(score) || score < 0 || score > examSub.max_marks) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_MARKS',
            message: `Marks obtained (${score}) must be between 0 and maximum marks (${examSub.max_marks})`
          }
        });
      }
    }
  }

  transaction(() => {
    for (const entry of marks) {
      const isAbsent = entry.isAbsent ? 1 : 0;
      const score = isAbsent ? null : Number(entry.marksObtained);
      let grade = 'AB';

      if (!isAbsent && score !== null) {
        const percentage = (score / examSub.max_marks) * 100.0;
        grade = calculateGrade(percentage).grade;
      }

      const existing = queryOne('SELECT id FROM marks WHERE school_id = ? AND exam_subject_id = ? AND student_id = ?', [
        req.schoolId, examSubjectId, entry.studentId
      ]);

      if (existing) {
        run(`
          UPDATE marks
          SET marks_obtained = ?, is_absent = ?, grade = ?, remarks = ?, entered_by = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [score, isAbsent, grade, entry.remarks || '', req.user.id, existing.id]);
      } else {
        run(`
          INSERT INTO marks (school_id, exam_subject_id, student_id, marks_obtained, is_absent, grade, remarks, entered_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.schoolId, examSubjectId, entry.studentId, score, isAbsent, grade, entry.remarks || '', req.user.id]);
      }
    }
  });

  logAudit(req.schoolId, req.user.id, 'ENTER_EXAM_MARKS', 'marks', examSubjectId, null, { updatedCount: marks.length }, req);

  res.json({
    success: true,
    message: `Marks entered successfully for ${marks.length} students`
  });
});

/**
 * PATCH /api/exams/:id/publish - Publish exam results
 */
router.patch('/:id/publish', requireRole(['admin', 'principal']), (req, res) => {
  const examId = Number(req.params.id);
  const exam = queryOne('SELECT * FROM exams WHERE school_id = ? AND id = ?', [req.schoolId, examId]);

  if (!exam) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
  }

  run(`
    UPDATE exams
    SET status = 'published', published_at = CURRENT_TIMESTAMP, published_by = ?
    WHERE school_id = ? AND id = ?
  `, [req.user.id, req.schoolId, examId]);

  const updated = queryOne('SELECT * FROM exams WHERE school_id = ? AND id = ?', [req.schoolId, examId]);
  logAudit(req.schoolId, req.user.id, 'PUBLISH_EXAM_RESULTS', 'exams', examId, exam, updated, req);

  res.json({ success: true, message: 'Exam results published successfully', data: updated });
});

/**
 * GET /api/exams/:id/report-cards/:studentId - Comprehensive Report Card View
 */
router.get('/:id/report-cards/:studentId', (req, res) => {
  const examId = Number(req.params.id);
  const studentId = Number(req.params.studentId);

  const exam = queryOne('SELECT * FROM exams WHERE school_id = ? AND id = ?', [req.schoolId, examId]);
  if (!exam) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
  }

  const student = queryOne(`
    SELECT
      s.*,
      c.name as class_name,
      c.id as class_id,
      sec.name as section_name,
      e.roll_no,
      sess.name as session_name,
      sch.name as school_name,
      sch.affiliation_number,
      sch.udise_code,
      sch.address as school_address,
      sch.phone as school_phone
    FROM students s
    JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
    JOIN classes c ON e.class_id = c.id
    JOIN sections sec ON e.section_id = sec.id
    JOIN academic_sessions sess ON e.session_id = sess.id
    JOIN schools sch ON s.school_id = sch.id
    WHERE s.school_id = ? AND s.id = ?
  `, [req.schoolId, studentId]);

  if (!student) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
  }

  // Get marks for all scheduled subjects for this class
  const marksRows = query(`
    SELECT
      es.id as exam_subject_id,
      es.max_marks,
      es.passing_marks,
      sub.name as subject_name,
      sub.code as subject_code,
      sub.type as subject_type,
      m.marks_obtained,
      m.is_absent,
      m.grade,
      m.remarks
    FROM exam_subjects es
    JOIN subjects sub ON es.subject_id = sub.id
    LEFT JOIN marks m ON es.id = m.exam_subject_id AND m.student_id = ?
    WHERE es.exam_id = ? AND es.class_id = ?
    ORDER BY sub.name ASC
  `, [studentId, examId, student.class_id]);

  let totalMaxMarks = 0;
  let totalMarksObtained = 0;
  let allPassed = true;

  const subjectsResult = marksRows.map(row => {
    totalMaxMarks += row.max_marks;
    const score = row.is_absent ? 0 : (row.marks_obtained || 0);
    totalMarksObtained += score;

    const isPassed = !row.is_absent && (row.marks_obtained >= row.passing_marks);
    if (!isPassed) allPassed = false;

    const percentage = row.max_marks > 0 ? (score / row.max_marks) * 100 : 0;
    const gradeInfo = row.is_absent ? { grade: 'AB', gradePoint: 0.0, remark: 'Absent' } : calculateGrade(percentage);

    return {
      ...row,
      marksObtained: row.is_absent ? 'AB' : row.marks_obtained,
      percentage: Number(percentage.toFixed(1)),
      grade: gradeInfo.grade,
      gradePoint: gradeInfo.gradePoint,
      remark: gradeInfo.remark,
      status: isPassed ? 'Pass' : 'Fail'
    };
  });

  const overallPercentage = totalMaxMarks > 0 ? ((totalMarksObtained / totalMaxMarks) * 100) : 0;
  const overallGrade = calculateGrade(overallPercentage);
  const division = calculateDivision(overallPercentage, allPassed);

  // Term attendance percentage
  const attStats = queryOne(`
    SELECT
      COUNT(*) as total_days,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days
    FROM attendance
    WHERE school_id = ? AND student_id = ? AND attendance_date >= ? AND attendance_date <= ?
  `, [req.schoolId, studentId, exam.start_date, exam.end_date]);

  const attDays = attStats?.total_days || 0;
  const attPresent = attStats?.present_days || 0;
  const attendanceRate = attDays > 0 ? Math.round((attPresent / attDays) * 100) : 100;

  res.json({
    success: true,
    data: {
      exam: {
        id: exam.id,
        name: exam.name,
        status: exam.status,
        publishedAt: exam.published_at
      },
      student,
      subjects: subjectsResult,
      summary: {
        totalMaxMarks,
        totalMarksObtained,
        percentage: Number(overallPercentage.toFixed(2)),
        overallGrade: overallGrade.grade,
        overallGradePoint: overallGrade.gradePoint,
        division,
        resultStatus: allPassed ? 'QUALIFIED / PASSED' : 'ESSENTIAL REPEAT',
        termAttendanceRate: `${attendanceRate}%`
      }
    }
  });
});

module.exports = router;
