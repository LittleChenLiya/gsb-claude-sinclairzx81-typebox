import { Value } from 'typebox/value'
import { Type } from 'typebox'
import { Assert } from 'test'

const Test = Assert.Context('Value.Default.Patch')

// ----------------------------------------------------------------
// Nested Object: Paths
// ----------------------------------------------------------------
Test('Should Patch 1 (nested object paths)', () => {
  const T = Type.Object({
    a: Type.String({ default: 'hello' }),
    b: Type.Object(
      {
        c: Type.Number({ default: 42 }),
        d: Type.Boolean({ default: true })
      },
      { default: {} }
    )
  })
  const patches: Value.TDefaultPatch[] = []
  const R = Value.DefaultWithPatches(T, {}, patches)
  Assert.IsEqual(R, { a: 'hello', b: { c: 42, d: true } })
  Assert.IsEqual(patches, [
    { path: '/a', value: 'hello' },
    { path: '/b', value: {} },
    { path: '/b/c', value: 42 },
    { path: '/b/d', value: true }
  ])
})
Test('Should Patch 1.1 (nested object without default is not created)', () => {
  // consistent with Value.Default: a missing nested object is only created
  // when the object itself carries a default annotation.
  const T = Type.Object({
    a: Type.String({ default: 'hello' }),
    b: Type.Object({ c: Type.Number({ default: 42 }) })
  })
  const patches: Value.TDefaultPatch[] = []
  const R = Value.DefaultWithPatches(T, {}, patches)
  Assert.IsEqual(R, { a: 'hello' })
  Assert.IsEqual(patches, [{ path: '/a', value: 'hello' }])
})
// ----------------------------------------------------------------
// Array Items: Paths
// ----------------------------------------------------------------
Test('Should Patch 2 (array item paths)', () => {
  const T = Type.Object({
    items: Type.Array(Type.Object({ x: Type.Number({ default: 1 }) }))
  })
  const patches: Value.TDefaultPatch[] = []
  const R = Value.DefaultWithPatches(T, { items: [{}, { x: 7 }, {}] }, patches)
  Assert.IsEqual(R, { items: [{ x: 1 }, { x: 7 }, { x: 1 }] })
  Assert.IsEqual(patches, [
    { path: '/items/0/x', value: 1 },
    { path: '/items/2/x', value: 1 }
  ])
})
// ----------------------------------------------------------------
// Referenced Schema: Paths Located Through $ref
// ----------------------------------------------------------------
Test('Should Patch 3 (referenced schema paths)', () => {
  const A = Type.Object({
    name: Type.String({ default: 'unknown' }),
    tags: Type.Array(Type.String({ default: 'tag' }), { default: [] })
  })
  const T = Type.Object({ ref: Type.Ref('A') })
  const patches: Value.TDefaultPatch[] = []
  const R = Value.DefaultWithPatches({ A }, T, { ref: {} }, patches)
  Assert.IsEqual(R, { ref: { name: 'unknown', tags: [] } })
  Assert.IsEqual(patches, [
    { path: '/ref/name', value: 'unknown' },
    { path: '/ref/tags', value: [] }
  ])
})
// ----------------------------------------------------------------
// Explicit Null Is Not Missing
// ----------------------------------------------------------------
Test('Should Patch 4 (null is preserved)', () => {
  const T = Type.Object({
    a: Type.String({ default: 'hello' }),
    b: Type.Union([Type.Null(), Type.String()], { default: 'fallback' })
  })
  const patches: Value.TDefaultPatch[] = []
  const R = Value.DefaultWithPatches(T, { a: null, b: null }, patches)
  Assert.IsEqual(R, { a: null, b: null })
  Assert.IsEqual(patches, [])
})
// ----------------------------------------------------------------
// Root Value
// ----------------------------------------------------------------
Test('Should Patch 5 (root path)', () => {
  const T = Type.Object({ x: Type.Number() }, { default: { x: 1 } })
  const patches: Value.TDefaultPatch[] = []
  const R = Value.DefaultWithPatches(T, undefined, patches)
  Assert.IsEqual(R, { x: 1 })
  Assert.IsEqual(patches, [{ path: '', value: { x: 1 } }])
})
Test('Should Patch 6 (root null is preserved)', () => {
  const T = Type.Object({ x: Type.Number() }, { default: { x: 1 } })
  const patches: Value.TDefaultPatch[] = []
  const R = Value.DefaultWithPatches(T, null, patches)
  Assert.IsEqual(R, null)
  Assert.IsEqual(patches, [])
})
// ----------------------------------------------------------------
// Patches Are Read-Only Copies
// ----------------------------------------------------------------
Test('Should Patch 7 (patch does not reverse modify the value)', () => {
  const T = Type.Object({
    nested: Type.Object({ x: Type.Number({ default: 1 }) }, { default: {} }),
    list: Type.Array(Type.Number(), { default: [1, 2, 3] })
  })
  const patches: Value.TDefaultPatch[] = []
  const R = Value.DefaultWithPatches(T, {}, patches) as { nested: { x: number }; list: number[] }
  Assert.IsEqual(patches, [
    { path: '/nested', value: {} },
    { path: '/nested/x', value: 1 },
    { path: '/list', value: [1, 2, 3] }
  ])
  // reverse modify via the patch receptacle
  ;(patches[0].value as { x?: number }).x = 999
  ;(patches[2].value as number[]).push(999)
  // the patched value is unaffected
  Assert.IsEqual(R, { nested: { x: 1 }, list: [1, 2, 3] })
})
Test('Should Patch 8 (value does not modify the patch)', () => {
  const T = Type.Object({ list: Type.Array(Type.Number(), { default: [1, 2, 3] }) })
  const patches: Value.TDefaultPatch[] = []
  const R = Value.DefaultWithPatches(T, {}, patches) as { list: number[] }
  R.list.push(999)
  Assert.IsEqual(patches, [{ path: '/list', value: [1, 2, 3] }])
})
// ----------------------------------------------------------------
// Existing API Is Unchanged
// ----------------------------------------------------------------
Test('Should Patch 9 (existing Default API unchanged)', () => {
  const T = Type.Object({ a: Type.String({ default: 'hello' }) })
  const R = Value.Default(T, {})
  Assert.IsEqual(R, { a: 'hello' })
  // context signature
  const A = Type.String({ default: 'world' })
  const S = Type.Ref('A')
  Assert.IsEqual(Value.Default({ A }, S, undefined), 'world')
})
Test('Should Patch 10 (DefaultWithPatches matches Default result)', () => {
  const T = Type.Object({
    a: Type.String({ default: 'hello' }),
    b: Type.Object({ c: Type.Number({ default: 42 }) })
  })
  const patches: Value.TDefaultPatch[] = []
  const R1 = Value.DefaultWithPatches(T, {}, patches)
  const R2 = Value.Default(T, {})
  Assert.IsEqual(R1, R2)
})
