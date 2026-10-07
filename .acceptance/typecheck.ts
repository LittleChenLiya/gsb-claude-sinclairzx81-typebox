import { Type, type Static } from '../src/index.ts'

// strict tuple: duplicate type-level entries collapse; number 1 keeps string '1'
const T1 = Type.StrictEnum([1, '1', 1, 'x', 'x'])
type T1V = Static<typeof T1>
const a: T1V = 1
const b: T1V = '1'
const c: T1V = 'x'
// @ts-expect-error duplicate number 1 collapsed and 2 not in domain
const d: T1V = 2
// @ts-expect-error string '2' not in domain
const e: T1V = '2'

// legal TypeScript enum: StrictEnum matches default Enum static semantics
enum Kind { Foo, Bar = 'bar' }
const T2 = Type.StrictEnum(Kind)
const T2Default = Type.Enum(Kind)
type T2Strict = Static<typeof T2>
type T2Legacy = Static<typeof T2Default>
const f: T2Strict = 0 as T2Legacy
const g: T2Legacy = 0 as T2Strict
// @ts-expect-error member name is not an enum value
const h: T2Strict = 'Foo'

// aliased members still express the duplicated literal type
enum Alias { A = 1, B = 1 }
const T4 = Type.StrictEnum(Alias)
type T4V = Static<typeof T4>
const m: T4V = 1
// @ts-expect-error
const n: T4V = 2

// default Enum signature unaffected
const T3 = Type.Enum([1, 1, '1'])
type T3V = Static<typeof T3>
const i: T3V = 1
const j: T3V = '1'
