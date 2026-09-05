package no.handleliste.app;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

/** Broen mellom websiden og de to hjemskjerm-widgetene. */
@CapacitorPlugin(name = "Handleliste")
public class HandlelistePlugin extends Plugin {

    /**
     * Tar imot lista, forslagene og katalogen appen kjenner, og oppdaterer
     * widgetene. Kalles av websiden hver gang noe endrer seg.
     */
    @PluginMethod
    public void syncWidget(PluginCall call) {
        JSArray list = call.getArray("list");
        JSArray suggestions = call.getArray("suggestions");
        JSArray categories = call.getArray("categories");
        JSArray catalog = call.getArray("catalog");
        Integer remaining = call.getInt("remaining", 0);

        JSObject payload = new JSObject();
        payload.put("list", list != null ? list : new JSArray());
        payload.put("suggestions", suggestions != null ? suggestions : new JSArray());
        payload.put("categories", categories != null ? categories : new JSArray());
        payload.put("catalog", catalog != null ? catalog : new JSArray());
        payload.put("remaining", remaining != null ? remaining : 0);

        WidgetStore.saveSnapshot(getContext(), payload.toString());
        WidgetActions.refreshAll(getContext());
        call.resolve();
    }

    /**
     * Henter trykkene som er gjort i widgetene siden sist, og tømmer køen.
     * Websiden kjører dem gjennom sin egen logikk og sender et nytt
     * snapshot tilbake etterpå.
     */
    @PluginMethod
    public void takePendingOps(PluginCall call) {
        String raw = WidgetStore.takeQueue(getContext());
        JSObject result = new JSObject();
        try {
            result.put("ops", new JSArray(raw));
        } catch (JSONException e) {
            result.put("ops", new JSArray());
        }
        call.resolve(result);
    }
}
