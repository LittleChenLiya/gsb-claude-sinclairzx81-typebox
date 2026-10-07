import { type TDefaultPatch, Value } from 'typebox/value'
import { Type } from 'typebox'
import { Assert } from 'test'

const Test = Assert.Context('Value.Default.Patch')

// ----------------------------------------------------------------
// Nested Object: Paths, Null Retention, Copy Isolation
// ----------------------------------------------------------------
Test('Should Patch 1 (nested object paths)', () => {
  const T = Type.Object({
    nested: Type.Object({
      x: Type.Number({ default: 1 }),
      y: Type.String({ default: 'hello' })
    }, { default: {} }),
    count: Type.Number({ default: 2 }),
    kept: Type.Union([Type.Null(), Type.Number()])
  })
  const patches: TDefaultPatch[] = []
  const R = Value.Default(T, { kept: null }, { patches })
  Assert.IsEqual(R, { kept: null, nested: { x: 1, y: 'hello' }, count: 2 })
  Assert.IsEqual(patches, [
    { path: '/nested/x', value: 1 },
    { path: '/nested/y', value: 'hello' },
    { path: '/nested', value: { x: 1, y: 'hello' } },
    { path: '/count', value: 2 }
  ])
})
Test('Should Patch 2 (explicit null is not missing)', () => {
  const T = Type.Object({
    a: Type.Union([Type.Null(), Type.Number()], { default: 1 }),
    b: Type.Union([Type.Null(), Type.Number()], { default: 2 })
  })
  const patches: TDefaultPatch[] = []
  const R = Value.Default(T, { a: null }, { patches })
  // explicit null retained and never reported
  Assert.IsEqual(R, { a: null, b: 2 })
  Assert.IsEqual(patches, [{ path: '/b', value: 2 }])
})
Test('Should Patch 3 (report copies do not write back)', () => {
  const T = Type.Object({
    nested: Type.Object({
      x: Type.Number({ default: 1 })
    }, { default: {} })
  })
  const patches: TDefaultPatch[] = []
  const R = Value.Default(T, {}, { patches }) as { nested: { x: number } }
  Assert.IsEqual(patches, [
    { path: '/nested/x', value: 1 },
    { path: '/nested', value: { x: 1 } }
  ])
  // mutate the reported copy: the patched value must not change
  const reported = patches[1].value as { x: number }
  reported.x = 999
  Assert.IsEqual(R.nested.x, 1)
  // mutate the patched value: the reported copy retains its own state
  R.nested.x = 555
  Assert.IsEqual(reported.x, 999)
})
// ----------------------------------------------------------------
// Array Items
// ----------------------------------------------------------------
Test('Should Patch 4 (array item elements)', () => {
  const T = Type.Array(Type.Number({ default: 0 }))
  const patches: TDefaultPatch[] = []
  const R = Value.Default(T, [1, undefined, 3], { patches })
  Assert.IsEqual(R, [1, 0, 3])
  Assert.IsEqual(patches, [{ path: '/1', value: 0 }])
})
Test('Should Patch 5 (array item object properties, null element retained)', () => {
  const T = Type.Array(Type.Object({ id: Type.Number({ default: 7 }) }))
  const patches: TDefaultPatch[] = []
  const R = Value.Default(T, [{}, { id: 1 }, null], { patches })
  Assert.IsEqual(R, [{ id: 7 }, { id: 1 }, null])
  Assert.IsEqual(patches, [{ path: '/0/id', value: 7 }])
})
// ----------------------------------------------------------------
// Referenced Schemas
// ----------------------------------------------------------------
Test('Should Patch 6 (ref root)', () => {
  const context = {
    A: Type.Object({ id: Type.Number({ default: 42 }) })
  }
  const patches: TDefaultPatch[] = []
  const R = Value.Default(context, Type.Ref('A'), {}, { patches })
  Assert.IsEqual(R, { id: 42 })
  Assert.IsEqual(patches, [{ path: '/id', value: 42 }])
})
Test('Should Patch 7 (ref property)', () => {
  const context = {
    A: Type.Object({ id: Type.Number({ default: 42 }) })
  }
  const T = Type.Object({ ref: Type.Ref('A') })
  const patches: TDefaultPatch[] = []
  const R = Value.Default(context, T, { ref: {} }, { patches })
  Assert.IsEqual(R, { ref: { id: 42 } })
  Assert.IsEqual(patches, [{ path: '/ref/id', value: 42 }])
})
// ----------------------------------------------------------------
// Root and Option Disabled
// ----------------------------------------------------------------
Test('Should Patch 8 (root default path)', () => {
  const T = Type.Number({ default: 1 })
  const patches: TDefaultPatch[] = []
  const R = Value.Default(T, undefined, { patches })
  Assert.IsEqual(R, 1)
  Assert.IsEqual(patches, [{ path: '', value: 1 }])
})
Test('Should Patch 9 (option disabled: 2-argument form)', () => {
  const T = Type.Object({ x: Type.Number({ default: 1 }) })
  const R = Value.Default(T, {})
  Assert.IsEqual(R, { x: 1 })
})
Test('Should Patch 10 (option disabled: 3-argument form)', () => {
  const context = { A: Type.Object({ x: Type.Number({ default: 1 }) }) }
  const R = Value.Default(context, Type.Ref('A'), {})
  Assert.IsEqual(R, { x: 1 })
})
Test('Should Patch 11 (no defaults: no patches)', () => {
  const T = Type.Object({ x: Type.Number({ default: 1 }) })
  const patches: TDefaultPatch[] = []
  const R = Value.Default(T, { x: 8 }, { patches })
  Assert.IsEqual(R, { x: 8 })
  Assert.IsEqual(patches, [])
})
