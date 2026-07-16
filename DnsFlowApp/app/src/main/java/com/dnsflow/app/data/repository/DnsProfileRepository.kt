package com.dnsflow.app.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.dnsflow.app.data.model.DnsProfile
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject

/**
 * DataStore extension for preferences storage
 */
val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "dns_flow_prefs")

/**
 * Repository for managing DNS profiles using DataStore.
 * Handles serialization/deserialization of profile list.
 */
class DnsProfileRepository(private val context: Context) {
    
    companion object {
        private val PROFILES_KEY = stringPreferencesKey("dns_profiles")
        private val MOBILE_DATA_DNS_KEY = stringPreferencesKey("mobile_data_dns")
    }
    
    /**
     * Flow of all stored DNS profiles
     */
    val profilesFlow: Flow<List<DnsProfile>> = context.dataStore.data.map { preferences ->
        val json = preferences[PROFILES_KEY] ?: return@map emptyList()
        parseProfiles(json)
    }
    
    /**
     * Get the default DNS for mobile data connections
     */
    val mobileDataDnsFlow: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[MOBILE_DATA_DNS_KEY]
    }
    
    /**
     * Parse JSON string to list of DnsProfile
     */
    private fun parseProfiles(jsonString: String): List<DnsProfile> {
        return try {
            val jsonArray = JSONArray(jsonString)
            List(jsonArray.length()) { index ->
                val obj = jsonArray.getJSONObject(index)
                DnsProfile(
                    id = obj.getString("id"),
                    ssid = obj.getString("ssid"),
                    dnsHostname = obj.getString("dnsHostname"),
                    createdAt = obj.optLong("createdAt", System.currentTimeMillis()),
                    isActive = obj.optBoolean("isActive", true)
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }
    
    /**
     * Convert list of DnsProfile to JSON string
     */
    private fun serializeProfiles(profiles: List<DnsProfile>): String {
        val jsonArray = JSONArray()
        profiles.forEach { profile ->
            val obj = JSONObject().apply {
                put("id", profile.id)
                put("ssid", profile.ssid)
                put("dnsHostname", profile.dnsHostname)
                put("createdAt", profile.createdAt)
                put("isActive", profile.isActive)
            }
            jsonArray.put(obj)
        }
        return jsonArray.toString()
    }
    
    /**
     * Add a new DNS profile
     */
    suspend fun addProfile(ssid: String, dnsHostname: String) {
        val currentProfiles = profilesFlow.firstOrNull() ?: emptyList()
        // Remove existing profile for same SSID if exists
        val filteredProfiles = currentProfiles.filter { it.ssid != ssid }
        val newProfile = DnsProfile(
            id = DnsProfile.generateId(),
            ssid = ssid,
            dnsHostname = dnsHostname
        )
        saveProfiles(filteredProfiles + newProfile)
    }
    
    /**
     * Update an existing profile
     */
    suspend fun updateProfile(id: String, ssid: String, dnsHostname: String) {
        val currentProfiles = profilesFlow.firstOrNull() ?: emptyList()
        val updatedProfiles = currentProfiles.map { profile ->
            if (profile.id == id) {
                profile.copy(ssid = ssid, dnsHostname = dnsHostname)
            } else {
                profile
            }
        }
        saveProfiles(updatedProfiles)
    }
    
    /**
     * Delete a profile by ID
     */
    suspend fun deleteProfile(id: String) {
        val currentProfiles = profilesFlow.firstOrNull() ?: emptyList()
        saveProfiles(currentProfiles.filter { it.id != id })
    }
    
    /**
     * Set the default DNS for mobile data
     */
    suspend fun setMobileDataDns(dnsHostname: String?) {
        context.dataStore.edit { preferences ->
            if (dnsHostname != null) {
                preferences[MOBILE_DATA_DNS_KEY] = dnsHostname
            } else {
                preferences.remove(MOBILE_DATA_DNS_KEY)
            }
        }
    }
    
    /**
     * Save the entire profiles list
     */
    private suspend fun saveProfiles(profiles: List<DnsProfile>) {
        context.dataStore.edit { preferences ->
            preferences[PROFILES_KEY] = serializeProfiles(profiles)
        }
    }
    
    /**
     * Find a profile by SSID
     */
    suspend fun getProfileBySsid(ssid: String): DnsProfile? {
        return profilesFlow.firstOrNull()?.find { it.ssid == ssid }
    }
}
