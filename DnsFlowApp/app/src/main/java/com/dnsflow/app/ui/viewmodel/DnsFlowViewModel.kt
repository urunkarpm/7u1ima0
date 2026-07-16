package com.dnsflow.app.ui.viewmodel

import android.app.Application
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.dnsflow.app.data.model.DnsProfile
import com.dnsflow.app.data.model.DnsStatus
import com.dnsflow.app.data.model.NetworkState
import com.dnsflow.app.data.repository.DnsProfileRepository
import com.dnsflow.app.domain.DnsManager
import com.dnsflow.app.domain.NetworkMonitor
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

/**
 * UI State for the DNS Flow App
 */
data class DnsFlowUiState(
    val networkState: NetworkState = NetworkState(),
    val profiles: List<DnsProfile> = emptyList(),
    val mobileDataDns: String? = null,
    val isAutoSwitchEnabled: Boolean = true,
    val currentDnsHostname: String? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val hasLocationPermission: Boolean = false,
    val isBatteryOptimized: Boolean = true
)

/**
 * Main ViewModel for DNS Flow App
 * Binds UI directly to ViewModel flows using StateFlow
 */
class DnsFlowViewModel(application: Application) : AndroidViewModel(application) {
    
    private val repository = DnsProfileRepository(application)
    private val networkMonitor = NetworkMonitor(application)
    private val dnsManager = DnsManager(application)
    
    private val _uiState = MutableStateFlow(DnsFlowUiState())
    val uiState: StateFlow<DnsFlowUiState> = _uiState.asStateFlow()
    
    // Event channel for one-time actions
    private val _events = MutableSharedFlow<UiEvent>()
    val events: SharedFlow<UiEvent> = _events.asSharedFlow()
    
    init {
        // Combine all data sources
        viewModelScope.launch {
            combine(
                networkMonitor.networkStateFlow,
                repository.profilesFlow,
                repository.mobileDataDnsFlow,
                _uiState.map { it.isAutoSwitchEnabled }
            ) { networkState, profiles, mobileDns, autoSwitch ->
                // Find matching profile for current SSID
                val matchedProfile = if (networkState.isWifi && networkState.ssid != null) {
                    profiles.find { it.ssid == networkState.ssid && it.isActive }
                } else {
                    null
                }
                
                // Determine DNS hostname
                val targetDns = when {
                    matchedProfile != null -> matchedProfile.dnsHostname
                    !networkState.isWifi && networkState.isConnected -> mobileDns
                    else -> null
                }
                
                // Update DNS if auto-switch is enabled
                if (autoSwitch && targetDns != _uiState.value.currentDnsHostname) {
                    switchDns(targetDns)
                }
                
                // Update network state with DNS status
                val updatedNetworkState = networkState.copy(
                    currentDns = targetDns,
                    dnsStatus = when {
                        targetDns == null -> DnsStatus.Default
                        matchedProfile != null || mobileDns != null -> DnsStatus.Active
                        else -> DnsStatus.Unknown
                    }
                )
                
                DnsFlowUiState(
                    networkState = updatedNetworkState,
                    profiles = profiles,
                    mobileDataDns = mobileDns,
                    isAutoSwitchEnabled = autoSwitch,
                    currentDnsHostname = targetDns,
                    hasLocationPermission = networkMonitor.hasSsidPermission(),
                    isBatteryOptimized = checkBatteryOptimization()
                )
            }.collect { state ->
                _uiState.value = state
            }
        }
        
        // Check initial permission state
        updatePermissionState()
    }
    
    /**
     * Switch to a specific DNS hostname
     */
    private fun switchDns(hostname: String?) {
        viewModelScope.launch {
            _uiState.update { 
                it.copy(
                    isLoading = true,
                    networkState = it.networkState.copy(dnsStatus = DnsStatus.Switching)
                )
            }
            
            val success = dnsManager.setPrivateDns(hostname)
            
            _uiState.update { currentState ->
                currentState.copy(
                    isLoading = false,
                    currentDnsHostname = hostname,
                    networkState = currentState.networkState.copy(
                        dnsStatus = if (success) {
                            if (hostname == null) DnsStatus.Default else DnsStatus.Active
                        } else {
                            DnsStatus.Failed
                        }
                    ),
                    errorMessage = if (!success) "Failed to switch DNS" else null
                )
            }
            
            if (!success) {
                _events.emit(UiEvent.ShowError("Failed to switch DNS. May require system settings."))
            }
        }
    }
    
    /**
     * Add a new DNS profile
     */
    fun addProfile(ssid: String, dnsHostname: String) {
        viewModelScope.launch {
            try {
                repository.addProfile(ssid.trim(), dnsHostname.trim())
                _events.emit(UiEvent.ProfileAdded)
            } catch (e: Exception) {
                _events.emit(UiEvent.ShowError("Failed to add profile: ${e.message}"))
            }
        }
    }
    
    /**
     * Update an existing profile
     */
    fun updateProfile(id: String, ssid: String, dnsHostname: String) {
        viewModelScope.launch {
            try {
                repository.updateProfile(id, ssid.trim(), dnsHostname.trim())
                _events.emit(UiEvent.ProfileUpdated)
            } catch (e: Exception) {
                _events.emit(UiEvent.ShowError("Failed to update profile: ${e.message}"))
            }
        }
    }
    
    /**
     * Delete a profile
     */
    fun deleteProfile(id: String) {
        viewModelScope.launch {
            try {
                repository.deleteProfile(id)
                _events.emit(UiEvent.ProfileDeleted)
            } catch (e: Exception) {
                _events.emit(UiEvent.ShowError("Failed to delete profile: ${e.message}"))
            }
        }
    }
    
    /**
     * Set DNS for mobile data
     */
    fun setMobileDataDns(hostname: String?) {
        viewModelScope.launch {
            repository.setMobileDataDns(hostname)
        }
    }
    
    /**
     * Toggle auto-switch functionality
     */
    fun toggleAutoSwitch(enabled: Boolean) {
        _uiState.update { it.copy(isAutoSwitchEnabled = enabled) }
        
        // If disabling, reset to automatic DNS
        if (!enabled) {
            switchDns(null)
        }
    }
    
    /**
     * Manually override DNS temporarily
     */
    fun overrideDns(hostname: String?) {
        switchDns(hostname)
        viewModelScope.launch {
            _events.emit(UiEvent.DnsOverridden)
        }
    }
    
    /**
     * Check and update permission state
     */
    private fun updatePermissionState() {
        _uiState.update {
            it.copy(hasLocationPermission = networkMonitor.hasSsidPermission())
        }
    }
    
    /**
     * Check if battery optimization is enabled for this app
     */
    private fun checkBatteryOptimization(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = getApplication<Application>().getSystemService(PowerManager::class.java)
            powerManager.isIgnoringBatteryOptimizations(getApplication<Application>().packageName).not()
        } else {
            false
        }
    }
    
    /**
     * Request battery optimization exemption
     */
    fun requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent().apply {
                action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                data = Uri.parse("package:${getApplication<Application>().packageName}")
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            getApplication<Application>().startActivity(intent)
        }
    }
    
    /**
     * Refresh permission state (call after permission request)
     */
    fun refreshPermissions() {
        updatePermissionState()
        _uiState.update {
            it.copy(isBatteryOptimized = checkBatteryOptimization())
        }
    }
}

/**
 * UI Events for one-time actions
 */
sealed class UiEvent {
    object ProfileAdded : UiEvent()
    object ProfileUpdated : UiEvent()
    object ProfileDeleted : UiEvent()
    object DnsOverridden : UiEvent()
    data class ShowError(val message: String) : UiEvent()
}
