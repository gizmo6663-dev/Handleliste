package no.handleliste.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.text.SpannableString;
import android.text.style.StrikethroughSpan;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Fyller innholdet i widgetene.
 *
 * Handleliste-widgeten har tre sider — lista, kategorioversikten og varene i
 * én kategori — og fabrikken slår opp hvilken den skal fylle. Påfyll-widgeten
 * har bare én.
 *
 * Rullbart innhold i en widget må gå gjennom en tjeneste som denne; det er
 * også det som gjør at widgeten kan endre størrelse uten at noe forsvinner.
 */
class WidgetListFactory implements RemoteViewsService.RemoteViewsFactory {

    /** De fire innholdstypene, som hver har sin egen radutforming. */
    private static final int TYPE_LIST = 0;
    private static final int TYPE_CATEGORY = 1;
    private static final int TYPE_ITEM = 2;
    private static final int TYPE_SUGGESTION = 3;

    private final Context context;
    private final int widgetId;
    private final boolean refillWidget;
    /** Siden denne fabrikken ble laget for; én fabrikk per side. */
    private final String page;

    private JSONArray rows = new JSONArray();
    private int type = TYPE_LIST;

    WidgetListFactory(Context context, Intent intent, boolean refillWidget) {
        this.context = context;
        this.refillWidget = refillWidget;
        this.widgetId = intent.getIntExtra(
                AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        String requested = intent.getStringExtra(WidgetActions.EXTRA_PAGE);
        this.page = requested != null ? requested : WidgetState.PAGE_LIST;
    }

    @Override
    public void onCreate() {
        onDataSetChanged();
    }

    @Override
    public void onDataSetChanged() {
        JSONObject snapshot = WidgetStore.snapshot(context);

        if (refillWidget) {
            type = TYPE_SUGGESTION;
            rows = dueSuggestions(snapshot);
            return;
        }

        if (WidgetState.PAGE_CATEGORIES.equals(page)) {
            type = TYPE_CATEGORY;
            rows = categories(snapshot);
        } else if (WidgetState.PAGE_ITEMS.equals(page)) {
            type = TYPE_ITEM;
            rows = itemsIn(snapshot, WidgetState.category(context, widgetId));
        } else {
            type = TYPE_LIST;
            JSONArray list = snapshot.optJSONArray("list");
            rows = list != null ? list : new JSONArray();
        }
    }

    // -----------------------------------------------------------------------
    // Utvalgene widgetene viser
    // -----------------------------------------------------------------------

    /**
     * Forslagene appen sendte, begrenset til dem som har forfalt nå.
     *
     * Appen sender også varer som forfaller litt fram i tid, sammen med
     * tidspunktet de skal dukke opp. Da holder widgeten seg riktig selv om
     * appen ikke har vært åpen på en stund.
     */
    static JSONArray dueSuggestions(JSONObject snapshot) {
        JSONArray all = snapshot.optJSONArray("suggestions");
        JSONArray due = new JSONArray();
        if (all == null) {
            return due;
        }
        long now = System.currentTimeMillis();
        for (int i = 0; i < all.length(); i++) {
            JSONObject row = all.optJSONObject(i);
            if (row != null && row.optLong("suggestAt", 0L) <= now) {
                due.put(row);
            }
        }
        return due;
    }

    /** Kategoriene som har varer å legge til, med antall. */
    static JSONArray categories(JSONObject snapshot) {
        JSONArray order = snapshot.optJSONArray("categories");
        JSONArray catalog = snapshot.optJSONArray("catalog");
        JSONArray result = new JSONArray();
        if (order == null || catalog == null) {
            return result;
        }

        for (int i = 0; i < order.length(); i++) {
            JSONObject category = order.optJSONObject(i);
            if (category == null) {
                continue;
            }
            String id = category.optString("id");
            int count = 0;
            for (int j = 0; j < catalog.length(); j++) {
                JSONObject item = catalog.optJSONObject(j);
                if (item != null
                        && id.equals(item.optString("categoryId"))
                        && !item.optBoolean("onList", false)) {
                    count++;
                }
            }
            if (count == 0) {
                continue;
            }
            JSONObject row = new JSONObject();
            try {
                row.put("id", id);
                row.put("icon", category.optString("icon"));
                row.put("name", category.optString("name"));
                row.put("count", count);
            } catch (org.json.JSONException ignored) {
                continue;
            }
            result.put(row);
        }
        return result;
    }

    /** Varene i én kategori som ikke allerede ligger på lista. */
    static JSONArray itemsIn(JSONObject snapshot, String categoryId) {
        JSONArray catalog = snapshot.optJSONArray("catalog");
        JSONArray result = new JSONArray();
        if (catalog == null || categoryId == null || categoryId.isEmpty()) {
            return result;
        }
        for (int i = 0; i < catalog.length(); i++) {
            JSONObject item = catalog.optJSONObject(i);
            if (item != null
                    && categoryId.equals(item.optString("categoryId"))
                    && !item.optBoolean("onList", false)) {
                result.put(item);
            }
        }
        return result;
    }

    // -----------------------------------------------------------------------
    // Radene
    // -----------------------------------------------------------------------

    @Override
    public RemoteViews getViewAt(int position) {
        JSONObject row = rows.optJSONObject(position);
        if (row == null) {
            return new RemoteViews(context.getPackageName(), R.layout.widget_row_item);
        }
        switch (type) {
            case TYPE_CATEGORY:
                return categoryTile(row);
            case TYPE_ITEM:
                return itemRow(row);
            case TYPE_SUGGESTION:
                return suggestionRow(row);
            default:
                return listRow(row);
        }
    }

    private RemoteViews listRow(JSONObject row) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_row_list);
        boolean checked = row.optBoolean("checked", false);
        String name = row.optString("name");

        views.setTextViewText(R.id.row_icon, row.optString("icon"));
        views.setTextViewText(R.id.row_qty, row.optString("qty"));
        views.setTextViewText(R.id.row_check, checked ? "✓" : "○");

        if (checked) {
            // Avkrysset vare beholder plassen sin, men trer i bakgrunnen.
            SpannableString struck = new SpannableString(name);
            struck.setSpan(new StrikethroughSpan(), 0, struck.length(), 0);
            views.setTextViewText(R.id.row_name, struck);
            views.setTextColor(R.id.row_name, color(R.color.widgetMuted));
            views.setTextColor(R.id.row_check, color(R.color.widgetAccent));
        } else {
            views.setTextViewText(R.id.row_name, name);
            views.setTextColor(R.id.row_name, color(R.color.widgetText));
            views.setTextColor(R.id.row_check, color(R.color.widgetMuted));
        }

        Intent fillIn = new Intent();
        fillIn.putExtra(WidgetActions.EXTRA_ENTRY_ID, row.optString("entryId"));
        views.setOnClickFillInIntent(R.id.row_root, fillIn);
        return views;
    }

    private RemoteViews categoryTile(JSONObject row) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tile_category);
        views.setTextViewText(R.id.row_icon, row.optString("icon"));
        views.setTextViewText(R.id.row_name, row.optString("name"));
        views.setTextViewText(R.id.row_count, String.valueOf(row.optInt("count")));

        Intent fillIn = new Intent();
        fillIn.putExtra(WidgetActions.EXTRA_PAGE, WidgetState.PAGE_ITEMS);
        fillIn.putExtra(WidgetActions.EXTRA_CATEGORY_ID, row.optString("id"));
        views.setOnClickFillInIntent(R.id.row_root, fillIn);
        return views;
    }

    private RemoteViews itemRow(JSONObject row) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_row_item);
        views.setTextViewText(R.id.row_icon, row.optString("icon"));
        views.setTextViewText(R.id.row_name, row.optString("name"));

        Intent fillIn = new Intent();
        fillIn.putExtra(WidgetActions.EXTRA_ITEM_ID, row.optString("itemId"));
        views.setOnClickFillInIntent(R.id.row_root, fillIn);
        return views;
    }

    private RemoteViews suggestionRow(JSONObject row) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_row_refill);
        views.setTextViewText(R.id.row_icon, row.optString("icon"));
        views.setTextViewText(R.id.row_name, row.optString("name"));
        views.setTextViewText(R.id.row_why, row.optString("why"));

        Intent fillIn = new Intent();
        fillIn.putExtra(WidgetActions.EXTRA_ITEM_ID, row.optString("itemId"));
        views.setOnClickFillInIntent(R.id.row_root, fillIn);
        return views;
    }

    private int color(int resource) {
        return ContextCompat.getColor(context, resource);
    }

    // -----------------------------------------------------------------------

    @Override
    public void onDestroy() {
        rows = new JSONArray();
    }

    @Override
    public int getCount() {
        return rows.length();
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        // Én per radutforming, siden samme fabrikk betjener alle sidene.
        return 4;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return false;
    }
}
