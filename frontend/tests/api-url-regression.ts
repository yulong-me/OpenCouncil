import assert from 'node:assert/strict'

const originalNodeEnv = process.env.NODE_ENV
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL

type ApiModule = typeof import('../lib/api')

function loadApiModule(): ApiModule {
  const modulePath = require.resolve('../lib/api')
  delete require.cache[modulePath]
  return require('../lib/api') as ApiModule
}

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

function setEnvApiUrl(value: string | undefined) {
  const env = process.env as unknown as Record<string, string | undefined>
  if (value === undefined) {
    delete env.NEXT_PUBLIC_API_URL
    return
  }
  env.NEXT_PUBLIC_API_URL = value
}

setNodeEnv('development')
setEnvApiUrl(undefined)

setWindowUrl('http://localhost:7013/room/example')
let { API_URL, resolveDefaultApiUrl } = loadApiModule()
assert.equal(resolveDefaultApiUrl(), 'http://localhost:7001')
assert.equal(API_URL, 'http://localhost:7001')

setWindowUrl('http://127.0.0.1:3000/')
assert.equal(resolveDefaultApiUrl(), 'http://127.0.0.1:7001')

setWindowUrl('http://localhost:7002/')
assert.equal(resolveDefaultApiUrl(), 'http://localhost:7001')

setWindowUrl('http://localhost:7000/')
assert.equal(resolveDefaultApiUrl(), 'http://localhost:7000')

setNodeEnv('production')

setWindowUrl('http://localhost:7002/')
;({ API_URL, resolveDefaultApiUrl } = loadApiModule())
assert.equal(resolveDefaultApiUrl(), 'http://localhost:7001')
assert.equal(API_URL, 'http://localhost:7001')

setWindowUrl('http://localhost:8080/')
;({ API_URL, resolveDefaultApiUrl } = loadApiModule())
assert.equal(resolveDefaultApiUrl(), 'http://localhost:8080')
assert.equal(API_URL, 'http://localhost:8080')

setWindowUrl('https://app.example.com/')
assert.equal(resolveDefaultApiUrl(), 'https://app.example.com')

setEnvApiUrl(' https://api.example.com ')
;({ API_URL } = loadApiModule())
assert.equal(API_URL, 'https://api.example.com')

setNodeEnv(originalNodeEnv)
setEnvApiUrl(originalApiUrl)

console.log('api-url-regression: ok')
