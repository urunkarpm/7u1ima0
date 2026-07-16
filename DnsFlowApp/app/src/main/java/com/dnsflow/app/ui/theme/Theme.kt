package com.dnsflow.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// ==================== LIGHT COLOR SCHEME ====================
// Vibrant, expressive palette with distinct colors for different UI elements
private val LightColorScheme = lightColorScheme(
    // Primary - Deep Purple for main actions and branding
    primary = Color(0xFF7C4DFF),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFEDE0FF),
    onPrimaryContainer = Color(0xFF3B0088),
    
    // Secondary - Teal for Wi-Fi connected states
    secondary = Color(0xFF00BFA5),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFA7F7E8),
    onSecondaryContainer = Color(0xFF003731),
    
    // Tertiary - Coral/Orange for mobile data and accents
    tertiary = Color(0xFFFF6D40),
    onTertiary = Color(0xFFFFFFFF),
    tertiaryContainer = Color(0xFFFFDBCF),
    onTertiaryContainer = Color(0xFF5C0F00),
    
    // Error - Red for errors and disconnected states
    error = Color(0xFFD32F2F),
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF410002),
    
    // Success - Green for active DNS states
    success = Color(0xFF00C853),
    onSuccess = Color(0xFFFFFFFF),
    successContainer = Color(0xFFB9F6CA),
    onSuccessContainer = Color(0xFF003D15),
    
    // Warning - Amber for switching/pending states
    warning = Color(0xFFFFAB00),
    onWarning = Color(0xFF000000),
    warningContainer = Color(0xFFFFECB3),
    onWarningContainer = Color(0xFF3D2F00),
    
    // Background and Surface
    background = Color(0xFFFAFAFA),
    onBackground = Color(0xFF1A1A2E),
    surface = Color(0xFFFAFAFA),
    onSurface = Color(0xFF1A1A2E),
    surfaceVariant = Color(0xFFE8E8ED),
    onSurfaceVariant = Color(0xFF4A4A58),
    outline = Color(0xFF7A7A8C),
    outlineVariant = Color(0xFFCAC4D0)
)

// ==================== DARK COLOR SCHEME ====================
// Rich, deep palette with high contrast for readability
private val DarkColorScheme = darkColorScheme(
    // Primary - Bright Lavender for main actions
    primary = Color(0xFFBB86FC),
    onPrimary = Color(0xFF3B0088),
    primaryContainer = Color(0xFF5C2DBF),
    onPrimaryContainer = Color(0xFFEDE0FF),
    
    // Secondary - Bright Cyan for Wi-Fi connected states
    secondary = Color(0xFF64FFDA),
    onSecondary = Color(0xFF003731),
    secondaryContainer = Color(0xFF008F7A),
    onSecondaryContainer = Color(0xFFA7F7E8),
    
    // Tertiary - Warm Orange for mobile data and accents
    tertiary = Color(0xFFFFAB91),
    onTertiary = Color(0xFF5C0F00),
    tertiaryContainer = Color(0xFFBF3600),
    onTertiaryContainer = Color(0xFFFFDBCF),
    
    // Error - Soft Red for errors
    error = Color(0xFFFF8A80),
    onError = Color(0xFF410002),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
    
    // Success - Bright Green for active DNS states
    success = Color(0xFF69F0AE),
    onSuccess = Color(0xFF003D15),
    successContainer = Color(0xFF00A843),
    onSuccessContainer = Color(0xFFB9F6CA),
    
    // Warning - Golden Yellow for switching/pending states
    warning = Color(0xFFFFD740),
    onWarning = Color(0xFF3D2F00),
    warningContainer = Color(0xFFBF9E00),
    onWarningContainer = Color(0xFFFFECB3),
    
    // Background and Surface - Deep blue-gray
    background = Color(0xFF12121A),
    onBackground = Color(0xFFE8E8ED),
    surface = Color(0xFF12121A),
    onSurface = Color(0xFFE8E8ED),
    surfaceVariant = Color(0xFF3A3A4A),
    onSurfaceVariant = Color(0xFFCAC4D0),
    outline = Color(0xFF938F99),
    outlineVariant = Color(0xFF49454F)
)

/**
 * Material 3 Expressive Theme for DNS Flow App.
 * Supports dynamic color (Android 12+) and manual light/dark themes.
 */
@Composable
fun DnsFlowTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val context = LocalContext.current
    
    // Dynamic color support (Android 12+)
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            if (darkTheme) {
                dynamicDarkColorScheme(context)
            } else {
                dynamicLightColorScheme(context)
            }
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Color.Transparent.toArgb()
            window.navigationBarColor = Color.Transparent.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
