package ch.duartesantos.opengym;

import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.Assert.assertEquals;

public class WidgetMathTest {
    @Test
    public void weekStartsMondayOrSunday() {
        assertEquals("2026-11-16", WidgetMath.weekKey("2026-11-19", 1));
        assertEquals("2026-11-16", WidgetMath.weekKey("2026-11-16", 1));
        assertEquals("2026-11-09", WidgetMath.weekKey("2026-11-15", 1));
        assertEquals("2026-11-15", WidgetMath.weekKey("2026-11-15", 0));
    }

    @Test
    public void currentWeekIsAGraceWeek() {
        assertEquals(2, WidgetMath.streak("2026-11-19", 1, Arrays.asList("2026-11-09", "2026-11-16")));
        assertEquals(1, WidgetMath.streak("2026-11-19", 1, Collections.singletonList("2026-11-09")));
        assertEquals(0, WidgetMath.streak("2026-11-19", 1, Collections.singletonList("2026-11-02")));
        assertEquals(0, WidgetMath.streak("2026-11-19", 1, Collections.<String>emptyList()));
    }

    @Test
    public void russianWeekWord() {
        assertEquals("неделя", WidgetMath.weeksWord(1, "неделя", "недели", "недель"));
        assertEquals("недели", WidgetMath.weeksWord(2, "неделя", "недели", "недель"));
        assertEquals("недель", WidgetMath.weeksWord(5, "неделя", "недели", "недель"));
        assertEquals("недель", WidgetMath.weeksWord(11, "неделя", "недели", "недель"));
        assertEquals("week", WidgetMath.weeksWord(1, "week", "", "weeks"));
        assertEquals("weeks", WidgetMath.weeksWord(4, "week", "", "weeks"));
    }
}
