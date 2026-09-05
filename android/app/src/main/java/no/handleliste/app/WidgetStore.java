package no.handleliste.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Det lille laget widgetene og websiden deler.
 *
 * Websiden lagrer alt i WebViewens eget localStorage, som en hjemskjerm-widget
 * ikke kan lese eller skrive til. Broen går derfor to veier:
 *
 *   snapshot — appen skriver en oppsummering av lista og forslagene hit,
 *              og widgetene tegner seg fra den.
 *   kø       — widgetene legger trykk (kryss av, legg til) i en kø her.
 *              Neste gang appen er framme, tømmer den køen og kjører
 *              handlingene gjennom den ekte logikken sin.
 *
 * Widgeten oppdaterer i tillegg snapshotet med én gang, slik at et trykk
 * gir svar umiddelbart i stedet for å vente på at appen åpnes.
 */
final class WidgetStore {

    private static final String PREFS = "handleliste_widget";
    private static final String KEY_SNAPSHOT = "snapshot";
    private static final String KEY_QUEUE = "queue";

    /** Widget og app deler prosess, men ikke nødvendigvis tråd. */
    private static final Object LOCK = new Object();

    private WidgetStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static JSONObject snapshot(Context context) {
        synchronized (LOCK) {
            String raw = prefs(context).getString(KEY_SNAPSHOT, null);
            if (raw == null) {
                return new JSONObject();
            }
            try {
                return new JSONObject(raw);
            } catch (JSONException e) {
                return new JSONObject();
            }
        }
    }

    static void saveSnapshot(Context context, String payload) {
        synchronized (LOCK) {
            prefs(context).edit().putString(KEY_SNAPSHOT, payload).apply();
        }
    }

    /** Legger et trykk i kø for appen, og beholder rekkefølgen. */
    static void enqueue(Context context, JSONObject operation) {
        synchronized (LOCK) {
            SharedPreferences preferences = prefs(context);
            JSONArray queue;
            try {
                String raw = preferences.getString(KEY_QUEUE, "[]");
                queue = new JSONArray(raw);
            } catch (JSONException e) {
                queue = new JSONArray();
            }
            queue.put(operation);
            preferences.edit().putString(KEY_QUEUE, queue.toString()).apply();
        }
    }

    /**
     * Henter køen og tømmer den i samme operasjon, slik at et trykk aldri
     * kan bli utført to ganger.
     */
    static String takeQueue(Context context) {
        synchronized (LOCK) {
            SharedPreferences preferences = prefs(context);
            String raw = preferences.getString(KEY_QUEUE, "[]");
            preferences.edit().remove(KEY_QUEUE).apply();
            return raw;
        }
    }
}
