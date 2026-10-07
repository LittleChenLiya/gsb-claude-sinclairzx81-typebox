# Strict Enum Deduplication — Local Acceptance

Scope: strict dedup mode for enum schema construction.

- `Type.StrictEnum(values | tsEnum, options?)` (new): compares constant values
  by **actual runtime type**, so the number `1` and the string `'1'` are
  distinct members. Invalid (non string/number) values or duplicate values
  throw `StrictEnumValuesError` **before** any schema is created (no half
  schema is returned). The error lists every duplicate together with its
  sources (array index, or TypeScript enum member name + index).
- `Type.Enum(...)` (original interface): output is unchanged — duplicates and
  aliased members are preserved exactly as before.

Source changes:

- `src/type/engine/enum/enum_strict_values.ts` — type-level strict tuple,
  source collection, same-type value comparison, `StrictEnumValuesError`.
- `src/type/engine/enum/index.ts` — exports the helper module.
- `src/type/types/enum.ts` — `StrictEnum` factory (returns `TEnum`).
- `src/typebox.ts` — exports `StrictEnum` on the `Type` namespace.
- Tests: `test/typebox/runtime/type/types/enum.ts` (construction, sources,
  no-half-schema, default-interface regression) and
  `test/typebox/runtime/value/check/enum.ts` (`Value.Check` discrimination).

## Environment

Native Node.js v24 (`--experimental-transform-types`) is used for this local
fixture because the repository test suite targets Deno. The fixture emulates
only the `Deno.test(name, fn)` registration surface; test files themselves are
unmodified. `TEMP`/`TMP`/`NODE_COMPILE_CACHE` point into this folder, so no
C-drive task data and no Docker/network are used.

## Test entry

From the repository root:

```sh
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File .acceptance/run.ps1

# or plain Node from the worktree root
set TEMP=%CD%\.acceptance\tmp
set TMP=%CD%\.acceptance\tmp
set NODE_COMPILE_CACHE=%CD%\.acceptance\compile-cache
node --experimental-transform-types --import ./.acceptance/harness/register.ts ^
  .acceptance/harness/run.ts ^
  test/typebox/runtime/type/types/enum.ts ^
  test/typebox/runtime/value/check/enum.ts
node --experimental-transform-types .acceptance/enum_strict_demo.ts
```

The canonical (Deno) entry for the same test files is `deno task test`.

## Actual result

Focused tests: **20 passed, 0 failed** (see `focused-test-results.txt`).
The 39 tests in the other enum-related suites (action/extends/clean/convert/
create/default/repair) also pass unchanged.

Scenario demonstration output is saved in `results.txt`; key expectations:

| Scenario | Expectation | Result |
| --- | --- | --- |
| `StrictEnum([1, '1'])` domain | `[1,"1"]` | `{"enum":[1,"1"]}` |
| `Value.Check(T, 1)` / `(T, '1')` | `true` / `true` | `true` / `true` |
| `Value.Check(T, 2)` | `false` | `false` |
| `StrictEnum([1, 2, 1])` | throw, sources `[2]` ↔ `[0]` | thrown as expected |
| `StrictEnum(['a','a'])` | throw, sources `[1]` ↔ `[0]` | thrown as expected |
| `enum { A = 1, B = 1 }` via StrictEnum | throw, sources `B ([1])` ↔ `A ([0])` | thrown as expected |
| `enum { Foo, Bar = 'bar' }` via StrictEnum | domain `[0,"bar"]`; `0`/`bar` ok, `Foo` fail | matches |
| `StrictEnum([1, {}])` | throw, caller variable untouched (`no-schema`) | matches |
| default `Enum([1, 1, '1'])` regression | `[1,1,"1"]` | `[1,1,"1"]` |
| default `Enum(Alias)` regression | `[1,1]` | `[1,1]` |

## Static types

Type-level checks use a small, D-drive-local `typescript` install (npm cache
redirected via `NPM_CONFIG_CACHE`):

```sh
set NPM_CONFIG_CACHE=%CD%\.acceptance\npm-cache
npm install --no-save --prefix .acceptance typescript@5.9.2 @types/node@22
.\.acceptance\node_modules\.bin\tsc -p .acceptance/tsconfig.src.json     # changed sources
.\.acceptance\node_modules\.bin\tsc -p .acceptance/tsconfig.static.json # repo static enum tests
.\.acceptance\node_modules\.bin\tsc -p .acceptance/tsconfig.check.json  # strict-tuple fixture
```

All three report no errors: duplicates collapse at the type level, `1` and
`'1'` stay distinct, and strict output for TS enums matches `Enum` output.
