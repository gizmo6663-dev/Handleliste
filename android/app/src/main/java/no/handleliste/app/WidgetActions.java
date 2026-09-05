package no.handleliste.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;

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
    static final String EXTRA_ENTRY_ID = "entryId";
    static final String EXTRA_ITEM_ID = "itemId";

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
                    boolean checked = !row.optBoolean("checked", false);
                    try {
                        row.put("checked", checked);
                    } catch (JSONException ignored) {
                        // Feltet er alltid skrivbart; hoppes over i verste fall.
                    }
                    break;
                }
            }
            writeBack(context, snapshot, list);
        }

        enqueue(context, "toggle", EXTRA_ENTRY_ID, entryId);
        refreshAll(context);
    }

    /** Flytt en foreslått vare over på handlelista. */
    static void add(Context context, String itemId) {
        if (itemId == null || itemId.isEmpty()) {
            return;
        }

        JSONObject snapshot = WidgetStore.snapshot(context);
        JSONArray suggestions = snapshot.optJSONArray("suggestions");
        JSONArray list = snapshot.optJSONArray("list");
        if (suggestions != null && list != null) {
            JSONArray remainingSuggestions = new JSONArray();
            for (int i = 0; i < suggestions.length(); i++) {
                JSONObject row = suggestions.optJSONObject(i);
                if (row == null) {
                    continue;
                }
                if (itemId.equals(row.optString("itemId"))) {
                    // Varen vises på lista med det samme. Appen gir den en ekte
                    // linje-id når den tømmer køen.
                    JSONObject added = new JSONObject();
                    try {
                        added.put("entryId", "venter-" + itemId);
                        added.put("itemId", itemId);
                        added.put("icon", row.optString("icon"));
                        added.put("name", row.optString("name"));
                        added.put("qty", "");
                        added.put("checked", false);
                        list.put(added);
                    } catch (JSONException ignored) {
                        // Da står varen i køen og dukker opp når appen åpnes.
                    }
                } else {
                    remainingSuggestions.put(row);
                }
            }
            try {
                snapshot.put("suggestions", remainingSuggestions);
            } catch (JSONException ignored) {
                // Forslaget blir stående til appen skriver nytt snapshot.
            }
            writeBack(context, snapshot, list);
        }

        enqueue(context, "add", EXTRA_ITEM_ID, itemId);
        refreshAll(context);
    }

    /** Teller opp hvor mange varer som gjenstår og lagrer snapshotet. */
    private static void writeBack(Context context, JSONObject snapshot, JSONArray list) {
        int remaining = 0;
        for (int i = 0; i < list.length(); i++) {
            JSONObject row = list.optJSONObject(i);
            if (row != null && !row.optBoolean("checked", false)) {
                remaining++;
            }
        }
        try {
            snapshot.put("list", list);
            snapshot.put("remaining", remaining);
        } catch (JSONException ignored) {
            // Snapshotet står som det var; appen retter det opp ved neste sync.
        }
        WidgetStore.saveSnapshot(context, snapshot.toString());
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
        notifyProvider(context, manager, HandlelisteWidget.class, R.id.widget_list);
        notifyProvider(context, manager, PafyllWidget.class, R.id.widget_list);
    }

    private static void notifyProvider(
            Context context,
            AppWidgetManager manager,
            Class<?> provider,
            int collectionViewId) {
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, provider));
        if (ids == null || ids.length == 0) {
            return;
        }
        // Listeinnholdet leses av fabrikken; rammen rundt tegnes av provideren.
        manager.notifyAppWidgetViewDataChanged(ids, collectionViewId);
        context.sendBroadcast(
                new android.content.Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                        .setComponent(new ComponentName(context, provider))
                        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids));
    }
}
