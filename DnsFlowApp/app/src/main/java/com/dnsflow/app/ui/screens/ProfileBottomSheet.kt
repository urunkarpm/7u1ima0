package com.dnsflow.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dnsflow.app.data.model.DnsProfile
import com.dnsflow.app.data.model.DnsProvider

/**
 * Bottom Sheet for adding/editing DNS profiles
 * Provides quick override and profile management
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileBottomSheet(
    editingProfile: DnsProfile? = null,
    onDismiss: () -> Unit,
    onSave: (ssid: String, dnsHostname: String) -> Unit,
    onQuickOverride: (String?) -> Unit
) {
    var ssid by remember { mutableStateOf(editingProfile?.ssid ?: "") }
    var dnsHostname by remember { mutableStateOf(editingProfile?.dnsHostname ?: "") }
    var selectedProvider by remember { mutableStateOf<DnsProvider?>(
        if (dnsHostname.isNotEmpty()) DnsProvider.fromHostname(dnsHostname) else null
    ) }
    
    val isEditing = editingProfile != null
    
    Surface(
        modifier = Modifier.fillMaxSize(),
        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 8.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (isEditing) "Edit Profile" else "Add Profile",
                    style = MaterialTheme.typography.headlineSmall.copy(
                        fontWeight = FontWeight.Bold
                    )
                )
                
                FilledTonalIconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // SSID Input
            OutlinedTextField(
                value = ssid,
                onValueChange = { ssid = it },
                label = { Text("Wi-Fi SSID") },
                placeholder = { Text("Enter network name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline
                )
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // DNS Provider Selection
            Text(
                text = "DNS Provider",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                DnsProvider.getAllProviders().forEach { provider ->
                    FilterChip(
                        selected = selectedProvider == provider,
                        onClick = {
                            selectedProvider = provider
                            dnsHostname = provider.hostname
                        },
                        label = { Text(provider.name) },
                        shape = RoundedCornerShape(50),
                        modifier = Modifier.height(48.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Custom DNS Input
            OutlinedTextField(
                value = dnsHostname,
                onValueChange = { 
                    dnsHostname = it
                    selectedProvider = null
                },
                label = { Text("Custom DNS Hostname") },
                placeholder = { Text("e.g., dns.example.com") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline
                )
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Quick Override Section (only when not editing)
            if (!isEditing) {
                Divider(modifier = Modifier.padding(vertical = 8.dp))
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = "Quick Override",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    FilledTonalButton(
                        onClick = { onQuickOverride(null) },
                        modifier = Modifier.weight(1f).height(56.dp),
                        shape = RoundedCornerShape(28.dp)
                    ) {
                        Text("Default")
                    }
                    FilledTonalButton(
                        onClick = { onQuickOverride("dns.google") },
                        modifier = Modifier.weight(1f).height(56.dp),
                        shape = RoundedCornerShape(28.dp)
                    ) {
                        Text("Google")
                    }
                    FilledTonalButton(
                        onClick = { onQuickOverride("one.one.one.one") },
                        modifier = Modifier.weight(1f).height(56.dp),
                        shape = RoundedCornerShape(28.dp)
                    ) {
                        Text("Cloudflare")
                    }
                }
                
                Spacer(modifier = Modifier.height(24.dp))
            }
            
            // Save Button
            Button(
                onClick = {
                    if (ssid.isNotBlank() && dnsHostname.isNotBlank()) {
                        onSave(ssid, dnsHostname)
                        onDismiss()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(28.dp),
                enabled = ssid.isNotBlank() && dnsHostname.isNotBlank()
            ) {
                Icon(
                    Icons.Default.Save,
                    contentDescription = null,
                    modifier = Modifier.padding(end = 8.dp)
                )
                Text(if (isEditing) "Update Profile" else "Save Profile")
            }
            
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

/**
 * Simple FlowRow implementation for provider chips
 */
@Composable
private fun FlowRow(
    modifier: Modifier = Modifier,
    horizontalArrangement: Arrangement.Horizontal = Arrangement.Start,
    content: @Composable () -> Unit
) {
    Row(
        modifier = modifier,
        horizontalArrangement = horizontalArrangement
    ) {
        content()
    }
}
