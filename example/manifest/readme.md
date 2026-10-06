# Manifest: Three Reference Example

An explicit manifest of schemas for reference compilation. Schemas are
registered by `$id` into a sealed collection. Every `$ref` must resolve
within the collection or an authorized external mapping (no global cache
is consulted). Validators are only generated once every registered
schema has been bound. Recursive references are supported without
infinite expansion, and later modification of the source objects does
not affect the sealed collection.

This example registers three schemas with three references forming a
cycle: `A -> B -> C -> A`.

## Run (Node, local)

```bash
npm run example:manifest
# or directly
node --experimental-transform-types example/manifest/index.ts
```

## Test (Node, local)

```bash
npm run test:manifest
# or directly
node --experimental-transform-types test/node/manifest.ts
```
