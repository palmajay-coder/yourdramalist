package com.palmajay.yourdramalist.mobiletest;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
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
        // Tell the website which app version is running, so it can offer an update when a newer one exists.
        try {
            android.content.pm.PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            @SuppressWarnings("deprecation")
            long code = Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
            web.getSettings().setUserAgentString(web.getSettings().getUserAgentString() + " YourDramaListApp/" + code);
        } catch (Exception ignored) {
            // The site then treats this as an older app, which only means it may suggest an update.
        }

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
