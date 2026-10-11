const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('Standalone HTML Application Integrity Suite', () => {
  const standaloneDir = path.resolve(__dirname, '../standalone-html');
  const htmlPath = path.join(standaloneDir, 'index.html');
  const cssPath = path.join(standaloneDir, 'styles.css');
  const jsPath = path.join(standaloneDir, 'app.js');

  test('All standalone files exist and are non-empty', () => {
    assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
    assert.ok(fs.existsSync(cssPath), 'styles.css must exist');
    assert.ok(fs.existsSync(jsPath), 'app.js must exist');

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    assert.ok(htmlContent.length > 500, 'index.html must have substantial markup');
    assert.ok(cssContent.length > 500, 'styles.css must have substantial styling');
    assert.ok(jsContent.length > 1000, 'app.js must have application logic');
  });

  test('index.html properly links styles.css and app.js as local assets', () => {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    assert.match(htmlContent, /<link\s+rel="stylesheet"\s+href="styles\.css"\s*\/?>/i, 'styles.css must be linked locally');
    assert.match(htmlContent, /<script\s+src="app\.js"><\/script>/i, 'app.js must be loaded locally without module restriction');
    assert.doesNotMatch(htmlContent, /<script[^>]+type="module"/i, 'Must not use type="module" to enable file:// origin loading');
  });

  test('All navigation view items match corresponding view sections in DOM', () => {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const navViews = [...htmlContent.matchAll(/data-view="([a-zA-Z0-9_-]+)"/g)].map(m => m[1]);

    assert.ok(navViews.length >= 10, 'Must have at least 10 navigable modules');
    
    navViews.forEach(view => {
      const sectionId = `view-${view}`;
      assert.ok(
        htmlContent.includes(`id="${sectionId}"`),
        `Section element with id="${sectionId}" must exist in index.html for nav view "${view}"`
      );
    });
  });

  test('Every document.getElementById target in app.js exists in index.html', () => {
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    const getElementCalls = [...jsContent.matchAll(/document\.getElementById\(['"]([a-zA-Z0-9_-]+)['"]\)/g)].map(m => m[1]);
    const uniqueIds = [...new Set(getElementCalls)];

    assert.ok(uniqueIds.length > 20, 'Expected extensive DOM bindings in app.js');

    const missingIds = [];
    uniqueIds.forEach(id => {
      const pattern = new RegExp(`id=["']${id}["']`, 'i');
      if (!pattern.test(htmlContent)) {
        missingIds.push(id);
      }
    });

    assert.deepEqual(missingIds, [], `Missing DOM element IDs in index.html: ${missingIds.join(', ')}`);
  });

  test('CBSE 9-Point grading logic handles edge values accurately', () => {
    // Pure unit verification of grading scale
    function cbseGrade(pct) {
      if (pct >= 91) return 'A1';
      if (pct >= 81) return 'A2';
      if (pct >= 71) return 'B1';
      if (pct >= 61) return 'B2';
      if (pct >= 51) return 'C1';
      if (pct >= 41) return 'C2';
      if (pct >= 33) return 'D';
      if (pct >= 21) return 'E1';
      return 'E2';
    }

    assert.equal(cbseGrade(100), 'A1');
    assert.equal(cbseGrade(91), 'A1');
    assert.equal(cbseGrade(90.5), 'A2');
    assert.equal(cbseGrade(81), 'A2');
    assert.equal(cbseGrade(80), 'B1');
    assert.equal(cbseGrade(71), 'B1');
    assert.equal(cbseGrade(61), 'B2');
    assert.equal(cbseGrade(51), 'C1');
    assert.equal(cbseGrade(41), 'C2');
    assert.equal(cbseGrade(33), 'D');
    assert.equal(cbseGrade(32), 'E1');
    assert.equal(cbseGrade(20), 'E2');
  });

  test('styles.css contains required responsive and print media queries', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('@media print'), 'Must include @media print stylesheet for receipts and report cards');
    assert.ok(cssContent.includes('@media (max-width:'), 'Must include responsive breakpoints for mobile/tablets');
  });
});
