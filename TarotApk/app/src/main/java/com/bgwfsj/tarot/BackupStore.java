package com.bgwfsj.tarot;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.Locale;

public class BackupStore {
    public static final int KEEP = 2;
    private final File dir;

    public BackupStore(Context ctx) {
        dir = new File(ctx.getFilesDir(), "backups");
        dir.mkdirs();
    }

    public void save(String json) throws Exception {
        String name = "tarot-backup-" + new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(new Date()) + ".json";
        File f = new File(dir, name);
        FileOutputStream out = new FileOutputStream(f);
        try { out.write(json.getBytes(StandardCharsets.UTF_8)); } finally { out.close(); }
        prune();
    }

    private void prune() {
        File[] files = dir.listFiles(new FileFilterJson());
        if (files == null) return;
        Arrays.sort(files, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));
        for (int i = KEEP; i < files.length; i++) files[i].delete();
    }

    public JSONArray listJson() {
        JSONArray arr = new JSONArray();
        File[] files = dir.listFiles(new FileFilterJson());
        if (files == null) return arr;
        Arrays.sort(files, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));
        for (File f : files) {
            try {
                JSONObject o = new JSONObject();
                o.put("name", f.getName());
                o.put("size", f.length());
                o.put("date", f.lastModified());
                arr.put(o);
            } catch (Exception ignored) { }
        }
        return arr;
    }

    public String read(String name) throws Exception {
        File f = new File(dir, name);
        if (!f.exists() || !name.endsWith(".json")) throw new Exception("backup not found");
        FileInputStream in = new FileInputStream(f);
        try {
            byte[] buf = new byte[(int) f.length()];
            int n = 0;
            while (n < buf.length) {
                int r = in.read(buf, n, buf.length - n);
                if (r < 0) break;
                n += r;
            }
            return new String(buf, 0, n, StandardCharsets.UTF_8);
        } finally { in.close(); }
    }

    public JSONArray delete(String name) {
        File f = new File(dir, name);
        if (f.exists() && name.endsWith(".json")) f.delete();
        return listJson();
    }

    private static class FileFilterJson implements java.io.FileFilter {
        public boolean accept(File f) { return f.isFile() && f.getName().endsWith(".json"); }
    }
}
