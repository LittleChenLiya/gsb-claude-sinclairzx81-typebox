// ------------------------------------------------------------------
// Node local command support.
//
// The examples import the library through bare "typebox/*" specifiers
// (the same mapping Deno uses in deno.jsonc). Node has no import map
// flag, so this file registers a small resolve hook that points those
// specifiers at the TypeScript sources in ../../src. Nothing is
// downloaded or installed.
//
// Usage:
//   node --experimental-transform-types --import ./node-local.mjs index.ts
// or:
//   npm start
// ------------------------------------------------------------------
import { register } from 'node:module'

const specifiers = {
  'typebox': '../../src/index.ts',
  'typebox/compile': '../../src/compile/index.ts',
  'typebox/error': '../../src/error/index.ts',
  'typebox/format': '../../src/format/index.ts',
  'typebox/guard': '../../src/guard/index.ts',
  'typebox/schema': '../../src/schema/index.ts',
  'typebox/system': '../../src/system/index.ts',
  'typebox/value': '../../src/value/index.ts',
  'typebox/type': '../../src/type/index.ts'
}

// Inline data URL hook: keeps the mapping in this single file and
// avoids a second module in the loader worker thread.
const source = `
const specifiers = ${JSON.stringify(specifiers)}
export async function resolve(specifier, context, nextResolve) {
  const relative = specifiers[specifier]
  if (relative) return nextResolve(new URL(relative, context.parentURL).href, context)
  return nextResolve(specifier, context)
}
`
register(`data:text/javascript,${encodeURIComponent(source)}`)
