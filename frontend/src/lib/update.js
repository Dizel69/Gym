// Update check — compares this APK's build number with the latest GitHub release
// and optionally downloads + installs that APK.
//
// CI publishes gym.apk on every push as a release tagged apk-<run>. The number is
// baked in at build time (__BUILD_NUMBER__), so the phone offers a newer build of
// this fork, not someone else's release.
// On Android (Capacitor), the APK is downloaded to the cache directory and handed
// to the system installer via a content:// URI.

import { MOBILE } from './mobile.js'

export const RELEASES_PAGE = 'https://github.com/Dizel69/Gym/releases/latest'
const RELEASES_URL = 'https://api.github.com/repos/Dizel69/Gym/releases/latest'

function releaseBuild(tag) {
  const match = /^apk-(\d+)$/.exec(tag || '')
  return match ? Number(match[1]) : 0
}

// One request per app session: Settings is opened often.
let cached = null
export function resetUpdateCheck() { cached = null }
export async function checkForUpdate() {
  if (!cached) cached = fetchLatest().catch(e => { cached = null; throw e })
  return cached
}
async function fetchLatest() {
  const res = await fetch(RELEASES_URL, { headers: { Accept: 'application/vnd.github+json' } })
  if (res.status === 404) return { hasUpdate: false, latestVersion: __APP_VERSION__, apkUrl: null, hashUrl: null }
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  const latest = await res.json()
  const latestBuild = releaseBuild(latest.tag_name)
  const installed = Number(__BUILD_NUMBER__ || 0)
  const assets = Array.isArray(latest.assets) ? latest.assets : []
  const apk = assets.find(asset => /\.apk$/i.test(asset.name || ''))
  const hash = assets.find(asset => /\.sha256$/i.test(asset.name || ''))
  return {
    hasUpdate: latestBuild > installed,
    latestVersion: latestBuild ? String(latestBuild) : __APP_VERSION__,
    apkUrl: apk?.browser_download_url || null,
    hashUrl: hash?.browser_download_url || null,
  }
}

/**
 * Computes the SHA-256 hash of an ArrayBuffer using the Web Crypto API.
 * Returns the hex-encoded digest string.
 */
export async function sha256(buffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// The checksum file is a few dozen bytes. On the phone it goes through native HTTP,
// because the WebView's origin is not one GitHub's download host allows.
export async function fetchReleaseText(url) {
  if (MOBILE) {
    const { CapacitorHttp } = await import('@capacitor/core')
    const res = await CapacitorHttp.get({ url, responseType: 'text' })
    if (res.status < 200 || res.status >= 300) throw new Error(`Download failed: ${res.status}`)
    return typeof res.data === 'string' ? res.data : ''
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  return res.text()
}

function base64ToBytes(b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/**
 * Downloads the APK from `url`, verifies its SHA-256 hash against `expectedHash`
 * (if provided), and triggers the Android installer.
 * Only works on the MOBILE (Capacitor) build with Android.
 *
 * @param {string} url - Direct download URL for the APK
 * @param {string|null} expectedHash - Expected SHA-256 hex string (from .sha256 asset), or null to skip verification
 * @param {function|null} onProgress - Called with (received, total) bytes during download, or null
 */
export async function downloadAndInstall(url, expectedHash = null, onProgress = null) {
  if (!MOBILE) {
    window.open(RELEASES_PAGE, '_blank', 'noopener')
    return
  }

  const { CapacitorHttp, registerPlugin } = await import('@capacitor/core')
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const res = await CapacitorHttp.get({ url, responseType: 'blob' })
  if (res.status < 200 || res.status >= 300) throw new Error(`Download failed: ${res.status}`)

  const base64 = typeof res.data === 'string' ? res.data : ''
  const bytes = base64ToBytes(base64)
  if (bytes.length < 100_000) {
    throw new Error('Downloaded file is too small to be a valid APK (' + bytes.length + ' bytes)')
  }
  if (onProgress) onProgress(bytes.length, bytes.length)

  if (expectedHash) {
    const actualHash = await sha256(bytes.buffer)
    if (actualHash !== expectedHash.toLowerCase().trim()) {
      throw new Error('SHA-256 mismatch — download may be corrupted or tampered with')
    }
  }

  const fileName = 'opengym-update.apk'
  await Filesystem.writeFile({
    path: fileName,
    directory: Directory.Cache,
    data: base64,
  })

  const Install = registerPlugin('Install')
  await Install.installApk({ fileName })
}
