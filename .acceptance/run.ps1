# Focused, deterministic local acceptance run (no Docker, no network).
# Redirects temp/cache locations into the worktree (D drive).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$env:TEMP = Join-Path $PSScriptRoot 'tmp'
$env:TMP = $env:TEMP
$env:NODE_COMPILE_CACHE = Join-Path $PSScriptRoot 'compile-cache'
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null

$register = ([Uri](Join-Path $PSScriptRoot 'harness/register.ts')).AbsoluteUri
$harness = Join-Path $PSScriptRoot 'harness/run.ts'
$tests = @(
  (Join-Path $root 'test/typebox/runtime/type/types/enum.ts'),
  (Join-Path $root 'test/typebox/runtime/value/check/enum.ts')
)
node --experimental-transform-types --import $register $harness @tests
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host '== scenario demonstration =='
node --experimental-transform-types (Join-Path $PSScriptRoot 'enum_strict_demo.ts')
