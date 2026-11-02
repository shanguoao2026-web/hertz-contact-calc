# hertz-contact-calc

Build a small TypeScript Node CLI (Node 18+, no runtime deps; devDeps typescript + @types/node only; tests with node:test) for Hertz contact stress.

Features:
- --geometry cylinder|sphere (required). --force F (N), --d1 (mm, body 1 diameter), optional --d2 (mm; omit or 0 = flat plate), --length L (mm, required for cylinder).
- Materials: --e1 --e2 (MPa, default 210000), --nu1 --nu2 (default 0.3).
- Cylinder (Shigley): b = sqrt( 2F/(πL) · [(1-ν1²)/E1 + (1-ν2²)/E2] / (1/d1 + 1/d2) ), pmax = 2F/(π b L). Output half-width b (mm), contact width 2b, pmax (MPa), max shear ≈ 0.30·pmax at depth ≈ 0.786·b.
- Sphere: a = cbrt( 3F/8 · [(1-ν1²)/E1 + (1-ν2²)/E2] / (1/d1 + 1/d2) ), pmax = 3F/(2π a²). Output radius a, pmax, max shear ≈ 0.31·pmax at depth ≈ 0.48·a.
- Optional --allow S (MPa): print PASS/FAIL and utilisation pmax/S.
- Validate finite positive numbers, 0<ν<0.5; errors to stderr with exit 1.
- Table output by default, --json, --help. README with examples, MIT LICENSE (author shanguoao2026-web), .gitignore with node_modules/ dist/ *.log.
- npm test must build and pass. No secrets, no personal info.

Check values (steel defaults, F 1000 N, must be in tests):
- cylinder d1 20 on flat, L 10 → b 0.1050 mm, pmax 606.0 MPa.
- cylinder d1 20, d2 40, L 10 → b 0.0858 mm, pmax 742.2 MPa.
- sphere d1 20 on flat → a 0.4021 mm, pmax 2953.5 MPa.
- sphere d1 20, d2 40 → a 0.3512 mm, pmax 3870.1 MPa.
- cylinder without --length → exit 1; --nu1 0.6 → exit 1.
