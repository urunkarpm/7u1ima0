package com.dnsflow.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.dnsflow.app.data.model.DnsProfile
import com.dnsflow.app.ui.screens.HomeScreen
import com.dnsflow.app.ui.theme.DnsFlowTheme

/**
 * Main Activity for DNS Flow App
 * Handles permission requests and hosts the Compose UI
 */
class MainActivity : ComponentActivity() {
    
    private var editingProfileId: String? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Request permissions on startup if not granted
        requestPermissionsIfNeeded()
        
        setContent {
            DnsFlowTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    HomeScreen(
                        onRequestPermission = { requestLocationPermission() },
                        onShowBottomSheet = { profile: DnsProfile? ->
                            editingProfileId = profile?.id
                            // In full implementation, this would open bottom sheet
                        }
                    )
                }
            }
        }
    }
    
    /**
     * Request location permission needed for SSID detection on Android 13+
     */
    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val hasFineLocation = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val hasCoarseLocation = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        
        if (hasFineLocation || hasCoarseLocation) {
            // Permission granted - refresh state in ViewModel
            // In production, use a proper callback or event system
        }
    }
    
    /**
     * Request location permissions
     */
    private fun requestLocationPermission() {
        locationPermissionLauncher.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )
    }
    
    /**
     * Check and request permissions if needed
     */
    private fun requestPermissionsIfNeeded() {
        val hasLocationPermission = 
            checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        
        if (!hasLocationPermission) {
            requestLocationPermission()
        }
    }
}
