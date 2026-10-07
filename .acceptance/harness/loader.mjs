// Minimal ESM resolve hook: maps the deno.jsonc import-map specifiers used by
// the focused test files to the worktree source tree. Everything else is
// delegated to Node's default resolution.
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve as pathResolve } from 'node:path'

const root = pathResolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const aliases = {
  'typebox': 'src/index.ts',
  'typebox/type': 'src/type/index.ts',
  'typebox/value': 'src/value/index.ts',
  'typebox/schema': 'src/schema/index.ts',
  'typebox/compile': 'src/compile/index.ts',
  'typebox/system': 'src/system/index.ts',
  'typebox/guard': 'src/guard/index.ts',
  'typebox/error': 'src/error/index.ts',
  'typebox/format': 'src/format/index.ts',
  'test': 'test/common/index.ts'
}

export async function resolve(specifier, context, nextResolve) {
  if (aliases[specifier] !== undefined) {
    return { url: pathToFileURL(pathResolve(root, aliases[specifier])).href, shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
