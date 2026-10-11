/**
 * Examination Service with CBSE 9-Point Grading Scale & Division Calculation
 */

function calculateGrade(percentage) {
  const p = Number(percentage);
  if (p >= 91.0) return { grade: 'A1', gradePoint: 10.0, remark: 'Outstanding' };
  if (p >= 81.0) return { grade: 'A2', gradePoint: 9.0, remark: 'Excellent' };
  if (p >= 71.0) return { grade: 'B1', gradePoint: 8.0, remark: 'Very Good' };
  if (p >= 61.0) return { grade: 'B2', gradePoint: 7.0, remark: 'Good' };
  if (p >= 51.0) return { grade: 'C1', gradePoint: 6.0, remark: 'Above Average' };
  if (p >= 41.0) return { grade: 'C2', gradePoint: 5.0, remark: 'Average' };
  if (p >= 33.0) return { grade: 'D', gradePoint: 4.0, remark: 'Pass' };
  if (p >= 21.0) return { grade: 'E1', gradePoint: 0.0, remark: 'Needs Improvement' };
  return { grade: 'E2', gradePoint: 0.0, remark: 'Needs Improvement' };
}

function calculateDivision(percentage, isPassed) {
  if (!isPassed) return 'Essential Repeat';
  const p = Number(percentage);
  if (p >= 75.0) return 'First Division with Distinction';
  if (p >= 60.0) return 'First Division';
  if (p >= 45.0) return 'Second Division';
  return 'Third Division';
}

module.exports = {
  calculateGrade,
  calculateDivision
};
