// Node local acceptance for Compile.Manifest. Run with:
// node --experimental-transform-types test/node/manifest.ts
import * as assert from 'node:assert/strict'
import Compile, { Manifest, ManifestConflictError, ManifestReferenceError, ManifestSealedError } from '../../src/compile/index.ts'
import Type from '../../src/index.ts'

let passed = 0
function test(name: string, callback: () => void): void {
  callback()
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}
// ------------------------------------------------------------------
// Acceptance: two schemas recursive binding succeeds
// ------------------------------------------------------------------
test('two schemas recursive binding succeeds', () => {
  const A = Type.Object({ b: Type.Optional(Type.Ref('node:b')) }, { $id: 'node:a' })
  const B = Type.Object({ a: Type.Optional(Type.Ref('node:a')) }, { $id: 'node:b' })
  const manifest = new Manifest()
  manifest.Add(A).Add(B)
  const validator = manifest.Compile('node:a')
  assert.equal(manifest.IsSealed(), true)
  assert.equal(validator.Check({ b: { a: { b: { a: {} } } } }), true)
  assert.equal(validator.Check({ b: { a: { b: 1 } } }), false)
})
// ------------------------------------------------------------------
// Acceptance: duplicate $id with different content is rejected
// ------------------------------------------------------------------
test('duplicate $id with different content is rejected', () => {
  const manifest = new Manifest()
  manifest.Add(Type.String({ $id: 'node:dup' }))
  assert.throws(() => manifest.Add(Type.Number({ $id: 'node:dup' })), ManifestConflictError)
  manifest.Add(Type.String({ $id: 'node:dup' })) // identical content is a no-op
  assert.deepEqual(manifest.Ids(), ['node:dup'])
})
// ------------------------------------------------------------------
// Acceptance: old collection is not overwritten by new registrations
// ------------------------------------------------------------------
test('old collection is not overwritten by new registrations', () => {
  const manifest = new Manifest()
  manifest.Add(Type.String({ $id: 'node:keep' }))
  manifest.Compile('node:keep')
  assert.throws(() => manifest.Add(Type.Number({ $id: 'node:keep' })), ManifestSealedError)
  // independent manifests do not share a global cache for the same $id
  const next = new Manifest()
  next.Add(Type.Number({ $id: 'node:keep' }))
  assert.equal(next.Compile('node:keep').Check(1), true)
  assert.equal(manifest.Compile('node:keep').Check('hello'), true)
  assert.equal(manifest.Compile('node:keep').Check(1), false)
})
// ------------------------------------------------------------------
// Acceptance: unknown ref has no validator
// ------------------------------------------------------------------
test('unknown ref has no validator', () => {
  const manifest = new Manifest()
  manifest.Add(Type.Object({ x: Type.Ref('node:missing') }, { $id: 'node:entry' }))
  assert.equal(manifest.TryCompile('node:entry'), undefined)
  assert.throws(() => manifest.Compile('node:entry'), ManifestReferenceError)
  assert.equal(manifest.TryCompile('node:unknown'), undefined)
})
// ------------------------------------------------------------------
// Acceptance: source mutation does not affect the sealed collection
// ------------------------------------------------------------------
test('source mutation does not affect the sealed collection', () => {
  const schema = Type.Object({ x: Type.String() }, { $id: 'node:snapshot' })
  const manifest = new Manifest()
  manifest.Add(schema)
  ;(schema.properties as Record<string, unknown>).x = Type.Number()
  const validator = manifest.Compile('node:snapshot')
  assert.equal(validator.Check({ x: 'hello' }), true)
  assert.equal(validator.Check({ x: 1 }), false)
})
// ------------------------------------------------------------------
// Acceptance: authorized external mapping resolves references
// ------------------------------------------------------------------
test('authorized external mapping resolves references', () => {
  const manifest = new Manifest({ 'node:external': Type.String() })
  manifest.Add(Type.Object({ x: Type.Ref('node:external') }, { $id: 'node:uses-external' }))
  const validator = manifest.Compile('node:uses-external')
  assert.equal(validator.Check({ x: 'hello' }), true)
  assert.equal(validator.Check({ x: 1 }), false)
})
// ------------------------------------------------------------------
// Acceptance: schema index is retained
// ------------------------------------------------------------------
test('schema index is retained', () => {
  const manifest = new Manifest()
  manifest.Add(Type.String({ $id: 'node:index/a' }))
  manifest.Add(Type.Number({ $id: 'node:index/b' }))
  const index = manifest.Index()
  assert.deepEqual(manifest.Ids(), ['node:index/a', 'node:index/b'])
  assert.equal(Type.IsString(index['node:index/a']), true)
  assert.equal(Type.IsNumber(index['node:index/b']), true)
})
// ------------------------------------------------------------------
// Acceptance: default Compile entry is preserved
// ------------------------------------------------------------------
test('default Compile entry is preserved', () => {
  const validator = Compile(Type.String())
  assert.equal(validator.Check('hello'), true)
  assert.equal(validator.Check(1), false)
})
// ------------------------------------------------------------------
// Acceptance: identifiers declared within a schema resolve locally
// ------------------------------------------------------------------
test('identifiers declared within a schema resolve locally', () => {
  const Node = Type.Cyclic({
    Node: Type.Object({
      value: Type.String(),
      next: Type.Optional(Type.Ref('Node'))
    })
  }, 'Node', { $id: 'node:cyclic' })
  const manifest = new Manifest()
  manifest.Add(Node)
  const validator = manifest.Compile('node:cyclic')
  assert.equal(validator.Check({ value: 'a', next: { value: 'b' } }), true)
  assert.equal(validator.Check({ value: 'a', next: { value: 1 } }), false)
})
console.log(`\n${passed} tests passed`)
