package no.handleliste.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Hjemskjerm-widgeten: de neste varene på lista, uten å åpne appen.
 *
 * En widget kan ikke bygge lister fritt uten en egen tjeneste, så layouten har
 * seks faste rader som skjules når de ikke er i bruk. Resten oppsummeres på
 * siste linje.
 */
public class HandlelisteWidget extends AppWidgetProvider {

    private static final int MAX_ROWS = 6;

    private static final int[] ROW_IDS = {
            R.id.widget_row_0, R.id.widget_row_1, R.id.widget_row_2,
            R.id.widget_row_3, R.id.widget_row_4, R.id.widget_row_5,
    };

    private static final int[] TEXT_IDS = {
            R.id.widget_row_0_text, R.id.widget_row_1_text, R.id.widget_row_2_text,
            R.id.widget_row_3_text, R.id.widget_row_4_text, R.id.widget_row_5_text,
    };

    private static final int[] QTY_IDS = {
            R.id.widget_row_0_qty, R.id.widget_row_1_qty, R.id.widget_row_2_qty,
            R.id.widget_row_3_qty, R.id.widget_row_4_qty, R.id.widget_row_5_qty,
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        RemoteViews views = build(context);
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, views);
        }
    }

    /** Ber alle widgeter på hjemskjermen tegne seg på nytt. */
    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, HandlelisteWidget.class);
        int[] ids = manager.getAppWidgetIds(provider);
        if (ids == null || ids.length == 0) {
            return;
        }
        RemoteViews views = build(context);
        for (int id : ids) {
            manager.updateAppWidget(id, views);
        }
    }

    private static RemoteViews build(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_handleliste);

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(
                context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pending);

        int shown = 0;
        int remaining = 0;

        String raw = WidgetStore.load(context);
        if (raw != null) {
            try {
                JSONObject payload = new JSONObject(raw);
                remaining = payload.optInt("remaining", 0);
                JSONArray lines = payload.optJSONArray("lines");
                if (lines != null) {
                    for (int i = 0; i < lines.length() && shown < MAX_ROWS; i++) {
                        JSONObject line = lines.optJSONObject(i);
                        if (line == null) {
                            continue;
                        }
                        views.setTextViewText(TEXT_IDS[shown], line.optString("text"));
                        views.setTextViewText(QTY_IDS[shown], line.optString("qty"));
                        views.setViewVisibility(ROW_IDS[shown], View.VISIBLE);
                        shown++;
                    }
                }
            } catch (JSONException ignored) {
                // Ødelagt lagret innhold skal ikke velte hjemskjermen.
            }
        }

        for (int i = shown; i < MAX_ROWS; i++) {
            views.setViewVisibility(ROW_IDS[i], View.GONE);
        }

        views.setTextViewText(R.id.widget_count, remaining > 0 ? String.valueOf(remaining) : "");
        views.setViewVisibility(R.id.widget_empty, shown == 0 ? View.VISIBLE : View.GONE);

        int hidden = remaining - shown;
        if (hidden > 0) {
            views.setTextViewText(R.id.widget_more, context.getString(R.string.widget_more, hidden));
            views.setViewVisibility(R.id.widget_more, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_more, View.GONE);
        }

        return views;
    }
}
