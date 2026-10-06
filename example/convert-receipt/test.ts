/*--------------------------------------------------------------------------

TypeBox: ConvertReceipt Acceptance (Node)

Node-directed acceptance for the explicit Convert-then-Check receipt. This
mirrors test/typebox/runtime/value/convert/receipt.ts which runs under Deno.

  $ node --experimental-transform-types example/convert-receipt/test.ts

---------------------------------------------------------------------------*/

import * as assert from 'node:assert'
import { Type } from '../../src/index.ts'
import { Value } from '../../src/value/index.ts'

// ------------------------------------------------------------------
// Three States
// ------------------------------------------------------------------
{
  const R = Value.ConvertReceipt(Type.Number(), '3.14')
  assert.deepStrictEqual(R, { kind: 'converted', converted: true, branch: null, value: 3.14, errors: [] })
}
{
  const R = Value.ConvertReceipt(Type.Number(), 'hello')
  assert.equal(R.kind, 'invalid')
  assert.equal(R.converted, false)
  assert.equal(R.value, 'hello')
  assert.ok(R.errors.length > 0)
}
{
  const R = Value.ConvertReceipt(Type.Integer(), 1)
  assert.deepStrictEqual(R, { kind: 'valid', converted: false, branch: null, value: 1, errors: [] })
}
// ------------------------------------------------------------------
// Non Mutation
// ------------------------------------------------------------------
{
  const V = { x: '1' }
  const R = Value.ConvertReceipt(Type.Object({ x: Type.Number() }), V)
  assert.equal(R.kind, 'converted')
  assert.deepStrictEqual(R.value, { x: 1 })
  assert.deepStrictEqual(V, { x: '1' })
}
{
  const V = { x: '1', y: 'hello' }
  const R = Value.ConvertReceipt(Type.Object({ x: Type.Number(), y: Type.Number() }), V)
  assert.equal(R.kind, 'invalid')
  assert.equal(R.value, V)
  assert.deepStrictEqual(V, { x: '1', y: 'hello' })
  assert.ok(R.errors.some(error => error.instancePath === '/y'))
}
{
  const V = ['1', '2']
  const R = Value.ConvertReceipt(Type.Array(Type.Integer()), V)
  assert.equal(R.kind, 'converted')
  assert.deepStrictEqual(R.value, [1, 2])
  assert.deepStrictEqual(V, ['1', '2'])
}
// ------------------------------------------------------------------
// Union Branch
// ------------------------------------------------------------------
{
  const R = Value.ConvertReceipt(Type.Union([Type.String(), Type.Number()]), '1')
  assert.deepStrictEqual(R, { kind: 'valid', converted: false, branch: 0, value: '1', errors: [] })
}
{
  const R = Value.ConvertReceipt(Type.Union([Type.Literal('x'), Type.Integer()]), '1')
  assert.deepStrictEqual(R, { kind: 'converted', converted: true, branch: 1, value: 1, errors: [] })
}
{
  const V = { x: 1 }
  const R = Value.ConvertReceipt(Type.Union([Type.Boolean(), Type.Integer()]), V)
  assert.equal(R.kind, 'invalid')
  assert.equal(R.branch, null)
  assert.equal(R.value, V)
  assert.ok(R.errors.length > 0)
}
// ------------------------------------------------------------------
// Context
// ------------------------------------------------------------------
{
  const A = Type.Object({ x: Type.Number() })
  const B = Type.Object({ y: Type.Number() })
  const R = Value.ConvertReceipt({ A, B }, Type.Union([A, B]), { y: '1' })
  assert.deepStrictEqual(R, { kind: 'converted', converted: true, branch: 1, value: { y: 1 }, errors: [] })
}
console.log('ok')
