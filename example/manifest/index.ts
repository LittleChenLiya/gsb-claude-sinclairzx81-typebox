// ------------------------------------------------------------------
// Manifest: Three Reference Example
//
// Three schemas, three references: A references B, B references C and
// C references A. The manifest binds the recursive collection before
// generating validators. Run locally with Node:
//
// node --experimental-transform-types example/manifest/index.ts
// ------------------------------------------------------------------
import Type from '../../src/index.ts'
import { Manifest } from '../../src/compile/index.ts'

// ------------------------------------------------------------------
// Schemas
// ------------------------------------------------------------------
const A = Type.Object({
  name: Type.String(),
  b: Type.Optional(Type.Ref('example:b')) // reference 1: A -> B
}, { $id: 'example:a' })

const B = Type.Object({
  name: Type.String(),
  c: Type.Optional(Type.Ref('example:c')) // reference 2: B -> C
}, { $id: 'example:b' })

const C = Type.Object({
  name: Type.String(),
  a: Type.Optional(Type.Ref('example:a')) // reference 3: C -> A
}, { $id: 'example:c' })

// ------------------------------------------------------------------
// Manifest
// ------------------------------------------------------------------
const manifest = new Manifest()
manifest.Add(A).Add(B).Add(C)

console.log('index:', manifest.Ids())

const validator = manifest.Compile('example:a')

// ------------------------------------------------------------------
// Validate
// ------------------------------------------------------------------
const valid = {
  name: 'a',
  b: {
    name: 'b',
    c: {
      name: 'c',
      a: { name: 'a2' } // recursive back edge C -> A
    }
  }
}
const invalid = {
  name: 'a',
  b: {
    name: 'b',
    c: {
      name: 'c',
      a: { name: 1 } // invalid: name must be a string
    }
  }
}

console.log('valid:', validator.Check(valid))     // true
console.log('invalid:', validator.Check(invalid)) // false
