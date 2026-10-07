import { Assert } from 'test'
import * as Type from 'typebox'
import { Value } from 'typebox/value'

const Test = Assert.Context('Type.Enum')

/** Captures the error thrown by the callback. */
function Catch(callback: () => unknown): Error {
  try {
    callback()
  } catch (error) {
    return error as Error
  }
  throw new Error('Expected throw')
}

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
// Enum (Default Interface Regression)
// ------------------------------------------------------------------
Test('Should Create Enum with duplicate values preserved (default regression)', () => {
  const T = Type.Enum([1, 1, '1'])
  Assert.IsTrue(Type.IsEnum(T))
  Assert.IsEqual(T.enum, [1, 1, '1'])
  Assert.IsTrue(Value.Check(T, 1))
  Assert.IsTrue(Value.Check(T, '1'))
  Assert.IsFalse(Value.Check(T, 2))
})
Test('Should Create Enum from aliased TypeScript enum (default regression)', () => {
  enum Kind { A = 1, B = 1 }
  const T = Type.Enum(Kind)
  Assert.IsTrue(Type.IsEnum(T))
  Assert.IsEqual(T.enum, [1, 1])
  Assert.IsTrue(Value.Check(T, 1))
})
// ------------------------------------------------------------------
// EnumStrict
// ------------------------------------------------------------------
Test('Should Create EnumStrict 1 (numeric 1 and string 1 are distinct)', () => {
  const T: Type.TEnum<[1, '1']> = Type.EnumStrict([1, '1'])
  Assert.IsTrue(Type.IsEnum(T))
  Assert.IsEqual(T.enum, [1, '1'])
})
Test('Should Create EnumStrict 2 (value domain checked with Value.Check)', () => {
  const T = Type.EnumStrict([1, '1', 'hello'])
  Assert.IsTrue(Value.Check(T, 1))
  Assert.IsTrue(Value.Check(T, '1'))
  Assert.IsTrue(Value.Check(T, 'hello'))
  Assert.IsFalse(Value.Check(T, 2))
  Assert.IsFalse(Value.Check(T, 'world'))
})
Test('Should Create EnumStrict 3 (from TypeScript enum)', () => {
  enum Kind { Foo = 'foo', Bar = 1 }
  const T = Type.EnumStrict(Kind)
  Assert.IsTrue(Type.IsEnum(T))
  Assert.IsEqual(T.enum, ['foo', 1])
  Assert.IsTrue(Value.Check(T, 'foo'))
  Assert.IsTrue(Value.Check(T, 1))
  Assert.IsFalse(Value.Check(T, 'bar'))
})
Test('Should Create EnumStrict 4 (with options)', () => {
  const T = Type.EnumStrict([1, 'hello'], { a: 1, b: 2 })
  Assert.HasPropertyKey(T, 'a')
  Assert.HasPropertyKey(T, 'b')
  Assert.IsEqual(T.a, 1)
  Assert.IsEqual(T.b, 2)
})
Test('Should throw EnumStrict on aliased TypeScript enum (sources in message)', () => {
  enum Kind { A = 1, B = 1 }
  const error = Catch(() => Type.EnumStrict(Kind))
  Assert.IsTrue(error instanceof Type.DuplicateEnumValue)
  Assert.IsTrue(error.message.includes("key 'A'"))
  Assert.IsTrue(error.message.includes("key 'B'"))
})
Test('Should throw EnumStrict on duplicate array values (indices in message)', () => {
  const error = Catch(() => Type.EnumStrict(['a', 'b', 'a']))
  Assert.IsTrue(error instanceof Type.DuplicateEnumValue)
  Assert.IsTrue(error.message.includes('index 0'))
  Assert.IsTrue(error.message.includes('index 2'))
})
Test('Should throw EnumStrict on invalid value (no partial schema returned)', () => {
  Assert.Throws(() => Type.EnumStrict([1, null as never]))
  Assert.Throws(() => Type.EnumStrict([1, true as never]))
  const error = Catch(() => Type.EnumStrict([1, null as never]))
  Assert.IsTrue(error instanceof Type.InvalidEnumValue)
  Assert.IsTrue(error.message.includes('index 1'))
})
