# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class libbox.** { *; }
-keep class go.** { *; }
-keep class org.golang.** { *; }

# Add any project specific keep options here:
# Сохраняем нативные методы и аннотации
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod *; }
-keep class com.facebook.react.bridge.CatalystInstanceImpl { *; }
-keep class com.facebook.react.bridge.WritableNativeMap { *; }
-keep class com.facebook.react.bridge.ReadableNativeMap { *; }
-keep class com.facebook.react.bridge.WritableNativeArray { *; }
-keep class com.facebook.react.bridge.ReadableNativeArray { *; }

# Защита от удаления имен классов, которые RN ищет через рефлексию
-keep class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }

-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

-keepattributes Signature
-keepclassmembers class** {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**

# Сохраняем все классы и методы expo-clipboard
-keep class expo.modules.clipboard.** { *; }

# Также полезно сохранить базовые классы Expo Modules
-keep class expo.modules.kotlin.** { *; }
-keep class expo.modules.core.** { *; }

-keep class com.anonymous.vpnapp.vpn.** { *; }

-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}