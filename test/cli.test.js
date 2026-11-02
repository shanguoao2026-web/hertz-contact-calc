import test from 'node:test';
import assert from 'node:assert/strict';
import { main } from '../dist/app.js';

function run(...args) {
  let stdout = '';
  try {
    main(args, { write(text) { stdout += text; } });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    return { status: 1, stdout, stderr: `Error: ${error.message}\n` };
  }
}
function calculate(geometry, ...extra) {
  const output = run('--geometry', geometry, '--force', '1000', '--d1', '20', '--json', ...extra);
  assert.equal(output.status, 0, output.stderr);
  return JSON.parse(output.stdout);
}
function near(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
}
for (const [geometry, d2, size, pressure] of [
  ['cylinder', '0', 0.1050, 606.0],
  ['cylinder', '40', 0.0858, 742.2],
  ['sphere', '0', 0.4021, 2953.5],
  ['sphere', '40', 0.3512, 3870.1],
]) {
  test(`${geometry}, d2=${d2}: reference contact stress`, () => {
    const result = calculate(geometry, '--d2', d2, ...(geometry === 'cylinder' ? ['--length', '10'] : []));
    near(result.halfWidthMm ?? result.radiusMm, size, 0.00005);
    near(result.pmaxMPa, pressure, 0.1);
    near(result.maxShearMPa, result.pmaxMPa * (geometry === 'cylinder' ? 0.30 : 0.31), 1e-10);
    near(result.shearDepthMm, (result.halfWidthMm ?? result.radiusMm) * (geometry === 'cylinder' ? 0.786 : 0.48), 1e-10);
    if (geometry === 'cylinder') assert.equal(result.contactWidthMm, 2 * result.halfWidthMm);
  });
}
test('omitted d2 means flat plate and defaults equal explicit materials', () => {
  assert.deepEqual(calculate('sphere'), calculate('sphere', '--d2', '0', '--e1', '210000', '--e2', '210000', '--nu1', '0.3', '--nu2', '0.3'));
});
test('custom materials affect pressure', () => {
  const standard = calculate('sphere');
  const soft = calculate('sphere', '--e1', '100000', '--e2', '100000');
  assert.ok(soft.radiusMm > standard.radiusMm);
  assert.ok(soft.pmaxMPa < standard.pmaxMPa);
});
test('allowable pressure reports pass, fail, and equality', () => {
  for (const [allow, expected] of [['4000', 'PASS'], ['2000', 'FAIL']]) {
    const result = calculate('sphere', '--allow', allow);
    assert.equal(result.status, expected);
    assert.equal(result.utilisation, result.pmaxMPa / Number(allow));
  }
  assert.equal(calculate('sphere', '--allow', String(calculate('sphere').pmaxMPa)).status, 'PASS');
});
test('table output and help', () => {
  const output = run('--geometry', 'cylinder', '--force', '1000', '--d1', '20', '--length', '10', '--allow', '700');
  assert.equal(output.status, 0);
  for (const text of ['Half-width', 'Contact width', 'Peak pressure', 'max shear', 'depth', 'Utilisation', 'PASS']) assert.ok(output.stdout.includes(text));
  assert.equal(run('--help').status, 0);
  assert.match(run('--help').stdout, /Usage:/);
});
for (const args of [
  [], ['--geometry', 'cone'],
  ['--geometry', 'cylinder', '--force', '1000', '--d1', '20'],
  ...['force', 'd1', 'd2', 'e1', 'e2', 'length', 'allow', 'nu1', 'nu2'].flatMap(key =>
    ['NaN', 'Infinity', '-1', ...(key === 'd2' ? [] : ['0'])].map(value =>
      ['--geometry', 'sphere', ...['force', 'd1'].filter(k => k !== key).flatMap(k => [`--${k}`, '20']), `--${key}`, value])),
  ...['0.5', '0.6'].flatMap(value => ['nu1', 'nu2'].map(key => ['--geometry', 'sphere', '--force', '1000', '--d1', '20', `--${key}`, value])),
  ['--geometry', 'sphere', '--force'], ['--wat'], ['--geometry', 'sphere', '--geometry', 'sphere'],
]) {
  test(`reject invalid input ${args.join(' ')}`, () => {
    const output = run(...args);
    assert.equal(output.status, 1);
    assert.match(output.stderr, /^Error:/);
    assert.equal(output.stdout, '');
  });
}
