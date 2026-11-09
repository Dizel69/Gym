// Update check — compares this APK's build number with the latest GitHub release
// and optionally downloads + installs that APK.
//
// CI publishes gym.apk on every push as a release tagged apk-<run>. The number is
// baked in at build time (__BUILD_NUMBER__), so the phone offers a newer build of
// this fork, not someone else's release. The name shown to the user is the release
// title, which CI sets from frontend/package.json ("1.4.0"), not the apk-<run> tag.
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
  const title = typeof latest.name === 'string' ? latest.name.trim() : ''
  return {
    hasUpdate: latestBuild > installed,
    latestVersion: /^\d+\.\d+\.\d+/.test(title) ? title : __APP_VERSION__,
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

// A release APK is about 200 MB with the exercise pictures inside. The old path asked
// CapacitorHttp for the whole file as one base64 string, then copied it back to disk.
// The progress sheet stayed on "Starting download…" until that round trip finished,
// which on a phone was many minutes. The native download writes the file as it arrives
// and hashes those same bytes, so the bar moves and the installer opens when it ends.
const UPDATE_FILE = 'opengym-update.apk'
const MIN_APK_BYTES = 100_000

/** 'ok', or why a finished download must not be installed. */
export function rejectDownload(bytes, actualHash, expectedHash) {
  if (!(Number(bytes) >= MIN_APK_BYTES)) return 'small'
  const want = String(expectedHash || '').toLowerCase().trim()
  if (want && String(actualHash || '').toLowerCase().trim() !== want) return 'mismatch'
  return 'ok'
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

  const { registerPlugin } = await import('@capacitor/core')
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const Install = registerPlugin('Install')
  const handle = onProgress
    ? await Install.addListener('progress', e => onProgress(Number(e.bytes) || 0, Number(e.total) || 0))
    : null
  let saved = null
  try {
    saved = await Install.downloadApk({ url, fileName: UPDATE_FILE })
    const verdict = rejectDownload(saved && saved.bytes, saved && saved.sha256, expectedHash)
    if (verdict === 'small') throw new Error('Downloaded file is too small to be a valid APK (' + (saved && saved.bytes) + ' bytes)')
    if (verdict === 'mismatch') throw new Error('SHA-256 mismatch — download may be corrupted or tampered with')
    await Install.installApk({ fileName: UPDATE_FILE })
  } catch (e) {
    try { await Filesystem.deleteFile({ path: UPDATE_FILE, directory: Directory.Cache }) } catch { /* nothing saved, or already gone */ }
    throw e
  } finally {
    if (handle) await handle.remove()
  }
}
