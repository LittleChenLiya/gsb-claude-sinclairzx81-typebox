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
import { Clone } from '../../system/memory/clone.ts'

import * as Schema from '../types/index.ts'
import * as Stack from '../engine/_stack.ts'
import { Resolve } from '../resolve/index.ts'
import { Validator } from '../compile.ts'

// ------------------------------------------------------------------
// XRegistryError
//
// Thrown when a Registry operation fails: duplicate conflicting $id
// definitions, attempts to override an already sealed document, $ref
// values that cannot be resolved inside the collection or via an
// authorized external mapping, and compilation before binding.
// ------------------------------------------------------------------
export class XRegistryError extends Error {
  constructor(public readonly id: string, message: string) {
    super(message)
  }
}
// ------------------------------------------------------------------
// XRegistryEntry
//
// A sealed document held by a Registry. The schema is a deep clone of
// the value passed at registration time, so later mutation of caller
// objects can never affect the collection. The source is an optional
// provenance label (file path, url, name) retained in the index.
// ------------------------------------------------------------------
export interface XRegistryEntry {
  readonly id: string
  readonly source: string | undefined
  readonly schema: Schema.XSchema
}
// ------------------------------------------------------------------
// XRegistryBindResult
//
// Outcome of an explicit Bind pass. Bound lists every $id that is now
// fully linked; Unresolved lists the $ref values that could not be
// resolved against the collection or the authorized external mappings.
// ------------------------------------------------------------------
export interface XRegistryBindResult {
  readonly ok: boolean
  readonly bound: readonly string[]
  readonly unresolved: readonly { readonly id: string, readonly ref: string }[]
}
// ------------------------------------------------------------------
// Internal
// ------------------------------------------------------------------
type XEntries = Map<string, XRegistryEntry>
type XMapping = XRegistry | Record<string, Schema.XSchema>
type XExternal = Map<string, XMapping>

function IsRegistry(value: unknown): value is XRegistry {
  return value instanceof XRegistry
}
// ------------------------------------------------------------------
// Canonical
//
// $id values may be relative names ('Node') or absolute URIs
// ('https://example.com/node'). Relative names are normalized to a
// synthetic hierarchical base so the JSON Schema engine resolves
// cross-document refs between them; the synthetic host is reserved
// to this registry and can never collide with a user supplied URL.
// ------------------------------------------------------------------
const CanonicalBase = 'https://typebox.registry.local/'
function IsAbsoluteId(id: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(id)
}
function Canonical(id: string): string {
  return IsAbsoluteId(id) ? id : new URL(id, CanonicalBase).href
}
// The original $id text recorded for an index entry.
function OriginalId(canonical: string): string {
  return canonical.startsWith(CanonicalBase) ? canonical.slice(CanonicalBase.length) : canonical
}
function CanonicalHref(href: string): string {
  return href.split('#')[0]
}
// ------------------------------------------------------------------
// Errors
// ------------------------------------------------------------------
function ConflictingId(id: string): never {
  throw new XRegistryError(id, `Duplicate $id '${id}' registered with a different definition`)
}
function UnboundId(id: string): never {
  throw new XRegistryError(id, `Cannot compile '${id}' until the collection has been bound`)
}
function UnresolvableRef(id: string, ref: string): never {
  throw new XRegistryError(id, `Cannot resolve $ref '${ref}' for '${id}': not present in this collection or authorized external mappings`)
}
// ------------------------------------------------------------------
// Walk
//
// Depth first traversal of a schema document. The visitor returning
// false stops descent at that node. const and enum values are user
// data, not schema, and are skipped.
// ------------------------------------------------------------------
function Walk(schema: unknown, visit: (schema: Schema.XSchemaObject) => boolean | void): void {
  if (!Schema.IsSchemaObject(schema)) return
  if (visit(schema) === false) return
  for (const key of Guard.Keys(schema as Record<string, unknown>)) {
    if (Guard.IsEqual(key, 'const') || Guard.IsEqual(key, 'enum')) continue
    const value = (schema as Record<string, unknown>)[key]
    if (Guard.IsArray(value)) {
      for (const item of value) Walk(item, visit)
    } else {
      Walk(value, visit)
    }
  }
}
// ------------------------------------------------------------------
// RefsOf
//
// Collects every $ref string reachable from a document.
// ------------------------------------------------------------------
function RefsOf(schema: Schema.XSchema): string[] {
  const refs: string[] = []
  Walk(schema, (node) => {
    if (Schema.IsRef(node)) refs.push(node.$ref)
    return true
  })
  return refs
}
// ------------------------------------------------------------------
// Normalize
//
// Rewrites every relative $id in a sealed clone to its canonical
// absolute URI. $ref values are untouched: the engine resolves
// relative refs against each resource's normalized base.
// ------------------------------------------------------------------
function Normalize(schema: unknown): void {
  if (!Schema.IsSchemaObject(schema)) return
  if (Schema.IsId(schema) && !IsAbsoluteId(schema.$id)) {
    ;(schema as unknown as Record<string, unknown>).$id = Canonical(schema.$id)
  }
  for (const key of Guard.Keys(schema as Record<string, unknown>)) {
    if (Guard.IsEqual(key, 'const') || Guard.IsEqual(key, 'enum')) continue
    const value = (schema as Record<string, unknown>)[key]
    if (Guard.IsArray(value)) {
      for (const item of value) Normalize(item)
    } else {
      Normalize(value)
    }
  }
}
// ------------------------------------------------------------------
// IdsOf
//
// Returns every canonical $id contained in a normalized document,
// paired with the schema node that carries it. The first pair is
// always the document root.
// ------------------------------------------------------------------
function IdsOf(schema: Schema.XSchema): [string, Schema.XSchemaObject][] {
  const ids: [string, Schema.XSchemaObject][] = []
  Walk(schema, (node) => {
    if (Schema.IsId(node)) ids.push([node.$id, node])
    return true
  })
  return ids
}
// ------------------------------------------------------------------
// XRegistry
//
// An explicit, sealed collection of named schema documents used for
// reference compilation. Registries are isolated: $ref resolution is
// restricted to documents in this collection plus mappings that were
// explicitly authorized with External; a registry never reads from a
// process global cache and a new registration can never overwrite an
// existing document.
//
// Documents are deep cloned on registration, so subsequent mutation
// of the caller objects does not affect the sealed collection.
// Compilation happens only after Bind has linked every $ref;
// recursive references are allowed and are resolved lazily during
// validation, so cycles bind without infinite expansion.
// ------------------------------------------------------------------
export class XRegistry {
  // Sealed documents keyed by canonical $id.
  private readonly entries: XEntries = new Map()
  // Explicitly authorized external mappings (never a global cache).
  private readonly external: XExternal = new Map()
  // Canonical $ids whose refs have all been linked.
  private readonly bound: Set<string> = new Set()
  // ----------------------------------------------------------------
  // Constructor
  // ----------------------------------------------------------------
  constructor(schemas: Schema.XSchema[] = []) {
    for (const schema of schemas) this.Register(schema)
  }
  // ----------------------------------------------------------------
  // Register
  //
  // Adds a document to the collection. The document must carry a
  // root $id; nested $id nodes are indexed as part of the same tree.
  // A second registration with the same $id is accepted only when
  // the definitions are structurally identical; conflicting
  // definitions throw XRegistryError, and an existing sealed document
  // is never replaced by new content.
  // ----------------------------------------------------------------
  public Register<const T extends Schema.XSchema>(schema: T, source?: string): this {
    const cloned = Clone(schema)
    Normalize(cloned)
    const ids = IdsOf(cloned)
    if (ids.length === 0) throw new XRegistryError('', 'Cannot register schema without a $id')
    for (const [id, node] of ids) {
      const existing = this.entries.get(id)
      if (existing) {
        if (!Guard.IsDeepEqual(existing.schema, node)) ConflictingId(OriginalId(id))
      } else {
        this.entries.set(id, { id: OriginalId(id), source, schema: node })
      }
    }
    // New content invalidates any previous binding.
    this.bound.clear()
    return this
  }
  // ----------------------------------------------------------------
  // External
  //
  // Authorizes an external mapping for $ref resolution. The mapping
  // may be another XRegistry or a plain canonical-id -> schema
  // record. Mappings are used only when passed here; nothing is
  // pulled from a global registry cache.
  // ----------------------------------------------------------------
  public External(id: string, mapping: XMapping): this {
    this.external.set(id, mapping)
    this.bound.clear()
    return this
  }
  // ----------------------------------------------------------------
  // Has
  // ----------------------------------------------------------------
  public Has(id: string): boolean {
    return this.entries.has(Canonical(id))
  }
  // ----------------------------------------------------------------
  // Get
  //
  // Returns the sealed schema for an id, or undefined when the
  // collection does not hold it.
  // ----------------------------------------------------------------
  public Get(id: string): Schema.XSchema | undefined {
    return this.entries.get(Canonical(id))?.schema
  }
  // ----------------------------------------------------------------
  // Source
  //
  // Returns the provenance label recorded for an id.
  // ----------------------------------------------------------------
  public Source(id: string): string | undefined {
    return this.entries.get(Canonical(id))?.source
  }
  // ----------------------------------------------------------------
  // Index
  //
  // Returns the retained schema index: every registered id paired
  // with its source label and sealed schema.
  // ----------------------------------------------------------------
  public Index(): readonly XRegistryEntry[] {
    return [...this.entries.values()]
  }
  // ----------------------------------------------------------------
  // Ids
  // ----------------------------------------------------------------
  public Ids(): string[] {
    return [...this.entries.keys()].map(OriginalId)
  }
  // ----------------------------------------------------------------
  // IsBound
  // ----------------------------------------------------------------
  public IsBound(id: string): boolean {
    return this.bound.has(Canonical(id))
  }
  // ----------------------------------------------------------------
  // (Internal) Context
  //
  // Builds the canonical-href -> root schema record consumed by the
  // engine. Scoped to this collection plus its authorized external
  // records; it never aggregates unrelated registries or a process
  // global cache.
  // ----------------------------------------------------------------
  private Context(): Record<string, Schema.XSchema> {
    const context: Record<string, Schema.XSchema> = {}
    for (const [id, entry] of this.entries) context[id] = entry.schema
    for (const mapping of this.external.values()) {
      if (IsRegistry(mapping)) {
        for (const [key, schema] of Object.entries(mapping.Context())) context[key] = schema
      } else {
        for (const key of Guard.Keys(mapping)) context[Canonical(key)] = mapping[key]
      }
    }
    return context
  }
  // ----------------------------------------------------------------
  // (Internal) ExternalContexts
  //
  // Flattens authorized external registries into context records.
  // Each external registry contributes its own scoped context only.
  // ----------------------------------------------------------------
  private ExternalContexts(): Record<string, Schema.XSchema>[] {
    const contexts: Record<string, Schema.XSchema>[] = []
    for (const mapping of this.external.values()) {
      if (IsRegistry(mapping)) contexts.push(mapping.Context())
    }
    return contexts
  }
  // ----------------------------------------------------------------
  // (Internal) Resolve
  //
  // Resolves a single $ref against the local document tree, the rest
  // of the collection, and the authorized external mappings. Used by
  // Bind to prove every reference has a concrete target before any
  // validator is generated.
  // ----------------------------------------------------------------
  private Resolve(rootId: string, root: Schema.XSchema, ref: string): Schema.XSchema | undefined {
    const context = this.Context()
    // (1) resolution against the whole collection: the local
    // document resolves fragments and relative refs, while the
    // scoped context resolves cross-document $refs.
    const local = Resolve.Ref(Stack.Stack(context, root), { $ref: ref }).schema
    if (Schema.IsSchema(local)) return local
    // (2) explicit canonical document lookup covers absolute refs
    // whose fragment points inside a sealed remote document.
    const base = Stack.NextUri(rootId, Stack.DefaultUri).href
    const target = Stack.NextUri(ref, base)
    const canonical = Canonical(CanonicalHref(target.href))
    const remoteEntry = this.entries.get(canonical)
    if (remoteEntry && !Guard.IsEqual(canonical, rootId)) {
      if (Guard.IsEqual(target.hash, '')) return remoteEntry.schema
      const remoteHit = Resolve.Ref(Stack.Stack(context, remoteEntry.schema), { $ref: target.href }).schema
      if (Schema.IsSchema(remoteHit)) return remoteHit
    }
    // (3) authorized external mappings only; never a global cache.
    for (const externalContext of this.ExternalContexts()) {
      const resolved = Resolve.Ref(Stack.Stack(externalContext, root), { $ref: ref }).schema
      if (Schema.IsSchema(resolved)) return resolved
    }
    for (const mapping of this.external.values()) {
      if (IsRegistry(mapping)) continue
      const direct = mapping[ref]
      if (Schema.IsSchema(direct)) return direct
      const remote = mapping[canonical]
      if (Schema.IsSchema(remote)) return remote
    }
    return undefined
  }
  // ----------------------------------------------------------------
  // Bind
  //
  // Explicitly links every $ref of every registered document.
  // Recursive references resolve because every document already
  // exists in the collection while binding; cycles terminate without
  // infinite expansion. Bind throws on the first unresolved ref by
  // default, or returns a structured result when throw is false; no
  // validators are generated here.
  // ----------------------------------------------------------------
  public Bind(): XRegistryBindResult
  public Bind(options: { throw: false }): XRegistryBindResult
  public Bind(options: { throw: true }): XRegistryBindResult
  public Bind(options: { throw?: boolean } = {}): XRegistryBindResult {
    const shouldThrow = options.throw !== false
    const unresolved: { id: string, ref: string }[] = []
    const boundCanonical: string[] = []
    for (const [id, entry] of this.entries) {
      let documentResolved = true
      for (const ref of RefsOf(entry.schema)) {
        const resolved = this.Resolve(id, entry.schema, ref)
        if (!Schema.IsSchema(resolved)) {
          documentResolved = false
          unresolved.push({ id: OriginalId(id), ref })
        }
      }
      if (documentResolved) {
        boundCanonical.push(id)
      } else {
        this.bound.delete(id)
      }
    }
    if (unresolved.length > 0 && shouldThrow) {
      const first = unresolved[0]
      UnresolvableRef(first.id, first.ref)
    }
    for (const id of boundCanonical) this.bound.add(id)
    return { ok: unresolved.length === 0, bound: boundCanonical.map(OriginalId), unresolved }
  }
  // ----------------------------------------------------------------
  // Compile
  //
  // Generates a Validator only after the requested document has been
  // fully bound. The validator runs against this registry's scoped
  // context, so recursive refs execute lazily at check time instead
  // of being expanded at build time.
  // ----------------------------------------------------------------
  public Compile(id: string): Validator<Schema.XSchema, unknown> {
    const canonical = Canonical(id)
    const entry = this.entries.get(canonical)
    if (!entry) throw new XRegistryError(id, `Unknown schema $id '${id}'`)
    if (!this.bound.has(canonical)) {
      this.Bind({ throw: false })
      if (!this.bound.has(canonical)) UnboundId(entry.id)
    }
    return new Validator(this.Context(), entry.schema)
  }
  // ----------------------------------------------------------------
  // TryCompile
  //
  // Non throwing compile. Returns undefined for an unknown id or for
  // any document that still has unresolved refs ("unknown ref, no
  // validator").
  // ----------------------------------------------------------------
  public TryCompile(id: string): Validator<Schema.XSchema, unknown> | undefined {
    const canonical = Canonical(id)
    const entry = this.entries.get(canonical)
    if (!entry) return undefined
    this.Bind({ throw: false })
    if (!this.bound.has(canonical)) return undefined
    return new Validator(this.Context(), entry.schema)
  }
  // ----------------------------------------------------------------
  // Delete
  //
  // Removes a document from the collection.
  // ----------------------------------------------------------------
  public Delete(id: string): boolean {
    this.bound.delete(Canonical(id))
    return this.entries.delete(Canonical(id))
  }
}
// ------------------------------------------------------------------
// Registry
//
// Functional entry point mirroring Schema.Compile usage.
// ------------------------------------------------------------------
/** Creates an explicit schema registry from the given documents. */
export function Registry(schemas: Schema.XSchema[] = []): XRegistry {
  return new XRegistry(schemas)
}