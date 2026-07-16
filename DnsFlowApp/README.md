# DNS Flow App

An Android application that automatically switches Private DNS based on the connected Wi-Fi network or mobile data, built with Kotlin and Jetpack Compose using Material 3 Expressive design.

## Features

- **Auto-switch DNS**: Automatically changes Private DNS when connecting to different Wi-Fi networks
- **Wi-Fi Profiles**: Map specific SSIDs to DNS providers (Google, Cloudflare, Quad9, OpenDNS, or custom)
- **Mobile Data DNS**: Set a default DNS for cellular connections
- **Material 3 Expressive UI**: 
  - Dynamic color support (Android 12+)
  - Organic shapes with 28dp corner radius
  - Animated state transitions with spring physics
  - Vibrant tertiary colors for active Wi-Fi, calm secondary for mobile data
  - Error container styling for failures
- **Battery Optimization**: Request exemption for reliable background operation
- **Privacy Focused**: No ads, no tracking, minimal permissions

## Technical Details

- **Min SDK**: 28 (Android 9 Pie)
- **Target SDK**: 34 (Android 14)
- **Architecture**: MVVM with Repository pattern
- **UI**: Jetpack Compose with Material 3
- **Storage**: DataStore Preferences
- **Coroutines & Flow**: For reactive programming

## Permissions

The app requests only essential permissions:
- `ACCESS_NETWORK_STATE` - Monitor network connectivity
- `ACCESS_WIFI_STATE` - Detect Wi-Fi networks
- `CHANGE_NETWORK_STATE` - Modify network settings
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` - Required for SSID detection on Android 13+
- `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` - Optional, for reliable background operation

## Building the App

### Prerequisites

- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17
- Android SDK with API 34

### Build Steps

1. **Open in Android Studio**
   ```
   File → Open → Select the DnsFlowApp folder
   ```

2. **Sync Gradle**
   - Android Studio will automatically sync the project
   - Wait for "Gradle sync finished" notification

3. **Build the App**
   ```bash
   ./gradlew assembleDebug
   ```
   
   Or use Android Studio: `Build → Make Project`

4. **Run on Device/Emulator**
   - Connect an Android device (API 28+) or start an emulator
   - Click the Run button or press `Shift + F10`

### Command Line Build

```bash
cd DnsFlowApp
chmod +x gradlew
./gradlew assembleDebug
```

The APK will be generated at: `app/build/outputs/apk/debug/app-debug.apk`

## Usage

1. **Grant Permissions**: On first launch, grant location permission for SSID detection

2. **Add Wi-Fi Profiles**:
   - Tap the "+" button or FAB
   - Enter the Wi-Fi network name (SSID)
   - Select a DNS provider or enter custom hostname
   - Save the profile

3. **Set Mobile Data DNS** (optional):
   - Use the quick select chips in the Mobile Data section
   - Choose Default, Google, or Cloudflare

4. **Enable Auto-Switch**:
   - Toggle the switch in the top bar
   - DNS will automatically change when networks change

5. **Quick Override**:
   - Tap the FAB for temporary DNS override
   - Changes persist until network change or app restart

6. **Battery Optimization**:
   - If prompted, disable battery optimization for reliable operation
   - Go to Settings → Apps → DNS Flow → Battery → Unrestricted

## Project Structure

```
DnsFlowApp/
├── app/
│   ├── src/main/
│   │   ├── java/com/dnsflow/app/
│   │   │   ├── data/
│   │   │   │   ├── model/          # Data classes (DnsProfile, NetworkState)
│   │   │   │   └── repository/     # DataStore repository
│   │   │   ├── domain/             # Business logic (NetworkMonitor, DnsManager)
│   │   │   ├── ui/
│   │   │   │   ├── components/     # Reusable Compose components
│   │   │   │   ├── screens/        # App screens
│   │   │   │   ├── theme/          # Material 3 theme
│   │   │   │   └── viewmodel/      # ViewModel with StateFlow
│   │   │   └── MainActivity.kt
│   │   ├── res/
│   │   │   ├── values/             # Colors, strings, themes
│   │   │   └── drawable/           # Vector assets
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── build.gradle.kts
└── settings.gradle.kts
```

## How It Works

### Network Monitoring
- Uses `ConnectivityManager.NetworkCallback` to monitor network changes
- Detects Wi-Fi SSID using `WifiManager` (requires location permission on Android 13+)
- Handles both Wi-Fi and cellular network transitions

### DNS Switching
- Uses reflection to access hidden `setPrivateDnsMode` API (available Android 9+)
- Sets DNS hostname directly without requiring root access
- Falls back gracefully if API is unavailable

### Profile Matching
- When network changes, checks current SSID against stored profiles
- If match found, switches to associated DNS
- For mobile data, uses configured default DNS
- Reverts to automatic when disconnecting from mapped Wi-Fi

## Troubleshooting

### DNS Not Switching
1. Ensure location permission is granted
2. Check that Private DNS is supported (Android 9+)
3. Verify the DNS hostname is valid (e.g., `dns.google`)
4. Some devices may restrict programmatic DNS changes

### SSID Not Detected
1. Grant location permission
2. Enable location services (required on Android 13+)
3. Some devices hide SSID for privacy - this is a system limitation

### App Stops Working in Background
1. Disable battery optimization for the app
2. Add app to "Never sleeping apps" list (Samsung)
3. Lock app in recent apps (device-specific)

## License

This project is provided as-is for educational purposes.

## Contributing

Feel free to submit issues and enhancement requests!
