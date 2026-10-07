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
import { Memory } from '../../system/memory/index.ts'
import { type TSchema, type TSchemaOptions, IsKind } from './schema.ts'
import { type TTypeScriptEnumLike, IsTypeScriptEnumLike } from '../engine/enum/typescript_enum_to_enum_values.ts'
import { type TTypeScriptEnumToEnumValues, TypeScriptEnumToEnumValues } from '../engine/enum/typescript_enum_to_enum_values.ts'

// ------------------------------------------------------------------
// Static
// ------------------------------------------------------------------
export type StaticEnum<Values extends TEnumValue[]> = (
  Values[number]
)
// ------------------------------------------------------------------
// EnumValue
// ------------------------------------------------------------------
export type TEnumValue = string | number

/** Returns true if the given value is a EnumValue */
export function IsEnumValue(value: unknown): value is TEnumValue {
  return Guard.IsString(value) || Guard.IsNumber(value)
}
// ------------------------------------------------------------------
// InvalidEnumValue
// ------------------------------------------------------------------
export class InvalidEnumValue extends Error {
  declare readonly cause: { source: string, value: unknown }
  constructor(source: string, value: unknown) {
    super(`Invalid Enum value at ${source}`)
    Object.defineProperty(this, 'cause', {
      value: { source, value },
      writable: false,
      configurable: false,
      enumerable: false
    })
  }
}
// ------------------------------------------------------------------
// DuplicateEnumValue
// ------------------------------------------------------------------
export class DuplicateEnumValue extends Error {
  declare readonly cause: { value: TEnumValue, sources: string[] }
  constructor(value: TEnumValue, sources: string[]) {
    super(`Duplicate Enum value ${JSON.stringify(value)} sourced from ${sources.join(', ')}`)
    Object.defineProperty(this, 'cause', {
      value: { value, sources },
      writable: false,
      configurable: false,
      enumerable: false
    })
  }
}
// ------------------------------------------------------------------
// Type
// ------------------------------------------------------------------

/** Represents an Enum type. */
export interface TEnum<Values extends TEnumValue[] = TEnumValue[]> extends TSchema {
  '~kind': 'Enum'
  enum: Values
}
// ------------------------------------------------------------------
// Factory
// ------------------------------------------------------------------
/** Creates an Enum type. */
export function Enum<Values extends TEnumValue[]>(values: readonly [...Values], options?: TSchemaOptions): TEnum<Values> 
/** Creates an Enum type from a TypeScript enum declaration. */
export function Enum<Enum extends TTypeScriptEnumLike>(value: Enum, options?: TSchemaOptions): TEnum<TTypeScriptEnumToEnumValues<Enum>> 
/** Creates an Enum type. */
export function Enum(value: readonly TEnumValue[] | TTypeScriptEnumLike, options?: TSchemaOptions): never {
  const values = IsTypeScriptEnumLike(value) ? TypeScriptEnumToEnumValues(value) : value
  return Memory.Create({ '~kind': 'Enum' }, { enum: values }, options) as never
}
// ------------------------------------------------------------------
// EnumStrict
// ------------------------------------------------------------------
interface TEnumEntry {
  source: string
  value: unknown
}
/** Resolves enum entries with their originating source (array index or enum key). */
function EnumEntries(value: readonly TEnumValue[] | TTypeScriptEnumLike): TEnumEntry[] {
  return IsTypeScriptEnumLike(value)
    ? Guard.Keys(value).filter((key) => isNaN(key as never)).map((key) => ({ source: `key '${key}'`, value: value[key] }))
    : value.map((entry, index) => ({ source: `index ${index}`, value: entry }))
}
/** Computes a type-sensitive identity for an enum value. Distinguishes numeric 1 from string '1'. */
function EnumIdentity(value: TEnumValue): string {
  return `${typeof value}:${value}`
}
/** Creates an Enum type using strict validation. Throws InvalidEnumValue if a value is not a string or number, and DuplicateEnumValue if two sources resolve to the same constant value. Values are compared by actual type, such that numeric 1 and string '1' are considered distinct. No schema is returned for invalid enums. */
export function EnumStrict<Values extends TEnumValue[]>(values: readonly [...Values], options?: TSchemaOptions): TEnum<Values>
/** Creates an Enum type from a TypeScript enum declaration using strict validation. Throws on aliased duplicate values. */
export function EnumStrict<Enum extends TTypeScriptEnumLike>(value: Enum, options?: TSchemaOptions): TEnum<TTypeScriptEnumToEnumValues<Enum>>
/** Creates an Enum type using strict validation. */
export function EnumStrict(value: readonly TEnumValue[] | TTypeScriptEnumLike, options?: TSchemaOptions): never {
  const entries = EnumEntries(value)
  // validate all values and detect duplicates prior to creating the schema
  const identities = new Map<string, string>()
  for (const entry of entries) {
    if (!IsEnumValue(entry.value)) throw new InvalidEnumValue(entry.source, entry.value)
    const identity = EnumIdentity(entry.value)
    const source = identities.get(identity)
    if (source !== undefined) throw new DuplicateEnumValue(entry.value, [source, entry.source])
    identities.set(identity, entry.source)
  }
  const values = entries.map((entry) => entry.value as TEnumValue)
  return Memory.Create({ '~kind': 'Enum' }, { enum: values }, options) as never
}
// ------------------------------------------------------------------
// Guard
// ------------------------------------------------------------------
/** Returns true if the given value is a TEnum. */
export function IsEnum(value: unknown): value is TEnum {
  return IsKind(value, 'Enum')
}