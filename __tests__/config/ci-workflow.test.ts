// __tests__/config/ci-workflow.test.ts
// Verifies P1-5: a CI workflow exists and wires up the three required gates
// (typecheck, test, lint) as specified by the backlog's acceptance
// criteria. Uses plain text assertions rather than a YAML parser to avoid
// adding a new dependency for one config-structure test — this can't prove
// the workflow runs correctly on GitHub Actions' infrastructure, but it
// guards against someone silently deleting a job or the `npm run` commands
// it depends on drifting out of sync with package.json.

import fs from 'fs';
import path from 'path';

const workflowPath = path.join(__dirname, '../../.github/workflows/ci.yml');
const raw = fs.readFileSync(workflowPath, 'utf-8');
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
);

function jobBlock(jobName: string): string {
  const match = raw.match(new RegExp(`\\n  ${jobName}:[\\s\\S]*?(?=\\n  \\w+:\\n|$)`));
  if (!match) throw new Error(`job "${jobName}" not found in ci.yml`);
  return match[0];
}

describe('CI workflow (P1-5)', () => {
  it('triggers on pull requests and pushes to main', () => {
    expect(raw).toMatch(/pull_request:\s*\n\s*branches:\s*\[main\]/);
    expect(raw).toMatch(/push:\s*\n\s*branches:\s*\[main\]/);
  });

  it('has a typecheck job that runs tsc --noEmit, blocking (no continue-on-error)', () => {
    const job = jobBlock('typecheck');
    expect(job).toMatch(/tsc --noEmit/);
    expect(job).not.toMatch(/continue-on-error/);
  });

  it('has a test job that runs the package.json test:ci script, blocking', () => {
    expect(packageJson.scripts['test:ci']).toBeDefined();
    const job = jobBlock('test');
    expect(job).toMatch(/npm run test:ci/);
    expect(job).not.toMatch(/continue-on-error/);
  });

  it('has a lint job that is explicitly non-blocking pending the known ESLint config fix', () => {
    const job = jobBlock('lint');
    expect(job).toMatch(/npm run lint/);
    expect(job).toMatch(/continue-on-error:\s*true/);
  });
});
