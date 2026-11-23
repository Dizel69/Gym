package ch.duartesantos.opengym;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The workout as one ongoing notification. On Android 16 the system can promote it to a Live
 * Update (a chip by the clock). Older phones get the same card as a plain ongoing notification.
 * Buttons come back through LiveCardReceiver.
 */
@CapacitorPlugin(name = "LiveCard")
public class LiveCardPlugin extends Plugin {
    static final int NOTIFICATION_ID = 42;
    static final String CHANNEL_ID = "workout-card";
    // Notification.Builder#setRequestPromotedOngoing. compileSdk 35 has no method yet; Android 16
    // reads the extra.
    private static final String EXTRA_PROMOTE = "android.requestPromotedOngoing";
    private static final int ACCENT = 0xFFA3E635;
    private static final int FLAGS = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

    private static LiveCardPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
    }

    static void deliver(String id) {
        LiveCardPlugin plugin = instance;
        if (plugin == null || id == null || id.isEmpty()) return;
        JSObject data = new JSObject();
        data.put("id", id);
        plugin.notifyListeners("action", data);
    }

    @PluginMethod
    public void show(PluginCall call) {
        Context ctx = getContext();
        if (ctx == null) {
            call.reject("no context");
            return;
        }
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || !nm.areNotificationsEnabled()) {
            call.reject("notifications off");
            return;
        }
        try {
            ensureChannel(ctx, nm);
            nm.notify(NOTIFICATION_ID, build(ctx, call));
            call.resolve();
        } catch (Exception e) {
            call.reject("card not posted", e);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        Context ctx = getContext();
        if (ctx != null) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(NOTIFICATION_ID);
        }
        call.resolve();
    }

    private static void ensureChannel(Context ctx, NotificationManager nm) {
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID, ctx.getString(R.string.workout_channel_name), NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription(ctx.getString(R.string.workout_channel_desc));
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        ch.setSound(null, null);
        ch.enableVibration(false);
        ch.setShowBadge(false);
        nm.createNotificationChannel(ch);
    }

    private static Notification build(Context ctx, PluginCall call) throws Exception {
        String title = call.getString("title", "Gym");
        String body = call.getString("body", "");
        String chip = call.getString("chip", "");
        int done = call.getInt("done", 0);
        int total = call.getInt("total", 0);
        Notification.Builder b = new Notification.Builder(ctx, CHANNEL_ID);
        b.setSmallIcon(R.drawable.ic_stat_dumbbell)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setAutoCancel(false)
                .setCategory(Notification.CATEGORY_WORKOUT)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setColor(ACCENT)
                .setLocalOnly(true)
                .setContentTitle(title == null ? "Gym" : title)
                .setContentText(body == null ? "" : body)
                .setContentIntent(openApp(ctx));
        if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        if (total > 0) progress(b, Math.max(0, done), total);
        if (Build.VERSION.SDK_INT >= 36) {
            Bundle extra = new Bundle();
            extra.putBoolean(EXTRA_PROMOTE, true);
            b.addExtras(extra);
            if (chip != null && !chip.isEmpty()) {
                try {
                    b.getClass().getMethod("setShortCriticalText", String.class).invoke(b, chip);
                } catch (Throwable ignored) { /* the body still says the same thing */ }
            }
        }
        JSONArray actions = new JSONArray(call.getString("actions", "[]"));
        int n = Math.min(3, actions.length());
        for (int i = 0; i < n; i++) {
            JSONObject a = actions.optJSONObject(i);
            if (a == null) continue;
            String id = a.optString("id", "");
            String label = a.optString("title", "");
            if (id.isEmpty() || label.isEmpty()) continue;
            Intent intent = new Intent(ctx, LiveCardReceiver.class);
            intent.putExtra(LiveCardReceiver.EXTRA_ID, id);
            PendingIntent pi = PendingIntent.getBroadcast(ctx, 80 + i, intent, FLAGS);
            b.addAction(new Notification.Action.Builder(null, label, pi).build());
        }
        return b.build();
    }

    /** Session progress. Android 16 draws it as a Live Update bar when that class exists. */
    private static void progress(Notification.Builder b, int done, int total) {
        if (Build.VERSION.SDK_INT >= 36 && progressStyle(b, done, total)) return;
        b.setProgress(total, Math.min(done, total), false);
    }

    private static boolean progressStyle(Notification.Builder b, int done, int total) {
        try {
            Class<?> segCls = Class.forName("android.app.Notification$ProgressStyle$Segment");
            Object seg = segCls.getConstructor(int.class).newInstance(total);
            segCls.getMethod("setColor", int.class).invoke(seg, ACCENT);
            Class<?> styleCls = Class.forName("android.app.Notification$ProgressStyle");
            Object style = styleCls.getConstructor().newInstance();
            List<Object> parts = new ArrayList<>();
            parts.add(seg);
            styleCls.getMethod("setProgressSegments", List.class).invoke(style, parts);
            styleCls.getMethod("setProgress", int.class).invoke(style, Math.min(done, total));
            styleCls.getMethod("setStyledByProgress", boolean.class).invoke(style, true);
            b.setStyle((Notification.Style) style);
            return true;
        } catch (Throwable ignored) {
            return false;
        }
    }

    private static PendingIntent openApp(Context ctx) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(ctx, 70, i, FLAGS);
    }
}
