package no.handleliste.app;

import android.content.Intent;
import android.widget.RemoteViewsService;

/** Serverer radene til påfyll-widgeten. */
public class PafyllWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new WidgetListFactory(getApplicationContext(), WidgetListFactory.Kind.PAFYLL);
    }
}
