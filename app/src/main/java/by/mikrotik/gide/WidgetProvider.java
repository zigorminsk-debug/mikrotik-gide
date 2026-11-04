package by.mikrotik.gide;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Виджет «Продолжить чтение»: показывает последнюю открытую статью и процент
 * прочитанного. Данные кладёт страница через AndroidBridge.setWidget(...).
 */
public class WidgetProvider extends AppWidgetProvider {

    static final String PREFS = "widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        if (appWidgetIds == null) return;
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, buildViews(context));
        }
    }

    static RemoteViews buildViews(Context context) {
        SharedPreferences sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String title = sp.getString("title", "");
        String hash = sp.getString("hash", "");
        int pct = sp.getInt("pct", 0);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_progress);
        if (title == null || title.isEmpty()) {
            views.setTextViewText(R.id.wTitle, "MikroTik · Учебник");
            views.setTextViewText(R.id.wSub, "Откройте статью — покажем, где продолжить");
        } else {
            views.setTextViewText(R.id.wTitle, title);
            views.setTextViewText(R.id.wSub, "Прочитано " + pct + "% · нажмите, чтобы продолжить");
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        intent.putExtra("hash", hash == null || hash.isEmpty() ? "/" : "/" + hash.replaceFirst("^/+", ""));
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.wRoot, pi);
        return views;
    }

    /** Перерисовать все экземпляры виджета. */
    static void refresh(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, WidgetProvider.class);
            int[] ids = manager.getAppWidgetIds(cn);
            if (ids == null || ids.length == 0) return;
            for (int id : ids) {
                manager.updateAppWidget(id, buildViews(context));
            }
        } catch (Exception ignored) { }
    }
}
