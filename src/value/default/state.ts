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
 * A read-only modification note describing a single default value assignment applied while
 * patching a value with Default. The value held by the patch is a cloned copy of the value
 * assigned into the target. Mutating the patch does not modify the patched value, and
 * mutating the patched value does not modify the patch.
 */
export interface TDefaultPatch {
  /** A JSON Pointer (RFC 6901) locating the filled value. The root value is denoted by an empty string. */
  path: string
  /** A cloned copy of the default value assigned at the path. */
  value: unknown
}
// ------------------------------------------------------------------
// TDefaultState
// ------------------------------------------------------------------
/** Internal state threaded through Default traversal when patch reporting is enabled. */
export interface TDefaultState {
  /** The current path segments relative to the root value. */
  path: string[]
  /** The caller provided patch receptacle. */
  patches: TDefaultPatch[]
}
/** Creates a new default state for the given patch receptacle. */
export function CreateState(patches: TDefaultPatch[]): TDefaultState {
  return { path: [], patches }
}
/** Derives a new state with the given key appended to the current path. */
export function PushPath(state: TDefaultState | undefined, key: string | number): TDefaultState | undefined {
  return Guard.IsUndefined(state) ? undefined : { path: [...state.path, key.toString()], patches: state.patches }
}
/** Encodes path segments as a JSON Pointer (RFC 6901). The root is denoted by an empty string. */
export function EncodePath(path: string[]): string {
  return path.length === 0 ? '' : '/' + path.map(segment => segment.replace(/~/g, '~0').replace(/\//g, '~1')).join('/')
}
/** Records a patch for a value filled by a default annotation. The recorded value is cloned. */
export function AddPatch(state: TDefaultState, value: unknown): void {
  state.patches.push({ path: EncodePath(state.path), value: Clone(value) })
}
