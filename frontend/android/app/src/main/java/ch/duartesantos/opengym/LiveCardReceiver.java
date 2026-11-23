package ch.duartesantos.opengym;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** A button on the workout notification. The page applies it; this only forwards the id. */
public class LiveCardReceiver extends BroadcastReceiver {
    static final String EXTRA_ID = "id";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        LiveCardPlugin.deliver(intent.getStringExtra(EXTRA_ID));
    }
}
