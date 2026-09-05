package no.handleliste.app;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Hvilken side hver enkelt widget står på.
 *
 * Handleliste-widgeten har tre sider: lista man krysser av i, oversikten over
 * kategorier, og varene i én kategori. To widgeter på hjemskjermen kan stå på
 * hver sin side, så tilstanden lagres per widget-id.
 */
final class WidgetState {

    static final String PAGE_LIST = "liste";
    static final String PAGE_CATEGORIES = "kategorier";
    static final String PAGE_ITEMS = "varer";

    private static final String PREFS = "handleliste_widget_state";

    private WidgetState() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String page(Context context, int widgetId) {
        return prefs(context).getString("side-" + widgetId, PAGE_LIST);
    }

    /** Kategorien som vises når siden er PAGE_ITEMS. */
    static String category(Context context, int widgetId) {
        return prefs(context).getString("kategori-" + widgetId, "");
    }

    static void setPage(Context context, int widgetId, String page, String categoryId) {
        prefs(context)
                .edit()
                .putString("side-" + widgetId, page)
                .putString("kategori-" + widgetId, categoryId != null ? categoryId : "")
                .apply();
    }

    /** Rydder opp når en widget fjernes fra hjemskjermen. */
    static void forget(Context context, int widgetId) {
        prefs(context).edit().remove("side-" + widgetId).remove("kategori-" + widgetId).apply();
    }
}
