import { Assert } from 'test'
import * as Type from 'typebox'

const Test = Assert.Context('Type.Enum')

// ------------------------------------------------------------------
// EnumValue
// ------------------------------------------------------------------
Test('Should not guard EnumValue', () => {
  Assert.IsFalse(Type.IsEnumValue(null))
})
Test('Should not guard EnumValue', () => {
  Assert.IsTrue(Type.IsEnumValue('hello'))
})
Test('Should not guard EnumValue', () => {
  Assert.IsTrue(Type.IsEnumValue(12345))
})
// ------------------------------------------------------------------
// Enum
// ------------------------------------------------------------------
Test('Should not guard Enum', () => {
  const T: Type.TNull = Type.Null()
  Assert.IsFalse(Type.IsEnum(T))
})
Test('Should Create Enum 1', () => {
  const T: Type.TEnum<[1, 'hello']> = Type.Enum([1, 'hello'])
  Assert.IsTrue(Type.IsEnum(T))
})
Test('Should Create Enum with options', () => {
  const T: Type.TEnum<[1, 'hello']> = Type.Enum([1, 'hello'], { a: 1, b: 2 })
  Assert.HasPropertyKey(T, 'a')
  Assert.HasPropertyKey(T, 'b')
  Assert.IsEqual(T.a, 1)
  Assert.IsEqual(T.b, 2)
})
// ------------------------------------------------------------------
// StrictEnum
// ------------------------------------------------------------------
function Catch(callback: () => unknown): Error {
  try {
    callback()
  } catch (error) {
    return error as Error
  }
  throw Error('Expected throw')
}
Test('Should StrictEnum distinguish number 1 from string 1', () => {
  const T: Type.TEnum<[1, '1', 'x']> = Type.StrictEnum([1, '1', 'x'])
  Assert.IsEqual(T.enum, [1, '1', 'x'])
  Assert.IsTrue(Type.IsEnum(T))
})
Test('Should StrictEnum reject number duplicates with sources', () => {
  const error = Catch(() => Type.StrictEnum([1, 2, 1]))
  Assert.IsEqual(error.name, 'StrictEnumValuesError')
  Assert.IsTrue(error.message.includes('1 (number)'))
  Assert.IsTrue(error.message.includes('at [2]'))
  Assert.IsTrue(error.message.includes('first occurred at [0]'))
})
Test('Should StrictEnum reject string duplicates with sources', () => {
  const error = Catch(() => Type.StrictEnum(['a', 'a']))
  Assert.IsTrue(error.message.includes('"a"'))
  Assert.IsTrue(error.message.includes('at [1]'))
  Assert.IsTrue(error.message.includes('first occurred at [0]'))
})
Test('Should StrictEnum reject TypeScript enum aliases with member sources', () => {
  enum Kind {
    A = 1,
    B = 1
  }
  const error = Catch(() => Type.StrictEnum(Kind))
  Assert.IsEqual(error.name, 'StrictEnumValuesError')
  Assert.IsTrue(error.message.includes('1 (number)'))
  Assert.IsTrue(error.message.includes('at B ([1])'))
  Assert.IsTrue(error.message.includes('first occurred at A ([0])'))
})
Test('Should StrictEnum accept a legal TypeScript enum', () => {
  enum Kind {
    Foo, // = 0
    Bar = 'bar'
  }
  const T = Type.StrictEnum(Kind)
  Assert.IsEqual(T.enum, [0, 'bar'])
})
Test('Should StrictEnum reject invalid values and return no schema', () => {
  let schema: unknown = 'untouched'
  const error = Catch(() => { schema = Type.StrictEnum([1, {} as never]) })
  Assert.IsEqual(error.name, 'StrictEnumValuesError')
  Assert.IsEqual(schema, 'untouched')
})
// ------------------------------------------------------------------
// Enum (default regression)
// ------------------------------------------------------------------
Test('Should keep duplicate values on default Enum (regression)', () => {
  const T = Type.Enum([1, 1, '1'])
  Assert.IsEqual(T.enum, [1, 1, '1'])
})
Test('Should keep aliased members on default TypeScript Enum (regression)', () => {
  enum Kind {
    A = 1,
    B = 1
  }
  const T = Type.Enum(Kind)
  Assert.IsEqual(T.enum, [1, 1])
})
