const { defineConfig } = require('vitest/config');
const path = require('path');
const fs = require('fs');

// Audit trail: timestamped report directory, never overwrites previous runs
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const reportDir = path.resolve(__dirname, 'test-reports', timestamp);
fs.mkdirSync(reportDir, { recursive: true });

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.js'],

    // ── Persistent Audit Trail ────────────────────────────────
    // Each run writes into test-reports/<timestamp>/, never overwritten.
    reporters: [
      // 1. Terminal (live)
      'default',

      // 2. JUnit XML — standard CI/CD format, machine-auditable
      ['junit', { outputFile: path.join(reportDir, 'junit.xml') }],

      // 3. JSON — full structured output for programmatic audit
      ['json', { outputFile: path.join(reportDir, 'results.json') }],

      // 4. HTML — browsable human-readable report
      ['html', { outputFile: path.join(reportDir, 'index.html') }],
    ],
  },
});
