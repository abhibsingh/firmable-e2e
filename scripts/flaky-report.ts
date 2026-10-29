import * as fs from 'fs';
import * as path from 'path';

type PwResult = { status: string; retry: number };
type PwTest = { status: 'expected' | 'unexpected' | 'flaky' | 'skipped'; projectName: string; results: PwResult[] };
type PwSpec = { title: string; file: string; tests: PwTest[] };
type PwSuite = { title: string; suites?: PwSuite[]; specs?: PwSpec[] };
type Row = { runAt: string; id: string; status: PwTest['status']; retries: number };

const [reportPath = 'reports/json/results.json', historyDir = 'flaky-history'] = process.argv.slice(2);
const WINDOW = 30;
const QUARANTINE_RATE = 0.05;
const MIN_RUNS = 10;

function collect(suite: PwSuite, trail: string[], out: Row[], runAt: string) {
  const here = suite.title ? [...trail, suite.title] : trail;
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      out.push({
        runAt,
        id: `[${t.projectName}] ${[...here, spec.title].join(' › ')}`,
        status: t.status,
        retries: Math.max(0, ...t.results.map((r) => r.retry)),
      });
    }
  }
  for (const child of suite.suites ?? []) collect(child, here, out, runAt);
}

function main() {
  if (!fs.existsSync(reportPath)) {
    console.log(`> No report found at ${reportPath}; nothing to analyse.`);
    return;
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as { suites: PwSuite[] };
  const runAt = new Date().toISOString();
  const rows: Row[] = [];
  for (const s of report.suites) collect(s, [], rows, runAt);

  fs.mkdirSync(historyDir, { recursive: true });
  const historyFile = path.join(historyDir, 'history.jsonl');
  fs.appendFileSync(historyFile, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');

  const history: Row[] = fs
    .readFileSync(historyFile, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const byTest = new Map<string, Row[]>();
  for (const r of history) byTest.set(r.id, [...(byTest.get(r.id) ?? []), r]);

  const flakyNow = rows.filter((r) => r.status === 'flaky');
  const stats = [...byTest.entries()]
    .map(([id, runs]) => {
      const recent = runs.slice(-WINDOW).filter((r) => r.status !== 'skipped');
      const flaky = recent.filter((r) => r.status === 'flaky').length;
      const failed = recent.filter((r) => r.status === 'unexpected').length;
      return { id, runs: recent.length, flaky, failed, rate: recent.length ? flaky / recent.length : 0 };
    })
    .filter((s) => s.flaky > 0)
    .sort((a, b) => b.rate - a.rate);

  const totals = {
    passed: rows.filter((r) => r.status === 'expected').length,
    failed: rows.filter((r) => r.status === 'unexpected').length,
    flaky: flakyNow.length,
    skipped: rows.filter((r) => r.status === 'skipped').length,
  };

  console.log(`## E2E results\n`);
  console.log(`| Passed | Failed | Flaky | Skipped |\n|---|---|---|---|\n| ${totals.passed} | ${totals.failed} | ${totals.flaky} | ${totals.skipped} |\n`);

  console.log(`### Flaky in this run (${flakyNow.length})\n`);
  console.log(flakyNow.length ? flakyNow.map((r) => `- ${r.id} (retries: ${r.retries})`).join('\n') : '_None_');

  console.log(`\n### Flake rate, last ${WINDOW} runs\n`);
  if (!stats.length) console.log('_No flaky history._');
  else {
    console.log('| Test | Runs | Flaky | Failed | Flake rate | Action |\n|---|---|---|---|---|---|');
    for (const s of stats) {
      const action = s.runs >= MIN_RUNS && s.rate >= QUARANTINE_RATE ? '**Quarantine + ticket**' : 'Watch';
      console.log(`| ${s.id} | ${s.runs} | ${s.flaky} | ${s.failed} | ${(s.rate * 100).toFixed(1)}% | ${action} |`);
    }
  }
}

main();
