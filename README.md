# Hertz contact stress calculator

A TypeScript CLI for external cylinder and sphere contact, using N, mm and
MPa (N/mm²). Requires Node.js 18 or newer. No runtime dependencies.

```sh
npm install
npm test
npm run build
node dist/cli.js --help
```

Examples:

```sh
# Cylinder on a flat plate; default steel materials
node dist/cli.js --geometry cylinder --force 1000 --d1 20 --length 10
# Two cylinders with an allowable peak pressure
node dist/cli.js --geometry cylinder --force 1000 --d1 20 --d2 40 --length 10 --allow 800
# Sphere on a flat plate, JSON output
node dist/cli.js --geometry sphere --force 1000 --d1 20 --json
# Two spheres with custom materials
node dist/cli.js --geometry sphere --force 1000 --d1 20 --d2 40 --e1 210000 --e2 70000 --nu1 0.3 --nu2 0.33
```

`--geometry`, `--force`, and `--d1` are required. Cylinders also require
`--length`. Omit `--d2` or set it to zero for a flat plate. Elastic moduli
`--e1` and `--e2` default to 210000 MPa, and Poisson ratios `--nu1` and
`--nu2` default to 0.3. All numeric inputs must be finite and positive,
except `d2`, which may be zero; Poisson ratios must lie strictly between
zero and 0.5. Invalid input prints an error to stderr and exits with code 1.

With compliance C = (1−ν1²)/E1 + (1−ν2²)/E2 and curvature
K = 1/d1 + 1/d2 (the flat plate contributes zero):

- Cylinder: b = √(2F C / (π L K)), pmax = 2F / (π b L).
  Reports half-width b, full width 2b, approximate maximum shear 0.30 pmax
  and its approximate depth 0.786 b.
- Sphere: a = ∛(3F C / (8 K)), pmax = 3F / (2π a²).
  Reports radius a, approximate maximum shear 0.31 pmax and its
  approximate depth 0.48 a.

The default output is a table. `--json` emits full precision numeric fields
with units in their names: `halfWidthMm` and `contactWidthMm` for cylinders,
`radiusMm` for spheres, plus `pmaxMPa`, `maxShearMPa`, and `shearDepthMm`.
`--allow S` adds `allowableMPa`, `utilisation` (pmax/S), and `status`:
PASS when pmax ≤ S, otherwise FAIL. Both outcomes exit successfully;
only invalid input or a numerical range error exits with code 1.

The equations assume elastic Hertz contact with convex bodies and small
contact regions. Shear estimates are approximate. Allowable pressure is
supplied by the user.

Licensed under MIT; see LICENSE.
