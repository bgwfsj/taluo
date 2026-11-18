package com.bgwfsj.tarot;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.content.FileProvider;

import java.io.File;
import java.util.Locale;

public class Notifications {
    public static final String CHANNEL_UPDATE = "update";
    public static final int NOTIF_UPDATE = 42;

    public static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            NotificationChannel ch = new NotificationChannel(CHANNEL_UPDATE,
                    ctx.getString(R.string.update_channel_name), NotificationManager.IMPORTANCE_LOW);
            nm.createNotificationChannel(ch);
        }
    }

    public static void progress(Context ctx, int pct, long done, long total) {
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_UPDATE)
                .setSmallIcon(android.R.drawable.stat_sys_download)
                .setContentTitle(ctx.getString(R.string.update_downloading))
                .setContentText(pct + "% · " + fmt(done) + " / " + fmt(total))
                .setProgress(100, pct, false)
                .setOnlyAlertOnce(true);
        nm.notify(NOTIF_UPDATE, b.build());
    }

    public static void ready(Context ctx, File apk) {
        Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent pi = PendingIntent.getActivity(ctx, 77, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_UPDATE)
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle(ctx.getString(R.string.update_ready))
                .setContentText(ctx.getString(R.string.update_ready))
                .setContentIntent(pi)
                .setAutoCancel(true);
        nm.notify(NOTIF_UPDATE, b.build());
    }

    public static void fail(Context ctx, String msg) {
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_UPDATE)
                .setSmallIcon(android.R.drawable.stat_notify_error)
                .setContentTitle(ctx.getString(R.string.update_failed))
                .setContentText(msg)
                .setAutoCancel(true);
        nm.notify(NOTIF_UPDATE, b.build());
    }

    private static String fmt(long bytes) {
        if (bytes >= 1024 * 1024) return String.format(Locale.US, "%.1f MB", bytes / 1024.0 / 1024.0);
        return String.format(Locale.US, "%.0f KB", bytes / 1024.0);
    }
}
