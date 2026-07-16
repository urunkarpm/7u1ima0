package com.dnsflow.app.domain

import android.content.Context
import android.net.ConnectivityManager
import android.os.Build
import android.util.Log
import java.lang.reflect.Method

/**
 * Domain layer component for managing Private DNS settings.
 * Uses reflection to access hidden Android APIs for DNS switching.
 * Works on Android 9+ (API 28+).
 */
class DnsManager(private val context: Context) {
    
    companion object {
        private const val TAG = "DnsManager"
    }
    
    /**
     * Set the Private DNS mode and hostname.
     * 
     * @param hostname The DNS hostname (e.g., "dns.google") or null/empty for automatic
     * @return true if successful, false otherwise
     */
    fun setPrivateDns(hostname: String?): Boolean {
        return try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
                Log.w(TAG, "Private DNS not supported below Android 9")
                return false
            }
            
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) 
                as ConnectivityManager
            
            // Use reflection to access the hidden setPrivateDns method
            val method: Method = connectivityManager.javaClass.getMethod(
                "setPrivateDnsMode",
                String::class.java
            )
            
            // Modes: "off", "automatic", or a hostname for opportunistic/strict
            val dnsValue = if (hostname.isNullOrBlank()) {
                "automatic"  // Default to automatic when no hostname provided
            } else {
                hostname
            }
            
            method.invoke(connectivityManager, dnsValue)
            Log.d(TAG, "Private DNS set to: $dnsValue")
            true
            
        } catch (e: NoSuchMethodException) {
            Log.e(TAG, "setPrivateDnsMode method not found", e)
            false
        } catch (e: Exception) {
            Log.e(TAG, "Error setting Private DNS", e)
            false
        }
    }
    
    /**
     * Get the current Private DNS hostname.
     * Note: This may require elevated permissions on some devices.
     * 
     * @return The current DNS hostname or null if not set/unavailable
     */
    fun getCurrentPrivateDns(): String? {
        return try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
                return null
            }
            
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) 
                as ConnectivityManager
            
            // Try to get current DNS via reflection
            val method: Method? = connectivityManager.javaClass.methods.find { 
                it.name == "getPrivateDnsMode" || it.name.contains("PrivateDns") 
            }
            
            if (method != null) {
                val result = method.invoke(connectivityManager)
                result?.toString()
            } else {
                null
            }
            
        } catch (e: Exception) {
            Log.w(TAG, "Could not get current Private DNS", e)
            null
        }
    }
    
    /**
     * Reset Private DNS to automatic/default mode
     */
    fun resetToAutomatic(): Boolean {
        return setPrivateDns(null)
    }
    
    /**
     * Check if Private DNS is available on this device
     */
    fun isPrivateDnsAvailable(): Boolean {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
    }
}
