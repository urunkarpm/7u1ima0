package com.dnsflow.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dnsflow.app.data.model.DnsStatus
import com.dnsflow.app.data.model.NetworkState

/**
 * Expressive Network Status Card
 * Displays current network state with animated colors based on connection type.
 * Uses organic shapes (28dp corners) and Material 3 tonal palettes.
 */
@Composable
fun NetworkStatusCard(
    networkState: NetworkState,
    modifier: Modifier = Modifier
) {
    // Determine color scheme based on network type and status
    val containerColor by animateColorAsState(
        targetValue = when {
            !networkState.isConnected -> MaterialTheme.colorScheme.errorContainer
            networkState.isWifi -> MaterialTheme.colorScheme.tertiaryContainer
            else -> MaterialTheme.colorScheme.secondaryContainer
        },
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "containerColor"
    )
    
    val contentColor by animateColorAsState(
        targetValue = when {
            !networkState.isConnected -> MaterialTheme.colorScheme.onErrorContainer
            networkState.isWifi -> MaterialTheme.colorScheme.onTertiaryContainer
            else -> MaterialTheme.colorScheme.onSecondaryContainer
        },
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "contentColor"
    )
    
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Large bold display type for status
            Text(
                text = when {
                    !networkState.isConnected -> "Disconnected"
                    networkState.isWifi -> "Wi-Fi Connected"
                    else -> "Mobile Data"
                },
                style = MaterialTheme.typography.displaySmall.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = contentColor
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // SSID or provider info
            if (networkState.ssid != null) {
                Text(
                    text = networkState.ssid,
                    style = MaterialTheme.typography.titleMedium,
                    color = contentColor.copy(alpha = 0.8f)
                )
            } else if (!networkState.isWifi && networkState.isConnected) {
                Text(
                    text = "Cellular Network",
                    style = MaterialTheme.typography.titleMedium,
                    color = contentColor.copy(alpha = 0.8f)
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // DNS Status indicator
            DnsStatusIndicator(status = networkState.dnsStatus)
        }
    }
}

/**
 * Animated DNS Status Indicator
 */
@Composable
private fun DnsStatusIndicator(status: DnsStatus) {
    val statusText = when (status) {
        DnsStatus.Unknown -> "Detecting..."
        DnsStatus.Active -> "DNS Active"
        DnsStatus.Switching -> "Switching..."
        DnsStatus.Failed -> "DNS Failed"
        DnsStatus.Default -> "Default DNS"
    }
    
    val statusColor by animateColorAsState(
        targetValue = when (status) {
            DnsStatus.Active -> MaterialTheme.colorScheme.success
            DnsStatus.Switching -> MaterialTheme.colorScheme.warning
            DnsStatus.Failed -> MaterialTheme.colorScheme.error
            else -> MaterialTheme.colorScheme.outline
        },
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "statusColor"
    )
    
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(statusColor.copy(alpha = 0.2f))
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .background(
                    color = statusColor,
                    shape = RoundedCornerShape(4.dp)
                )
        )
        
        Spacer(modifier = Modifier.width(8.dp))
        
        Text(
            text = statusText,
            style = MaterialTheme.typography.labelLarge,
            color = statusColor
        )
    }
}

/**
 * Expressive Toggle Button
 * Animated toggle with spring physics for DNS enable/disable
 */
@Composable
fun ExpressiveToggle(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    val backgroundColor by animateColorAsState(
        targetValue = if (checked) {
            MaterialTheme.colorScheme.primary
        } else {
            MaterialTheme.colorScheme.surfaceVariant
        },
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "toggleBackground"
    )
    
    val thumbColor by animateColorAsState(
        targetValue = if (checked) {
            MaterialTheme.colorScheme.onPrimary
        } else {
            MaterialTheme.colorScheme.onSurfaceVariant
        },
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "thumbColor"
    )
    
    Switch(
        checked = checked,
        onCheckedChange = onCheckedChange,
        modifier = modifier.size(56.dp, 36.dp),
        enabled = enabled,
        colors = SwitchDefaults.colors(
            checkedThumbColor = thumbColor,
            checkedTrackColor = backgroundColor,
            uncheckedThumbColor = thumbColor,
            uncheckedTrackColor = backgroundColor
        )
    )
}

/**
 * Pill-shaped Chip for DNS Provider selection
 */
@Composable
fun DnsProviderChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge
            )
        },
        modifier = modifier.height(48.dp),
        shape = RoundedCornerShape(50),
        border = if (selected) {
            FilterChipDefaults.filterChipBorder(
                enabled = true,
                selected = true,
                borderColor = MaterialTheme.colorScheme.primary
            )
        } else {
            null
        }
    )
}
