package no.handleliste.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * Påfyll-widgeten: varene appen tror det nærmer seg at du går tom for,
 * med hvor ofte du pleier å kjøpe dem. Trykk på en vare for å legge den
 * rett på handlelista.
 *
 * Den er tom til appen har sett en vare lagt til minst to ganger — da først
 * finnes det et intervall å regne på.
 */
public class PafyllWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, build(context, id));
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (WidgetActions.ACTION_ADD.equals(intent.getAction())) {
            WidgetActions.add(
                    context,
                    intent.getStringExtra(WidgetActions.EXTRA_ITEM_ID),
                    intent.getStringExtra(WidgetActions.EXTRA_NAME));
        }
    }

    private static RemoteViews build(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_page_refill);

        int count = WidgetListFactory.dueSuggestions(WidgetStore.snapshot(context)).length();
        views.setTextViewText(R.id.widget_count, count > 0 ? String.valueOf(count) : "");

        Intent rows = new Intent(context, PafyllWidgetService.class);
        rows.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        rows.setData(Uri.parse(rows.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_collection, rows);
        views.setEmptyView(R.id.widget_collection, R.id.widget_empty);

        Intent add = new Intent(context, PafyllWidget.class);
        add.setAction(WidgetActions.ACTION_ADD);
        add.setData(Uri.parse(add.toUri(Intent.URI_INTENT_SCHEME)));
        views.setPendingIntentTemplate(
                R.id.widget_collection,
                PendingIntent.getBroadcast(
                        context,
                        0,
                        add,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));

        PendingIntent open = HandlelisteWidget.openApp(context);
        views.setOnClickPendingIntent(R.id.widget_title, open);
        views.setOnClickPendingIntent(R.id.widget_empty, open);

        return views;
    }
}
