package no.handleliste.app;

import android.content.Intent;
import android.widget.RemoteViewsService;

/** Serverer innholdet til handleliste-widgeten, uansett hvilken side den står på. */
public class ListWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new WidgetListFactory(getApplicationContext(), intent, false);
    }
}
