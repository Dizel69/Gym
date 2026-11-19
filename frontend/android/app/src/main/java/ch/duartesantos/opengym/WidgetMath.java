package ch.duartesantos.opengym;

import java.util.Calendar;
import java.util.Collection;
import java.util.Locale;

/**
 * The date arithmetic the home-screen widgets share with lib/history.js streakWeeks and
 * lib/format.js weekKey. The current week does not break a streak: a week counts until it ends.
 */
final class WidgetMath {
    private WidgetMath() {}

    static String today() {
        Calendar c = Calendar.getInstance();
        return iso(c);
    }

    static String weekKey(String iso, int weekStart) {
        Calendar c = atNoon(iso);
        if (c == null) return iso;
        int jsDay = c.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY;
        int offset = (jsDay - weekStart + 7) % 7;
        c.add(Calendar.DATE, -offset);
        return iso(c);
    }

    static int streak(String today, int weekStart, Collection<String> weeks) {
        if (today == null || weeks == null || weeks.isEmpty()) return 0;
        Calendar c = atNoon(today);
        if (c == null) return 0;
        int n = 0;
        for (int i = 0; i < 520; i++) {
            if (weeks.contains(weekKey(iso(c), weekStart))) n++;
            else if (i > 0) break;
            c.add(Calendar.DATE, -7);
        }
        return n;
    }

    /** Russian one/few/many when `few` is set, otherwise one vs many. */
    static String weeksWord(int n, String one, String few, String many) {
        if (few != null && !few.isEmpty()) {
            int x = Math.abs(n) % 100;
            int d = x % 10;
            if (x > 10 && x < 20) return many;
            if (d == 1) return one;
            if (d >= 2 && d <= 4) return few;
            return many;
        }
        return n == 1 ? one : many;
    }

    private static Calendar atNoon(String iso) {
        if (iso == null || iso.length() < 10) return null;
        try {
            int y = Integer.parseInt(iso.substring(0, 4));
            int m = Integer.parseInt(iso.substring(5, 7));
            int d = Integer.parseInt(iso.substring(8, 10));
            Calendar c = Calendar.getInstance();
            c.set(Calendar.YEAR, y);
            c.set(Calendar.MONTH, m - 1);
            c.set(Calendar.DAY_OF_MONTH, d);
            c.set(Calendar.HOUR_OF_DAY, 12);
            c.set(Calendar.MINUTE, 0);
            c.set(Calendar.SECOND, 0);
            c.set(Calendar.MILLISECOND, 0);
            return c;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String iso(Calendar c) {
        return String.format(Locale.US, "%04d-%02d-%02d",
                c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }
}
