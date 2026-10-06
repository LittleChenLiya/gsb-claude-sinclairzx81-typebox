import Compile, { Manifest, ManifestConflictError, ManifestReferenceError, ManifestSealedError } from 'typebox/compile'
import { Type } from 'typebox'
import { Assert } from 'test'

const Test = Assert.Context('Compile.Manifest')

// ------------------------------------------------------------------
// Recursive Binding
// ------------------------------------------------------------------
Test('Should bind two mutually recursive schemas', () => {
  const A = Type.Object({ b: Type.Optional(Type.Ref('test:b')) }, { $id: 'test:a' })
  const B = Type.Object({ a: Type.Optional(Type.Ref('test:a')) }, { $id: 'test:b' })
  const manifest = new Manifest()
  manifest.Add(A).Add(B)
  const validator = manifest.Compile('test:a')
  Assert.IsTrue(manifest.IsSealed())
  Assert.IsTrue(validator.Check({ b: { a: { b: { a: {} } } } }))
  Assert.IsFalse(validator.Check({ b: { a: { b: 1 } } }))
})
Test('Should bind self recursive schema', () => {
  const Node = Type.Object({
    value: Type.String(),
    next: Type.Optional(Type.Ref('test:node'))
  }, { $id: 'test:node' })
  const manifest = new Manifest()
  manifest.Add(Node)
  const validator = manifest.Compile('test:node')
  Assert.IsTrue(validator.Check({ value: 'a', next: { value: 'b', next: { value: 'c' } } }))
  Assert.IsFalse(validator.Check({ value: 'a', next: { value: 1 } }))
})
// ------------------------------------------------------------------
// Conflict
// ------------------------------------------------------------------
Test('Should reject duplicate identifier with different definition', () => {
  const manifest = new Manifest()
  manifest.Add(Type.String({ $id: 'test:conflict' }))
  let error: unknown
  try {
    manifest.Add(Type.Number({ $id: 'test:conflict' }))
  } catch (caught) {
    error = caught
  }
  Assert.IsTrue(error instanceof ManifestConflictError)
})
Test('Should allow duplicate identifier with identical definition', () => {
  const manifest = new Manifest()
  manifest.Add(Type.String({ $id: 'test:identical' }))
  manifest.Add(Type.String({ $id: 'test:identical' }))
  Assert.IsEqual(manifest.Ids(), ['test:identical'])
})
// ------------------------------------------------------------------
// Sealed Collection
// ------------------------------------------------------------------
Test('Should not overwrite a sealed collection with new registrations', () => {
  const manifest = new Manifest()
  manifest.Add(Type.String({ $id: 'test:sealed' }))
  const before = manifest.Compile('test:sealed')
  let error: unknown
  try {
    manifest.Add(Type.Number({ $id: 'test:sealed' }))
  } catch (caught) {
    error = caught
  }
  Assert.IsTrue(error instanceof ManifestSealedError)
  const after = manifest.Compile('test:sealed')
  Assert.IsTrue(after.Check('hello'))
  Assert.IsFalse(after.Check(1))
  Assert.IsEqual(before, after)
})
Test('Should not share collections across manifests (no global cache)', () => {
  const first = new Manifest()
  first.Add(Type.String({ $id: 'test:shared' }))
  const second = new Manifest()
  second.Add(Type.Number({ $id: 'test:shared' }))
  Assert.IsTrue(second.Compile('test:shared').Check(1))
  Assert.IsTrue(first.Compile('test:shared').Check('hello'))
  Assert.IsFalse(first.Compile('test:shared').Check(1))
})
// ------------------------------------------------------------------
// Unknown References
// ------------------------------------------------------------------
Test('Should not generate a validator for unknown references', () => {
  const manifest = new Manifest()
  manifest.Add(Type.Object({ x: Type.Ref('test:missing') }, { $id: 'test:entry' }))
  Assert.IsUndefined(manifest.TryCompile('test:entry'))
  let error: unknown
  try {
    manifest.Compile('test:entry')
  } catch (caught) {
    error = caught
  }
  Assert.IsTrue(error instanceof ManifestReferenceError)
})
Test('Should not generate a validator for unknown identifiers', () => {
  const manifest = new Manifest()
  manifest.Add(Type.String({ $id: 'test:known' }))
  Assert.IsUndefined(manifest.TryCompile('test:unknown'))
})
Test('Should resolve references through authorized externals', () => {
  const manifest = new Manifest({ 'test:external': Type.String() })
  manifest.Add(Type.Object({ x: Type.Ref('test:external') }, { $id: 'test:uses-external' }))
  const validator = manifest.Compile('test:uses-external')
  Assert.IsTrue(validator.Check({ x: 'hello' }))
  Assert.IsFalse(validator.Check({ x: 1 }))
})
// ------------------------------------------------------------------
// Snapshot
// ------------------------------------------------------------------
Test('Should not be affected by source object modification after registration', () => {
  const schema = Type.Object({ x: Type.String() }, { $id: 'test:snapshot' })
  const manifest = new Manifest()
  manifest.Add(schema)
  schema.properties.x = Type.Number() as never // mutate source after registration
  const validator = manifest.Compile('test:snapshot')
  Assert.IsTrue(validator.Check({ x: 'hello' }))
  Assert.IsFalse(validator.Check({ x: 1 }))
})
// ------------------------------------------------------------------
// Index
// ------------------------------------------------------------------
Test('Should retain a schema index of registered schemas', () => {
  const manifest = new Manifest()
  manifest.Add(Type.String({ $id: 'test:index/a' }))
  manifest.Add(Type.Number({ $id: 'test:index/b' }))
  const index = manifest.Index()
  Assert.IsEqual(manifest.Ids(), ['test:index/a', 'test:index/b'])
  Assert.HasPropertyKey(index, 'test:index/a')
  Assert.HasPropertyKey(index, 'test:index/b')
  Assert.IsTrue(Type.IsString(index['test:index/a']))
  Assert.IsTrue(Type.IsNumber(index['test:index/b']))
  Assert.IsTrue(manifest.Has('test:index/a'))
  Assert.IsEqual(manifest.Get('test:index/b'), index['test:index/b'])
})
// ------------------------------------------------------------------
// Default Compile Entry
// ------------------------------------------------------------------
Test('Should preserve the default Compile entry', () => {
  const validator = Compile(Type.String())
  Assert.IsTrue(validator.Check('hello'))
  Assert.IsFalse(validator.Check(1))
})
// ------------------------------------------------------------------
// Local Identifiers
// ------------------------------------------------------------------
Test('Should resolve references to identifiers declared within the same schema', () => {
  const Node = Type.Cyclic({
    Node: Type.Object({
      value: Type.String(),
      next: Type.Optional(Type.Ref('Node'))
    })
  }, 'Node', { $id: 'test:cyclic' })
  const manifest = new Manifest()
  manifest.Add(Node)
  const validator = manifest.Compile('test:cyclic')
  Assert.IsTrue(validator.Check({ value: 'a', next: { value: 'b' } }))
  Assert.IsFalse(validator.Check({ value: 'a', next: { value: 1 } }))
})
