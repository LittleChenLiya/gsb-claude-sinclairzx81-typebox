/*--------------------------------------------------------------------------

TypeBox

The MIT License (MIT)

Copyright (c) 2017-2026 Haydn Paterson 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

// deno-fmt-ignore-file

import { Arguments } from '../../system/arguments/index.ts'
import type { TLocalizedValidationError } from '../../error/index.ts'
import * as Type from '../../type/index.ts'
import type { TProperties, TSchema, TUnion } from '../../type/index.ts'
import { Check } from '../check/index.ts'
import { Clone } from '../clone/index.ts'
import { Errors } from '../errors/index.ts'
import { FromType } from './from_type.ts'

// ------------------------------------------------------------------
// Receipts
// ------------------------------------------------------------------
/** The value already Checked valid against the type. No conversion was applied and the input value is returned unmodified. */
export interface TConvertValid {
  kind: 'valid'
  converted: false
  /** The union variant index the value matched, or null for non-union types. */
  branch: number | null
  value: unknown
  errors: []
}
/** The value did not Check, but a converted clone does. The converted value is returned. */
export interface TConvertConverted {
  kind: 'converted'
  converted: true
  /** The union variant index the converted value was bound to, or null for non-union types. */
  branch: number | null
  value: unknown
  errors: []
}
/** The value did not Check and no reasonable conversion makes it Check. The original value is returned unmodified and the remaining validation errors (with instance paths) are retained. */
export interface TConvertInvalid {
  kind: 'invalid'
  converted: false
  branch: null
  value: unknown
  errors: TLocalizedValidationError[]
}
/**
 * A receipt for an explicit Convert-then-Check operation. The receipt is a three
 * state discriminator that distinguishes values that were already valid ('valid'),
 * values that were invalid but convertible ('converted') and values that remain
 * invalid after conversion ('invalid'). It is not a single changed boolean.
 */
export type TConvertReceipt = TConvertValid | TConvertConverted | TConvertInvalid

// ------------------------------------------------------------------
// Union
// ------------------------------------------------------------------
// Union conversion binds to the actual variant the value Checks against. The
// adopted branch is recorded on the receipt: it is the first variant in declared
// order that Checks, never a guess based on the last attempted variant.
// ------------------------------------------------------------------
function FromUnionReceipt(context: TProperties, type: TUnion, value: unknown): TConvertReceipt {
  const matched = type.anyOf.findIndex(variant => Check(context, variant, value))
  if (matched !== -1) return { kind: 'valid', converted: false, branch: matched, value, errors: [] }
  for (let branch = 0; branch < type.anyOf.length; branch++) {
    const candidate = FromType(context, type.anyOf[branch], Clone(value))
    if (Check(context, type.anyOf[branch], candidate)) {
      return { kind: 'converted', converted: true, branch, value: candidate, errors: [] }
    }
  }
  return { kind: 'invalid', converted: false, branch: null, value, errors: Errors(context, type, value) }
}
// ------------------------------------------------------------------
// Type
// ------------------------------------------------------------------
// Conversion is staged on a Clone such that a failed conversion never leaves a
// partially converted structure on the caller's value. Only conversion rules
// defined by FromType are applied, no additional string coercion is guessed.
// ------------------------------------------------------------------
function FromTypeReceipt(context: TProperties, type: TSchema, value: unknown): TConvertReceipt {
  if (Check(context, type, value)) return { kind: 'valid', converted: false, branch: null, value, errors: [] }
  const candidate = FromType(context, type, Clone(value))
  if (Check(context, type, candidate)) return { kind: 'converted', converted: true, branch: null, value: candidate, errors: [] }
  return { kind: 'invalid', converted: false, branch: null, value, errors: Errors(context, type, candidate) }
}
/**
 * Performs an explicit Convert then Check and returns a receipt describing the outcome.
 * The receipt distinguishes values that were already valid, values that were invalid
 * but convertible, and values that remain invalid after conversion. This function
 * never mutates the provided value: conversion is staged on a clone and is only
 * committed to the receipt when the converted value Checks. On failure the original
 * value is returned along with the remaining validation errors.
 */
export function ConvertReceipt(context: TProperties, type: TSchema, value: unknown): TConvertReceipt
/**
 * Performs an explicit Convert then Check and returns a receipt describing the outcome.
 * The receipt distinguishes values that were already valid, values that were invalid
 * but convertible, and values that remain invalid after conversion. This function
 * never mutates the provided value: conversion is staged on a clone and is only
 * committed to the receipt when the converted value Checks. On failure the original
 * value is returned along with the remaining validation errors.
 */
export function ConvertReceipt(type: TSchema, value: unknown): TConvertReceipt
/**
 * Performs an explicit Convert then Check and returns a receipt describing the outcome.
 * The receipt distinguishes values that were already valid, values that were invalid
 * but convertible, and values that remain invalid after conversion. This function
 * never mutates the provided value: conversion is staged on a clone and is only
 * committed to the receipt when the converted value Checks. On failure the original
 * value is returned along with the remaining validation errors.
 */
export function ConvertReceipt(...args: unknown[]): TConvertReceipt {
  const [context, type, value] = Arguments.Match<[TProperties, TSchema, unknown]>(args, {
    3: (context, type, value) => [context, type, value],
    2: (type, value) => [{}, type, value],
  })
  return Type.IsUnion(type)
    ? FromUnionReceipt(context, type, value)
    : FromTypeReceipt(context, type, value)
}
