package com.bgwfsj.tarot;

import android.content.Context;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import org.json.JSONObject;

public class Bridge {
    private final Context ctx;
    private final WebView web;
    private final BackupStore backups;
    private Updater updater;

    public Bridge(Context ctx, WebView web) {
        this.ctx = ctx;
        this.web = web;
        this.backups = new BackupStore(ctx);
    }

    private void respond(String cbId, JSONObject r) {
        final String script = "window.onBridgeResult && window.onBridgeResult("
                + JSONObject.quote(cbId) + "," + r.toString() + ")";
        web.post(new Runnable() {
            public void run() { web.evaluateJavascript(script, null); }
        });
    }

    private JSONObject err(Exception e) {
        JSONObject r = new JSONObject();
        try {
            r.put("ok", false);
            r.put("error", e == null ? "error" : e.getMessage());
        } catch (Exception ignored) { }
        return r;
    }

    @JavascriptInterface
    public void backupSave(String json, String cbId) {
        try {
            backups.save(json);
            JSONObject r = new JSONObject();
            r.put("ok", true);
            r.put("backups", backups.listJson());
            respond(cbId, r);
        } catch (Exception e) { respond(cbId, err(e)); }
    }

    @JavascriptInterface
    public void backupList(String cbId) {
        try {
            JSONObject r = new JSONObject();
            r.put("ok", true);
            r.put("backups", backups.listJson());
            respond(cbId, r);
        } catch (Exception e) { respond(cbId, err(e)); }
    }

    @JavascriptInterface
    public void backupRestore(String name, String cbId) {
        try {
            String content = backups.read(name);
            JSONObject r = new JSONObject();
            r.put("ok", true);
            r.put("content", content);
            respond(cbId, r);
        } catch (Exception e) { respond(cbId, err(e)); }
    }

    @JavascriptInterface
    public void backupDelete(String name, String cbId) {
        try {
            JSONObject r = new JSONObject();
            r.put("ok", true);
            r.put("backups", backups.delete(name));
            respond(cbId, r);
        } catch (Exception e) { respond(cbId, err(e)); }
    }

    @JavascriptInterface
    public void checkUpdate(String cbId) {
        if (updater == null) updater = new Updater(ctx, web);
        updater.checkUpdate(cbId);
    }

    @JavascriptInterface
    public void startUpdate(String url, String sha256, String cbId) {
        if (updater == null) updater = new Updater(ctx, web);
        updater.startUpdate(url, sha256, cbId);
    }

    @JavascriptInterface
    public void toast(String msg) {
        Toast.makeText(ctx, msg, Toast.LENGTH_SHORT).show();
    }
}
