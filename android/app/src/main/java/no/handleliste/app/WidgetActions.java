package no.handleliste.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.UUID;

/**
 * Det som skjer når noen trykker i en widget.
 *
 * Handlingen legges i kø for appen, og snapshotet oppdateres med én gang så
 * widgeten svarer umiddelbart. Når appen neste gang er framme, kjører den
 * køen gjennom den ekte logikken sin og skriver et ferskt snapshot tilbake.
 */
final class WidgetActions {

    static final String ACTION_TOGGLE = "no.handleliste.app.TOGGLE";
    static final String ACTION_ADD = "no.handleliste.app.ADD";
    static final String ACTION_PAGE = "no.handleliste.app.PAGE";

    static final String EXTRA_ENTRY_ID = "entryId";
    static final String EXTRA_ITEM_ID = "itemId";
    static final String EXTRA_PAGE = "side";
    static final String EXTRA_CATEGORY_ID = "kategoriId";

    private WidgetActions() {}

    /** Kryss av eller angre avkryssing for en vare på lista. */
    static void toggle(Context context, String entryId) {
        if (entryId == null || entryId.isEmpty()) {
            return;
        }

        JSONObject snapshot = WidgetStore.snapshot(context);
        JSONArray list = snapshot.optJSONArray("list");
        if (list != null) {
            for (int i = 0; i < list.length(); i++) {
                JSONObject row = list.optJSONObject(i);
                if (row != null && entryId.equals(row.optString("entryId"))) {
                    put(row, "checked", !row.optBoolean("checked", false));
                    break;
                }
            }
            countAndSave(context, snapshot, list);
        }

        enqueue(context, "toggle", EXTRA_ENTRY_ID, entryId);
        refreshAll(context);
    }

    /**
     * Legger en kjent vare på lista — fra påfyll-widgeten eller fra en
     * kategori. Varen forsvinner der den ble trykket og dukker opp på lista.
     */
    static void add(Context context, String itemId) {
        if (itemId == null || itemId.isEmpty()) {
            return;
        }

        JSONObject snapshot = WidgetStore.snapshot(context);
        JSONArray list = snapshot.optJSONArray("list");
        String icon = "";
        String name = "";

        // Varen finnes i katalogen; merk den som lagt til, så forsvinner den
        // fra kategorivisningen med én gang.
        JSONArray catalog = snapshot.optJSONArray("catalog");
        if (catalog != null) {
            for (int i = 0; i < catalog.length(); i++) {
                JSONObject row = catalog.optJSONObject(i);
                if (row != null && itemId.equals(row.optString("itemId"))) {
                    put(row, "onList", true);
                    icon = row.optString("icon");
                    name = row.optString("name");
                    break;
                }
            }
        }

        // Den kan også ligge blant forslagene i påfyll-widgeten.
        JSONArray suggestions = snapshot.optJSONArray("suggestions");
        if (suggestions != null) {
            JSONArray remainingSuggestions = new JSONArray();
            for (int i = 0; i < suggestions.length(); i++) {
                JSONObject row = suggestions.optJSONObject(i);
                if (row == null) {
                    continue;
                }
                if (itemId.equals(row.optString("itemId"))) {
                    if (icon.isEmpty()) icon = row.optString("icon");
                    if (name.isEmpty()) name = row.optString("name");
                } else {
                    remainingSuggestions.put(row);
                }
            }
            put(snapshot, "suggestions", remainingSuggestions);
        }

        if (list != null && !name.isEmpty() && !alreadyOnList(list, itemId)) {
            JSONObject added = new JSONObject();
            // Appen gir linja en ekte id når den tømmer køen.
            put(added, "entryId", "venter-" + itemId);
            put(added, "itemId", itemId);
            put(added, "icon", icon);
            put(added, "name", name);
            put(added, "qty", "");
            put(added, "checked", false);
            list.put(added);
        }
        if (list != null) {
            countAndSave(context, snapshot, list);
        }

        enqueue(context, "add", EXTRA_ITEM_ID, itemId);
        refreshAll(context);
    }

    /** Bytter side i handleliste-widgeten. */
    static void page(Context context, int widgetId, String page, String categoryId) {
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID || page == null) {
            return;
        }
        WidgetState.setPage(context, widgetId, page, categoryId);
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        // Siden bytter layout, så hele widgeten må bygges på nytt.
        manager.updateAppWidget(widgetId, HandlelisteWidget.build(context, widgetId));
        manager.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_collection);
    }

    private static boolean alreadyOnList(JSONArray list, String itemId) {
        for (int i = 0; i < list.length(); i++) {
            JSONObject row = list.optJSONObject(i);
            if (row != null && itemId.equals(row.optString("itemId"))) {
                return true;
            }
        }
        return false;
    }

    /** Teller opp hvor mange varer som gjenstår og lagrer snapshotet. */
    private static void countAndSave(Context context, JSONObject snapshot, JSONArray list) {
        int remaining = 0;
        for (int i = 0; i < list.length(); i++) {
            JSONObject row = list.optJSONObject(i);
            if (row != null && !row.optBoolean("checked", false)) {
                remaining++;
            }
        }
        put(snapshot, "list", list);
        put(snapshot, "remaining", remaining);
        WidgetStore.saveSnapshot(context, snapshot.toString());
    }

    /** JSON-skriving som ikke velter noe om et felt skulle være uskrivbart. */
    private static void put(JSONObject target, String key, Object value) {
        try {
            target.put(key, value);
        } catch (JSONException ignored) {
            // Snapshotet står som det var; appen retter det opp ved neste sync.
        }
    }

    private static void enqueue(Context context, String type, String key, String value) {
        JSONObject operation = new JSONObject();
        try {
            operation.put("id", UUID.randomUUID().toString());
            operation.put("type", type);
            operation.put(key, value);
            // Tidspunktet for trykket, ikke for når appen rakk å lese køen —
            // det er dette forslagsmotoren lærer av.
            operation.put("at", System.currentTimeMillis());
        } catch (JSONException e) {
            return;
        }
        WidgetStore.enqueue(context, operation);
    }

    /** Ber begge widgetene hente innhold på nytt og tegne seg om. */
    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        notifyProvider(context, manager, HandlelisteWidget.class);
        notifyProvider(context, manager, PafyllWidget.class);
    }

    private static void notifyProvider(Context context, AppWidgetManager manager, Class<?> provider) {
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, provider));
        if (ids == null || ids.length == 0) {
            return;
        }
        // Listeinnholdet leses av fabrikken; rammen rundt tegnes av provideren.
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_collection);
        context.sendBroadcast(
                new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                        .setComponent(new ComponentName(context, provider))
                        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids));
    }
}
