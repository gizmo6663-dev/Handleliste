package no.handleliste.app;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Broen fra websiden til hjemskjerm-widgeten. */
@CapacitorPlugin(name = "Handleliste")
public class HandlelistePlugin extends Plugin {

    /**
     * Tar imot en kort oppsummering av lista og oppdaterer widgeten.
     * Kalles av websiden hver gang lista endrer seg.
     */
    @PluginMethod
    public void syncWidget(PluginCall call) {
        JSArray lines = call.getArray("lines");
        Integer remaining = call.getInt("remaining", 0);

        JSObject payload = new JSObject();
        payload.put("lines", lines != null ? lines : new JSArray());
        payload.put("remaining", remaining != null ? remaining : 0);

        WidgetStore.save(getContext(), payload.toString());
        HandlelisteWidget.refreshAll(getContext());
        call.resolve();
    }
}
