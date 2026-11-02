package by.mikrotik.gide;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Загрузка и установка обновления без браузера.
 *
 * 1. APK скачивается во внутренний кэш приложения (cache/update) — никаких разрешений на
 *    внешнее хранилище не нужно.
 * 2. Установка идёт через PackageInstaller: система сама показывает диалог «Обновить
 *    приложение?», файл никуда не «уезжает» и не остаётся в загрузках.
 * 3. После передачи данных в сессию установщика наш файл удаляется, а остатки
 *    предыдущих попыток подчищаются при следующем запуске приложения.
 */
public final class UpdateInstaller {

    /** Колбэк в UI-поток приложения. */
    public interface Callback {
        void onProgress(int percent, long done, long total);
        void onState(String state, String message);
    }

    private UpdateInstaller() { }

    public static File dir(Context c) {
        File d = new File(c.getCacheDir(), "update");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    /** Удаляет все скачанные APK — вызывается при старте приложения. */
    public static void cleanup(Context c) {
        deleteDir(new File(c.getCacheDir(), "update"));
    }

    public static void deleteDir(File dir) {
        if (dir == null || !dir.exists()) return;
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) deleteDir(f);
                else f.delete();
            }
        }
        dir.delete();
    }

    /** Скачивает APK и запускает установку. Работает в фоновом потоке. */
    public static void start(final Activity act, final String url, final String version,
                             final Callback cb) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                File apk = null;
                try {
                    File dir = dir(act);
                    // на всякий случай чистим предыдущие попытки
                    File[] old = dir.listFiles();
                    if (old != null) for (File f : old) f.delete();

                    String safe = (version == null ? "update" : version).replaceAll("[^0-9A-Za-z._-]", "_");
                    apk = new File(dir, "mikrotik-gide-" + safe + ".apk");

                    cb.onState("downloading", "Скачиваем обновление…");
                    HttpURLConnection conn = open(url);
                    long total = -1;
                    String len = conn.getHeaderField("Content-Length");
                    if (len != null) {
                        try { total = Long.parseLong(len.trim()); } catch (NumberFormatException ignored) { }
                    }

                    InputStream in = conn.getInputStream();
                    OutputStream out = new FileOutputStream(apk);
                    byte[] buf = new byte[64 * 1024];
                    long done = 0;
                    int r, last = -1;
                    try {
                        while ((r = in.read(buf)) > 0) {
                            out.write(buf, 0, r);
                            done += r;
                            if (total > 0) {
                                int pct = (int) (done * 100 / total);
                                if (pct != last) { last = pct; cb.onProgress(pct, done, total); }
                            }
                        }
                        out.flush();
                    } finally {
                        try { out.close(); } catch (Exception ignored) { }
                        try { in.close(); } catch (Exception ignored) { }
                        conn.disconnect();
                    }

                    if (apk.length() < 1024) throw new IOException("файл слишком мал");

                    cb.onState("installing", "Запускаем установщик…");
                    install(act, apk);
                    cb.onState("done", "Установка запущена");
                } catch (SecurityException se) {
                    cb.onState("permission", "Разрешите установку приложений из этого источника");
                } catch (Exception e) {
                    if (apk != null && apk.exists()) apk.delete();
                    String msg = e.getMessage() == null ? "не удалось скачать обновление" : e.getMessage();
                    cb.onState("error", msg);
                }
            }
        }, "update-download").start();
    }

    /** Открывает системную установку через сессию PackageInstaller. */
    private static void install(Activity act, File apk) throws Exception {
        PackageInstaller pm = act.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params =
                new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        int id = pm.createSession(params);

        Intent res = new Intent(act, InstallResultReceiver.class);
        res.putExtra(InstallResultReceiver.EXTRA_APK, apk.getAbsolutePath());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_MUTABLE;
        PendingIntent cb = PendingIntent.getBroadcast(act, id, res, flags);

        PackageInstaller.Session session = pm.openSession(id);
        try {
            long size = apk.length();
            FileInputStream in = new FileInputStream(apk);
            OutputStream out = session.openWrite("base.apk", 0, size);
            try {
                byte[] buf = new byte[64 * 1024];
                int r;
                while ((r = in.read(buf)) > 0) out.write(buf, 0, r);
                session.fsync(out);
            } finally {
                try { out.close(); } catch (Exception ignored) { }
                try { in.close(); } catch (Exception ignored) { }
            }
            session.commit(cb.getIntentSender());
        } finally {
            session.close();
        }

        // данные уже переданы в сессию — собственный файл больше не нужен
        try { apk.delete(); } catch (Exception ignored) { }
    }

    private static HttpURLConnection open(String url) throws IOException {
        String cur = url;
        for (int i = 0; i < 6; i++) {
            HttpURLConnection c = (HttpURLConnection) new URL(cur).openConnection();
            c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(15000);
            c.setReadTimeout(60000);
            c.setRequestProperty("User-Agent", "mikrotik-gide-android");
            c.setRequestProperty("Accept", "application/octet-stream");
            int code = c.getResponseCode();
            if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                String loc = c.getHeaderField("Location");
                c.disconnect();
                if (loc == null) throw new IOException("сервер не указал адрес перенаправления");
                cur = loc.startsWith("http") ? loc : new URL(new URL(cur), loc).toString();
                continue;
            }
            if (code != 200) {
                c.disconnect();
                throw new IOException("сервер ответил " + code);
            }
            return c;
        }
        throw new IOException("слишком много перенаправлений");
    }
}
