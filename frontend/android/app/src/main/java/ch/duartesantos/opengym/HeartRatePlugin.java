package ch.duartesantos.opengym;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.Collections;
import java.util.UUID;

/**
 * A heart rate from a Bluetooth strap (the standard Heart Rate service), not from Health Connect
 * and not from a watch app. The number is whatever the strap is advertising right now.
 */
@CapacitorPlugin(
        name = "HeartRate",
        permissions = {
            @Permission(strings = {
                android.Manifest.permission.BLUETOOTH_CONNECT,
                android.Manifest.permission.BLUETOOTH_SCAN
            }, alias = "hr")
        }
)
public class HeartRatePlugin extends Plugin {
    private static final UUID HR_SERVICE = UUID.fromString("0000180d-0000-1000-8000-00805f9b34fb");
    private static final UUID HR_MEAS = UUID.fromString("00002a37-0000-1000-8000-00805f9b34fb");
    private static final UUID CLIENT_CONFIG = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    private final Handler main = new Handler(Looper.getMainLooper());
    private BluetoothGatt gatt;
    private boolean running;
    private int lastBpm;

    @PluginMethod
    public void start(PluginCall call) {
        if (Build.VERSION.SDK_INT < 31) {
            call.resolve();
            return;
        }
        if (!hasRequiredPermissions()) {
            requestPermissionForAlias("hr", call, "onHrPermission");
            return;
        }
        begin();
        call.resolve();
    }

    @PermissionCallback
    private void onHrPermission(PluginCall call) {
        if (hasRequiredPermissions()) begin();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        running = false;
        stopScan();
        closeGatt();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        running = false;
        stopScan();
        closeGatt();
    }

    @SuppressLint("MissingPermission")
    private void begin() {
        running = true;
        lastBpm = 0;
        Context ctx = getContext();
        if (ctx == null) return;
        BluetoothManager mgr = (BluetoothManager) ctx.getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = mgr == null ? null : mgr.getAdapter();
        BluetoothLeScanner scanner = adapter == null || !adapter.isEnabled() ? null : adapter.getBluetoothLeScanner();
        if (scanner == null) return;
        stopScan();
        ScanFilter filter = new ScanFilter.Builder().setServiceUuid(new ParcelUuid(HR_SERVICE)).build();
        ScanSettings settings = new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_POWER).build();
        try {
            scanner.startScan(Collections.singletonList(filter), settings, scanCallback);
        } catch (SecurityException ignored) {
            return;
        }
        main.postDelayed(this::stopScan, 20000);
    }

    private final ScanCallback scanCallback = new ScanCallback() {
        @Override
        @SuppressLint("MissingPermission")
        public void onScanResult(int callbackType, ScanResult result) {
            if (!running || gatt != null || result == null || result.getDevice() == null) return;
            stopScan();
            Context ctx = getContext();
            if (ctx == null) return;
            try {
                gatt = result.getDevice().connectGatt(ctx, false, gattCallback, BluetoothDevice.TRANSPORT_LE);
            } catch (SecurityException ignored) {
                gatt = null;
            }
        }
    };

    private final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {
        @Override
        @SuppressLint("MissingPermission")
        public void onConnectionStateChange(BluetoothGatt g, int status, int newState) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                try { g.discoverServices(); } catch (SecurityException ignored) { /* gone */ }
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                closeGatt();
            }
        }

        @Override
        @SuppressLint("MissingPermission")
        public void onServicesDiscovered(BluetoothGatt g, int status) {
            if (status != BluetoothGatt.GATT_SUCCESS) return;
            android.bluetooth.BluetoothGattService svc = g.getService(HR_SERVICE);
            BluetoothGattCharacteristic ch = svc == null ? null : svc.getCharacteristic(HR_MEAS);
            if (ch == null) return;
            try {
                g.setCharacteristicNotification(ch, true);
                BluetoothGattDescriptor desc = ch.getDescriptor(CLIENT_CONFIG);
                if (desc == null) return;
                if (Build.VERSION.SDK_INT >= 33) {
                    g.writeDescriptor(desc, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                } else {
                    desc.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                    g.writeDescriptor(desc);
                }
            } catch (SecurityException ignored) { /* the strap refused */ }
        }

        @Override
        public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic ch, byte[] value) {
            publish(value);
        }

        @Override
        public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic ch) {
            publish(ch.getValue());
        }
    };

    private void publish(byte[] value) {
        if (!running || value == null || value.length < 2) return;
        int flags = value[0] & 0xff;
        int bpm = (flags & 0x01) == 0 ? (value[1] & 0xff) : (value.length < 3 ? 0 : (value[1] & 0xff) | ((value[2] & 0xff) << 8));
        if (bpm < 25 || bpm > 250 || bpm == lastBpm) return;
        lastBpm = bpm;
        JSObject data = new JSObject();
        data.put("bpm", bpm);
        notifyListeners("bpm", data);
    }

    @SuppressLint("MissingPermission")
    private void stopScan() {
        main.removeCallbacksAndMessages(null);
        Context ctx = getContext();
        if (ctx == null) return;
        BluetoothManager mgr = (BluetoothManager) ctx.getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = mgr == null ? null : mgr.getAdapter();
        BluetoothLeScanner scanner = adapter == null ? null : adapter.getBluetoothLeScanner();
        if (scanner == null) return;
        try { scanner.stopScan(scanCallback); } catch (Exception ignored) { /* already stopped */ }
    }

    @SuppressLint("MissingPermission")
    private void closeGatt() {
        BluetoothGatt g = gatt;
        gatt = null;
        if (g == null) return;
        try {
            g.disconnect();
            g.close();
        } catch (Exception ignored) { /* already closed */ }
    }
}
