import { Value } from 'typebox/value'
import { Type } from 'typebox'
import { Assert } from 'test'

const Test = Assert.Context('Value.ConvertCheck')

// ------------------------------------------------------------------
// Tri-State: Converted (invalid but convertible)
// ------------------------------------------------------------------
Test('Should ConvertCheck 1 (numeric string converts and passes)', () => {
  const R = Value.ConvertCheck(Type.Integer(), '42')
  Assert.IsEqual(R.status, 'converted')
  Assert.IsEqual(R.converted, true)
  Assert.IsEqual(R.value, 42)
  Assert.IsEqual(R.errors, [])
})
// ------------------------------------------------------------------
// Tri-State: Failed (still invalid after conversion)
// ------------------------------------------------------------------
Test('Should ConvertCheck 2 (bad string fails after conversion)', () => {
  const R = Value.ConvertCheck(Type.Integer(), 'hello')
  Assert.IsEqual(R.status, 'failed')
  Assert.IsEqual(R.converted, false)
  Assert.IsEqual(R.value, 'hello')
  Assert.IsTrue(R.errors.length > 0)
})
// ------------------------------------------------------------------
// Tri-State: Unchanged (already valid, not converted)
// ------------------------------------------------------------------
Test('Should ConvertCheck 3 (existing integer marked not converted)', () => {
  const R = Value.ConvertCheck(Type.Integer(), 42)
  Assert.IsEqual(R.status, 'unchanged')
  Assert.IsEqual(R.converted, false)
  Assert.IsEqual(R.value, 42)
  Assert.IsEqual(R.errors, [])
})
// ------------------------------------------------------------------
// Input Immutability
// ------------------------------------------------------------------
Test('Should ConvertCheck 4 (input object is not mutated)', () => {
  const T = Type.Object({ a: Type.Integer(), b: Type.Integer() })
  const input = { a: '1', b: '2' }
  const R = Value.ConvertCheck(T, input)
  Assert.IsEqual(R.status, 'converted')
  Assert.IsEqual(R.value, { a: 1, b: 2 })
  Assert.IsEqual(input, { a: '1', b: '2' })
})
Test('Should ConvertCheck 5 (failed conversion leaves no partial object)', () => {
  const T = Type.Object({ a: Type.Integer(), b: Type.Integer() })
  const input = { a: '1', b: 'nope' }
  const R = Value.ConvertCheck(T, input)
  Assert.IsEqual(R.status, 'failed')
  Assert.IsEqual(R.value, input)
  Assert.IsEqual(input, { a: '1', b: 'nope' })
})
// ------------------------------------------------------------------
// Error Paths
// ------------------------------------------------------------------
Test('Should ConvertCheck 6 (residual error paths preserved on failure)', () => {
  const T = Type.Object({ a: Type.Integer(), b: Type.Integer() })
  const R = Value.ConvertCheck(T, { a: '1', b: 'nope' })
  Assert.IsEqual(R.status, 'failed')
  Assert.IsTrue(R.errors.some(error => error.instancePath === '/b'))
})
// ------------------------------------------------------------------
// Array Binding
// ------------------------------------------------------------------
Test('Should ConvertCheck 7 (array elements bound to target item schema)', () => {
  const R = Value.ConvertCheck(Type.Array(Type.Integer()), ['1', '2', '3'])
  Assert.IsEqual(R.status, 'converted')
  Assert.IsEqual(R.value, [1, 2, 3])
})
// ------------------------------------------------------------------
// Union Branch
// ------------------------------------------------------------------
Test('Should ConvertCheck 8 (union branch is the actual match, not the last attempt)', () => {
  const T = Type.Union([Type.Integer(), Type.Boolean()])
  const R = Value.ConvertCheck(T, '42')
  Assert.IsEqual(R.status, 'converted')
  Assert.IsEqual(R.value, 42)
  Assert.IsEqual(R.branch, 0)
})
Test('Should ConvertCheck 9 (union branch resolved for already valid values)', () => {
  const T = Type.Union([Type.Integer(), Type.Boolean()])
  const R = Value.ConvertCheck(T, true)
  Assert.IsEqual(R.status, 'unchanged')
  Assert.IsEqual(R.branch, 1)
})
Test('Should ConvertCheck 10 (union branch null on failure)', () => {
  const T = Type.Union([Type.Integer(), Type.Boolean()])
  const R = Value.ConvertCheck(T, 'nope')
  Assert.IsEqual(R.status, 'failed')
  Assert.IsEqual(R.branch, null)
})
Test('Should ConvertCheck 11 (branch null for non-union targets)', () => {
  const R = Value.ConvertCheck(Type.Integer(), '42')
  Assert.IsEqual(R.branch, null)
})
// ------------------------------------------------------------------
// Default Value.Convert Unchanged
// ------------------------------------------------------------------
Test('Should ConvertCheck 12 (default Value.Convert behavior unchanged)', () => {
  Assert.IsEqual(Value.Convert(Type.Integer(), '42'), 42)
  Assert.IsEqual(Value.Convert(Type.Integer(), 'hello'), 'hello')
  const mutable = { a: '1' }
  Value.Convert(Type.Object({ a: Type.Integer() }), mutable)
  Assert.IsEqual(mutable, { a: 1 })
})
// ------------------------------------------------------------------
// Context Signature
// ------------------------------------------------------------------
Test('Should ConvertCheck 13 (context, type, value signature)', () => {
  const R = Value.ConvertCheck({}, Type.Integer(), '42')
  Assert.IsEqual(R.status, 'converted')
  Assert.IsEqual(R.value, 42)
})
