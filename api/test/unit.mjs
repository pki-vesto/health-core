// Offline unit-test aggregator. Runs every fixture-based test module in one
// process (no live server needed) and exits non-zero if any assertion failed.
//
//   docker run --rm -v "$HOME/health-core":/work -w /work/api \
//     health-core-api:latest node test/unit.mjs
//
// Each module exports run() → number of failures.
import { run as intelligence } from './intelligence.test.mjs';
import { run as intelligenceGolden } from './intelligence-golden.test.mjs';
import { run as healthOs } from './health-os.test.mjs';
import { run as platform } from './platform.test.mjs';
import { run as migration } from './migration.test.mjs';
import { run as appleHealth } from './apple-health.test.mjs';
import { run as lab } from './lab.test.mjs';
import { run as math } from './math.test.mjs';
import { run as precedence } from './precedence.test.mjs';
import { run as decisionSupport } from './decision-support.test.mjs';
import { run as track } from './track.test.mjs';
import { run as milestones } from './milestones.test.mjs';
import { run as exportBackup } from './export-backup.test.mjs';

const SUITES = [
  ['intelligence', intelligence],
  ['intelligence-golden', intelligenceGolden],
  ['health-os', healthOs],
  ['platform', platform],
  ['migration', migration],
  ['apple-health', appleHealth],
  ['lab', lab],
  ['math', math],
  ['precedence', precedence],
  ['decision-support', decisionSupport],
  ['track', track],
  ['milestones', milestones],
  ['export-backup', exportBackup]
];

let total = 0;
for (const [name, run] of SUITES) {
  try {
    total += run();
  } catch (e) {
    total += 1;
    console.error(`  ✗ suite '${name}' threw — ${e.stack || e.message}`);
  }
}

console.log(`\n=== unit total: ${total} failed across ${SUITES.length} suite(s) ===`);
process.exit(total ? 1 : 0);
