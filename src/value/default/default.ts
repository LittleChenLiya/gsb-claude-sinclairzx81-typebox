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
import { IsDefaultOptions, type TDefaultOptions } from './patch.ts'

/**
 * Patches missing properties on the value using default annotations specified on the provided type. This 
 * function returns unknown so callers should Check the return value before use. This function mutates the 
 * provided value. If mutation is not wanted, you should Clone the value before passing to this function.
 */
export function Default(type: TSchema, value: unknown): unknown
/**
 * Patches missing properties on the value using default annotations specified on the provided type. This 
 * function returns unknown so callers should Check the return value before use. This function mutates the 
 * provided value. If mutation is not wanted, you should Clone the value before passing to this function.
 * 
 * When the patches option is provided, this function appends a read-only TDefaultPatch entry for each 
 * field it fills with a default. Each entry reports the RFC-6901 JSON Pointer path of the filled field 
 * and a cloned copy of the assigned default value. Explicit null values are not considered missing and 
 * are never reported.
 */
export function Default(type: TSchema, value: unknown, options: TDefaultOptions): unknown
/**
 * Patches missing properties on the value using default annotations specified on the provided type. This 
 * function returns unknown so callers should Check the return value before use. This function mutates the 
 * provided value. If mutation is not wanted, you should Clone the value before passing to this function.
 */
export function Default(context: TProperties, type: TSchema, value: unknown): unknown
/**
 * Patches missing properties on the value using default annotations specified on the provided type. This 
 * function returns unknown so callers should Check the return value before use. This function mutates the 
 * provided value. If mutation is not wanted, you should Clone the value before passing to this function.
 * 
 * When the patches option is provided, this function appends a read-only TDefaultPatch entry for each 
 * field it fills with a default. Each entry reports the RFC-6901 JSON Pointer path of the filled field 
 * and a cloned copy of the assigned default value. Explicit null values are not considered missing and 
 * are never reported.
 */
export function Default(context: TProperties, type: TSchema, value: unknown, options: TDefaultOptions): unknown
/**
 * Patches missing properties on the value using default annotations specified on the provided type. This 
 * function returns unknown so callers should Check the return value before use. This function mutates the 
 * provided value. If mutation is not wanted, you should Clone the value before passing to this function.
 */
export function Default(...args: unknown[]): unknown {
  const [context, type, value, options] = Arguments.Match<[TProperties, TSchema, unknown, TDefaultOptions | undefined]>(args, {
    4: (context, type, value, options) => [context, type, value, options],
    3: (...args) => IsDefaultOptions(args[2]) ? [{}, args[0], args[1], args[2]] : [args[0], args[1], args[2], undefined],
    2: (type, value) => [{}, type, value, undefined],
  })
  const patches = options?.patches
  return FromType(context, type, value, patches === undefined ? undefined : { path: '', patches })
}