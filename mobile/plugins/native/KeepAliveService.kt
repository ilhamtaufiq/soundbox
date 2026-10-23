package com.cianjur.soundbox

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

/**
 * Foreground service agar pemantauan tetap berjalan saat layar terkunci.
 * Notifikasi "Soundbox aktif" menampilkan status pemantauan terakhir dari JS.
 */
class KeepAliveService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private var statusText = "Memantau pembayaran masuk"

    override fun onCreate() {
        super.onCreate()
        createChannel()
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "soundbox:keepalive")
            .apply { setReferenceCounted(false) }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.getStringExtra(EXTRA_TEXT)?.let { statusText = it }

        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        // CPU tetap aktif supaya timer dan jaringan JS tidak tertidur saat layar mati
        wakeLock?.let { if (!it.isHeld) it.acquire() }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        wakeLock?.let { if (it.isHeld) it.release() }
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Pemantauan pembayaran",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Menjaga soundbox tetap aktif saat layar terkunci"
            setShowBadge(false)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pending = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Soundbox aktif")
            .setContentText(statusText)
            .setSmallIcon(applicationInfo.icon)
            .setContentIntent(pending)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .build()
    }

    companion object {
        const val CHANNEL_ID = "soundbox_keepalive"
        const val NOTIFICATION_ID = 4711
        const val EXTRA_TEXT = "status_text"
    }
}
