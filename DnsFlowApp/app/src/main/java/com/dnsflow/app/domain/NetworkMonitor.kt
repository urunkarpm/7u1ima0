package com.dnsflow.app.domain

import android.content.Context
import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import android.util.Log
import com.dnsflow.app.data.model.DnsStatus
import com.dnsflow.app.data.model.NetworkState
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import java.lang.reflect.Method

/**
 * Domain layer component for monitoring network changes.
 * Uses ConnectivityManager and WifiManager to detect network transitions.
 * Handles Android 13+ restrictions on SSID access.
 */
class NetworkMonitor(private val context: Context) {
    
    companion object {
        private const val TAG = "NetworkMonitor"
    }
    
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    
    /**
     * Flow that emits network state changes.
     * Monitors both Wi-Fi and mobile data connections.
     */
    val networkStateFlow: Flow<NetworkState> = callbackFlow {
        val networkCallback = object : ConnectivityManager.NetworkCallback() {
            
            override fun onAvailable(network: Network) {
                Log.d(TAG, "Network available: $network")
                updateState(network)
            }
            
            override fun onLost(network: Network) {
                Log.d(TAG, "Network lost: $network")
                updateState(null)
            }
            
            override fun onCapabilitiesChanged(
                network: Network,
                networkCapabilities: NetworkCapabilities
            ) {
                Log.d(TAG, "Capabilities changed for network: $network")
                updateState(network)
            }
            
            override fun onLinkPropertiesChanged(
                network: Network,
                linkProperties: LinkProperties
            ) {
                Log.d(TAG, "Link properties changed for network: $network")
                updateState(network)
            }
        }
        
        // Register for network callbacks
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .addTransportType(NetworkCapabilities.TRANSPORT_CELLULAR)
            .build()
        
        connectivityManager.registerNetworkCallback(networkRequest, networkCallback)
        
        // Emit initial state
        trySend(getCurrentNetworkState())
        
        awaitClose {
            connectivityManager.unregisterNetworkCallback(networkCallback)
        }
    }.distinctUntilChanged()
    
    /**
     * Get the current network state synchronously
     */
    fun getCurrentNetworkState(): NetworkState {
        val activeNetwork = connectivityManager.activeNetwork
        val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork)
        
        if (capabilities == null || !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
            return NetworkState(isConnected = false)
        }
        
        val isWifi = capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
        val isCellular = capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
        
        val ssid = if (isWifi) {
            getWifiSsidCompat()
        } else {
            null
        }
        
        return NetworkState(
            isConnected = true,
            isWifi = isWifi,
            ssid = ssid,
            dnsStatus = DnsStatus.Unknown
        )
    }
    
    /**
     * Update state based on network information
     */
    private fun updateState(network: Network?) {
        val state = if (network != null) {
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            if (capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true) {
                val isWifi = capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                val ssid = if (isWifi) getWifiSsidCompat() else null
                
                NetworkState(
                    isConnected = true,
                    isWifi = isWifi,
                    ssid = ssid,
                    dnsStatus = DnsStatus.Unknown
                )
            } else {
                NetworkState(isConnected = false)
            }
        } else {
            NetworkState(isConnected = false)
        }
        
        trySend(state)
    }
    
    /**
     * Get Wi-Fi SSID with compatibility for Android 13+
     * On Android 13+, requires ACCESS_FINE_LOCATION and location enabled
     */
    @Suppress("DEPRECATION")
    private fun getWifiSsidCompat(): String? {
        return try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) 
                as? android.net.wifi.WifiManager
            
            if (wifiManager == null) {
                Log.w(TAG, "WifiManager not available")
                return null
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+: Use getCurrentNetwork() approach
                val wifiInfo = wifiManager.connectionInfo
                val ssid = wifiInfo?.ssid
                
                // Remove quotes if present
                ssid?.removeSurrounding("\"")?.takeIf { it != "<unknown ssid>" }
            } else {
                // Android 9-12: Traditional approach
                val wifiInfo = wifiManager.connectionInfo
                val ssid = wifiInfo?.ssid
                ssid?.removeSurrounding("\"")?.takeIf { it != "<unknown ssid>" }
            }
        } catch (e: SecurityException) {
            Log.w(TAG, "Security exception getting SSID - location permission may be required", e)
            null
        } catch (e: Exception) {
            Log.e(TAG, "Error getting SSID", e)
            null
        }
    }
    
    /**
     * Check if the app has necessary permissions for SSID detection
     */
    fun hasSsidPermission(): Boolean {
        return context.checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) 
            == android.content.pm.PackageManager.PERMISSION_GRANTED ||
            context.checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION)
            == android.content.pm.PackageManager.PERMISSION_GRANTED
    }
}
