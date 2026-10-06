/*--------------------------------------------------------------------------

TypeBox: Value.ConvertCheck (Node-Targeted Acceptance)

Runs directly on the TypeScript sources with Node type stripping. No build
step and no Docker required:

  node --experimental-transform-types --test test/node/convert_check.test.ts

---------------------------------------------------------------------------*/

import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import { Type } from '../../src/index.ts'
import { Value } from '../../src/value/index.ts'

test('numeric string converts and passes', () => {
  const receipt = Value.ConvertCheck(Type.Integer(), '42')
  assert.equal(receipt.status, 'converted')
  assert.equal(receipt.converted, true)
  assert.equal(receipt.value, 42)
  assert.deepEqual(receipt.errors, [])
})

test('bad string still fails after conversion', () => {
  const receipt = Value.ConvertCheck(Type.Integer(), 'hello')
  assert.equal(receipt.status, 'failed')
  assert.equal(receipt.converted, false)
  assert.equal(receipt.value, 'hello')
  assert.ok(receipt.errors.length > 0)
})

test('existing integer is marked not converted', () => {
  const receipt = Value.ConvertCheck(Type.Integer(), 42)
  assert.equal(receipt.status, 'unchanged')
  assert.equal(receipt.converted, false)
  assert.equal(receipt.value, 42)
})

test('input object is unchanged, failure leaves no partial object', () => {
  const T = Type.Object({ a: Type.Integer(), b: Type.Integer() })
  const input = { a: '1', b: 'nope' }
  const receipt = Value.ConvertCheck(T, input)
  assert.equal(receipt.status, 'failed')
  assert.deepEqual(input, { a: '1', b: 'nope' })
  assert.equal(receipt.value, input)
  assert.ok(receipt.errors.some(error => error.instancePath === '/b'))
})

test('array elements bind to the target item schema', () => {
  const receipt = Value.ConvertCheck(Type.Array(Type.Integer()), ['1', '2'])
  assert.equal(receipt.status, 'converted')
  assert.deepEqual(receipt.value, [1, 2])
})

test('union branch is the actual match, not the last attempt', () => {
  const T = Type.Union([Type.Integer(), Type.Boolean()])
  const receipt = Value.ConvertCheck(T, '42')
  assert.equal(receipt.status, 'converted')
  assert.equal(receipt.branch, 0)
  assert.equal(Value.ConvertCheck(T, true).branch, 1)
  assert.equal(Value.ConvertCheck(T, 'nope').branch, null)
})

test('default Value.Convert behavior is unchanged', () => {
  assert.equal(Value.Convert(Type.Integer(), '42'), 42)
  assert.equal(Value.Convert(Type.Integer(), 'hello'), 'hello')
})
