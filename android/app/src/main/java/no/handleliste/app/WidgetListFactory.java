package no.handleliste.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.text.SpannableString;
import android.text.style.StrikethroughSpan;
import android.view.View;
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

    /**
     * Flisfarge per kategori, i samme toner som prikkene i appen.
     * Slått opp her framfor med getIdentifier, som er treg og feilbarlig.
     */
    private static final java.util.Map<String, Integer> TILE_COLOURS = tileColours();

    private static java.util.Map<String, Integer> tileColours() {
        java.util.Map<String, Integer> map = new java.util.HashMap<>();
        map.put("frukt-gront", R.drawable.tile_frukt_gront);
        map.put("brod", R.drawable.tile_brod);
        map.put("meieri", R.drawable.tile_meieri);
        map.put("palegg", R.drawable.tile_palegg);
        map.put("kjott-fisk", R.drawable.tile_kjott_fisk);
        map.put("middag", R.drawable.tile_middag);
        map.put("torrvarer", R.drawable.tile_torrvarer);
        map.put("hermetikk", R.drawable.tile_hermetikk);
        map.put("frys", R.drawable.tile_frys);
        map.put("snacks", R.drawable.tile_snacks);
        map.put("drikke", R.drawable.tile_drikke);
        map.put("husholdning", R.drawable.tile_husholdning);
        map.put("hygiene", R.drawable.tile_hygiene);
        map.put("dyr", R.drawable.tile_dyr);
        map.put("annet", R.drawable.tile_annet);
        return map;
    }

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
            return new RemoteViews(context.getPackageName(), R.layout.widget_tile_item);
        }
        switch (type) {
            case TYPE_CATEGORY:
                return categoryTile(row);
            case TYPE_ITEM:
                return itemTile(row);
            case TYPE_SUGGESTION:
                return refillTile(row);
            default:
                return listTile(row);
        }
    }

    private RemoteViews listTile(JSONObject row) {
        RemoteViews views = tile(R.layout.widget_tile_list, row);
        boolean checked = row.optBoolean("checked", false);

        if (checked) {
            // Tatt: flisen krymper, blir halvgjennomsiktig, og vareikonet vikes
            // for en grå hake. Et emoji beholder fargene sine uansett hva
            // teksten farges med, og trakk blikket like mye som de aktive
            // flisene helt til det ble byttet ut.
            //
            // Streken over markerer grensen mot det som gjenstår. Et rutenett
            // kan ikke ha et element som spenner over hele bredden, så linjen
            // ligger på flisene selv.
            views.setViewVisibility(R.id.row_divider, View.VISIBLE);
            views.setInt(R.id.row_tile, "setBackgroundResource", R.drawable.tile_avkrysset);
            views.setViewPadding(R.id.row_pad, dp(8), dp(4), dp(8), dp(8));
            views.setTextViewText(R.id.row_icon, "✓");
            views.setTextColor(R.id.row_icon, color(R.color.widgetMuted));

            SpannableString struck = new SpannableString(row.optString("name"));
            struck.setSpan(new StrikethroughSpan(), 0, struck.length(), 0);
            views.setTextViewText(R.id.row_name, struck);
            views.setTextColor(R.id.row_name, color(R.color.widgetMuted));
            views.setTextViewText(R.id.row_qty, "");
        } else {
            views.setViewVisibility(R.id.row_divider, View.GONE);
            views.setViewPadding(R.id.row_pad, 0, 0, 0, 0);
            views.setTextColor(R.id.row_name, color(R.color.widgetText));
            views.setTextViewText(R.id.row_qty, row.optString("qty"));
        }

        fillIn(views, WidgetActions.EXTRA_ENTRY_ID, row.optString("entryId"));
        return views;
    }

    private RemoteViews categoryTile(JSONObject row) {
        RemoteViews views = tile(R.layout.widget_tile_category, row);
        views.setTextViewText(R.id.row_count, String.valueOf(row.optInt("count")));

        Intent extra = new Intent();
        extra.putExtra(WidgetActions.EXTRA_PAGE, WidgetState.PAGE_ITEMS);
        extra.putExtra(WidgetActions.EXTRA_CATEGORY_ID, row.optString("id"));
        views.setOnClickFillInIntent(R.id.row_root, extra);
        return views;
    }

    private RemoteViews itemTile(JSONObject row) {
        RemoteViews views = tile(R.layout.widget_tile_item, row);
        Intent extra = new Intent();
        extra.putExtra(WidgetActions.EXTRA_ITEM_ID, row.optString("itemId"));
        // Startvarer appen ikke har møtt før har ingen id, bare et navn.
        extra.putExtra(WidgetActions.EXTRA_NAME, row.optString("name"));
        views.setOnClickFillInIntent(R.id.row_root, extra);
        return views;
    }

    private RemoteViews refillTile(JSONObject row) {
        RemoteViews views = tile(R.layout.widget_tile_refill, row);
        views.setTextViewText(R.id.row_why, row.optString("why"));
        fillIn(views, WidgetActions.EXTRA_ITEM_ID, row.optString("itemId"));
        return views;
    }

    /** Felles oppsett: ikon, navn og et fargehint fra kategorien. */
    private RemoteViews tile(int layout, JSONObject row) {
        RemoteViews views = new RemoteViews(context.getPackageName(), layout);
        views.setTextViewText(R.id.row_icon, row.optString("icon"));
        views.setTextViewText(R.id.row_name, row.optString("name"));

        // Kategorisiden bærer sin egen id; de andre sidene sender categoryId.
        String category = row.optString("categoryId", row.optString("id"));
        Integer background = TILE_COLOURS.get(category);
        views.setInt(
                R.id.row_tile,
                "setBackgroundResource",
                background != null ? background : R.drawable.tile_annet);
        return views;
    }

    private void fillIn(RemoteViews views, String key, String value) {
        Intent extra = new Intent();
        extra.putExtra(key, value);
        views.setOnClickFillInIntent(R.id.row_root, extra);
    }

    private int dp(int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
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
        // Én per flisutforming, siden samme fabrikk betjener alle sidene.
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
