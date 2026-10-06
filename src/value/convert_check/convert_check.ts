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
import * as Type from '../../type/index.ts'
import type { TLocalizedValidationError } from '../../error/index.ts'
import { Check } from '../check/index.ts'
import { Clone } from '../clone/index.ts'
import { Convert } from '../convert/index.ts'
import { Errors } from '../errors/index.ts'

// ------------------------------------------------------------------
// ConvertCheckStatus
// ------------------------------------------------------------------
/**
 * The tri-state outcome of a ConvertCheck operation: "unchanged" (the value was
 * already valid), "converted" (the value was invalid but a reasonable conversion
 * was found) and "failed" (the value remained invalid after conversion).
 */
export type TConvertCheckStatus = 'unchanged' | 'converted' | 'failed'
// ------------------------------------------------------------------
// ConvertCheckReceipt
// ------------------------------------------------------------------
/**
 * A receipt returned by ConvertCheck. This type communicates the tri-state outcome of an explicit
 * Convert-then-Check operation, the value that should be used by the caller, the residual validation
 * error paths on failure, and the union variant branch actually bound for union targets.
 */
export interface TConvertCheckReceipt<Value extends unknown = unknown> {
  /** The tri-state outcome: "unchanged" | "converted" | "failed". */
  status: TConvertCheckStatus
  /** True only when status is "converted". Provided for convenience, use status to disambiguate all three states. */
  converted: boolean
  /** The receipt value. This is the converted value on "converted" and the original unmodified value otherwise. */
  value: Value
  /** Residual validation errors (with instancePath error paths) captured when status is "failed". Empty otherwise. */
  errors: TLocalizedValidationError[]
  /** The union variant index actually bound for union targets, resolved by Checking the receipt value against each variant (never inferred from the last attempted conversion). Null for non-union targets and failed conversions. */
  branch: number | null
}
// ------------------------------------------------------------------
// UnionBranch
// ------------------------------------------------------------------
/** Resolves the union variant index the given value actually matches, or null if no variant matches. */
function UnionBranch(context: Type.TProperties, type: Type.TSchema, value: unknown): number | null {
  if (!Type.IsUnion(type)) return null
  const index = type.anyOf.findIndex(variant => Check(context, variant, value))
  return index === -1 ? null : index
}
// ------------------------------------------------------------------
// ConvertCheck
// ------------------------------------------------------------------
/**
 * Performs an explicit Convert-then-Check and returns a receipt disambiguating the three possible
 * outcomes: "unchanged" (already valid), "converted" (invalid but convertible) and "failed" (still
 * invalid after conversion). Conversion is bound to the actual target schema for object, array and
 * union types and is applied to an interior Clone, so the provided value is never mutated and a
 * failed conversion never leaves a partially converted object. On failure the receipt preserves the
 * residual validation error paths; on union targets it preserves the variant branch actually taken.
 * This function does not change the default Value.Convert behavior.
 */
export function ConvertCheck<Type extends Type.TSchema>(type: Type, value: unknown): TConvertCheckReceipt
/**
 * Performs an explicit Convert-then-Check and returns a receipt disambiguating the three possible
 * outcomes: "unchanged" (already valid), "converted" (invalid but convertible) and "failed" (still
 * invalid after conversion). Conversion is bound to the actual target schema for object, array and
 * union types and is applied to an interior Clone, so the provided value is never mutated and a
 * failed conversion never leaves a partially converted object. On failure the receipt preserves the
 * residual validation error paths; on union targets it preserves the variant branch actually taken.
 * This function does not change the default Value.Convert behavior.
 */
export function ConvertCheck<Context extends Type.TProperties, Type extends Type.TSchema>(context: Context, type: Type, value: unknown): TConvertCheckReceipt
/**
 * Performs an explicit Convert-then-Check and returns a receipt disambiguating the three possible
 * outcomes: "unchanged" (already valid), "converted" (invalid but convertible) and "failed" (still
 * invalid after conversion). Conversion is bound to the actual target schema for object, array and
 * union types and is applied to an interior Clone, so the provided value is never mutated and a
 * failed conversion never leaves a partially converted object. On failure the receipt preserves the
 * residual validation error paths; on union targets it preserves the variant branch actually taken.
 * This function does not change the default Value.Convert behavior.
 */
export function ConvertCheck(...args: unknown[]): TConvertCheckReceipt {
  const [context, type, value] = Arguments.Match<[Type.TProperties, Type.TSchema, unknown]>(args, {
    3: (context, type, value) => [context, type, value],
    2: (type, value) => [{}, type, value],
  })
  // Already Valid: no conversion attempted, the value is returned as-is.
  if (Check(context, type, value)) {
    return { status: 'unchanged', converted: false, value, errors: [], branch: UnionBranch(context, type, value) }
  }
  // Convertible: conversion is bound to the actual target schema and applied to an
  // interior Clone. The provided value is never mutated.
  const candidate = Convert(context, type, Clone(value))
  if (Check(context, type, candidate)) {
    return { status: 'converted', converted: true, value: candidate, errors: [], branch: UnionBranch(context, type, candidate) }
  }
  // Failed: the original unmodified value is returned (never a partially converted
  // object) and the residual validation error paths are preserved on the receipt.
  return { status: 'failed', converted: false, value, errors: Errors(context, type, candidate), branch: null }
}
