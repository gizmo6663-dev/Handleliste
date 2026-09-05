package no.handleliste.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * Handlelista på hjemskjermen. Trykk på en vare for å krysse den av eller
 * angre; pluss-knappen åpner appen for å skrive inn noe nytt.
 */
public class HandlelisteWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, build(context, id));
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (WidgetActions.ACTION_TOGGLE.equals(intent.getAction())) {
            WidgetActions.toggle(context, intent.getStringExtra(WidgetActions.EXTRA_ENTRY_ID));
        }
    }

    private static RemoteViews build(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_handleliste);

        int remaining = WidgetStore.snapshot(context).optInt("remaining", 0);
        views.setTextViewText(R.id.widget_count, remaining > 0 ? String.valueOf(remaining) : "");

        // Radene hentes fra tjenesten. Data-URI-en må være unik per widget,
        // ellers gjenbruker Android innholdet fra en annen instans.
        Intent rows = new Intent(context, ListWidgetService.class);
        rows.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        rows.setData(Uri.parse(rows.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_list, rows);
        views.setEmptyView(R.id.widget_list, R.id.widget_empty);

        // Én mal for alle radene; hver rad fyller inn sin egen linje-id.
        Intent toggle = new Intent(context, HandlelisteWidget.class);
        toggle.setAction(WidgetActions.ACTION_TOGGLE);
        toggle.setData(Uri.parse(toggle.toUri(Intent.URI_INTENT_SCHEME)));
        views.setPendingIntentTemplate(
                R.id.widget_list,
                PendingIntent.getBroadcast(
                        context,
                        0,
                        toggle,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));

        // En widget kan ikke ta imot tekst, så pluss-knappen og overskriften
        // åpner appen der skrivefeltet står.
        PendingIntent open = openApp(context);
        views.setOnClickPendingIntent(R.id.widget_add, open);
        views.setOnClickPendingIntent(R.id.widget_title, open);
        views.setOnClickPendingIntent(R.id.widget_empty, open);

        return views;
    }

    static PendingIntent openApp(Context context) {
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
                context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
