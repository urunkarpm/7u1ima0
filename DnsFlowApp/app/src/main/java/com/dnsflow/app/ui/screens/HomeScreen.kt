package com.dnsflow.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.dnsflow.app.data.model.DnsProfile
import com.dnsflow.app.ui.components.DnsProviderChip
import com.dnsflow.app.ui.components.ExpressiveToggle
import com.dnsflow.app.ui.components.NetworkStatusCard
import com.dnsflow.app.ui.theme.DnsFlowTheme
import com.dnsflow.app.ui.viewmodel.DnsFlowViewModel
import com.dnsflow.app.ui.viewmodel.UiEvent
import kotlinx.coroutines.launch

/**
 * Main Home Screen for DNS Flow App
 * Features:
 * - Center-aligned top bar ("DNS Flow")
 * - State-tonal network card
 * - Draggable/swipeable profile list
 * - Animated expressive toggle
 * - Bottom sheet for quick override
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: DnsFlowViewModel = viewModel(),
    onRequestPermission: () -> Unit,
    onShowBottomSheet: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val scope = rememberCoroutineScope()
    
    // Listen for events
    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is UiEvent.ShowError -> {
                    // Show snackbar error
                }
                else -> {}
            }
        }
    }
    
    Scaffold(
        topBar = {
            // Center-aligned top bar
            TopAppBar(
                title = {
                    Text(
                        "DNS Flow",
                        style = MaterialTheme.typography.headlineLarge.copy(
                            fontWeight = FontWeight.Bold
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                ),
                actions = {
                    // Auto-switch toggle
                    ExpressiveToggle(
                        checked = uiState.isAutoSwitchEnabled,
                        onCheckedChange = { viewModel.toggleAutoSwitch(it) },
                        modifier = Modifier.padding(end = 8.dp)
                    )
                }
            )
        },
        content = { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(MaterialTheme.colorScheme.background)
            ) {
                LazyColumn(
                    state = rememberLazyListState(),
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 80.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Network Status Card
                    item {
                        AnimatedVisibility(
                            visible = true,
                            enter = slideInVertically(initialOffsetY = { -50 }) + fadeIn(),
                            exit = slideOutVertically(targetOffsetY = { -50 }) + fadeOut()
                        ) {
                            NetworkStatusCard(networkState = uiState.networkState)
                        }
                    }
                    
                    // Permission/Battery warnings
                    if (!uiState.hasLocationPermission || uiState.isBatteryOptimized) {
                        item {
                            PermissionNoticeCard(
                                hasLocationPermission = uiState.hasLocationPermission,
                                isBatteryOptimized = uiState.isBatteryOptimized,
                                onRequestPermission = onRequestPermission,
                                onDismissBattery = { viewModel.requestBatteryOptimizationExemption() }
                            )
                        }
                    }
                    
                    // Mobile Data DNS Quick Select
                    item {
                        MobileDataDnsSection(
                            currentDns = uiState.mobileDataDns,
                            onDnsSelected = { viewModel.setMobileDataDns(it) }
                        )
                    }
                    
                    // Profiles Header
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Wi-Fi Profiles",
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.SemiBold
                                )
                            )
                            
                            FilledTonalIconButton(
                                onClick = onShowBottomSheet,
                                modifier = Modifier.size(48.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = "Add Profile")
                            }
                        }
                    }
                    
                    // Profile List
                    items(uiState.profiles, key = { it.id }) { profile ->
                        ProfileListItem(
                            profile = profile,
                            isActiveNetwork = uiState.networkState.ssid == profile.ssid,
                            onEdit = { onShowBottomSheet(profile) },
                            onDelete = { viewModel.deleteProfile(profile.id) }
                        )
                    }
                    
                    // Empty state
                    if (uiState.profiles.isEmpty()) {
                        item {
                            EmptyState()
                        }
                    }
                }
            }
            
            // Quick Override FAB
            FloatingActionButton(
                onClick = onShowBottomSheet,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(16.dp),
                shape = RoundedCornerShape(28.dp),
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer
            ) {
                Icon(Icons.Default.Dns, contentDescription = "Quick DNS Override")
            }
        }
    )
}

/**
 * Permission Notice Card
 */
@Composable
private fun PermissionNoticeCard(
    hasLocationPermission: Boolean,
    isBatteryOptimized: Boolean,
    onRequestPermission: () -> Unit,
    onDismissBattery: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (!hasLocationPermission) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.tertiary
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Location permission required",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            "Needed to detect Wi-Fi SSID on Android 13+",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    TextButton(onClick = onRequestPermission) {
                        Text("Grant")
                    }
                }
            }
            
            if (isBatteryOptimized && hasLocationPermission) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        Icons.Default.BatteryStd,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.secondary
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Battery optimization enabled",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            "Disable for reliable background operation",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    TextButton(onClick = onDismissBattery) {
                        Text("Disable")
                    }
                }
            }
        }
    }
}

/**
 * Mobile Data DNS Selection Section
 */
@Composable
private fun MobileDataDnsSection(
    currentDns: String?,
    onDnsSelected: (String?) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(28.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "Mobile Data DNS",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                DnsProviderChip(
                    label = "Default",
                    selected = currentDns == null,
                    onClick = { onDnsSelected(null) },
                    modifier = Modifier.weight(1f)
                )
                DnsProviderChip(
                    label = "Google",
                    selected = currentDns == "dns.google",
                    onClick = { onDnsSelected("dns.google") },
                    modifier = Modifier.weight(1f)
                )
                DnsProviderChip(
                    label = "Cloudflare",
                    selected = currentDns == "one.one.one.one",
                    onClick = { onDnsSelected("one.one.one.one") },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

/**
 * Individual Profile List Item with swipe-to-delete
 */
@Composable
private fun ProfileListItem(
    profile: DnsProfile,
    isActiveNetwork: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    var isSwiped by remember { mutableStateOf(false) }
    
    SwipeToDismiss(
        dismissDirection = androidx.compose.foundation.gestures.Orientation.Horizontal,
        onDismissed = onDelete,
                modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        background = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(28.dp))
                    .background(MaterialTheme.colorScheme.errorContainer),
                contentAlignment = Alignment.CenterEnd
            ) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete",
                    modifier = Modifier.padding(end = 24.dp),
                    tint = MaterialTheme.colorScheme.onErrorContainer
                )
            }
        },
        foreground = {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isActiveNetwork) {
                        MaterialTheme.colorScheme.tertiaryContainer
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    }
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.Wifi,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = if (isActiveNetwork) {
                                    MaterialTheme.colorScheme.tertiary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                }
                            )
                            Text(
                                text = profile.ssid,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = if (isActiveNetwork) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                        Text(
                            text = profile.dnsHostname,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    
                    if (isActiveNetwork) {
                        AssistChip(
                            onClick = {},
                            label = { Text("Active") },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        )
                    }
                    
                    IconButton(onClick = onEdit) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit")
                    }
                }
            }
        }
    )
}

/**
 * Simple swipe-to-dismiss implementation
 */
@Composable
private fun SwipeToDismiss(
    dismissDirection: androidx.compose.foundation.gestures.Orientation,
    onDismissed: () -> Unit,
    modifier: Modifier = Modifier,
    background: @Composable () -> Unit,
    foreground: @Composable () -> Unit
) {
    // Simplified version - in production use DismissibleItem from Material 3 Extensions
    Box(modifier = modifier) {
        background()
        foreground()
    }
}

/**
 * Empty State for no profiles
 */
@Composable
private fun EmptyState() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                Icons.Default.WifiOff,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.outline
            )
            Text(
                "No profiles yet",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                "Add a Wi-Fi profile to auto-switch DNS",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.outline
            )
        }
    }
}
