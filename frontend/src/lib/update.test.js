import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkForUpdate, sha256, resetUpdateCheck } from './update.js'

// __APP_VERSION__ and __BUILD_NUMBER__ are defined at build time by vite.config.js.
// In the test environment vitest applies the same define. A test build has no
// BUILD_NUMBER, so the installed build is 0.

describe('sha256', () => {
  it('computes the correct hash for a known input', async () => {
    const input = new TextEncoder().encode('hello world')
    const hash = await sha256(input.buffer)
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9')
  })

  it('computes a different hash for different input', async () => {
    const a = await sha256(new TextEncoder().encode('aaa').buffer)
    const b = await sha256(new TextEncoder().encode('bbb').buffer)
    expect(a).not.toBe(b)
  })

  it('returns a 64-character hex string', async () => {
    const hash = await sha256(new TextEncoder().encode('test').buffer)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('checkForUpdate', () => {
  let originalFetch

  beforeEach(() => { originalFetch = globalThis.fetch; resetUpdateCheck() })
  afterEach(() => { globalThis.fetch = originalFetch })

  function mockFetch(body, status = 200) {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }))
  }

  function release(tag, assets = []) {
    return { tag_name: tag, assets }
  }

  it('reports no update when the published build is the one installed', async () => {
    mockFetch(release('apk-0'))
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(false)
    expect(result.latestVersion).toBe(__APP_VERSION__)
  })

  it('reports no update for a tag that is not an apk build', async () => {
    mockFetch(release('v1.3.8'))
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(false)
    expect(result.latestVersion).toBe(__APP_VERSION__)
  })

  it('reports an update when the published build is newer', async () => {
    mockFetch(release('apk-12'))
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(true)
    expect(result.latestVersion).toBe('12')
  })

  it('finds the APK and its checksum, and does not confuse the two', async () => {
    const apkUrl = 'https://github.com/Dizel69/Gym/releases/download/apk-12/gym.apk'
    const hashUrl = 'https://github.com/Dizel69/Gym/releases/download/apk-12/gym.apk.sha256'
    mockFetch(release('apk-12', [
      { name: 'gym.apk.sha256', browser_download_url: hashUrl },
      { name: 'gym.apk', browser_download_url: apkUrl },
    ]))
    const result = await checkForUpdate()
    expect(result.apkUrl).toBe(apkUrl)
    expect(result.hashUrl).toBe(hashUrl)
  })

  it('returns null apkUrl when the release has no apk', async () => {
    mockFetch(release('apk-12', [
      { name: 'notes.txt', browser_download_url: 'https://example.com/notes.txt' },
    ]))
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(true)
    expect(result.apkUrl).toBe(null)
    expect(result.hashUrl).toBe(null)
  })

  it('returns no update when GitHub has no releases', async () => {
    mockFetch({ message: 'Not Found' }, 404)
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(false)
    expect(result.latestVersion).toBe(__APP_VERSION__)
    expect(result.apkUrl).toBe(null)
  })

  it('throws when the API responds with an error status', async () => {
    mockFetch(null, 500)
    await expect(checkForUpdate()).rejects.toThrow('GitHub API 500')
  })

  it('throws on network failure', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
    await expect(checkForUpdate()).rejects.toThrow('Network error')
  })
})
