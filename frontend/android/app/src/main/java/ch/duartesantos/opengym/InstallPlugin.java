package ch.duartesantos.opengym;

import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * Downloads an APK straight into the cache and opens the Android package installer.
 *
 * The file is about 200 MB once the exercise pictures are inside it. Pulling that
 * through the WebView as one base64 string froze the update sheet for minutes, so
 * the bytes stay on disk. The SHA-256 is taken while they are written.
 *
 * Usage from JS:
 *   const Install = registerPlugin('Install');
 *   await Install.downloadApk({ url, fileName: 'opengym-update.apk' });
 *   await Install.installApk({ fileName: 'opengym-update.apk' });
 */
@CapacitorPlugin(name = "Install")
public class InstallPlugin extends Plugin {
    private static final int CONNECT_TIMEOUT_MS = 15_000;
    private static final int READ_TIMEOUT_MS = 60_000;
    private static final int BUFFER = 64 * 1024;
    private static final long MIN_APK_BYTES = 100_000;
    private static final long PROGRESS_EVERY_MS = 100;

    @PluginMethod
    public void downloadApk(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName", "opengym-update.apk");
        if (url == null || url.isEmpty()) {
            call.reject("url is required");
            return;
        }
        if (!safeName(fileName)) {
            call.reject("fileName is invalid");
            return;
        }
        File file = new File(getContext().getCacheDir(), fileName);
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setInstanceFollowRedirects(true);
            conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
            conn.setReadTimeout(READ_TIMEOUT_MS);
            // The APK is already compressed. Asking for identity keeps the hash on the
            // real file bytes, not on a gzip wrapper Android would strip afterwards.
            conn.setRequestProperty("Accept-Encoding", "identity");
            conn.setRequestProperty("User-Agent", "openGym");
            conn.connect();
            int status = conn.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IllegalStateException("Download failed: " + status);
            }
            long total = conn.getContentLengthLong();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long got = 0;
            long lastEmit = 0;
            byte[] buf = new byte[BUFFER];
            try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(file)) {
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    digest.update(buf, 0, n);
                    got += n;
                    long now = System.currentTimeMillis();
                    if (now - lastEmit >= PROGRESS_EVERY_MS) {
                        emit(got, total);
                        lastEmit = now;
                    }
                }
            }
            emit(got, total > 0 ? total : got);
            if (got < MIN_APK_BYTES) {
                throw new IllegalStateException("Downloaded file is too small to be a valid APK (" + got + " bytes)");
            }
            JSObject ret = new JSObject();
            ret.put("sha256", toHex(digest.digest()));
            ret.put("bytes", got);
            call.resolve(ret);
        } catch (Exception e) {
            if (file.exists()) file.delete();
            call.reject(e.getMessage() != null ? e.getMessage() : "Download failed");
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String fileName = call.getString("fileName");
        if (fileName == null || fileName.isEmpty()) {
            call.reject("fileName is required");
            return;
        }
        if (!safeName(fileName)) {
            call.reject("fileName is invalid");
            return;
        }

        File file = new File(getContext().getCacheDir(), fileName);
        if (!file.exists()) {
            call.reject("APK file not found: " + fileName);
            return;
        }

        Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);

        getContext().startActivity(intent);
        call.resolve();
    }

    private void emit(long got, long total) {
        JSObject ev = new JSObject();
        ev.put("bytes", got);
        ev.put("total", total > 0 ? total : 0);
        notifyListeners("progress", ev);
    }

    private static boolean safeName(String name) {
        return name.matches("[A-Za-z0-9._-]+");
    }

    private static String toHex(byte[] raw) {
        StringBuilder sb = new StringBuilder(raw.length * 2);
        for (byte b : raw) sb.append(String.format("%02x", b & 0xff));
        return sb.toString();
    }
}
