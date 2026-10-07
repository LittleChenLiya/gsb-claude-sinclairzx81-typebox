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

import { Guard } from '../../../guard/index.ts'
import { type TEnumValue, IsEnumValue } from '../../types/enum.ts'
import { type TTypeScriptEnumLike, IsTypeScriptEnumLike } from './typescript_enum_to_enum_values.ts'

// ------------------------------------------------------------------
// Static
// ------------------------------------------------------------------
// Removes duplicate enum values at the type level. Values are compared
// by their actual types, so the number 1 and the string '1' are treated
// as distinct values.
type TStrictValuesReduce<Values extends TEnumValue[], Seen extends TEnumValue[], Result extends TEnumValue[] = []> = (
  Values extends [infer Left extends TEnumValue, ...infer Right extends TEnumValue[]]
    ? Left extends Seen[number]
      ? TStrictValuesReduce<Right, [...Seen, Left], Result>
      : TStrictValuesReduce<Right, [...Seen, Left], [...Result, Left]>
    : Result
)
/** The strict, duplicate free value tuple of an Enum. */
export type TEnumStrictValues<Values extends TEnumValue[]> = TStrictValuesReduce<Values, []>

// ------------------------------------------------------------------
// Sources
// ------------------------------------------------------------------
/** Describes where an enum value originated from. */
export interface TEnumValueSource {
  /** Zero based position of the value. */
  index: number
  /** Enum member name for TypeScript enum like inputs, otherwise undefined. */
  key: string | undefined
}
/** Describes a duplicate enum value and where it originated. */
export interface TEnumDuplicateValue {
  value: TEnumValue
  /** The source of the first occurrence of the value. */
  first: TEnumValueSource
  /** The source of the repeated occurrence. */
  repeated: TEnumValueSource
}
/** Describes a value that is not a string or number. */
export interface TEnumInvalidValue {
  value: unknown
  source: TEnumValueSource
}

// ------------------------------------------------------------------
// Error
// ------------------------------------------------------------------
function FormatSource(source: TEnumValueSource): string {
  return source.key !== undefined ? `${source.key} ([${source.index}])` : `[${source.index}]`
}
function FormatValue(value: unknown): string {
  if (Guard.IsString(value)) return JSON.stringify(value)
  return `${String(value)} (${typeof value})`
}
/** Thrown when strict enum construction encounters invalid or duplicate values. */
export class StrictEnumValuesError extends Error {
  constructor(
    readonly invalid: TEnumInvalidValue[],
    readonly duplicates: TEnumDuplicateValue[]
  ) {
    const lines: string[] = []
    for (const duplicate of duplicates) {
      lines.push(`duplicate value ${FormatValue(duplicate.value)} at ${FormatSource(duplicate.repeated)}; first occurred at ${FormatSource(duplicate.first)}`)
    }
    for (const entry of invalid) {
      lines.push(`value ${FormatValue(entry.value)} at ${FormatSource(entry.source)} is not a string or number`)
    }
    super(`StrictEnum values are invalid:\n  - ${lines.join('\n  - ')}`)
    this.name = 'StrictEnumValuesError'
  }
}

// ------------------------------------------------------------------
// SameValue
// ------------------------------------------------------------------
// Compares values by their actual runtime types. The number 1 and the
// string '1' never compare equal.
function SameEnumValue(left: TEnumValue, right: TEnumValue): boolean {
  return typeof left === typeof right && left === right
}

// ------------------------------------------------------------------
// Entries
// ------------------------------------------------------------------
/** Collects enum values together with their source information. */
export function EnumStrictEntries(value: readonly TEnumValue[] | TTypeScriptEnumLike): { value: unknown, source: TEnumValueSource }[] {
  if (!IsTypeScriptEnumLike(value)) {
    return (value as readonly unknown[]).map((entry, index) => ({ value: entry, source: { index, key: undefined } }))
  }
  return Guard.Keys(value).filter((key) => isNaN(key as never)).map((key, index) => ({ value: value[key], source: { index, key } }))
}

// ------------------------------------------------------------------
// StrictEnumValues
// ------------------------------------------------------------------
/**
 * Validates and returns the values of a strict Enum. Values are compared by
 * actual type so the number 1 and string '1' are distinct. Throws a
 * StrictEnumValuesError, which carries the invalid values and the sources of
 * every duplicate, when the input is invalid. No schema is produced when an
 * error is thrown.
 */
export function StrictEnumValues(entries: { value: unknown, source: TEnumValueSource }[]): TEnumValue[] {
  const seen: { value: TEnumValue, source: TEnumValueSource }[] = []
  const duplicates: TEnumDuplicateValue[] = []
  const invalid: TEnumInvalidValue[] = []
  const values: TEnumValue[] = []
  for (const entry of entries) {
    if (!IsEnumValue(entry.value)) {
      invalid.push({ value: entry.value, source: entry.source })
      continue
    }
    const value: TEnumValue = entry.value
    const prior = seen.find((item) => SameEnumValue(item.value, value))
    if (prior !== undefined) {
      duplicates.push({ value, first: prior.source, repeated: entry.source })
    } else {
      seen.push({ value, source: entry.source })
      values.push(value)
    }
  }
  if (invalid.length > 0 || duplicates.length > 0) throw new StrictEnumValuesError(invalid, duplicates)
  return values
}
