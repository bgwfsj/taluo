package com.bgwfsj.tarot;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Updater {
    public static final String OWNER = "bgwfsj";
    public static final String REPO = "taluo";
    private static final String TAG = "TarotUpdater";

    private final Context ctx;
    private final WebView web;

    public Updater(Context ctx, WebView web) {
        this.ctx = ctx;
        this.web = web;
    }

    private void respond(String cbId, JSONObject payload) {
        final String script = "window.onBridgeResult && window.onBridgeResult("
                + JSONObject.quote(cbId) + "," + payload.toString() + ")";
        web.post(new Runnable() {
            public void run() { web.evaluateJavascript(script, null); }
        });
    }

    // ---------- 检查更新 ----------
    public void checkUpdate(final String cbId) {
        new Thread(new Runnable() {
            public void run() {
                try {
                    JSONObject latest = fetchLatest();
                    JSONObject r = new JSONObject();
                    r.put("ok", true);
                    String tag = latest.optString("tag", "").replaceAll("^[vV]", "");
                    if (tag.isEmpty()) {
                        r.put("hasUpdate", false);
                    } else if (compareVersions(tag, MainActivity.VERSION_NAME) > 0) {
                        r.put("hasUpdate", true);
                        r.put("version", tag);
                        r.put("notes", latest.optString("notes", ""));
                        r.put("url", latest.optString("url", ""));
                        r.put("sha256", latest.optString("sha256", ""));
                    } else {
                        r.put("hasUpdate", false);
                    }
                    respond(cbId, r);
                } catch (Exception e) {
                    respond(cbId, errJson(e));
                }
            }
        }).start();
    }

    private JSONObject fetchLatest() {
        try {
            return fetchFromApi();
        } catch (Exception apiEx) {
            Log.w(TAG, "api failed, fallback web: " + apiEx.getMessage());
            try {
                return fetchFromWeb();
            } catch (Exception webEx) {
                JSONObject o = new JSONObject();
                try {
                    o.put("tag", "");
                    o.put("notes", "");
                    o.put("url", "");
                    o.put("sha256", "");
                    o.put("error", apiEx.getMessage() + " / web: " + webEx.getMessage());
                } catch (Exception ignored) { }
                return o;
            }
        }
    }

    private JSONObject fetchFromApi() throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(
                "https://api.github.com/repos/" + OWNER + "/" + REPO + "/releases/latest").openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(15000);
        conn.setRequestProperty("User-Agent", "TarotUpdater");
        conn.setRequestProperty("Accept", "application/vnd.github+json");
        int code = conn.getResponseCode();
        if (code != 200) throw new IOException("api http " + code);
        String body = readAll(conn.getInputStream());
        conn.disconnect();
        JSONObject j = new JSONObject(body);
        JSONObject out = new JSONObject();
        out.put("tag", j.optString("tag_name", ""));
        out.put("notes", j.optString("body", ""));
        out.put("sha256", "");
        JSONArray assets = j.optJSONArray("assets");
        if (assets != null) {
            for (int i = 0; i < assets.length(); i++) {
                JSONObject a = assets.optJSONObject(i);
                if (a == null) continue;
                String name = a.optString("name", "");
                if (name.toLowerCase(Locale.US).endsWith(".apk")) {
                    out.put("url", a.optString("browser_download_url", ""));
                    out.put("name", name);
                    out.put("sha256", normalizeDigest(a.optString("digest", "")));
                    break;
                }
            }
        }
        if (out.optString("url", "").isEmpty()) throw new IOException("no apk asset in release");
        return out;
    }

    private String normalizeDigest(String digest) {
        if (digest == null || digest.isEmpty()) return "";
        digest = digest.trim();
        if (digest.startsWith("sha256:")) digest = digest.substring("sha256:".length());
        if (digest.matches("[0-9a-fA-F]{64}")) return digest.toLowerCase(Locale.US);
        try {
            byte[] raw = Base64.decode(digest, Base64.DEFAULT);
            return bytesToHex(raw);
        } catch (Exception e) {
            return "";
        }
    }

    private JSONObject fetchFromWeb() throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(
                "https://github.com/" + OWNER + "/" + REPO + "/releases/latest").openConnection();
        conn.setInstanceFollowRedirects(true);
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(15000);
        conn.setRequestProperty("User-Agent", "TarotUpdater");
        int code = conn.getResponseCode();
        String finalUrl = conn.getURL().toString();
        Matcher m = Pattern.compile("/releases/tag/([^/?#]+)").matcher(finalUrl);
        if (!m.find()) throw new IOException("web tag not found (http " + code + ")");
        String tag = m.group(1);

        HttpURLConnection c2 = (HttpURLConnection) new URL(
                "https://github.com/" + OWNER + "/" + REPO + "/releases/expanded_assets/" + tag).openConnection();
        c2.setConnectTimeout(15000);
        c2.setReadTimeout(15000);
        c2.setRequestProperty("User-Agent", "TarotUpdater");
        String html = readAll(c2.getInputStream());
        c2.disconnect();
        Matcher am = Pattern.compile("href=\"([^\"]*\\.apk)\"").matcher(html);
        if (!am.find()) throw new IOException("no apk in expanded assets");
        String path = am.group(1);
        JSONObject out = new JSONObject();
        out.put("tag", tag);
        out.put("notes", "");
        out.put("url", "https://github.com" + (path.startsWith("/") ? path : "/" + path));
        out.put("sha256", "");
        return out;
    }

    // ---------- 下载安装 ----------
    public void startUpdate(final String url, final String sha256, final String cbId) {
        Notifications.ensureChannel(ctx);
        // 先回执“已开始”，随后后台下载
        new Thread(new Runnable() {
            public void run() {
                try {
                    JSONObject r = new JSONObject();
                    r.put("ok", true);
                    respond(cbId, r);
                } catch (Exception ignored) { }
            }
        }).start();

        new Thread(new Runnable() {
            public void run() {
                try {
                    File dir = new File(ctx.getCacheDir(), "downloads");
                    dir.mkdirs();
                    File apk = new File(dir, "update.apk");
                    download(url, apk);
                    if (sha256 != null && !sha256.isEmpty()) {
                        String got = sha256Of(apk);
                        if (!sha256.equalsIgnoreCase(got)) {
                            apk.delete();
                            Notifications.fail(ctx, "校验失败（SHA-256 不匹配）");
                            return;
                        }
                    }
                    Notifications.ready(ctx, apk);
                    install(apk);
                } catch (Exception e) {
                    Log.e(TAG, "download failed", e);
                    Notifications.fail(ctx, e.getMessage() == null ? "未知错误" : e.getMessage());
                }
            }
        }).start();
    }

    private void download(String url, File apk) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(30000);
        conn.setInstanceFollowRedirects(true);
        conn.setRequestProperty("User-Agent", "TarotUpdater");
        long total = conn.getContentLengthLong();
        InputStream in = conn.getInputStream();
        FileOutputStream out = new FileOutputStream(apk);
        byte[] buf = new byte[65536];
        long done = 0;
        int n;
        int lastPct = -1;
        try {
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                done += n;
                if (total > 0) {
                    int pct = (int) (done * 100 / total);
                    if (pct != lastPct && pct % 5 == 0) {
                        lastPct = pct;
                        Notifications.progress(ctx, pct, done, total);
                    }
                }
            }
            out.flush();
        } finally {
            out.close();
            in.close();
        }
        Notifications.progress(ctx, 100, done, done > 0 ? done : 1);
    }

    private void install(File apk) {
        Uri uri = androidx.core.content.FileProvider.getUriForFile(ctx,
                ctx.getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            ctx.startActivity(intent);
        } catch (Exception e) {
            if (Build.VERSION.SDK_INT >= 26 && !ctx.getPackageManager().canRequestPackageInstalls()) {
                Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + ctx.getPackageName()));
                settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try { ctx.startActivity(settings); } catch (Exception ignored) { }
            }
        }
    }

    // ---------- 工具 ----------
    private static int compareVersions(String a, String b) {
        String[] pa = a.replaceAll("^[vV]", "").split("\\.");
        String[] pb = b.replaceAll("^[vV]", "").split("\\.");
        int n = Math.max(pa.length, pb.length);
        for (int i = 0; i < n; i++) {
            int x = i < pa.length ? parseInt(pa[i]) : 0;
            int y = i < pb.length ? parseInt(pb[i]) : 0;
            if (x != y) return Integer.compare(x, y);
        }
        return 0;
    }

    private static int parseInt(String s) {
        try { return Integer.parseInt(s); } catch (Exception e) { return 0; }
    }

    private static String readAll(InputStream in) throws IOException {
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }

    private static String sha256Of(File f) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        InputStream in = new java.io.FileInputStream(f);
        byte[] buf = new byte[65536];
        int n;
        try {
            while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
        } finally { in.close(); }
        return bytesToHex(md.digest());
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format(Locale.US, "%02x", b & 0xff));
        return sb.toString();
    }

    private static JSONObject errJson(Exception e) {
        JSONObject r = new JSONObject();
        try {
            r.put("ok", false);
            r.put("error", e == null ? "error" : e.getMessage());
        } catch (Exception ignored) { }
        return r;
    }
}
