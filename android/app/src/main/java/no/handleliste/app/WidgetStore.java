package no.handleliste.app;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Det lille laget widgeten og websiden deler.
 *
 * Websiden lagrer alt i WebViewens eget localStorage, som en hjemskjerm-widget
 * ikke har tilgang til. Derfor skriver appen en kort oppsummering av lista hit
 * hver gang den endrer seg, og widgeten leser den herfra.
 */
final class WidgetStore {

    private static final String PREFS = "handleliste_widget";
    private static final String KEY_PAYLOAD = "payload";

    private WidgetStore() {}

    static void save(Context context, String payload) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_PAYLOAD, payload)
                .apply();
    }

    static String load(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_PAYLOAD, null);
    }
}
