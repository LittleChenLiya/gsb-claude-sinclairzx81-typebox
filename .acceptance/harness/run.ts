// Lightweight focused test runner: emulates the Deno.test registration surface
// used by test/common/assert.ts, imports the given test modules, then runs
// every registered test sequentially.
import { pathToFileURL } from 'node:url'

type Entry = { name: string, callback: () => unknown }
const entries: Entry[] = []

;(globalThis as any).Deno = {
  test(name: string, callback: () => unknown) { entries.push({ name, callback }) }
}

for (const file of process.argv.slice(2)) {
  await import(pathToFileURL(file).href)
}

let passed = 0
const failures: { name: string, error: unknown }[] = []
for (const entry of entries) {
  try {
    await entry.callback()
    console.log(`ok   - ${entry.name}`)
    passed++
  } catch (error) {
    console.log(`FAIL - ${entry.name}`)
    failures.push({ name: entry.name, error })
  }
}
for (const failure of failures) {
  console.log(`\n--- ${failure.name}`)
  console.log(failure.error)
}
console.log(`\n${passed} passed, ${failures.length} failed, ${entries.length} total`)
if (failures.length > 0) process.exit(1)
