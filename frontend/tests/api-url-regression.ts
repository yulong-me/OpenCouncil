import assert from 'node:assert/strict'

import { resolveDefaultApiUrl } from '../lib/api'

const originalNodeEnv = process.env.NODE_ENV

function setWindowUrl(url: string) {
  Object.defineProperty(globalThis, 'window', {
    value: { location: new URL(url) } as unknown as Window,
    configurable: true,
  })
}

function setNodeEnv(value: string | undefined) {
  const env = process.env as unknown as Record<string, string | undefined>
  if (value === undefined) {
    delete env.NODE_ENV
    return
  }
  env.NODE_ENV = value
}

setNodeEnv('development')

setWindowUrl('http://localhost:7013/room/example')
assert.equal(resolveDefaultApiUrl(), 'http://localhost:7001')

setWindowUrl('http://127.0.0.1:3000/')
assert.equal(resolveDefaultApiUrl(), 'http://127.0.0.1:7001')

setWindowUrl('http://localhost:7002/')
assert.equal(resolveDefaultApiUrl(), 'http://localhost:7001')

setWindowUrl('http://localhost:7000/')
assert.equal(resolveDefaultApiUrl(), 'http://localhost:7000')

setNodeEnv('production')

setWindowUrl('http://localhost:7002/')
assert.equal(resolveDefaultApiUrl(), 'http://localhost:7001')

setWindowUrl('http://localhost:8080/')
assert.equal(resolveDefaultApiUrl(), 'http://localhost:8080')

setWindowUrl('https://app.example.com/')
assert.equal(resolveDefaultApiUrl(), 'https://app.example.com')

setNodeEnv(originalNodeEnv)

console.log('api-url-regression: ok')
