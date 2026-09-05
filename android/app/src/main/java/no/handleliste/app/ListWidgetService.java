package no.handleliste.app;

import android.content.Intent;
import android.widget.RemoteViewsService;

/** Serverer radene til handleliste-widgeten. */
public class ListWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new WidgetListFactory(getApplicationContext(), WidgetListFactory.Kind.LISTE);
    }
}
