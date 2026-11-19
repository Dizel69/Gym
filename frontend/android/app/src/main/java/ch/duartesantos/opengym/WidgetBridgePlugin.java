package ch.duartesantos.opengym;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** The app writes the widget snapshot here. The widgets read it back on their own. */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {
    @PluginMethod
    public void write(PluginCall call) {
        String json = call.getString("json");
        if (json == null || json.isEmpty()) {
            call.reject("empty");
            return;
        }
        getContext().getSharedPreferences(GymWidgetDraw.PREFS, android.content.Context.MODE_PRIVATE)
                .edit().putString(GymWidgetDraw.SNAP, json).commit();
        GymWidgetDraw.refreshAll(getContext());
        call.resolve();
    }
}
