package no.handleliste.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * Handlelista på hjemskjermen, med tre sider man blar mellom:
 *
 *   Lista       — trykk på en vare for å krysse den av eller angre.
 *   Kategoriene — pluss-knappen fører hit; store fliser med antall varer.
 *   Varene      — alt du har i én kategori; trykk legger varen på lista.
 *
 * Tilbake-knappen tar deg alltid ett steg opp, så man aldri blir stående fast.
 */
public class HandlelisteWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, build(context, id));
        }
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            WidgetState.forget(context, id);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (WidgetActions.ACTION_TOGGLE.equals(action)) {
            WidgetActions.toggle(context, intent.getStringExtra(WidgetActions.EXTRA_ENTRY_ID));
        } else if (WidgetActions.ACTION_ADD.equals(action)) {
            WidgetActions.add(context, intent.getStringExtra(WidgetActions.EXTRA_ITEM_ID));
        } else if (WidgetActions.ACTION_PAGE.equals(action)) {
            WidgetActions.page(
                    context,
                    intent.getIntExtra(
                            AppWidgetManager.EXTRA_APPWIDGET_ID,
                            AppWidgetManager.INVALID_APPWIDGET_ID),
                    intent.getStringExtra(WidgetActions.EXTRA_PAGE),
                    intent.getStringExtra(WidgetActions.EXTRA_CATEGORY_ID));
        }
    }

    static RemoteViews build(Context context, int appWidgetId) {
        String page = WidgetState.page(context, appWidgetId);
        JSONObject snapshot = WidgetStore.snapshot(context);

        if (WidgetState.PAGE_CATEGORIES.equals(page)) {
            return categoriesPage(context, appWidgetId);
        }
        if (WidgetState.PAGE_ITEMS.equals(page)) {
            return itemsPage(context, appWidgetId, snapshot);
        }
        return listPage(context, appWidgetId, snapshot);
    }

    // -----------------------------------------------------------------------
    // Sidene
    // -----------------------------------------------------------------------

    private static RemoteViews listPage(Context context, int widgetId, JSONObject snapshot) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_page_list);

        int remaining = snapshot.optInt("remaining", 0);
        views.setTextViewText(R.id.widget_count, remaining > 0 ? String.valueOf(remaining) : "");

        collection(context, views, widgetId, WidgetState.PAGE_LIST);
        template(context, views, widgetId, WidgetActions.ACTION_TOGGLE);

        // Pluss-knappen fører til kategoriene, der man plukker kjente varer.
        views.setOnClickPendingIntent(
                R.id.widget_add, pageIntent(context, widgetId, WidgetState.PAGE_CATEGORIES, null));
        views.setOnClickPendingIntent(R.id.widget_title, openApp(context));
        views.setOnClickPendingIntent(R.id.widget_empty, openApp(context));
        return views;
    }

    private static RemoteViews categoriesPage(Context context, int widgetId) {
        RemoteViews views =
                new RemoteViews(context.getPackageName(), R.layout.widget_page_categories);

        collection(context, views, widgetId, WidgetState.PAGE_CATEGORIES);
        template(context, views, widgetId, WidgetActions.ACTION_PAGE);

        views.setOnClickPendingIntent(
                R.id.widget_back, pageIntent(context, widgetId, WidgetState.PAGE_LIST, null));
        views.setOnClickPendingIntent(R.id.widget_empty, openApp(context));
        return views;
    }

    private static RemoteViews itemsPage(Context context, int widgetId, JSONObject snapshot) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_page_items);

        String categoryId = WidgetState.category(context, widgetId);
        views.setTextViewText(R.id.widget_title, categoryName(snapshot, categoryId));

        collection(context, views, widgetId, WidgetState.PAGE_ITEMS);
        template(context, views, widgetId, WidgetActions.ACTION_ADD);

        // Tilbake til kategorioversikten, ikke helt ut til lista.
        views.setOnClickPendingIntent(
                R.id.widget_back, pageIntent(context, widgetId, WidgetState.PAGE_CATEGORIES, null));
        views.setOnClickPendingIntent(
                R.id.widget_done, pageIntent(context, widgetId, WidgetState.PAGE_LIST, null));
        return views;
    }

    private static String categoryName(JSONObject snapshot, String categoryId) {
        org.json.JSONArray categories = snapshot.optJSONArray("categories");
        if (categories == null) {
            return "";
        }
        for (int i = 0; i < categories.length(); i++) {
            JSONObject category = categories.optJSONObject(i);
            if (category != null && categoryId.equals(category.optString("id"))) {
                return category.optString("icon") + "  " + category.optString("name");
            }
        }
        return "";
    }

    // -----------------------------------------------------------------------
    // Felles oppkobling
    // -----------------------------------------------------------------------

    /** Kobler den rullbare delen til tjenesten som fyller den. */
    private static void collection(
            Context context, RemoteViews views, int widgetId, String page) {
        Intent rows = new Intent(context, ListWidgetService.class);
        rows.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        // Data-URI-en må være unik per widget og side. Sidene bruker ulike
        // radutforminger — og kategoriene et rutenett — så en gjenbrukt
        // adapter ville fylt feil visning.
        rows.putExtra(WidgetActions.EXTRA_PAGE, page);
        rows.setData(Uri.parse(rows.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_collection, rows);
        views.setEmptyView(R.id.widget_collection, R.id.widget_empty);
    }

    /**
     * Én mal for alle radene på siden; hver rad fyller inn sin egen id.
     * Malen bærer widget-id-en, slik at handlingen vet hvilken widget den kom fra.
     */
    private static void template(Context context, RemoteViews views, int widgetId, String action) {
        Intent intent = new Intent(context, HandlelisteWidget.class);
        intent.setAction(action);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        intent.setData(Uri.parse(intent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setPendingIntentTemplate(
                R.id.widget_collection,
                PendingIntent.getBroadcast(
                        context,
                        widgetId,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));
    }

    private static PendingIntent pageIntent(
            Context context, int widgetId, String page, String categoryId) {
        Intent intent = new Intent(context, HandlelisteWidget.class);
        intent.setAction(WidgetActions.ACTION_PAGE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        intent.putExtra(WidgetActions.EXTRA_PAGE, page);
        intent.putExtra(WidgetActions.EXTRA_CATEGORY_ID, categoryId);
        intent.setData(Uri.parse(intent.toUri(Intent.URI_INTENT_SCHEME)));
        return PendingIntent.getBroadcast(
                context,
                widgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static PendingIntent openApp(Context context) {
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
                context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
