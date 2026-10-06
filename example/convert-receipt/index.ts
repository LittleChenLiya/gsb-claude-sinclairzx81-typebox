/*--------------------------------------------------------------------------

TypeBox: ConvertReceipt Three-State Example

Explicit Convert-then-Check receipts. Each receipt is one of three states:

  'valid'     - the value already checked, it was NOT converted
  'converted' - the value was invalid but convertible, receipt.value is the converted clone
  'invalid'   - the value remains invalid after conversion, receipt.value is the
                untouched original and receipt.errors retains the error paths

Run with Node (type transformation, no build step):

  $ node --experimental-transform-types example/convert-receipt/index.ts

---------------------------------------------------------------------------*/

import * as assert from 'node:assert'
import { Type } from '../../src/index.ts'
import { Value } from '../../src/value/index.ts'

// ------------------------------------------------------------------
// State 1: numeric string converts and passes
// ------------------------------------------------------------------
const converted = Value.ConvertReceipt(Type.Number(), '3.14')
console.log('converted:', converted)
assert.deepStrictEqual(converted, { kind: 'converted', converted: true, branch: null, value: 3.14, errors: [] })

// ------------------------------------------------------------------
// State 2: bad string still fails after conversion, errors retained
// ------------------------------------------------------------------
const invalid = Value.ConvertReceipt(Type.Number(), 'hello')
console.log('invalid:  ', invalid)
assert.equal(invalid.kind, 'invalid')
assert.equal(invalid.converted, false)
assert.equal(invalid.value, 'hello') // original value, not a partial conversion
assert.ok(invalid.errors.length > 0) // error paths retained

// ------------------------------------------------------------------
// State 3: integer was already valid, marked as not converted
// ------------------------------------------------------------------
const valid = Value.ConvertReceipt(Type.Integer(), 1)
console.log('valid:    ', valid)
assert.deepStrictEqual(valid, { kind: 'valid', converted: false, branch: null, value: 1, errors: [] })

// ------------------------------------------------------------------
// Objects: failed conversion never leaves a partial object behind
// ------------------------------------------------------------------
const T = Type.Object({ x: Type.Number(), y: Type.Number() })
const input = { x: '1', y: 'hello' }
const failed = Value.ConvertReceipt(T, input)
console.log('partial:  ', failed)
assert.equal(failed.kind, 'invalid')
assert.deepStrictEqual(input, { x: '1', y: 'hello' }) // input object unchanged
assert.ok(failed.errors.some(error => error.instancePath === '/y'))

// ------------------------------------------------------------------
// Unions: bind to the actual variant, record the adopted branch
// ------------------------------------------------------------------
const U = Type.Union([Type.String(), Type.Number()])
const branch = Value.ConvertReceipt(U, '1')
console.log('branch:   ', branch)
assert.deepStrictEqual(branch, { kind: 'valid', converted: false, branch: 0, value: '1', errors: [] })

console.log('ok')
