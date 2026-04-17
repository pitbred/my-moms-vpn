package com.anonymous.vpnapp.vpn

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.os.Handler
import android.os.Looper
import android.os.Process
import androidx.core.app.NotificationCompat
import libbox.*
import java.io.File
import java.util.Timer
import java.util.TimerTask

import android.content.Context
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest

import kotlin.concurrent.thread
import org.json.JSONArray

class L7VpnService : VpnService() {
    private var sessionStartTime: Long = 0
    private var vpnInterface: ParcelFileDescriptor? = null
    private var boxService: CommandServer? = null
    private var commandClient: CommandClient? = null
    private var startTime: Long = 0
    private var statsTimer: java.util.Timer? = null
    private var selectedPackages: List<String> = emptyList()
    private var lastUp: Long = 0
    private var lastDown: Long = 0
    private var upSpeed: Long = 0
    private var downSpeed: Long = 0

    private val logBuffer = mutableListOf<String>()
    private val logFile by lazy { File(filesDir, "vpn.log") }
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    private fun formatDuration(seconds: Long): String {
        val h = seconds / 3600
        val m = (seconds % 3600) / 60
        val s = seconds % 60
        return String.format("%02d:%02d:%02d", h, m, s)
    }

    private fun sendStatusBroadcast(status: String) {
        val intent = Intent("L7_VPN_STATUS_UPDATE")
        intent.putExtra("status", status)
        intent.setPackage(packageName)
        sendBroadcast(intent)
    }

    private fun sendErrorBroadcast(errorMessage: String) {
        val intent = Intent("VPN_ERROR_UPDATE")
        intent.putExtra("errorMessage", errorMessage)
        intent.setPackage(packageName)
        sendBroadcast(intent)
    }

    private fun startStatsNotifier() {
        startTime = System.currentTimeMillis()
        statsTimer = Timer()
        statsTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {

                val duration = (System.currentTimeMillis() - startTime) / 1000
                val up = lastUp
                val down = lastDown
                val upSpd = upSpeed
                val downSpd = downSpeed
                val appsCount = selectedPackages?.size ?: 0

                // 3. Формируем и шлем Broadcast
                val intent = Intent("L7_VPN_STATS_UPDATE")
                intent.putExtra("duration", duration)
                intent.putExtra("up", up)
                intent.putExtra("down", down)
                intent.putExtra("upSpd", upSpd)
                intent.putExtra("downSpd", downSpd)
                intent.putExtra("apps", appsCount)
                intent.setPackage(packageName)
                sendBroadcast(intent)
            }
        }, 0, 1000)
    }

    private fun stopStatsNotifier() {
        statsTimer?.cancel()
        statsTimer = null
    }

    private fun registerNetworkMonitor() {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                //android.util.Log.i(TAG, "Network available")
            }

            override fun onLost(network: Network) {
                //android.util.Log.i(TAG, "Network lost")
            }
        }

        cm.registerNetworkCallback(request, networkCallback!!)
    }

    private fun unregisterNetworkMonitor() {
        try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

            if (networkCallback != null) {
                cm.unregisterNetworkCallback(networkCallback!!)
                networkCallback = null
            }

        } catch (e: Exception) {
            //android.util.Log.w(TAG, "Failed to unregister network monitor", e)
        }
    }

    companion object {
        const val CHANNEL_ID = "l7vpn"
        const val NOTIF_ID = 1001
        const val TAG = "L7VPN"
        const val ACTION_STOP = "L7VPN_STOP"
        const val ACTION_START = "L7VPN_START"

        init {
            try {
                // Устанавливаем флаг максимально рано
                android.system.Os.setenv("GODEBUG", "runtime_epoll_pwait2=0", true)
                //android.util.Log.d("L7VPN", "GODEBUG set to runtime_epoll_pwait2=0")
            } catch (e: Exception) {
                //android.util.Log.e("L7VPN", "Failed to set GODEBUG", e)
            }
        }
    }

    override fun onCreate() {

        super.onCreate()

        // Foreground notification (обязательно для VPN)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Service.NOTIFICATION_SERVICE) as NotificationManager
            val channel =
                NotificationChannel(
                    CHANNEL_ID,
                    "L7 VPN",
                    NotificationManager.IMPORTANCE_LOW,
                )
            nm.createNotificationChannel(channel)
        }

        val notification =
            NotificationCompat
                .Builder(this, CHANNEL_ID)
                .setContentTitle("L7 VPN")
                .setContentText("Running…")
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .build()

        startForeground(NOTIF_ID, notification)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // 1. Если интента нет (система пересоздала сервис) - ничего не делаем
        if (intent == null) {
            return START_NOT_STICKY
        }

        // 2. Обработка команды СТОП
        if (intent.action == ACTION_STOP) {
            //android.util.Log.i(TAG, "Received STOP action")
            stopVpn()
            return START_NOT_STICKY
        }

        // 3. Обработка команды СТАРТ (важно делать это только по конкретному экшену)
        if (intent.action == ACTION_START) {
            sendStatusBroadcast("connecting")
            startVpn()
        }

        return START_NOT_STICKY
    }

    private fun stopVpn() {
        sendStatusBroadcast("stopping")
        //android.util.Log.e(TAG, "!!! FORCE STOP START !!!")

        // 1. Сначала НЕМЕДЛЕННО рвем связь с системой (убираем ключ VPN)
        try {
            vpnInterface?.close()
            vpnInterface = null
            //android.util.Log.e(TAG, "!!! TUN CLOSED !!!")
        } catch (e: Exception) {
        }

        // 2. Снимаем статус Foreground СРАЗУ в Main Thread
        stopForeground(Service.STOP_FOREGROUND_REMOVE)

        // 3. Запускаем "смерть" ядра в отдельном потоке, чтобы ОНО НАС НЕ ЖДАЛО
        Thread {
            try {
                //android.util.Log.e(TAG, "!!! BACKGROUND CLOSE START !!!")
                // Мы НЕ ПРИСВАИВАЕМ это переменной, просто дергаем метод
                boxService?.close()
                boxService = null
                //android.util.Log.e(TAG, "!!! BACKGROUND CLOSE SUCCESS !!!")
            } catch (e: Throwable) {
                //android.util.Log.e(TAG, "!!! BACKGROUND CLOSE FAILED !!!", e)
            }
        }.start()

        stopStatsNotifier()
        commandClient?.disconnect()
        commandClient = null

        // 4. Посылаем сигнал остановки через короткую паузу
        Handler(Looper.getMainLooper()).postDelayed({
            //android.util.Log.e(TAG, "Killing VPN process for clean exit")
            // Теперь это безопасно для Expo-приложения!
            android.os.Process.killProcess(android.os.Process.myPid())
        }, 700)
    }

    // 2. Метод-чистильщик (вызывает система)
    override fun onDestroy() {
        //android.util.Log.i(TAG, "onDestroy: Final cleanup")

        // Если по какой-то причине stopVpn не был вызван (убили систему/крэш)
        // закрываем всё здесь
        unregisterNetworkMonitor()

        boxService?.close()
        boxService = null

        // САМОЕ ВАЖНОЕ: закрытие интерфейса именно здесь гарантирует
        // исчезновение значка VPN ("ключа") в момент смерти сервиса
        vpnInterface?.close()
        vpnInterface = null
        commandClient?.disconnect()
        commandClient = null

        super.onDestroy()

        sendStatusBroadcast("disconnected")
        stopStatsNotifier()
    }

    private fun readConfig(): String {
        val userFile = File(filesDir, "config.json")

        return if (userFile.exists()) {
            userFile.readText()
        } else {
            readAssetConfig("config.json.sample")
        }
    }

    private fun readAssetConfig(name: String): String =
        assets.open(name).bufferedReader().use {
            it.readText()
        }

    fun saveUserConfig(json: String) {
        val file = File(filesDir, "config.json")
        file.writeText(json)
    }

    private fun applyAppFiltering(builder: VpnService.Builder) {
        val myPackage = applicationContext.packageName
        val file = File(applicationContext.filesDir, "pkgs.json")

        if (!file.exists()) {
            // Режим: всё через VPN, кроме себя
            builder.addDisallowedApplication(myPackage)
            return
        }

        try {
            val json = JSONArray(file.readText())

            for (i in 0 until json.length()) {
                val pkg = json.getString(i)

                if (pkg != myPackage) {
                    builder.addAllowedApplication(pkg)
                }
            }

        } catch (e: Exception) {
            // Если файл битый — безопасный fallback
            builder.addDisallowedApplication(myPackage)
        }
    }

    private fun startVpn() {
        try {
            //Libbox.redirectStderr(File(filesDir, "libbox-stderr.log").absolutePath)
            //android.util.Log.d("LIBBOX", "libbox version = " + Libbox.version())

            //android.util.Log.i(TAG, "Starting VPN...")

            val config = readConfig()
            //android.util.Log.d("L7VPN", "CONFIG LEN=${config.length}")
            //android.util.Log.d("L7VPN", "CONFIG HEAD=${config.take(120)}")

            // 0) если уже запущено — не стартуем повторно
            if (boxService != null) {
                //android.util.Log.w(TAG, "Already started, ignoring.")
                sendStatusBroadcast("connected")
                return
            }

            // 1) libbox setup
            val options = SetupOptions()

            // ВАЖНО: basePath/workingPath должны быть реально существующими
            val base = File(filesDir, "libbox").apply { mkdirs() }
            val work = File(cacheDir, "libbox").apply { mkdirs() }

            options.setBasePath(base.absolutePath)
            options.setWorkingPath(work.absolutePath)

            Libbox.setup(options)

            //android.util.Log.i(TAG, "Libbox version: ${Libbox.version()}")

            // 2) PlatformInterface
            val platform =
                object : PlatformInterface {
                    override fun openTun(options: TunOptions): Int {
                        //android.util.Log.i(TAG, "openTun() called from libbox")

                        if (vpnInterface != null) {
                            return vpnInterface?.fd ?: -1
                        }

                        val builder =
                            Builder()
                                .setSession("L7 VPN")
                                .setMtu(1400)
                                .addAddress("172.19.0.1", 30)
                                .addRoute("0.0.0.0", 0)
                                .addDnsServer("8.8.8.8")
                                .setBlocking(true)

                        applyAppFiltering(builder)
                        // 4. Опции для современных Android
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            builder.setMetered(false) // Чтобы система не считала VPN "платным" трафиком
                        }

                        try {
                            vpnInterface = builder.establish()
                            val fd = vpnInterface?.fd ?: -1
                            //android.util.Log.i(TAG, "VPN established, fd=$fd")
                            return fd
                        } catch (e: Exception) {
                            //android.util.Log.e(TAG, "Failed to establish VPN", e)
                            return -1
                        }
                    }

                    override fun clearDNSCache() {}

                    override fun autoDetectInterfaceControl(fd: Int) {
                        // Защищаем файловый дескриптор сокета от перехвата самим VPN
                        protect(fd)
                    }

                    override fun closeDefaultInterfaceMonitor(l: InterfaceUpdateListener) {}

                    override fun findConnectionOwner(
                        protocol: Int,
                        srcAddress: String,
                        srcPort: Int,
                        destAddress: String,
                        destPort: Int,
                    ): ConnectionOwner {
                        val owner = ConnectionOwner()
                        owner.setUserId(0)
                        owner.setUserName("mom")
                        owner.setProcessPath("")
                        //owner.setAndroidPackageName("")
                        //owner.setPackageName("")
                        //owner.setAppId("com.anonymous.vpnapp")
                        //owner.setProcessName("")
                        return owner
                    }

                    override fun getInterfaces(): NetworkInterfaceIterator? = null
                    override fun includeAllNetworks(): Boolean = false
                    override fun localDNSTransport(): LocalDNSTransport? = null
                    override fun readWIFIState(): WIFIState? = null
                    override fun sendNotification(n: Notification) {}
                    override fun startDefaultInterfaceMonitor(l: InterfaceUpdateListener) {}
                    override fun systemCertificates(): StringIterator? = null
                    override fun underNetworkExtension(): Boolean = false
                    override fun usePlatformAutoDetectInterfaceControl(): Boolean = false
                    override fun useProcFS(): Boolean = false
                    override fun startNeighborMonitor(listener: NeighborUpdateListener?) {}
                    override fun closeNeighborMonitor(listener: NeighborUpdateListener?) {}
                    override fun registerMyInterface(name: String?) {}
                }

            // 3) CommandServerHandler
            val handler =
                object : CommandServerHandler {
                    override fun serviceReload() {
                        //android.util.Log.i(TAG, "serviceReload()")
                    }

                    override fun serviceStop() {
                        //android.util.Log.i(TAG, "serviceStop()")
                        stopSelf()
                    }

                    override fun getSystemProxyStatus(): SystemProxyStatus? = null

                    override fun setSystemProxyEnabled(e: Boolean) {
                        //android.util.Log.i(TAG, "setSystemProxyEnabled($e)")
                    }

                    override fun writeDebugMessage(m: String?) {
                        //android.util.Log.d("LIBBOX", m ?: "")
                    }

                    override fun triggerNativeCrash() {
                        // noop или лог
                    }
                }

            // 4) Создаём сервер
            boxService = Libbox.newCommandServer(handler, platform)

            // 1. Создаем объект настроек
            val clientOptions = libbox.CommandClientOptions()
            //android.util.Log.i(TAG, "libbox.CommandClientOptions")

            // 2. Реализуем обработчик со всеми методами
            val clientHandler = object : libbox.CommandClientHandler {
                override fun connected() {
                    //android.util.Log.i(TAG, "Connected from clientHandler")
                }

                override fun disconnected(message: String?) {
                    //android.util.Log.i(TAG, "Disconnected: $message")
                }

                override fun clearLogs() {}
                override fun initializeClashMode(modeList: libbox.StringIterator?, currentMode: String?) {}
                override fun setDefaultLogLevel(level: Int) {}
                override fun updateClashMode(newMode: String?) {}
                override fun writeConnectionEvents(events: libbox.ConnectionEvents?) {}
                override fun writeGroups(message: libbox.OutboundGroupIterator?) {}
                override fun writeLogs(messageList: libbox.LogIterator?) {
                    if (messageList == null) return

                    if (logFile.length() > 1_000_000) {
                        logFile.writeText("") // или ротация
                    }

                    messageList?.let {
                        while (it.hasNext()) {
                            val msg = it.next().toString()
                            logFile.appendText(msg + "\n")
                            //android.util.Log.d(TAG, "Core message: $msg")
                        }
                    }
                }

                override fun writeStatus(message: libbox.StatusMessage?) {
                    if (message == null) return

                    // Текущая скорость (байты в секунду)
                    downSpeed = message.downlink
                    upSpeed = message.uplink

                    // Общий трафик за сессию
                    lastDown = message.downlinkTotal
                    lastUp = message.uplinkTotal

                    // Дополнительная инфа для отладки
                    val memory = message.memory
                    val connections = message.connectionsIn + message.connectionsOut

                    // Красивый вывод в лог
                    /*
                    android.util.Log.i(
                        TAG, """
            --- VPN Status Update ---
            Speed: ↓ ${libbox.Libbox.formatBytes(downSpeed)}/s | ↑ ${libbox.Libbox.formatBytes(upSpeed)}/s
            Total: ↓ ${libbox.Libbox.formatBytes(lastDown)} | ↑ ${libbox.Libbox.formatBytes(lastUp)}
            Memory: ${libbox.Libbox.formatMemoryBytes(memory)}
            Active Connections: $connections       
            """.trimIndent()
                    )
                    */
                }

                override fun writeOutbounds(it: OutboundGroupItemIterator) {
                    // пока пусто
                }
            }

            // 3. Создаем клиент
            commandClient = Libbox.newCommandClient(clientHandler, clientOptions)
            //android.util.Log.i(TAG, "Libbox.newCommandClient")

            // 5) Стартуем командный сервер
            boxService?.start()

            // 6) Читаем config.json            
            val configJson = readConfig()

            // 7) Проверка конфига (очень полезно)
            boxService?.checkConfig(configJson)

            // 8) Запуск sing-box
            val override = OverrideOptions()
            boxService?.startOrReloadService(configJson, override)

            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    //android.util.Log.i(TAG, "CommandClient: Connecting...")
                    val socketFile = java.io.File(filesDir, "libbox/command.sock")
                    //android.util.Log.i(TAG, "Socket file exists: ${socketFile.exists()}")
                } catch (e: Exception) {
                    //android.util.Log.e(TAG, "CommandClient: Connect EXCEPTION: ${e.message}")
                }
            }, 1500)

            thread(start = true) {
                try {
                    Thread.sleep(1500) // Ждем инициализации сокета

                    val options = libbox.CommandClientOptions()

                    // ВАЖНО: Подписываемся на типы данных
                    // Константы мы видели в javap класса Libbox
                    options.addCommand(libbox.Libbox.CommandStatus)     // Статистика (скорость/трафик)
                    options.addCommand(libbox.Libbox.CommandLog)        // Логи ядра
                    //options.addCommand(libbox.Libbox.CommandGroup)      // Состояние прокси-групп

                    // Устанавливаем интервал обновления (в миллисекундах)
                    options.statusInterval = 1000L * 1000L * 1000L

                    // Создаем клиент с этими опциями
                    commandClient = Libbox.newCommandClient(clientHandler, options)

                    //android.util.Log.i(TAG, "Connecting with commands: Status, Log, Group")
                    commandClient?.connect()

                } catch (e: Exception) {
                    //android.util.Log.e(TAG, "Connect error: ${e.message}")
                    sendStatusBroadcast("error")
                    sendErrorBroadcast(e.toString())
                }
            }

            sendStatusBroadcast("connected")
            startStatsNotifier()
            /*
            android.util.Log.d("L7VPN2", "CONFIG LEN2=${configJson.length}")
            android.util.Log.d("L7VPN2", "CONFIG HEAD2=${configJson.take(120)}")
            android.util.Log.i(TAG, "needFindProcess=${boxService?.needFindProcess()}")
            android.util.Log.i(TAG, "needWIFIState=${boxService?.needWIFIState()}")
            android.util.Log.i(TAG, "VPN started successfully.")
            */
            sessionStartTime = System.currentTimeMillis()

        } catch (e: Exception) {
            //android.util.Log.e(TAG, "startVpn failed", e)
            sendStatusBroadcast("error")
            sendErrorBroadcast(e.toString())
            stopVpn()
        }
    }
}