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

import { Guard } from '../guard/index.ts'
import { type TProperties, type TSchema } from '../type/index.ts'
import { Clone, Equal } from '../value/index.ts'
import { Validator } from './validator.ts'

// ------------------------------------------------------------------
// Errors
// ------------------------------------------------------------------
/** Base error for all Manifest related errors. */
export class ManifestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManifestError'
  }
}
/** Raised when a schema is registered with an identifier that is already registered with a different definition. */
export class ManifestConflictError extends ManifestError {
  constructor(id: string) {
    super(`Manifest conflict: a schema with identifier '${id}' is already registered with a different definition`)
    this.name = 'ManifestConflictError'
  }
}
/** Raised when a reference cannot be resolved within the manifest or its authorized externals. */
export class ManifestReferenceError extends ManifestError {
  constructor(message: string) {
    super(message)
    this.name = 'ManifestReferenceError'
  }
}
/** Raised when registering a schema on a manifest that has already been sealed. */
export class ManifestSealedError extends ManifestError {
  constructor(id: string) {
    super(`Manifest sealed: cannot register schema '${id}' after the manifest has been sealed`)
    this.name = 'ManifestSealedError'
  }
}
// ------------------------------------------------------------------
// DeepFreeze
// ------------------------------------------------------------------
function DeepFreeze(value: unknown, visited: Set<unknown> = new Set()): void {
  if (!Guard.IsObject(value) || visited.has(value)) return
  visited.add(value)
  if (Guard.IsArray(value)) {
    for (const item of value) DeepFreeze(item, visited)
  } else {
    for (const key of Guard.Keys(value)) DeepFreeze(value[key], visited)
  }
  Object.freeze(value)
}
// ------------------------------------------------------------------
// CollectRefs
// ------------------------------------------------------------------
function CollectRefs(value: unknown, refs: Set<string>, visited: Set<unknown>): void {
  if (!Guard.IsObject(value) || visited.has(value)) return
  visited.add(value)
  if (Guard.IsArray(value)) {
    for (const item of value) CollectRefs(item, refs, visited)
    return
  }
  const record = value as Record<string, unknown>
  if (Guard.IsString(record.$ref)) refs.add(record.$ref)
  for (const key of Guard.Keys(record)) {
    if (Guard.IsEqual(key, 'const') || Guard.IsEqual(key, 'enum')) continue // user data, not schema
    CollectRefs(record[key], refs, visited)
  }
}
// ------------------------------------------------------------------
// CollectIdentifiers
// ------------------------------------------------------------------
function CollectIdentifiers(value: unknown, identifiers: Set<string>, visited: Set<unknown>): void {
  if (!Guard.IsObject(value) || visited.has(value)) return
  visited.add(value)
  if (Guard.IsArray(value)) {
    for (const item of value) CollectIdentifiers(item, identifiers, visited)
    return
  }
  const record = value as Record<string, unknown>
  if (Guard.IsString(record.$id)) identifiers.add(record.$id)
  if (Guard.IsString(record.$anchor)) identifiers.add(record.$anchor)
  for (const key of Guard.Keys(record)) {
    if (Guard.IsEqual(key, 'const') || Guard.IsEqual(key, 'enum')) continue // user data, not schema
    CollectIdentifiers(record[key], identifiers, visited)
  }
}
// ------------------------------------------------------------------
// RequireId
// ------------------------------------------------------------------
function RequireId(schema: TSchema): string {
  if (Guard.IsObject(schema) && Guard.HasPropertyKey(schema, '$id') && Guard.IsString(schema.$id)) return schema.$id
  throw new ManifestError('Manifest registration requires a schema with an $id or an explicit identifier')
}
// ------------------------------------------------------------------
// Manifest
// ------------------------------------------------------------------
/**
 * An explicit manifest of schemas registered for reference compilation. Schemas
 * are registered by identifier into a collection where each $ref must resolve
 * within the collection or an authorized external mapping. The manifest does
 * not use any global cache: collections are independent per instance and a
 * sealed collection is never overwritten by later registrations. Schemas are
 * snapshotted and frozen on registration, so subsequent modification of the
 * source objects does not affect the sealed collection. Validators are only
 * generated once every registered schema has been bound, and recursive
 * references are supported without infinite expansion.
 */
export class Manifest {
  private readonly externals: TProperties
  private readonly schemas: Map<string, TSchema> = new Map()
  private readonly validators: Map<string, Validator> = new Map()
  private sealed: boolean = false
  /** Creates a new Manifest with an optional authorized external mapping. */
  constructor(externals: TProperties = {}) {
    const snapshot: TProperties = {}
    for (const key of Guard.Keys(externals)) {
      const cloned = Clone(externals[key])
      DeepFreeze(cloned)
      snapshot[key] = cloned
    }
    this.externals = Object.freeze(snapshot)
  }
  // ----------------------------------------------------------------
  // Registration
  // ----------------------------------------------------------------
  /** Registers a schema into this manifest using its $id. */
  public Add<const Type extends TSchema>(schema: Type): this
  /** Registers a schema into this manifest using an explicit identifier. */
  public Add<const Type extends TSchema>(id: string, schema: Type): this
  /** Registers a schema into this manifest. */
  public Add(...args: [TSchema] | [string, TSchema]): this {
    const [id, schema] = args.length === 2 ? args : [RequireId(args[0]), args[0]]
    if (this.sealed) throw new ManifestSealedError(id)
    if (Guard.IsObject(schema) && Guard.HasPropertyKey(schema, '$id') && Guard.IsString(schema.$id) && !Guard.IsEqual(schema.$id, id)) {
      throw new ManifestError(`Manifest registration: schema $id '${schema.$id}' does not match registration identifier '${id}'`)
    }
    const snapshot = Clone(schema)
    const existing = this.schemas.get(id)
    if (!Guard.IsUndefined(existing)) {
      if (!Equal(existing, snapshot)) throw new ManifestConflictError(id)
      return this // identical re-registration is a no-op
    }
    DeepFreeze(snapshot)
    this.schemas.set(id, snapshot)
    return this
  }
  // ----------------------------------------------------------------
  // Index
  // ----------------------------------------------------------------
  /** Returns true if a schema is registered with the given identifier. */
  public Has(id: string): boolean {
    return this.schemas.has(id)
  }
  /** Returns the registered schema for the given identifier, or undefined. */
  public Get(id: string): TSchema | undefined {
    return this.schemas.get(id)
  }
  /** Returns the identifiers registered in this manifest. */
  public Ids(): string[] {
    return [...this.schemas.keys()]
  }
  /** Returns the authorized external mapping for this manifest. */
  public Externals(): Readonly<TProperties> {
    return this.externals
  }
  /** Returns a schema index for this manifest, mapping identifiers to their registered schemas. */
  public Index(): Readonly<Record<string, TSchema>> {
    const index: Record<string, TSchema> = {}
    for (const [id, schema] of this.schemas) index[id] = schema
    return Object.freeze(index)
  }
  // ----------------------------------------------------------------
  // Seal
  // ----------------------------------------------------------------
  /** Returns true if this manifest has been sealed. */
  public IsSealed(): boolean {
    return this.sealed
  }
  /**
   * Seals this manifest by binding every registered schema. Each reference must
   * resolve within this collection or the authorized external mapping. Once
   * sealed, no further registrations are accepted and validators may be
   * generated for the bound collection.
   */
  public Seal(): this {
    if (this.sealed) return this
    for (const [id, schema] of this.schemas) this.AssertResolvable(id, schema)
    this.sealed = true
    return this
  }
  // ----------------------------------------------------------------
  // Compile
  // ----------------------------------------------------------------
  /**
   * Compiles the schema registered with the given identifier into a Validator.
   * The manifest is sealed prior to compilation such that validators are only
   * generated once every registered schema has been bound.
   */
  public Compile<const Type extends TSchema = TSchema>(id: string): Validator<TProperties, Type> {
    this.Seal()
    const existing = this.validators.get(id)
    if (!Guard.IsUndefined(existing)) return existing as never
    const schema = this.schemas.get(id)
    if (Guard.IsUndefined(schema)) throw new ManifestReferenceError(`Manifest reference: no schema registered with identifier '${id}'`)
    const validator = new Validator(this.Context(), schema)
    this.validators.set(id, validator)
    return validator as never
  }
  /** Tries to compile the schema registered with the given identifier. Returns undefined if no validator can be generated. */
  public TryCompile<const Type extends TSchema = TSchema>(id: string): Validator<TProperties, Type> | undefined {
    try {
      return this.Compile<Type>(id)
    } catch {
      return undefined
    }
  }
  // ----------------------------------------------------------------
  // Internal
  // ----------------------------------------------------------------
  private Context(): TProperties {
    const context: TProperties = { ...this.externals }
    for (const [id, schema] of this.schemas) context[id] = schema
    return context
  }
  private IsResolvable(ref: string, identifiers: Set<string>): boolean {
    if (ref.startsWith('#')) return true // local to its declaring resource
    if (identifiers.has(ref)) return true // declared within its own schema
    if (this.schemas.has(ref) || Guard.HasPropertyKey(this.externals, ref)) return true
    const canonical = ref.split('#')[0]
    if (canonical.length === 0 || Guard.IsEqual(canonical, ref)) return false
    return identifiers.has(canonical) || this.schemas.has(canonical) || Guard.HasPropertyKey(this.externals, canonical)
  }
  private AssertResolvable(id: string, schema: TSchema): void {
    const refs = new Set<string>()
    const identifiers = new Set<string>()
    CollectRefs(schema, refs, new Set())
    CollectIdentifiers(schema, identifiers, new Set())
    for (const ref of refs) {
      if (!this.IsResolvable(ref, identifiers)) throw new ManifestReferenceError(`Manifest reference: unable to resolve reference '${ref}' declared by schema '${id}'`)
    }
  }
}
