# Fix 0% Test Coverage: Migrate from nyc to c8

## Problem

All 321 tests pass but coverage reports 0% across the board:

```
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |       0 |        0 |       0 |       0 |
 index.ts |       0 |        0 |       0 |       0 |
----------|---------|----------|---------|---------|-------------------
```

## Root Cause

The project is an **ESM module** (`"type": "module"` in `package.json`) using `--loader=ts-node/esm` to run TypeScript tests directly. **nyc cannot instrument ESM modules** — it relies on CommonJS `require` hooks that are completely bypassed by the ESM loader.

This is a [known, unresolved issue](https://github.com/istanbuljs/nyc/issues/1544) in nyc. The `.nyc_output` JSON files are empty `{}` because nyc's instrumentation never sees the loaded modules. The only file that appears (`index.ts`) is from the `"all": true` filesystem scan, not from actual execution data.

This same issue likely affects official Salesforce CLI plugins — they have the identical configuration (`nyc mocha` + `loader=ts-node/esm` + `"type": "module"`).

## Configuration Issues

| Issue | Detail |
|-------|--------|
| **nyc + ESM incompatibility** | nyc's require-hook instrumentation doesn't work with ESM loaders — the fundamental blocker |
| **Conflicting loaders in `.mocharc.json`** | Both `"require": ["ts-node/register"]` (CJS) and `"node-option": ["loader=ts-node/esm"]` (ESM) are specified simultaneously |
| **`"all": true` misleading** | Makes nyc scan the filesystem for files to report, but without execution data everything shows 0% |
| **`"include": ["**/*.ts"]` too broad** | Inherited from `@salesforce/dev-config/nyc` — should be scoped to `"src/**/*.ts"` |

## Environment

- **Node.js**: v24.14.0
- **nyc**: 17.1.0
- **mocha**: 10.8.2
- **ts-node**: 10.9.2
- **TypeScript**: ^5.9.3
- **Module system**: ESM (`"module": "Node16"`, `"target": "ES2022"`)

## Recommended Fix: Switch to c8

[c8](https://github.com/bcoe/c8) uses V8's native built-in code coverage (not instrumentation hooks), so it works with ESM out of the box. It produces Istanbul-compatible reports (lcov, text, html).

### Step 1: Install c8

```bash
yarn add -D c8
```

### Step 2: Create `.c8rc.json`

Replace `.nycrc` with `.c8rc.json`:

```json
{
  "check-coverage": true,
  "lines": 90,
  "statements": 90,
  "functions": 90,
  "branches": 90,
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.d.ts", "**/*.test.ts"],
  "reporter": ["lcov", "text"],
  "all": true,
  "src": ["src"]
}
```

### Step 3: Update `package.json` wireit test command

Change the `test:only` wireit command from `nyc` to `c8`:

```diff
  "test:only": {
-   "command": "nyc mocha \"test/**/*.test.ts\"",
+   "command": "c8 mocha \"test/**/*.test.ts\"",
```

### Step 4: Clean up `.mocharc.json`

Remove the redundant CJS hook (not needed in an ESM project):

```diff
  {
-   "require": ["ts-node/register"],
    "watch-extensions": "ts",
    "recursive": true,
    "reporter": "spec",
    "timeout": 600000,
    "node-option": ["loader=ts-node/esm"]
  }
```

### Step 5: Clean up old nyc artifacts

```bash
rm -rf .nyc_output coverage .nycrc
```

## Alternative Approach (if c8 is not viable)

Compile TypeScript to JavaScript first, then run nyc on compiled output with source maps:

1. Ensure `tsc` compiles to `lib/` with source maps enabled
2. Update `.nycrc` to target compiled JS: `"include": ["lib/**/*.js"]`
3. Run tests against compiled JS instead of TS source
4. nyc uses source maps to map coverage back to original `.ts` files

This is more complex and fragile, so **c8 is the recommended path**.

## References

- [istanbuljs/nyc#1544 — ESM support broken](https://github.com/istanbuljs/nyc/issues/1544)
- [istanbuljs/nyc#1530 — 0% coverage with type:module](https://github.com/istanbuljs/nyc/issues/1530)
- [c8 — Native V8 coverage for Node.js](https://github.com/bcoe/c8)
- [@salesforce/dev-config nyc.json](https://github.com/forcedotcom/sfdx-dev-packages/blob/main/packages/dev-config/nyc.json)
