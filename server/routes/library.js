const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireSchool } = require('../middleware/tenantMiddleware');
const { query, queryOne, run, transaction } = require('../config/database');
const { logAudit } = require('../services/auditService');

router.use(requireAuth, requireSchool);

/**
 * GET /api/library/books
 */
router.get('/books', (req, res) => {
  const { category, search } = req.query;

  let whereClauses = ['school_id = ?'];
  let params = [req.schoolId];

  if (category) {
    whereClauses.push('category = ?');
    params.push(category);
  }

  if (search) {
    whereClauses.push('(title LIKE ? OR author LIKE ? OR isbn LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const whereSql = whereClauses.join(' AND ');
  const books = query(`SELECT * FROM books WHERE ${whereSql} ORDER BY title ASC`, params);

  res.json({ success: true, data: books });
});

/**
 * POST /api/library/books
 */
router.post('/books', requireRole(['admin', 'principal', 'librarian']), (req, res) => {
  const { isbn, title, author, category, totalCopies = 1, rackNumber } = req.body;

  if (!title || !author || !category) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'title, author, and category are required' }
    });
  }

  const copies = Number(totalCopies) || 1;
  run(`
    INSERT INTO books (school_id, isbn, title, author, category, total_copies, available_copies, rack_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    req.schoolId, isbn || null, title, author, category, copies, copies, rackNumber || null
  ]);

  const created = queryOne('SELECT * FROM books WHERE school_id = ? ORDER BY id DESC LIMIT 1', [req.schoolId]);
  logAudit(req.schoolId, req.user.id, 'ADD_BOOK', 'books', created.id, null, created, req);

  res.status(201).json({ success: true, data: created });
});

/**
 * POST /api/library/issue - Check out book with copy decrement
 */
router.post('/issue', requireRole(['admin', 'librarian']), (req, res) => {
  const { bookId, studentId, staffId, dueDate } = req.body;

  if (!bookId || (!studentId && !staffId) || !dueDate) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'bookId, borrower (studentId or staffId), and dueDate are required' }
    });
  }

  const book = queryOne('SELECT * FROM books WHERE school_id = ? AND id = ?', [req.schoolId, bookId]);
  if (!book) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Book not found' } });
  }

  if (book.available_copies <= 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'OUT_OF_STOCK', message: 'All copies of this book are currently checked out' }
    });
  }

  let issueRecord = null;
  transaction(() => {
    run('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [bookId]);

    run(`
      INSERT INTO book_issues (school_id, book_id, student_id, staff_id, issue_date, due_date, status)
      VALUES (?, ?, ?, ?, CURRENT_DATE, ?, 'issued')
    `, [req.schoolId, bookId, studentId || null, staffId || null, dueDate]);

    issueRecord = queryOne('SELECT * FROM book_issues WHERE school_id = ? ORDER BY id DESC LIMIT 1', [req.schoolId]);
  });

  logAudit(req.schoolId, req.user.id, 'ISSUE_BOOK', 'book_issues', issueRecord.id, null, issueRecord, req);

  res.status(201).json({ success: true, data: issueRecord });
});

/**
 * POST /api/library/return - Return book with copy increment and fine calculation
 */
router.post('/return', requireRole(['admin', 'librarian']), (req, res) => {
  const { issueId } = req.body;

  if (!issueId) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'issueId is required' } });
  }

  const issue = queryOne('SELECT * FROM book_issues WHERE school_id = ? AND id = ?', [req.schoolId, issueId]);
  if (!issue) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Issue record not found' } });
  }

  if (issue.status === 'returned') {
    return res.status(400).json({ success: false, error: { code: 'ALREADY_RETURNED', message: 'Book has already been returned' } });
  }

  const today = new Date().toISOString().split('T')[0];
  const due = new Date(issue.due_date);
  const now = new Date(today);
  const diffDays = Math.max(0, Math.ceil((now - due) / (1000 * 60 * 60 * 24)));
  const fine = diffDays * 5.0; // ₹5 per day late fine

  transaction(() => {
    run('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [issue.book_id]);

    run(`
      UPDATE book_issues
      SET return_date = CURRENT_DATE, fine_amount = ?, status = 'returned'
      WHERE id = ?
    `, [fine, issueId]);
  });

  const updated = queryOne('SELECT * FROM book_issues WHERE id = ?', [issueId]);
  logAudit(req.schoolId, req.user.id, 'RETURN_BOOK', 'book_issues', issueId, issue, updated, req);

  res.json({ success: true, data: updated, fineAmount: fine });
});

module.exports = router;
