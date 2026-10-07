declare namespace Deno {
  interface TestContext {}
  function test(name: string, callback: (context: Deno.TestContext) => void): void
}
