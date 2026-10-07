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
import type { TProperties, TSchema } from '../../type/index.ts'
import { FromType } from './from_type.ts'
import { CreateState, type TDefaultPatch } from './state.ts'

/**
 * Patches missing properties on the value using default annotations specified on the provided type and
 * reports a read-only patch for each default value assigned. Each patch carries a JSON Pointer path
 * locating the filled value as well as a cloned copy of the assigned default. Explicit null values are
 * not considered missing and are never reported. This function returns unknown so callers should Check
 * the return value before use. This function mutates the provided value. If mutation is not wanted, you
 * should Clone the value before passing to this function.
 */
export function DefaultWithPatches(type: TSchema, value: unknown, patches: TDefaultPatch[]): unknown
/**
 * Patches missing properties on the value using default annotations specified on the provided type and
 * reports a read-only patch for each default value assigned. Each patch carries a JSON Pointer path
 * locating the filled value as well as a cloned copy of the assigned default. Explicit null values are
 * not considered missing and are never reported. This function returns unknown so callers should Check
 * the return value before use. This function mutates the provided value. If mutation is not wanted, you
 * should Clone the value before passing to this function.
 */
export function DefaultWithPatches(context: TProperties, type: TSchema, value: unknown, patches: TDefaultPatch[]): unknown
/**
 * Patches missing properties on the value using default annotations specified on the provided type and
 * reports a read-only patch for each default value assigned. Each patch carries a JSON Pointer path
 * locating the filled value as well as a cloned copy of the assigned default. Explicit null values are
 * not considered missing and are never reported. This function returns unknown so callers should Check
 * the return value before use. This function mutates the provided value. If mutation is not wanted, you
 * should Clone the value before passing to this function.
 */
export function DefaultWithPatches(...args: unknown[]): unknown {
  const [context, type, value, patches] = Arguments.Match<[TProperties, TSchema, unknown, TDefaultPatch[]]>(args, {
    4: (context, type, value, patches) => [context, type, value, patches],
    3: (type, value, patches) => [{}, type, value, patches],
  })
  return FromType(context, type, value, CreateState(patches))
}
