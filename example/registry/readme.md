# Registry

An example of the explicit `Schema.XRegistry` reference compiler. It
registers **three** schema documents that reference one another:

| Schema | Reference |
| ------ | --------- |
| `Node` | self recursive `$ref: 'Node'` for children |
| `TreeMeta` | `$ref: 'Tree'` back to the owning document (mutual recursion) |
| `Tree` | `$ref: 'Node'` and `$ref: 'TreeMeta'` |

The schemas are bound explicitly (`Bind()`) before any validator is
generated, and each registration keeps a source label in the registry
index.

## Run

### Deno

```bash
deno run -A --no-lock example/registry/index.ts
```

### Node (local command)

Node 22.6+ / 24 can transpile TypeScript natively, so no install step is
required. The bare `typebox/*` import specifiers are resolved to
`../../src` by the small local hook in `node-local.mjs`:

```bash
cd example/registry
npm start
```

…which is shorthand for:

```bash
node --experimental-transform-types --import ./node-local.mjs index.ts
```

Expected output:

```text
bound: [ "Node", "TreeMeta", "Tree" ]
node ok: true
tree ok: true
tree bad: false
index: Node <- schemas/node.json
index: TreeMeta <- schemas/tree-meta.json
index: Tree <- schemas/tree.json
```
