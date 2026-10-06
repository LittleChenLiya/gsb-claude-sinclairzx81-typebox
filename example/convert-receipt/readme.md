# ConvertReceipt

Explicit Convert-then-Check receipts via `Value.ConvertReceipt`. Unlike
`Value.Convert` (which only returns a value, leaving callers to infer what
happened), `ConvertReceipt` returns a three-state receipt:

| kind        | meaning                                                        |
| ----------- | -------------------------------------------------------------- |
| `valid`     | the value already checked, marked `converted: false`           |
| `converted` | the value was invalid but convertible, `value` is the converted clone |
| `invalid`   | still invalid after conversion, `value` is the untouched original and `errors` retains the validation error paths |

Conversion is staged on a clone, so a failed conversion never leaves a
partially converted object on the caller's input. Objects, arrays and unions
bind to their actual target (per property, per element, per variant); for
unions the receipt records the adopted `branch` — the first variant in
declared order that checks, never a guess based on the last attempted
variant. Only the conversion rules defined by `Value.Convert` are applied;
no additional string coercion is guessed. `Value.Convert` is unchanged.

## Three-State Example

```typescript
import { Type } from 'typebox'
import { Value } from 'typebox/value'

Value.ConvertReceipt(Type.Number(), '3.14')   // { kind: 'converted', converted: true,  value: 3.14,   ... }
Value.ConvertReceipt(Type.Number(), 'hello')  // { kind: 'invalid',   converted: false, value: 'hello', errors: [...] }
Value.ConvertReceipt(Type.Integer(), 1)       // { kind: 'valid',     converted: false, value: 1,      ... }
```

## Run With Node

No build step is required. Node runs the TypeScript sources directly with
type transformation:

```bash
# three-state example
$ node --experimental-transform-types example/convert-receipt/index.ts

# acceptance assertions
$ node --experimental-transform-types example/convert-receipt/test.ts
```

Or via the registered task:

```bash
$ deno task receipt
```

The Deno test suite for this feature lives at
`test/typebox/runtime/value/convert/receipt.ts`.
