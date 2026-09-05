package no.handleliste.app;

import android.content.Context;
import android.content.Intent;
import android.text.SpannableString;
import android.text.style.StrikethroughSpan;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Fyller listene i widgetene. Brukes av begge: handlelista viser en
 * avkryssingsrad per vare, påfyll-widgeten viser forslagene med en pluss-knapp.
 *
 * En rullbar liste i en widget må gå gjennom en tjeneste som denne — det er
 * også det som gjør at widgeten kan endre størrelse uten at innhold forsvinner.
 */
class WidgetListFactory implements RemoteViewsService.RemoteViewsFactory {

    /** Hvilken av de to widgetene fabrikken jobber for. */
    enum Kind {
        LISTE,
        PAFYLL
    }

    private final Context context;
    private final Kind kind;
    private JSONArray rows = new JSONArray();

    WidgetListFactory(Context context, Kind kind) {
        this.context = context;
        this.kind = kind;
    }

    @Override
    public void onCreate() {
        onDataSetChanged();
    }

    @Override
    public void onDataSetChanged() {
        JSONObject snapshot = WidgetStore.snapshot(context);
        if (kind == Kind.LISTE) {
            JSONArray found = snapshot.optJSONArray("list");
            rows = found != null ? found : new JSONArray();
        } else {
            rows = dueSuggestions(snapshot);
        }
    }

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

    @Override
    public void onDestroy() {
        rows = new JSONArray();
    }

    @Override
    public int getCount() {
        return rows.length();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        JSONObject row = rows.optJSONObject(position);
        if (row == null) {
            return loadingView();
        }
        return kind == Kind.LISTE ? listRow(row) : refillRow(row);
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

    private RemoteViews refillRow(JSONObject row) {
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
        return androidx.core.content.ContextCompat.getColor(context, resource);
    }

    private RemoteViews loadingView() {
        return new RemoteViews(context.getPackageName(), R.layout.widget_row_list);
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
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
