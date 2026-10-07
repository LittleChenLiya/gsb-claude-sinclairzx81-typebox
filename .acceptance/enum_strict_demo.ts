// Acceptance demonstration for strict enum deduplication.
// Covers: numeric 1 vs string 1, alias duplicates, legal enum, invalid enum,
// value domains, duplicate sources, default-interface regression, and
// Value.Check type discrimination.
import { Type } from '../src/index.ts'
import { Value } from '../src/value/index.ts'

const line = (title: string) => console.log(`\n== ${title} ==`)

// 1. number 1 and string '1' are distinct members of the value domain
line('number 1 vs string 1')
const distinct = Type.StrictEnum([1, '1'])
console.log('schema:', JSON.stringify(distinct))
console.log('Value.Check(1)   =', Value.Check(distinct, 1))     // true  (number)
console.log("Value.Check('1') =", Value.Check(distinct, '1'))   // true  (string)
console.log('Value.Check(2)   =', Value.Check(distinct, 2))     // false

// 2. duplicate numeric value -> error carries both sources
line('duplicate number value')
try { Type.StrictEnum([1, 2, 1]) } catch (error) { console.log((error as Error).message) }

// 3. duplicate string value (same shape, actual type compared)
line('duplicate string value')
try { Type.StrictEnum(['a', 'a']) } catch (error) { console.log((error as Error).message) }

// 4. TypeScript enum alias duplicate -> member names are the sources
line('aliased TypeScript enum (illegal in strict mode)')
enum Alias { A = 1, B = 1 }
try { Type.StrictEnum(Alias) } catch (error) { console.log((error as Error).message) }

// 5. legal mixed TypeScript enum -> value domain
line('legal TypeScript enum')
enum Kind { Foo, Bar = 'bar' }
const legal = Type.StrictEnum(Kind)
console.log('schema:', JSON.stringify(legal))
console.log('Value.Check(0)    =', Value.Check(legal, 0))      // true
console.log("Value.Check('bar')=", Value.Check(legal, 'bar'))  // true
console.log("Value.Check('Foo')=", Value.Check(legal, 'Foo'))  // false

// 6. invalid enum never returns a half-built schema
line('invalid values produce no schema')
let produced: unknown = 'no-schema'
try { produced = Type.StrictEnum([1, {} as never]) } catch (error) { console.log((error as Error).message) }
console.log('schema produced:', produced)

// 7. default interface regression: duplicates are preserved as before
line('default Enum output (compatibility regression)')
console.log('Enum([1, 1, "1"]):', JSON.stringify(Type.Enum([1, 1, '1'])))
console.log('Enum(Alias):      ', JSON.stringify(Type.Enum(Alias)))
