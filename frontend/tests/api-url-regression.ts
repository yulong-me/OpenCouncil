import assert from 'node:assert/strict'

import { resolveDefaultApiUrl } from '../lib/api'

function setWindowUrl(url: string) {
  Object.defineProperty(globalThis, 'window', {
    value: { location: new URL(url) } as unknown as Window,
    configurable: true,
  })
}

setWindowUrl('http://localhost:7013/room/example')
assert.equal(resolveDefaultApiUrl(), 'http://localhost:7001')

setWindowUrl('http://127.0.0.1:3000/')
assert.equal(resolveDefaultApiUrl(), 'http://127.0.0.1:7001')

setWindowUrl('http://localhost:7000/')
assert.equal(resolveDefaultApiUrl(), 'http://localhost:7000')

setWindowUrl('https://app.example.com/')
assert.equal(resolveDefaultApiUrl(), 'https://app.example.com')

console.log('api-url-regression: ok')
