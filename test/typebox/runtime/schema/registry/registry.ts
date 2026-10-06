import { Assert } from 'test'
import Schema from 'typebox/schema'

const Test = Assert.Context('Schema.Registry')

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------
const Node = {
  $id: 'Node',
  type: 'object',
  properties: {
    id: { type: 'number' },
    children: { type: 'array', items: { $ref: 'Node' } }
  },
  required: ['id']
}
const TreeMeta = {
  $id: 'TreeMeta',
  type: 'object',
  properties: { owner: { $ref: 'Tree' } }
}
const Tree = {
  $id: 'Tree',
  type: 'object',
  properties: {
    root: { $ref: 'Node' },
    meta: { $ref: 'TreeMeta' }
  }
}

// ------------------------------------------------------------------
// Bind | Recursive
// ------------------------------------------------------------------
Test('Should bind two mutually recursive schemas 1', () => {
  const registry = new Schema.XRegistry([Node, Tree, TreeMeta])
  const result = registry.Bind()
  Assert.IsTrue(result.ok)
  Assert.IsTrue(result.bound.includes('Node'))
  Assert.IsTrue(result.bound.includes('Tree'))
  Assert.IsTrue(result.bound.includes('TreeMeta'))
  Assert.IsTrue(registry.IsBound('Node'))
})
Test('Should bind two mutually recursive schemas 2', () => {
  const registry = new Schema.XRegistry([Node, Tree, TreeMeta])
  registry.Bind()
  const validator = registry.Compile('Node')
  Assert.IsTrue(validator.Check({ id: 1, children: [{ id: 2 }, { id: 3, children: [{ id: 4 }] }] }))
  Assert.IsFalse(validator.Check({ id: 1, children: [{ id: 'bad' }] }))
})
Test('Should bind two mutually recursive schemas 3', () => {
  const registry = new Schema.XRegistry([Node, Tree, TreeMeta])
  registry.Bind()
  const validator = registry.Compile('Tree')
  Assert.IsTrue(validator.Check({ root: { id: 1 }, meta: { owner: { root: { id: 2 } } } }))
  Assert.IsFalse(validator.Check({ root: { id: 1 }, meta: { owner: { root: { id: false } } } }))
})
Test('Should bind two mutually recursive schemas 4', () => {
  const A = { $id: 'A', properties: { b: { $ref: 'B' } } }
  const B = { $id: 'B', properties: { a: { $ref: 'A' } } }
  const registry = new Schema.XRegistry([A, B])
  Assert.IsTrue(registry.Bind().ok)
})
Test('Should bind two mutually recursive schemas 5', () => {
  // functional entry
  const registry = Schema.Registry([Node]).Register(Tree).Register(TreeMeta)
  Assert.IsTrue(registry.Bind().ok)
  Assert.IsTrue(registry.Compile('Node').Check({ id: 1 }))
})

// ------------------------------------------------------------------
// Register | Duplicate $id
// ------------------------------------------------------------------
Test('Should reject duplicate $id with different definition 1', () => {
  const registry = new Schema.XRegistry([{ $id: 'A', type: 'string' }])
  Assert.Throws(() => registry.Register({ $id: 'A', type: 'number' }))
})
Test('Should reject duplicate $id with different definition 2', () => {
  const registry = new Schema.XRegistry()
  registry.Register({ $id: 'https://example.com/a', type: 'string' })
  Assert.Throws(() => registry.Register({ $id: 'https://example.com/a', type: 'boolean' }))
})
Test('Should accept identical duplicate $id 1', () => {
  const registry = new Schema.XRegistry([{ $id: 'A', type: 'string' }])
  registry.Register({ $id: 'A', type: 'string' })
  Assert.IsTrue(registry.Bind().ok)
  Assert.IsTrue(registry.Compile('A').Check('ok'))
})
Test('Should reject registration without $id 1', () => {
  const registry = new Schema.XRegistry()
  Assert.Throws(() => registry.Register({ type: 'string' }))
})

// ------------------------------------------------------------------
// Isolation | Old collection not overridden
// ------------------------------------------------------------------
Test('Should isolate registries with same $id 1', () => {
  const first = new Schema.XRegistry([{ $id: 'A', type: 'string' }])
  first.Bind()
  const firstValidator = first.Compile('A')
  const second = new Schema.XRegistry([{ $id: 'A', type: 'number' }])
  second.Bind()
  Assert.IsTrue(firstValidator.Check('hello'))
  Assert.IsFalse(firstValidator.Check(42))
  Assert.IsTrue(second.Compile('A').Check(42))
  Assert.IsFalse(second.Compile('A').Check('hello'))
})
Test('Should not let new registration overwrite sealed schema 1', () => {
  const registry = new Schema.XRegistry([{ $id: 'A', type: 'string' }])
  registry.Bind()
  const validator = registry.Compile('A')
  Assert.Throws(() => registry.Register({ $id: 'A', type: 'number' }))
  Assert.IsTrue(validator.Check('sealed'))
})

// ------------------------------------------------------------------
// Unknown Ref | No Validator
// ------------------------------------------------------------------
Test('Should not produce validator for unknown ref 1', () => {
  const registry = new Schema.XRegistry([{
    $id: 'B',
    type: 'object',
    properties: { x: { $ref: 'Missing' } }
  }])
  const result = registry.Bind({ throw: false })
  Assert.IsFalse(result.ok)
  Assert.IsEqual(result.unresolved.length, 1)
  Assert.IsEqual(result.unresolved[0].ref, 'Missing')
  Assert.IsUndefined(registry.TryCompile('B'))
  Assert.Throws(() => registry.Compile('B'))
})
Test('Should not produce validator for unknown id 1', () => {
  const registry = new Schema.XRegistry()
  Assert.IsUndefined(registry.TryCompile('Nope'))
  Assert.Throws(() => registry.Compile('Nope'))
})
Test('Should throw from Bind on unresolved ref 1', () => {
  const registry = new Schema.XRegistry([{ $id: 'C', properties: { x: { $ref: 'Ghost' } } }])
  Assert.Throws(() => registry.Bind())
})

// ------------------------------------------------------------------
// Sealed | Source mutation does not affect collection
// ------------------------------------------------------------------
Test('Should seal source objects on registration 1', () => {
  const source: Record<PropertyKey, unknown> = {
    $id: 'C',
    type: 'object',
    properties: { x: { type: 'number' } },
    required: ['x']
  }
  const registry = new Schema.XRegistry([source])
  registry.Bind()
  source.properties = { x: { type: 'string' } }
  source.required = []
  ;(source as Record<string, unknown>).additional = true
  const validator = registry.Compile('C')
  Assert.IsTrue(validator.Check({ x: 1 }))
  Assert.IsFalse(validator.Check({ x: 'nope' }))
  Assert.IsFalse(validator.Check({}))
})
Test('Should seal nested source objects on registration 1', () => {
  const source: Record<string, unknown> = { $id: 'D', type: 'array', items: { type: 'integer' } }
  const registry = new Schema.XRegistry([source])
  registry.Bind()
  ;(source.items as Record<string, unknown>).type = 'string'
  const validator = registry.Compile('D')
  Assert.IsTrue(validator.Check([1, 2]))
  Assert.IsFalse(validator.Check(['a']))
})

// ------------------------------------------------------------------
// External | Authorized mappings only
// ------------------------------------------------------------------
Test('Should resolve refs through authorized external registry 1', () => {
  const remote = {
    $id: 'https://example.com/remote',
    $defs: { Point: { type: 'object', properties: { x: { type: 'number' } }, required: ['x'] } }
  }
  const local = {
    $id: 'Local',
    type: 'object',
    properties: { p: { $ref: 'https://example.com/remote#/$defs/Point' } }
  }
  const registry = new Schema.XRegistry([local])
  Assert.IsFalse(registry.Bind({ throw: false }).ok)
  registry.External('remote', new Schema.XRegistry([remote]))
  Assert.IsTrue(registry.Bind().ok)
  const validator = registry.Compile('Local')
  Assert.IsTrue(validator.Check({ p: { x: 1 } }))
  Assert.IsFalse(validator.Check({ p: { x: 'z' } }))
  Assert.IsFalse(validator.Check({ p: {} }))
})
Test('Should resolve refs through authorized external record 1', () => {
  const local = { $id: 'Local2', properties: { n: { $ref: 'Num' } } }
  const registry = new Schema.XRegistry([local])
  registry.External('nums', { Num: { type: 'integer' } })
  Assert.IsTrue(registry.Bind().ok)
  const validator = registry.Compile('Local2')
  Assert.IsTrue(validator.Check({ n: 3 }))
  Assert.IsFalse(validator.Check({ n: 3.5 }))
})

// ------------------------------------------------------------------
// Index | Source provenance retained
// ------------------------------------------------------------------
Test('Should retain schema source index 1', () => {
  const registry = new Schema.XRegistry()
  registry.Register(Node, 'schemas/node.json')
  registry.Register(Tree, 'schemas/tree.json')
  const index = registry.Index()
  const node = index.find((entry) => entry.id === 'Node')
  const tree = index.find((entry) => entry.id === 'Tree')
  Assert.IsEqual(node?.source, 'schemas/node.json')
  Assert.IsEqual(tree?.source, 'schemas/tree.json')
  Assert.IsEqual(registry.Source('Node'), 'schemas/node.json')
  Assert.IsTrue(registry.Ids().includes('Tree'))
  Assert.IsTrue(registry.Has('Node'))
})

// ------------------------------------------------------------------
// Default Compile entry retained
// ------------------------------------------------------------------
Test('Should retain default Schema.Compile entry 1', () => {
  const validator = Schema.Compile({ type: 'string' })
  Assert.IsTrue(validator.Check('a'))
  const contextValidator = Schema.Compile({ R: { type: 'boolean' } }, { $ref: 'R' })
  Assert.IsTrue(contextValidator.Check(true))
  Assert.IsFalse(contextValidator.Check('true'))
})
