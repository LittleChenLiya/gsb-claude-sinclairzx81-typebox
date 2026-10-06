import { Value } from 'typebox/value'
import { Type } from 'typebox'
import { Assert } from 'test'

const Test = Assert.Context('Value.ConvertReceipt')

// ------------------------------------------------------------------
// Three States
// ------------------------------------------------------------------
Test('Should Receipt 1 (numeric string converts and checks)', () => {
  const T = Type.Number()
  const R = Value.ConvertReceipt(T, '3.14')
  Assert.IsEqual(R.kind, 'converted')
  Assert.IsEqual(R.converted, true)
  Assert.IsEqual(R.value, 3.14)
  Assert.IsEqual(R.errors, [])
})
Test('Should Receipt 2 (bad string remains invalid after conversion)', () => {
  const T = Type.Number()
  const R = Value.ConvertReceipt(T, 'hello')
  Assert.IsEqual(R.kind, 'invalid')
  Assert.IsEqual(R.converted, false)
  Assert.IsEqual(R.value, 'hello')
  Assert.IsTrue(R.errors.length > 0)
})
Test('Should Receipt 3 (integer is valid and marked not converted)', () => {
  const T = Type.Integer()
  const R = Value.ConvertReceipt(T, 1)
  Assert.IsEqual(R.kind, 'valid')
  Assert.IsEqual(R.converted, false)
  Assert.IsEqual(R.value, 1)
  Assert.IsEqual(R.errors, [])
})
// ------------------------------------------------------------------
// Non Mutation
// ------------------------------------------------------------------
Test('Should Receipt 4 (does not mutate input on converted)', () => {
  const T = Type.Object({ x: Type.Number() })
  const V = { x: '1' }
  const R = Value.ConvertReceipt(T, V)
  Assert.IsEqual(R.kind, 'converted')
  Assert.IsEqual(R.value, { x: 1 })
  Assert.IsEqual(V, { x: '1' })
})
Test('Should Receipt 5 (failed conversion leaves no partial object)', () => {
  const T = Type.Object({ x: Type.Number(), y: Type.Number() })
  const V = { x: '1', y: 'hello' }
  const R = Value.ConvertReceipt(T, V)
  Assert.IsEqual(R.kind, 'invalid')
  Assert.IsEqual(R.value, V)
  Assert.IsEqual(V, { x: '1', y: 'hello' })
  // error paths retained for the remaining unconvertible property
  Assert.IsTrue(R.errors.some(error => error.instancePath === '/y'))
})
Test('Should Receipt 6 (does not mutate input array)', () => {
  const T = Type.Array(Type.Integer())
  const V = ['1', '2']
  const R = Value.ConvertReceipt(T, V)
  Assert.IsEqual(R.kind, 'converted')
  Assert.IsEqual(R.value, [1, 2])
  Assert.IsEqual(V, ['1', '2'])
})
// ------------------------------------------------------------------
// Union Branch
// ------------------------------------------------------------------
Test('Should Receipt 7 (union binds to actual matched variant, not last attempt)', () => {
  const T = Type.Union([Type.String(), Type.Number()])
  const R = Value.ConvertReceipt(T, '1')
  Assert.IsEqual(R.kind, 'valid')
  Assert.IsEqual(R.converted, false)
  Assert.IsEqual(R.branch, 0)
  Assert.IsEqual(R.value, '1')
})
Test('Should Receipt 8 (union records adopted converted branch)', () => {
  const T = Type.Union([Type.Literal('x'), Type.Integer()])
  const R = Value.ConvertReceipt(T, '1')
  Assert.IsEqual(R.kind, 'converted')
  Assert.IsEqual(R.branch, 1)
  Assert.IsEqual(R.value, 1)
})
Test('Should Receipt 9 (union invalid retains errors and original value)', () => {
  const T = Type.Union([Type.Boolean(), Type.Integer()])
  const V = { x: 1 }
  const R = Value.ConvertReceipt(T, V)
  Assert.IsEqual(R.kind, 'invalid')
  Assert.IsEqual(R.branch, null)
  Assert.IsEqual(R.value, V)
  Assert.IsTrue(R.errors.length > 0)
})
// ------------------------------------------------------------------
// Context
// ------------------------------------------------------------------
Test('Should Receipt 10 (supports context argument)', () => {
  const A = Type.Object({ x: Type.Number() })
  const B = Type.Object({ y: Type.Number() })
  const T = Type.Union([A, B])
  const R = Value.ConvertReceipt({ A, B }, T, { y: '1' })
  Assert.IsEqual(R.kind, 'converted')
  Assert.IsEqual(R.branch, 1)
  Assert.IsEqual(R.value, { y: 1 })
})
