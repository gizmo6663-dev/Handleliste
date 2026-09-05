package no.handleliste.app;

import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Må registreres før super, ellers rekker ikke broen å se plugin-en.
        registerPlugin(HandlelistePlugin.class);
        super.onCreate(savedInstanceState);

        // Fra Android 15 tegnes apper kant til kant, og websiden ville ellers
        // havnet under statuslinja og navigasjonsfeltet. Vi polstrer innholdet
        // med systemets egne mål i stedet, så toppfeltet og bunnmenyen i appen
        // alltid ligger klar av dem.
        final View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return windowInsets;
        });
    }
}
