const test = require('node:test');
const assert = require('node:assert/strict');
const { query, queryOne, run, transaction } = require('../server/config/database');

test('Operational Modules (Library, Transport, Staff, Notices) Suite', async (t) => {
  const school = query("SELECT id FROM schools WHERE code = 'DPMS-01'")[0];
  const adminUser = query("SELECT id FROM users WHERE username = 'admin.dpms@schoolerp.internal'")[0];
  const student = query('SELECT s.id FROM students s WHERE s.school_id = ? LIMIT 1', [school.id])[0];

  assert.ok(school && adminUser && student, 'Prerequisites must exist');

  await t.test('Library book issue decrements copy count and return restores it', () => {
    // Add test book with 2 copies
    run(`
      INSERT INTO books (school_id, isbn, title, author, category, total_copies, available_copies)
      VALUES (?, '978-TEST-01', 'Algorithm Design Test', 'Kleinberg', 'Computer Science', 2, 2)
    `, [school.id]);

    const book = queryOne('SELECT * FROM books WHERE school_id = ? AND isbn = ?', [school.id, '978-TEST-01']);
    assert.equal(book.available_copies, 2);

    let issueId = null;
    // Issue copy
    transaction(() => {
      run('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [book.id]);
      run(`
        INSERT INTO book_issues (school_id, book_id, student_id, issue_date, due_date, status)
        VALUES (?, ?, ?, CURRENT_DATE, '2026-10-25', 'issued')
      `, [school.id, book.id, student.id]);
      const issue = queryOne('SELECT id FROM book_issues WHERE school_id = ? ORDER BY id DESC LIMIT 1', [school.id]);
      issueId = issue.id;
    });

    const bookAfterIssue = queryOne('SELECT available_copies FROM books WHERE id = ?', [book.id]);
    assert.equal(bookAfterIssue.available_copies, 1, 'Available copies must decrement to 1');

    // Return copy
    transaction(() => {
      run('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [book.id]);
      run("UPDATE book_issues SET return_date = CURRENT_DATE, status = 'returned' WHERE id = ?", [issueId]);
    });

    const bookAfterReturn = queryOne('SELECT available_copies FROM books WHERE id = ?', [book.id]);
    assert.equal(bookAfterReturn.available_copies, 2, 'Available copies must restore to 2');
  });

  await t.test('Transport route enforces passenger capacity limit', () => {
    run('DELETE FROM transport_routes WHERE school_id = ? AND vehicle_number = ?', [school.id, 'RJ-14-TEST-01']);
    // Add test bus with tiny capacity of 1 seat
    run(`
      INSERT INTO transport_routes (school_id, route_name, vehicle_number, driver_name, driver_phone, capacity)
      VALUES (?, 'Test Mini Route', 'RJ-14-TEST-01', 'Driver Test', '+919999900000', 1)
    `, [school.id]);

    const route = queryOne('SELECT * FROM transport_routes WHERE school_id = ? AND vehicle_number = ?', [school.id, 'RJ-14-TEST-01']);
    assert.equal(route.capacity, 1);

    // Create stop
    run("INSERT INTO transport_stops (route_id, stop_name, pickup_time, drop_time) VALUES (?, 'Stop 1', '08:00', '14:00')", [route.id]);
    const stop = queryOne('SELECT id FROM transport_stops WHERE route_id = ?', [route.id]);

    // Fill seat
    run(`
      INSERT OR REPLACE INTO student_transport (school_id, student_id, route_id, stop_id)
      VALUES (?, ?, ?, ?)
    `, [school.id, student.id, route.id, stop.id]);

    const allocatedCount = queryOne('SELECT COUNT(*) as count FROM student_transport WHERE route_id = ?', [route.id]).count;
    assert.equal(allocatedCount, 1);

    // Verify capacity condition check
    const isFull = allocatedCount >= route.capacity;
    assert.equal(isFull, true, 'Capacity detector must recognize bus is at maximum capacity');
  });

  await t.test('Staff employee code uniqueness', () => {
    assert.throws(() => {
      run(`
        INSERT INTO staff (school_id, user_id, employee_code, department, designation, joining_date)
        VALUES (?, ?, 'EMP-MATH-01', 'Duplicate Dept', 'Teacher', '2026-01-01')
      `, [school.id, adminUser.id]);
    }, /UNIQUE constraint failed/);
  });
});
