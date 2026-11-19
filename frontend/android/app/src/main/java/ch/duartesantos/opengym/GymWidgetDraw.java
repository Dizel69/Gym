package ch.duartesantos.opengym;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.os.Bundle;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

/** Draws every openGym home-screen widget from the snapshot the app last wrote. */
final class GymWidgetDraw {
    static final String PREFS = "opengym_widget";
    static final String SNAP = "snap";

    private GymWidgetDraw() {}

    static void refreshAll(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        refresh(context, mgr, BoardWidget.class, "board");
        refresh(context, mgr, StreakWidget.class, "streak");
        refresh(context, mgr, GoalWidget.class, "weight");
        refresh(context, mgr, NextWidget.class, "next");
    }

    private static void refresh(Context context, AppWidgetManager mgr, Class<?> cls, String kind) {
        int[] ids = mgr.getAppWidgetIds(new ComponentName(context, cls));
        for (int id : ids) update(context, mgr, id, kind);
    }

    static void update(Context context, AppWidgetManager mgr, int id, String kind) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_image);
        views.setImageViewBitmap(R.id.widget_art, bitmap(context, mgr, id, kind));
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(context, id, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, tap);
        mgr.updateAppWidget(id, views);
    }

    private static Bitmap bitmap(Context context, AppWidgetManager mgr, int id, String kind) {
        Bundle opts = mgr.getAppWidgetOptions(id);
        float density = context.getResources().getDisplayMetrics().density;
        int minW = opts == null ? 0 : opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int minH = opts == null ? 0 : opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);
        if (minW < 40) minW = "board".equals(kind) ? 280 : 140;
        if (minH < 40) minH = 140;
        int w = Math.min(1400, Math.max(1, Math.round(minW * density)));
        int h = Math.min(900, Math.max(1, Math.round(minH * density)));
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        boolean night = (context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
        paint(canvas, w, h, density, model(context, night), kind);
        return bmp;
    }

    private static Model model(Context context, boolean night) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(SNAP, null);
        JSONObject snap = null;
        if (raw != null) {
            try { snap = new JSONObject(raw); } catch (Exception ignored) { snap = null; }
        }
        Model m = new Model();
        m.dark = night;
        m.open = context.getString(R.string.widget_open);
        if (snap == null) return m;
        String theme = snap.optString("theme", "dark");
        if ("light".equals(theme)) m.dark = false;
        else if ("dark".equals(theme)) m.dark = true;
        m.accent = color(snap.optString("accent", ""), 0xFF30D158);
        JSONObject words = snap.optJSONObject("words");
        String one = words == null ? "week" : words.optString("one", "week");
        String few = words == null ? "" : words.optString("few", "");
        String many = words == null ? "weeks" : words.optString("many", "weeks");
        m.row = words == null ? "" : words.optString("row", "");
        m.today = words == null ? "Today" : words.optString("today", "Today");
        m.nothing = words == null ? "Nothing planned" : words.optString("nothing", "Nothing planned");
        if (words != null && words.optString("open", null) != null) m.open = words.optString("open");
        JSONArray weekArr = snap.optJSONArray("weeks");
        Set<String> weeks = new HashSet<>();
        if (weekArr != null) for (int i = 0; i < weekArr.length(); i++) weeks.add(weekArr.optString(i));
        String today = WidgetMath.today();
        m.streak = WidgetMath.streak(today, snap.optInt("weekStart", 1), weeks);
        m.weeksWord = WidgetMath.weeksWord(m.streak, one, few, many);
        JSONObject weight = snap.optJSONObject("weight");
        if (weight != null) {
            m.weightValue = weight.optString("value", "—");
            m.weightCaption = weight.optString("caption", "");
            m.weightNow = weight.optString("now", "");
            m.dir = weight.optString("dir", "");
            m.unit = weight.optString("unit", "");
            JSONArray trend = weight.optJSONArray("trend");
            if (trend != null) {
                m.trend = new float[trend.length()];
                for (int i = 0; i < trend.length(); i++) m.trend[i] = (float) trend.optDouble(i, Float.NaN);
            }
        }
        JSONArray days = snap.optJSONArray("days");
        if (days != null) {
            for (int i = 0; i < days.length(); i++) {
                JSONObject d = days.optJSONObject(i);
                if (d == null) continue;
                String iso = d.optString("iso", "");
                String name = d.optString("name", "");
                if (iso.compareTo(today) < 0 || name.isEmpty()) continue;
                if (iso.equals(snap.optString("today")) && d.optBoolean("done")) continue;
                m.nextName = name;
                m.nextWhen = iso.equals(today) ? m.today : d.optString("weekday", "");
                break;
            }
        }
        if (m.nextName == null) m.nextName = m.nothing;
        m.ready = true;
        return m;
    }

    private static int color(String hex, int fallback) {
        if (hex == null) return fallback;
        String s = hex.startsWith("#") ? hex.substring(1) : hex;
        if (s.length() != 6) return fallback;
        try { return 0xFF000000 | Integer.parseInt(s, 16); }
        catch (NumberFormatException e) { return fallback; }
    }

    private static void paint(Canvas canvas, int w, int h, float density, Model m, String kind) {
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        int bg = m.dark ? 0xFF141416 : 0xFFF4F4F6;
        int ink = m.dark ? 0xFFF5F5F7 : 0xFF1C1C1E;
        int muted = m.dark ? 0xFF98989F : 0xFF6E6E73;
        int line = m.dark ? 0x22FFFFFF : 0x14000000;
        float radius = Math.min(28f * density, Math.min(w, h) * 0.18f);
        Path clip = new Path();
        clip.addRoundRect(new RectF(0, 0, w, h), radius, radius, Path.Direction.CW);
        canvas.clipPath(clip);
        canvas.drawColor(bg);
        paint.setColor(m.accent);
        canvas.drawRect(0, 0, w, Math.max(4f * density, h * 0.02f), paint);
        if (!m.ready) {
            text(canvas, paint, "openGym", w / 2f, h * 0.46f, 18f * density, w * 0.8f, m.accent, true);
            text(canvas, paint, m.open, w / 2f, h * 0.66f, 12f * density, w * 0.8f, muted, false);
            return;
        }
        if ("board".equals(kind)) {
            paint.setColor(line);
            if (w >= h) {
                float col = w / 3f;
                block(canvas, paint, density, m, "streak", 0, 0, col, h, ink, muted);
                block(canvas, paint, density, m, "weight", col, 0, col, h, ink, muted);
                block(canvas, paint, density, m, "next", col * 2, 0, col, h, ink, muted);
                paint.setColor(line);
                canvas.drawRect(col, h * 0.22f, col + density, h * 0.82f, paint);
                canvas.drawRect(col * 2, h * 0.22f, col * 2 + density, h * 0.82f, paint);
            } else {
                float row = h / 3f;
                block(canvas, paint, density, m, "streak", 0, 0, w, row, ink, muted);
                block(canvas, paint, density, m, "weight", 0, row, w, row, ink, muted);
                block(canvas, paint, density, m, "next", 0, row * 2, w, row, ink, muted);
                paint.setColor(line);
                canvas.drawRect(w * 0.12f, row, w * 0.88f, row + density, paint);
                canvas.drawRect(w * 0.12f, row * 2, w * 0.88f, row * 2 + density, paint);
            }
            return;
        }
        block(canvas, paint, density, m, kind, 0, 0, w, h, ink, muted);
    }

    private static void block(Canvas canvas, Paint paint, float density, Model m, String kind,
                              float x, float y, float w, float h, int ink, int muted) {
        float cx = x + w / 2f;
        if ("weight".equals(kind)) {
            icon(canvas, paint, density, "weight", cx, y + h * 0.22f, m.accent);
            text(canvas, paint, m.weightValue, cx, y + h * 0.52f, Math.min(w * 0.28f, h * 0.28f), w * 0.86f, ink, true);
            text(canvas, paint, m.weightCaption, cx, y + h * 0.70f, 12f * density, w * 0.86f, muted, false);
            if (m.weightNow != null && !m.weightNow.isEmpty() && ("gain".equals(m.dir) || "lose".equals(m.dir))) {
                text(canvas, paint, m.weightNow, cx, y + h * 0.82f, 11f * density, w * 0.86f, muted, false);
            }
            spark(canvas, paint, x + w * 0.18f, y + h * 0.88f, w * 0.64f, h * 0.07f, m.trend, m.accent);
            return;
        }
        if ("next".equals(kind)) {
            icon(canvas, paint, density, "next", cx, y + h * 0.24f, m.accent);
            text(canvas, paint, m.nextName, cx, y + h * 0.55f, Math.min(w * 0.16f, 20f * density), w * 0.86f, ink, true);
            if (m.nextWhen != null && !m.nextWhen.isEmpty() && !m.nextName.equals(m.nothing)) {
                text(canvas, paint, m.nextWhen, cx, y + h * 0.74f, 13f * density, w * 0.86f, m.accent, false);
            }
            return;
        }
        icon(canvas, paint, density, "streak", cx, y + h * 0.22f, 0xFFFF9F0A);
        text(canvas, paint, String.valueOf(m.streak), cx, y + h * 0.54f, Math.min(w * 0.32f, h * 0.32f), w * 0.86f, ink, true);
        text(canvas, paint, m.weeksWord, cx, y + h * 0.72f, 13f * density, w * 0.86f, muted, false);
        if (m.row != null && !m.row.isEmpty()) text(canvas, paint, m.row, cx, y + h * 0.84f, 12f * density, w * 0.86f, m.accent, false);
    }

    private static void text(Canvas canvas, Paint paint, String value, float cx, float baseline, float size, float maxWidth, int color, boolean bold) {
        if (value == null) value = "";
        paint.setColor(color);
        paint.setTextAlign(Paint.Align.CENTER);
        paint.setFakeBoldText(bold);
        paint.setTextSize(Math.max(10f, size));
        float max = Math.max(20f, maxWidth);
        while (paint.measureText(value) > max && paint.getTextSize() > 11f) paint.setTextSize(paint.getTextSize() - 1f);
        canvas.drawText(value, cx, baseline, paint);
        paint.setFakeBoldText(false);
    }

    private static void icon(Canvas canvas, Paint paint, float density, String kind, float cx, float cy, int color) {
        float s = 11f * density;
        paint.setColor((color & 0x00FFFFFF) | 0x28000000);
        canvas.drawCircle(cx, cy, s * 1.35f, paint);
        paint.setColor(color);
        if ("streak".equals(kind)) {
            Path p = new Path();
            p.moveTo(cx, cy - s);
            p.cubicTo(cx + s, cy - s * 0.15f, cx + s * 0.72f, cy + s * 0.85f, cx, cy + s);
            p.cubicTo(cx - s * 0.72f, cy + s * 0.85f, cx - s, cy - s * 0.15f, cx, cy - s);
            canvas.drawPath(p, paint);
            return;
        }
        if ("weight".equals(kind)) {
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(Math.max(2f, density * 1.6f));
            canvas.drawCircle(cx, cy - s * 0.15f, s * 0.62f, paint);
            paint.setStyle(Paint.Style.FILL);
            canvas.drawRect(cx - s * 0.55f, cy + s * 0.55f, cx + s * 0.55f, cy + s * 0.85f, paint);
            return;
        }
        canvas.drawCircle(cx - s * 0.55f, cy, s * 0.34f, paint);
        canvas.drawCircle(cx + s * 0.55f, cy, s * 0.34f, paint);
        canvas.drawRoundRect(new RectF(cx - s * 0.42f, cy - s * 0.14f, cx + s * 0.42f, cy + s * 0.14f), s * 0.1f, s * 0.1f, paint);
    }

    private static void spark(Canvas canvas, Paint paint, float x, float y, float w, float h, float[] trend, int color) {
        if (trend == null || trend.length < 2) return;
        float min = trend[0], max = trend[0];
        for (float v : trend) {
            if (Float.isNaN(v)) continue;
            min = Math.min(min, v);
            max = Math.max(max, v);
        }
        float span = Math.max(0.1f, max - min);
        Path p = new Path();
        for (int i = 0; i < trend.length; i++) {
            if (Float.isNaN(trend[i])) continue;
            float px = x + w * i / (trend.length - 1);
            float py = y + h - h * (trend[i] - min) / span;
            if (p.isEmpty()) p.moveTo(px, py);
            else p.lineTo(px, py);
        }
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(Math.max(2f, h * 0.18f));
        paint.setStrokeCap(Paint.Cap.ROUND);
        paint.setColor(color);
        canvas.drawPath(p, paint);
        paint.setStyle(Paint.Style.FILL);
        paint.setStrokeCap(Paint.Cap.BUTT);
    }

    private static final class Model {
        boolean ready;
        boolean dark = true;
        int accent = 0xFF30D158;
        int streak;
        String weeksWord = "";
        String row = "";
        String today = "Today";
        String nothing = "";
        String open = "openGym";
        String weightValue = "—";
        String weightCaption = "";
        String weightNow = "";
        String unit = "";
        String dir = "";
        float[] trend = new float[0];
        String nextName;
        String nextWhen = "";
    }
}
