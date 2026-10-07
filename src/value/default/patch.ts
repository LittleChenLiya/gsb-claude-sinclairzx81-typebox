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

import { Guard } from '../../guard/index.ts'
import { Clone } from '../clone/index.ts'

// ------------------------------------------------------------------
// TDefaultPatch
// ------------------------------------------------------------------
/**
 * A read-only description of a single default assignment performed by Default. The 
 * path is an RFC-6901 JSON Pointer locating the field that was filled. The value is 
 * a cloned copy of the assigned default: mutating it never writes back to the value 
 * that was patched.
 */
export interface TDefaultPatch {
  /** RFC-6901 JSON Pointer path to the field that was filled with a default. */
  readonly path: string
  /** A cloned copy of the default value assigned at the path. */
  readonly value: unknown
}
// ------------------------------------------------------------------
// TDefaultOptions
// ------------------------------------------------------------------
/**
 * Options for the Default function. When the patches array is provided, Default 
 * appends a read-only TDefaultPatch entry for each field it fills with a default 
 * annotation. When omitted, Default behaves exactly as it did before.
 */
export interface TDefaultOptions {
  /** Receives read-only patch entries describing each default assignment. */
  patches: TDefaultPatch[]
}
// ------------------------------------------------------------------
// IsDefaultOptions
// ------------------------------------------------------------------
/** Returns true if the given value is a TDefaultOptions object. */
export function IsDefaultOptions(value: unknown): value is TDefaultOptions {
  return Guard.IsObject(value) && Guard.HasPropertyKey(value, 'patches') && Guard.IsArray(value.patches)
}
// ------------------------------------------------------------------
// TPatchState (Internal)
// ------------------------------------------------------------------
/** Internal state threaded through the Default traversal when patching is enabled. */
export interface TPatchState {
  /** The current RFC-6901 JSON Pointer path. */
  path: string
  /** The caller provided patch collector. */
  patches: TDefaultPatch[]
}
// ------------------------------------------------------------------
// CreatePatchState (Internal)
// ------------------------------------------------------------------
/** Creates a child patch state for the given key, or returns undefined if disabled. */
export function CreatePatchState(state: TPatchState | undefined, key: string | number): TPatchState | undefined {
  if (Guard.IsUndefined(state)) return undefined
  const escaped = key.toString().replace(/~/g, '~0').replace(/\//g, '~1')
  return { path: `${state.path}/${escaped}`, patches: state.patches }
}
// ------------------------------------------------------------------
// PushPatch (Internal)
// ------------------------------------------------------------------
/** Pushes a read-only patch entry for the current path. The value is cloned so the 
 * report never aliases (and can never write back to) the patched value. Returns the 
 * value unchanged.
 */
export function PushPatch(state: TPatchState, value: unknown): unknown {
  state.patches.push({ path: state.path, value: Clone(value) })
  return value
}
