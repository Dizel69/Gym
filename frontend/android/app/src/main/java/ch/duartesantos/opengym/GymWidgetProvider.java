package ch.duartesantos.opengym;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;

/** Shared update path. Each home-screen widget is its own receiver so the picker lists them apart. */
abstract class GymWidgetProvider extends AppWidgetProvider {
    protected abstract String kind();

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) GymWidgetDraw.update(context, manager, id, kind());
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        GymWidgetDraw.update(context, manager, id, kind());
    }
}
