package com.cianjur.soundbox

import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** Jembatan JS untuk menyalakan, mematikan, dan memperbarui teks KeepAliveService */
class KeepAliveModule(private val reactCtx: ReactApplicationContext) : ReactContextBaseJavaModule(reactCtx) {

    override fun getName(): String = "KeepAlive"

    @ReactMethod
    fun start(promise: Promise) {
        try {
            ContextCompat.startForegroundService(reactCtx, Intent(reactCtx, KeepAliveService::class.java))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("KEEP_ALIVE_START_FAILED", e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            reactCtx.stopService(Intent(reactCtx, KeepAliveService::class.java))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("KEEP_ALIVE_STOP_FAILED", e)
        }
    }

    /** Memperbarui teks notifikasi (hanya saat layanan sudah berjalan) */
    @ReactMethod
    fun update(text: String, promise: Promise) {
        try {
            val intent = Intent(reactCtx, KeepAliveService::class.java)
                .putExtra(KeepAliveService.EXTRA_TEXT, text)
            reactCtx.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("KEEP_ALIVE_UPDATE_FAILED", e)
        }
    }
}
