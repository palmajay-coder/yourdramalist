package com.palmajay.yourdramalist.mobiletest;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private static final String HOST = "yourdramalist.net";
    private static final String START_URL = "https://" + HOST + "/";
    private static final int WHATS_NEW_VERSION_CODE = 5;
    private static final String WHATS_NEW_TITLE = "What’s new in 1.1.25";
    private static final String WHATS_NEW_MESSAGE =
            "• Unified Discover search: Find dramas, movies, actors, and directors in one search bar.\n\n"
            + "• Richer title previews: See artwork, ratings, cast, and MyDramaList reviews. Tap the blue Add to Collection button to save a title.\n\n"
            + "• My Collections: Build custom catalogs, add or remove titles across collections, and delete collections you no longer need.\n\n"
            + "• Nuvio sync: Install collections as catalogs and sync later title edits without reinstalling. Remove unwanted catalogs on the Confirmation page.\n\n"
            + "• Simpler navigation: Connect opens your lists in Community. Skip to go straight to Discover, with My Collections next.";
    private WebView web;
    private Button retry;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        int background = Color.rgb(24, 24, 24);
        getWindow().setStatusBarColor(background);
        getWindow().setNavigationBarColor(background);

        web = new WebView(this);
        web.setBackgroundColor(background);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setSupportMultipleWindows(false);

        FrameLayout layout = new FrameLayout(this);
        layout.addView(web, new FrameLayout.LayoutParams(-1, -1));
        retry = new Button(this);
        retry.setText("Couldn’t load YourDramaList. Tap to retry.");
        retry.setVisibility(Button.GONE);
        retry.setOnClickListener(view -> {
            retry.setVisibility(Button.GONE);
            web.loadUrl(START_URL);
        });
        FrameLayout.LayoutParams retryLayout = new FrameLayout.LayoutParams(-2, -2);
        retryLayout.gravity = android.view.Gravity.CENTER;
        layout.addView(retry, retryLayout);
        setContentView(layout);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri url = request.getUrl();
                String scheme = url.getScheme();
                if ("https".equals(scheme) && HOST.equalsIgnoreCase(url.getHost())) return false;
                if ("https".equals(scheme) || "stremio".equals(scheme) || "nuvio".equals(scheme)) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, url));
                    } catch (ActivityNotFoundException error) {
                        Toast.makeText(MainActivity.this, "Use Copy install link to open it manually.", Toast.LENGTH_LONG).show();
                    }
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) retry.setVisibility(Button.VISIBLE);
            }
        });
        if (state == null || web.restoreState(state) == null) web.loadUrl(START_URL);
        showWhatsNewAfterUpdate();
    }

    @SuppressWarnings("deprecation")
    private void showWhatsNewAfterUpdate() {
        final PackageInfo installedPackage;
        try {
            installedPackage = getPackageManager().getPackageInfo(getPackageName(), 0);
        } catch (PackageManager.NameNotFoundException ignored) {
            return;
        }
        if (installedPackage.versionCode != WHATS_NEW_VERSION_CODE
                || installedPackage.lastUpdateTime <= installedPackage.firstInstallTime) return;

        SharedPreferences updates = getSharedPreferences("release-notes", MODE_PRIVATE);
        String acknowledgedVersion = "acknowledged-version";
        if (updates.getInt(acknowledgedVersion, 0) >= WHATS_NEW_VERSION_CODE) return;

        AlertDialog dialog = new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
                .setTitle(WHATS_NEW_TITLE)
                .setMessage(WHATS_NEW_MESSAGE)
                .setPositiveButton("Got it", (view, action) -> view.dismiss())
                .create();
        dialog.setCanceledOnTouchOutside(false);
        dialog.setOnDismissListener(view ->
                updates.edit().putInt(acknowledgedVersion, WHATS_NEW_VERSION_CODE).apply());
        dialog.show();
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        web.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
