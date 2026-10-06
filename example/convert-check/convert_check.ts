/*--------------------------------------------------------------------------

TypeBox: ConvertCheck Three-State Example

This example demonstrates the explicit Convert-then-Check receipt returned by
Value.ConvertCheck. The receipt distinguishes three outcomes rather than a
single "changed" flag:

  - "unchanged": the value was already valid, no conversion attempted
  - "converted": the value was invalid, but a reasonable conversion was found
  - "failed":    the value remained invalid after conversion was attempted

Run with Node (type stripping, no build step):

  node --experimental-transform-types example/convert-check/convert_check.ts

---------------------------------------------------------------------------*/

import { Type } from '../../src/index.ts'
import { Value } from '../../src/value/index.ts'

// ------------------------------------------------------------------
// State 1: Converted - a numeric string converts and passes Check
// ------------------------------------------------------------------
const converted = Value.ConvertCheck(Type.Integer(), '42')
console.log('converted:', converted)
// { status: 'converted', converted: true, value: 42, errors: [], branch: null }

// ------------------------------------------------------------------
// State 2: Failed - a bad string is still invalid after conversion
// ------------------------------------------------------------------
const failed = Value.ConvertCheck(Type.Integer(), 'hello')
console.log('failed:   ', failed)
// { status: 'failed', converted: false, value: 'hello', errors: [...], branch: null }
// residual error paths are preserved on the receipt (errors[0].instancePath)

// ------------------------------------------------------------------
// State 3: Unchanged - an existing integer is marked not converted
// ------------------------------------------------------------------
const unchanged = Value.ConvertCheck(Type.Integer(), 42)
console.log('unchanged:', unchanged)
// { status: 'unchanged', converted: false, value: 42, errors: [], branch: null }

// ------------------------------------------------------------------
// Objects and Arrays: conversion binds to the actual target schema,
// the input value is never mutated, and a failed conversion never
// leaves a partially converted object.
// ------------------------------------------------------------------
const T = Type.Object({ a: Type.Integer(), b: Type.Integer() })
const input = { a: '1', b: 'nope' }
const receipt = Value.ConvertCheck(T, input)
console.log('object:   ', receipt.status, receipt.errors.map(error => error.instancePath))
// 'failed' [ '/b' ] ... and the input is untouched:
console.log('input:    ', input) // { a: '1', b: 'nope' }

// ------------------------------------------------------------------
// Unions: the receipt preserves the variant branch actually bound,
// resolved by Checking each variant (never guessed from the last
// attempted conversion).
// ------------------------------------------------------------------
const U = Type.Union([Type.Integer(), Type.Boolean()])
const branch = Value.ConvertCheck(U, '42')
console.log('union:    ', branch.status, 'branch:', branch.branch)
// 'converted' branch: 0 (Integer matched, even though Boolean was attempted last)
