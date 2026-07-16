package com.dnsflow.app.data.model

/**
 * Represents a Wi-Fi DNS profile mapping an SSID to a DNS provider.
 * Stored in DataStore for persistence.
 */
data class DnsProfile(
    val id: String,
    val ssid: String,
    val dnsHostname: String,
    val createdAt: Long = System.currentTimeMillis(),
    val isActive: Boolean = true
) {
    companion object {
        fun generateId(): String = System.currentTimeMillis().toString() + "_" + (1000..9999).random()
    }
}

/**
 * Network state representing the current connection type and active DNS.
 */
data class NetworkState(
    val isConnected: Boolean = false,
    val isWifi: Boolean = false,
    val ssid: String? = null,
    val currentDns: String? = null,
    val dnsStatus: DnsStatus = DnsStatus.Unknown
)

/**
 * Status of DNS switching operation
 */
enum class DnsStatus {
    Unknown,
    Active,
    Switching,
    Failed,
    Default
}

/**
 * Available DNS providers with their hostnames
 */
sealed class DnsProvider(val name: String, val hostname: String) {
    object Google : DnsProvider("Google", "dns.google")
    object Cloudflare : DnsProvider("Cloudflare", "one.one.one.one")
    object Quad9 : DnsProvider("Quad9", "dns.quad9.net")
    object OpenDNS : DnsProvider("OpenDNS", "doh.opendns.com")
    object Custom : DnsProvider("Custom", "")
    
    companion object {
        fun fromHostname(hostname: String): DnsProvider {
            return when (hostname) {
                "dns.google" -> Google
                "one.one.one.one" -> Cloudflare
                "dns.quad9.net" -> Quad9
                "doh.opendns.com" -> OpenDNS
                else -> Custom
            }
        }
        
        fun getAllProviders(): List<DnsProvider> = listOf(Google, Cloudflare, Quad9, OpenDNS)
    }
}
