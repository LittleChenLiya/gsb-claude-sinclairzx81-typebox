# Node-Targeted Tests

These tests run directly against the TypeScript sources in `src/` using Node
type stripping. No build step, package install, or Docker is required.

```bash
# run the ConvertCheck acceptance tests
node --experimental-transform-types --test test/node/convert_check.test.ts

# run the three-state example
node --experimental-transform-types example/convert-check/convert_check.ts
```
