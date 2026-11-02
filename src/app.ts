const help = `Usage: hertz-contact-calc --geometry cylinder|sphere --force F --d1 D [options]

Hertz contact stress calculator (external convex contact).
  --geometry TYPE  cylinder or sphere (required)
  --force F        Normal force in N (required, positive)
  --d1 D           Body 1 diameter in mm (required, positive)
  --d2 D           Body 2 diameter in mm (omit or 0 for a flat plate)
  --length L       Contact length in mm (required for cylinder)
  --e1 E, --e2 E   Elastic moduli in MPa (default: 210000)
  --nu1 V, --nu2 V Poisson ratios, 0 < V < 0.5 (default: 0.3)
  --allow S        Allowable peak pressure in MPa; report PASS/FAIL
  --json           Output JSON instead of a table
  --help           Show this help
`;

export function main(args: string[], stdout: { write(text: string): unknown }): void {
  if (args.includes('--help')) {
    stdout.write(help);
    return;
  }
  const numeric = new Set(['force', 'd1', 'd2', 'length', 'e1', 'e2', 'nu1', 'nu2', 'allow']);
  const options = new Map<string, string>();
  let json = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') {
      if (json) throw new Error('Duplicate option: --json');
      json = true;
      continue;
    }
    const key = arg.startsWith('--') ? arg.slice(2) : '';
    if (key !== 'geometry' && !numeric.has(key)) throw new Error(`Unknown option: ${arg}`);
    if (options.has(key)) throw new Error(`Duplicate option: ${arg}`);
    const value = args[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    options.set(key, value);
  }
  const geometry = options.get('geometry');
  if (geometry !== 'cylinder' && geometry !== 'sphere') throw new Error('--geometry must be cylinder or sphere');
  function number(key: string, fallback?: number): number {
    const raw = options.get(key);
    if (raw === undefined && fallback === undefined) throw new Error(`--${key} is required`);
    const value = raw === undefined ? fallback! : Number(raw);
    if ((raw !== undefined && raw.trim() === '') || !Number.isFinite(value) || (key === 'd2' ? value < 0 : value <= 0)) {
      throw new Error(`--${key} must be a finite ${key === 'd2' ? 'nonnegative' : 'positive'} number`);
    }
    if ((key === 'nu1' || key === 'nu2') && value >= 0.5) throw new Error(`--${key} must satisfy 0 < nu < 0.5`);
    return value;
  }
  const force = number('force');
  const d1 = number('d1');
  const d2 = number('d2', 0);
  const e1 = number('e1', 210000);
  const e2 = number('e2', 210000);
  const nu1 = number('nu1', 0.3);
  const nu2 = number('nu2', 0.3);
  const length = geometry === 'cylinder' ? number('length') : options.has('length') ? number('length') : undefined;
  const allow = options.has('allow') ? number('allow') : undefined;
  const compliance = (1 - nu1 ** 2) / e1 + (1 - nu2 ** 2) / e2;
  const curvature = 1 / d1 + (d2 === 0 ? 0 : 1 / d2);
  const result: Record<string, string | number> = { geometry };
  const rows: [string, string | number][] = [['Geometry', geometry]];
  let pmax: number;
  let shear: number;
  let depth: number;
  if (geometry === 'cylinder') {
    const b = Math.sqrt(2 * force / (Math.PI * length!) * compliance / curvature);
    pmax = 2 * force / (Math.PI * b * length!);
    shear = 0.30 * pmax;
    depth = 0.786 * b;
    Object.assign(result, { halfWidthMm: b, contactWidthMm: 2 * b });
    rows.push(['Half-width b (mm)', b], ['Contact width 2b (mm)', 2 * b]);
  } else {
    const a = Math.cbrt(3 * force / 8 * compliance / curvature);
    pmax = 3 * force / (2 * Math.PI * a ** 2);
    shear = 0.31 * pmax;
    depth = 0.48 * a;
    result.radiusMm = a;
    rows.push(['Contact radius a (mm)', a]);
  }
  Object.assign(result, { pmaxMPa: pmax, maxShearMPa: shear, shearDepthMm: depth });
  rows.push(['Peak pressure (MPa)', pmax], ['Approx. max shear (MPa)', shear], ['Approx. shear depth (mm)', depth]);
  if (allow !== undefined) {
    const utilisation = pmax / allow;
    const status = pmax <= allow ? 'PASS' : 'FAIL';
    Object.assign(result, { allowableMPa: allow, utilisation, status });
    rows.push(['Allowable pressure (MPa)', allow], ['Utilisation', utilisation], ['Status', status]);
  }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'number' && (!Number.isFinite(value) || value <= 0)) {
      throw new Error(`Inputs exceed the supported numerical range (${key})`);
    }
  }
  if (json) stdout.write(JSON.stringify(result, null, 2) + '\n');
  else stdout.write(rows.map(([label, value]) => `${label.padEnd(28)} ${typeof value === 'number' ? value.toFixed(4) : value}`).join('\n') + '\n');
}

