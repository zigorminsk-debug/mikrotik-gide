package by.mikrotik.gide;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;

import java.io.File;

/**
 * Получает результат установки от PackageInstaller.
 * После успешной установки скачанный APK удаляется, чтобы не занимать место.
 */
public class InstallResultReceiver extends BroadcastReceiver {

    public static final String EXTRA_APK = "by.mikrotik.gide.APK";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS,
                PackageInstaller.STATUS_FAILURE);

        // некоторым прошивкам нужно самим показать диалог подтверждения
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    context.startActivity(confirm);
                } catch (Exception ignored) {
                }
            }
            return;
        }

        String path = intent.getStringExtra(EXTRA_APK);
        if (path != null) {
            try {
                File apk = new File(path);
                if (apk.exists()) apk.delete();
            } catch (Exception ignored) {
            }
        }

        // подчистим папку обновлений в любом случае
        try {
            UpdateInstaller.deleteDir(new File(context.getCacheDir(), "update"));
        } catch (Exception ignored) {
        }
    }
}
