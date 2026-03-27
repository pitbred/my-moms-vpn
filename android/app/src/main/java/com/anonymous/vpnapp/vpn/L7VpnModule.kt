package com.anonymous.vpnapp.vpn

import android.app.Activity
import android.content.*
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.VpnService
import android.os.Build
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException
import java.net.NetworkInterface
import java.util.Collections


class L7VpnModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "L7Vpn"

    private fun readConfig(): String {
        val userFile = File(reactApplicationContext.filesDir, "config.json")

        return if (userFile.exists()) {
            userFile.readText()
        } else {
            readAssetConfig("config.json.sample")
        }
    }

    private fun readAssetConfig(name: String): String =
        reactApplicationContext.assets
            .open(name)
            .bufferedReader()
            .use { it.readText() }

    //Слушатель широковещательных сообщений ---
    private val vpnStatusReceiver =
        object : BroadcastReceiver() {
            override fun onReceive(
                context: Context?,
                intent: Intent?,
            ) {
                val status = intent?.getStringExtra("status")
                if (status != null) {
                    updateStatus(status) // Обновляем статус в JS и в переменной модуля
                }
            }
        }

    private val vpnErrorReceiver =
        object : BroadcastReceiver() {
            override fun onReceive(
                context: Context?,
                intent: Intent?,
            ) {
                val extras = intent?.extras

                // Достаем значение как Object и принудительно в String
                val error = extras?.get("errorMessage")?.toString()

                if (error != null) {
                    updateError(error)
                } else {
                    updateError("Key 'errorMessage' not found in extras")
                }
            }
        }

    init {
        instance = this

        // Регистрация приемника при инициализации модуля
        val filter = IntentFilter("L7_VPN_STATUS_UPDATE")
        val errorFilter = IntentFilter("VPN_ERROR_UPDATE")

        // Для Android 14+ (API 34) флаг RECEIVER_EXPORTED или NOT_EXPORTED обязателен
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(vpnStatusReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            reactContext.registerReceiver(vpnErrorReceiver, errorFilter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(vpnStatusReceiver, filter)
            reactContext.registerReceiver(vpnErrorReceiver, errorFilter)
        }

        val statsFilter = IntentFilter("L7_VPN_STATS_UPDATE")
        reactContext.registerReceiver(
            object : BroadcastReceiver() {
                override fun onReceive(
                    context: Context?,
                    intent: Intent?,
                ) {
                    val map =
                        Arguments.createMap().apply {
                            putDouble("duration", intent?.getLongExtra("duration", 0L)?.toDouble() ?: 0.0)
                            putDouble("up", intent?.getLongExtra("up", 0L)?.toDouble() ?: 0.0)
                            putDouble("down", intent?.getLongExtra("down", 0L)?.toDouble() ?: 0.0)
                            putDouble("upSpd", intent?.getLongExtra("upSpd", 0L)?.toDouble() ?: 0.0)
                            putDouble("downSpd", intent?.getLongExtra("downSpd", 0L)?.toDouble() ?: 0.0)
                            putInt("apps", intent?.getIntExtra("apps", 0) ?: 0)

                            val logsArray = intent?.getStringArrayExtra("logs")
                            if (logsArray != null) {
                                val writableLogs = Arguments.createArray()
                                for (log in logsArray) {
                                    writableLogs.pushString(log)
                                }
                                putArray("logs", writableLogs)
                            } else {
                                // Если логов нет, шлем пустой массив, чтобы JS не ругался на undefined
                                putArray("logs", Arguments.createArray())
                            }                         
                        }
                    // Отправляем событие в JS через EventEmitter
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("VPN_STATS", map)
                }
            },
            statsFilter,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) Context.RECEIVER_NOT_EXPORTED else 0,
        )
    }
    
    @ReactMethod
    fun prepare(promise: Promise) {
        val activity: Activity? = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity")
            return
        }

        val intent = VpnService.prepare(activity)
        if (intent != null) {
            activity.startActivityForResult(intent, 9001)
            promise.resolve("NEED_PERMISSION")
        } else {
            promise.resolve("ALREADY_GRANTED")
        }
    }

    @ReactMethod
    fun start(promise: Promise) {
        updateStatus("connecting") // Локально обновляем, пока сервис запускается
        val i = Intent(reactContext, L7VpnService::class.java)
        i.action = L7VpnService.ACTION_START
        reactContext.startService(i)
        promise.resolve(true)
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            val i = Intent(reactContext, L7VpnService::class.java)
            i.action = L7VpnService.ACTION_STOP
            // Используем startService, так как мы просто шлем команду стоп существующему сервису
            reactContext.startService(i)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e)
        }
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        // Если статус "disconnected", но сервис на самом деле запущен в системе
        if (currentStatus == "disconnected" && isTunInterfaceUp()) {
            currentStatus = "connected"
        }

        if (currentStatus == "stopping") {            
            updateStatus("disconnected")           
        }

        promise.resolve(currentStatus)
    }

    private fun isTunInterfaceUp(): Boolean {
        return try {
            // Используем Collections.list для совместимости с итератором
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            interfaces.any { it.name == "tun0" && it.isUp }
        } catch (e: Exception) {
            false
        }
    }

    // Вспомогательный метод
    private fun isServiceRunning(serviceClass: Class<*>): Boolean {
        val manager = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        for (service in manager.getRunningServices(Int.MAX_VALUE)) {
            if (serviceClass.name == service.service.className) return true
        }
        return false
    }

    private fun sendStatus(status: String) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("VPN_STATUS", status)
    }

    private fun sendError(error: String?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("VPN_ERROR", error)
    }

    @ReactMethod
    fun resetError() {
        sendError(null) // В React Native это придет как null
    }

    companion object {
        var instance: L7VpnModule? = null
        var currentStatus: String = "disconnected"
    }

    fun updateStatus(status: String) {
        currentStatus = status
        sendStatus(status)
    }

    fun updateError(error: String) {
        sendError(error)
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager

            val intent = Intent(Intent.ACTION_MAIN, null)
            intent.addCategory(Intent.CATEGORY_LAUNCHER)
            val apps = pm.queryIntentActivities(intent, 0)

            val result = Arguments.createArray()

            apps
                .distinctBy { it.activityInfo.packageName }
                .sortedBy { it.loadLabel(pm).toString().lowercase() }
                .forEach { resolveInfo ->
                    val obj = Arguments.createMap()
                    obj.putString("name", resolveInfo.loadLabel(pm).toString())
                    obj.putString("packageName", resolveInfo.activityInfo.packageName)

                    val iconDrawable = resolveInfo.loadIcon(pm)
                    val iconBase64 = drawableToBase64(iconDrawable)              

                    obj.putString("icon", iconBase64)
                    result.pushMap(obj)
                }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("APPS_ERROR", e)
        }
    }

    private fun drawableToBase64(drawable: Drawable): String {
        val size = 96 // фиксированный безопасный размер

        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        drawable.setBounds(0, 0, size, size)
        drawable.draw(canvas)

        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)

        return Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
    }

    @ReactMethod
    fun getSavedPackages(promise: Promise) {
        try {
            val file = File(reactApplicationContext.filesDir, "pkgs.json")

            if (!file.exists()) {
                promise.resolve(null)
                return
            }

            val json = file.readText()
            promise.resolve(json)
        } catch (e: Exception) {
            promise.reject("READ_ERROR", e)
        }
    }

    @ReactMethod
    fun savePackages(
        packages: ReadableArray,
        promise: Promise,
    ) {
        try {
            val file = File(reactApplicationContext.filesDir, "pkgs.json")

            val list = mutableListOf<String>()
            for (i in 0 until packages.size()) {
                list.add(packages.getString(i)!!)
            }

            val json = JSONArray(list).toString()

            file.writeText(json)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SAVE_ERROR", e)
        }
    }

    @ReactMethod
    fun getConfig(promise: Promise) {
        try {
            promise.resolve(readConfig())
        } catch (e: Exception) {
            promise.reject("READ_ERROR", e)
        }
    }

    @ReactMethod
    fun saveConfig(json: String, promise: Promise) {
        try {
            val file = File(reactApplicationContext.filesDir, "config.json")
            file.writeText(json)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SAVE_ERROR", e)
        }
    }

    @ReactMethod
    fun getSampleConfig(promise: Promise) {
        try {
            promise.resolve(readAssetConfig("config.json.sample"))
        } catch (e: Exception) {
            promise.reject("SAMPLE_ERROR", e)
        }
    }

    @ReactMethod
    fun hasUserConfig(promise: Promise) {
        val file = File(reactApplicationContext.filesDir, "config.json")
        promise.resolve(file.exists())
    }

    @ReactMethod
    fun deleteUserConfig(promise: Promise) {
        try {
            val file = File(reactApplicationContext.filesDir, "config.json")
            if (file.exists()) file.delete()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DELETE_ERROR", e)
        }
    }
}