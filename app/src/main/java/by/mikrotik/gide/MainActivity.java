package by.mikrotik.gide;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

/**
 * Единственная Activity приложения.
 * Учебник находится в assets/www (HTML/CSS/JS) и работает офлайн.
 * Нативный мост (AndroidBridge) нужен только для проверки обновлений:
 * запрос к GitHub API из Java, чтобы не зависеть от CORS для file:// страниц.
 */
public class MainActivity extends Activity {

    private static final String START_URL = "file:///android_asset/www/index.html";
    private static final String EXTRA_HASH = "hash";
    private static final String RELEASE_API =
            "https://api.github.com/repos/zigorminsk-debug/mikrotik-gide/releases/latest";

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        w.setStatusBarColor(Color.parseColor("#0d1117"));
        w.setNavigationBarColor(Color.parseColor("#0d1117"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0d1117"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setMediaPlaybackRequiresUserGesture(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                String scheme = u.getScheme() == null ? "" : u.getScheme();
                if (scheme.equals("file")) {
                    return false; // внутренние переходы (хеш-навигация)
                }
                openExternally(u);
                return true;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url != null && url.startsWith("file://")) {
                    return false;
                }
                openExternally(Uri.parse(url));
                return true;
            }
        });

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");

        // удаляем APK, оставшиеся от предыдущих попыток обновления
        UpdateInstaller.cleanup(this);

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(START_URL);
        }
        openFromShortcut(getIntent());
        registerBackCallback();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openFromShortcut(intent);
    }

    /** Переход на нужный экран из ярлыка (долгое нажатие на иконку приложения). */
    private void openFromShortcut(Intent intent) {
        if (intent == null || web == null) return;
        String hash = intent.getStringExtra(EXTRA_HASH);
        if (hash == null || hash.isEmpty()) return;
        if (!hash.startsWith("/")) hash = "/" + hash;
        web.loadUrl(START_URL + "#" + hash);
        intent.removeExtra(EXTRA_HASH);
    }

    private void openExternally(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (Exception ignored) {
        }
    }

    /** Мост для JS: проверка обновлений и открытие ссылок. */
    private static String sanitizeFileName(String raw) {
        String base = raw == null ? "file.txt" : raw.trim();
        if (base.isEmpty()) base = "file.txt";
        base = base.replace('\\', '_').replace('/', '_').replace(":", "_");
        if (base.length() > 80) base = base.substring(base.length() - 80);
        return base;
    }

    private static String mimeOf(String name) {
        String n = name.toLowerCase();
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".csv")) return "text/csv";
        if (n.endsWith(".rsc") || n.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    private class Bridge {

        /** Последний релиз с GitHub. Ответ придёт в window.__updateCallback(jsonString). */
        @JavascriptInterface
        public void getLatestRelease() {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    final String result = httpGet(RELEASE_API);
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            if (web == null) return;
                            String js = "window.__updateCallback && window.__updateCallback("
                                    + JSONObject.quote(result) + ");";
                            web.evaluateJavascript(js, null);
                        }
                    });
                }
            }).start();
        }

        /** Скачать APK и передать его системному установщику (без браузера). */
        @JavascriptInterface
        public void downloadAndInstall(final String url, final String version) {
            if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
                postUpdate("error", "Некорректная ссылка на обновление");
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && !getPackageManager().canRequestPackageInstalls()) {
                postUpdate("permission", "Разрешите установку приложений из этого источника");
                openInstallSettings();
                return;
            }
            UpdateInstaller.start(MainActivity.this, url, version, new UpdateInstaller.Callback() {
                @Override
                public void onProgress(final int percent, long done, long total) {
                    postUpdate("progress", String.valueOf(percent));
                }

                @Override
                public void onState(final String state, final String message) {
                    postUpdate(state, message);
                }
            });
        }

        /** Экран «Установка неизвестных приложений» для нашего пакета. */
        @JavascriptInterface
        public void openInstallSettings() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + getPackageName())));
                    return;
                } catch (Exception ignored) {
                }
            }
            try {
                startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.parse("package:" + getPackageName())));
            } catch (Exception ignored) {
            }
        }

        /** true, если система уже разрешает установку пакетов этому приложению. */
        @JavascriptInterface
        public boolean canInstallPackages() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                return getPackageManager().canRequestPackageInstalls();
            }
            return true;
        }

        /** Поделиться текстом через системное меню «Поделиться». */
        @JavascriptInterface
        public void share(final String text) {
            if (text == null || text.trim().isEmpty()) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent i = new Intent(Intent.ACTION_SEND);
                        i.setType("text/plain");
                        i.putExtra(Intent.EXTRA_TEXT, text);
                        startActivity(Intent.createChooser(i, "Поделиться"));
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        /** Печать статьи или сохранение в PDF через системное окно печати. */
        @JavascriptInterface
        public void printPage(final String title) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        if (pm == null || web == null) return;
                        String name = (title == null || title.trim().isEmpty()) ? "MikroTik" : title.trim();
                        PrintDocumentAdapter adapter = web.createPrintDocumentAdapter(name);
                        pm.print(name, adapter, new PrintAttributes.Builder().build());
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        /**
         * Сохранить текст в «Загрузки» (конфиг .rsc, CSV, резервная копия JSON).
         * На Android 10+ — через MediaStore, на более старых — в папку приложения.
         */
        @JavascriptInterface
        public void saveText(final String rawName, final String text) {
            if (text == null) return;
            final String name = sanitizeFileName(rawName);
            new Thread(new Runnable() {
                @Override
                public void run() {
                    String where = null;
                    try {
                        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            ContentValues cv = new ContentValues();
                            cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                            cv.put(MediaStore.MediaColumns.MIME_TYPE, mimeOf(name));
                            cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/MikroTik");
                            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                            if (uri != null) {
                                OutputStream os = getContentResolver().openOutputStream(uri);
                                if (os != null) {
                                    os.write(bytes);
                                    os.close();
                                    where = "Download/MikroTik/" + name;
                                }
                            }
                        } else {
                            File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                            if (dir != null) {
                                if (!dir.exists()) dir.mkdirs();
                                File f = new File(dir, name);
                                FileOutputStream fos = new FileOutputStream(f);
                                fos.write(bytes);
                                fos.close();
                                where = f.getAbsolutePath();
                            }
                        }
                    } catch (Exception e) {
                        where = null;
                    }
                    final String path = where;
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                Toast.makeText(MainActivity.this,
                                        path == null ? "Не удалось сохранить файл" : "Сохранено: " + path,
                                        Toast.LENGTH_LONG).show();
                            } catch (Exception ignored) {
                            }
                        }
                    });
                }
            }).start();
        }

        /**
         * Скачать текст по https (контент-пак, доп. статьи).
         * Ответ придёт в window.__fetchText(tag, ok, body).
         */
        @JavascriptInterface
        public void fetchText(final String url, final String tag) {
            if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
                postText(tag, false, "bad url");
                return;
            }
            new Thread(new Runnable() {
                @Override
                public void run() {
                    final String body = httpGetRaw(url);
                    postText(tag, body != null, body == null ? "network error" : body);
                }
            }).start();
        }

        @JavascriptInterface
        public void openUrl(String url) {
            if (url != null && (url.startsWith("https://") || url.startsWith("http://"))) {
                openExternally(Uri.parse(url));
            }
        }

        @JavascriptInterface
        public String getDeviceInfo() {
            try {
                JSONObject o = new JSONObject();
                o.put("android", Build.VERSION.RELEASE);
                o.put("sdk", Build.VERSION.SDK_INT);
                o.put("model", Build.MANUFACTURER + " " + Build.MODEL);
                return o.toString();
            } catch (Exception e) {
                return "{}";
            }
        }
    }

    /** Сообщение в JS: window.__fetchText(tag, ok, body). */
    private void postText(final String tag, final boolean ok, final String body) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (web == null) return;
                String js = "window.__fetchText && window.__fetchText("
                        + JSONObject.quote(tag) + "," + (ok ? "true" : "false") + ","
                        + JSONObject.quote(body) + ");";
                web.evaluateJavascript(js, null);
            }
        });
    }

    /** GET без обёртки в JSON: null при ошибке. */
    private String httpGetRaw(String urlStr) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(20000);
            conn.setInstanceFollowRedirects(true);
            conn.setRequestProperty("User-Agent", "mikrotik-gide-android");
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) return null;
            StringBuilder sb = new StringBuilder();
            BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
            String line;
            while ((line = br.readLine()) != null) sb.append(line).append('\n');
            br.close();
            return sb.toString();
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /** Сообщение в JS: window.__updateProgress(state, message). */
    private void postUpdate(final String state, final String message) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (web == null) return;
                String js = "window.__updateProgress && window.__updateProgress("
                        + JSONObject.quote(state) + "," + JSONObject.quote(message) + ");";
                web.evaluateJavascript(js, null);
            }
        });
    }

    private String httpGet(String urlStr) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);
            conn.setRequestProperty("Accept", "application/vnd.github+json");
            conn.setRequestProperty("User-Agent", "mikrotik-gide-android");
            int code = conn.getResponseCode();
            if (code != 200) {
                return "{\"error\":\"GitHub ответил " + code + "\"}";
            }
            StringBuilder sb = new StringBuilder();
            BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            br.close();
            return sb.toString();
        } catch (Exception e) {
            String msg = e.getMessage() == null ? "нет соединения" : e.getMessage();
            return "{\"error\":" + JSONObject.quote("Ошибка сети: " + msg) + "}";
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (web != null) {
            web.saveState(outState);
        }
    }

    /**
     * «Назад»: закрыть панель поиска, затем вернуться по истории экранов.
     * Возвращает false, если возвращаться некуда — тогда приложение закрывается.
     */
    private boolean handleBack() {
        if (web == null) return false;
        if (web.canGoBack()) {
            web.goBack();
            return true;
        }
        return false;
    }

    /** Android 13+ (predictive back): системный жест приходит сюда, а не в onKeyDown. */
    private void registerBackCallback() {
        if (Build.VERSION.SDK_INT < 33) return;
        getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                new OnBackInvokedCallback() {
                    @Override
                    public void onBackInvoked() {
                        if (!handleBack()) finish();
                    }
                });
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && handleBack()) {
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
