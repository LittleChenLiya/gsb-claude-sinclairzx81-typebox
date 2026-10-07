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
// deno-lint-ignore-file

import type { TProperties, TUnion } from '../../type/index.ts'
import { Check } from '../check/index.ts'
import { Clone } from '../clone/index.ts'
import { FromType } from './from_type.ts'
import { Guard } from '../../guard/index.ts'
import type { TDefaultPatch, TDefaultState } from './state.ts'

export function FromUnion(context: TProperties, schema: TUnion, value: unknown, state?: TDefaultState): unknown {
  for (const inner of schema.anyOf) {
    // collect patches tentatively: only patches for the matching variant are reported
    const patches: TDefaultPatch[] = []
    const innerState = Guard.IsUndefined(state) ? undefined : { path: state.path, patches }
    const result = FromType(context, inner, Clone(value), innerState)
    if (Check(context, inner, result)) {
      if (!Guard.IsUndefined(state)) state.patches.push(...patches)
      return result
    }
  }
  return value
}