# Campus Navigator AR - Unity WebGL Quick Start

## Opening the Project

1. **Open Unity Hub**
2. **Add Project**: Click "Add" → "Add project from disk"
3. **Select folder**: `unity-ar-navigation`
4. **Select Unity version**: **6000.0.62f1** (Unity 6)
5. **Open** the project

## First Time Setup (AUTOMATED!)

When Unity opens for the first time:

### 1. Install TextMeshPro
- Unity will prompt you - click **"Import TMP Essentials"**
- Or: Window → TextMeshPro → Import TMP Essential Resources

### 2. Build Complete Scene (One Click!)
1. **Tools → Campus Navigator → Build Complete AR Scene**
2. Click **"Build Scene"**
3. Save scene: **Ctrl+S** → Name it `ARNavigationScene`

That's it! The script creates EVERYTHING:
- ✅ Main Camera
- ✅ All Manager GameObjects
- ✅ Complete UI Canvas with all elements
- ✅ All references automatically wired

### 3. Switch to WebGL Platform
- **File → Build Settings**
- Select **WebGL** → Click **"Switch Platform"**

## Building for WebGL

1. **File → Build Settings**
2. **Add Open Scenes** (make sure ARNavigationScene is added)
3. **Player Settings**:
   - Company Name: Your name
   - Product Name: Campus Navigator AR
   - WebGL Memory Size: 512 (or higher for complex scenes)
   - Compression Format: Gzip (better compatibility)
4. **Build**: Click "Build" and select output folder

## Deployment Notes

⚠️ **HTTPS Required**: 
- Geolocation API requires HTTPS
- Device Orientation requires HTTPS
- Camera access requires HTTPS

Test on:
- `https://localhost` with local server
- GitHub Pages
- Netlify
- Vercel

## Project Structure

```
Assets/
├── Materials/           # Glassmorphism shader & material
├── Plugins/WebGL/       # JavaScript interop for browser APIs
├── Scenes/              # Unity scenes
├── Scripts/
│   ├── Camera/          # WebCam handling
│   ├── Core/            # Bootstrap & entry point
│   ├── Data/            # Location data management
│   ├── Editor/          # UI builder utilities
│   ├── Navigation/      # GPS, compass, navigation logic
│   ├── Platform/        # WebGL platform bridge
│   ├── Rendering/       # AR arrows & path drawing
│   └── UI/              # UI controller & animations
├── Settings/            # Input actions
└── WebGLTemplates/      # Custom HTML template with permissions
```

## Matching React ARScene.js Behavior

| Feature | React (ARScene.js) | Unity |
|---------|-------------------|-------|
| Haversine Distance | `calculateDistance()` | `ARNavigationManager.CalculateDistance()` |
| Bearing Calculation | `calculateBearing()` | `ARNavigationManager.CalculateBearing()` |
| Compass Smoothing | 0.3 low-pass filter | `compassSmoothingFactor = 0.3` |
| Turn Hysteresis | 40°/50° thresholds | `straightThreshold/turnThreshold` |
| GPS Accuracy Filter | < 50m | `gpsAccuracyThreshold = 50` |
| Softened Colors | #60C8E8, #7DD4A8, etc. | `alignedColor`, `neutralColor` etc. |
| Relaxed UI | Hide direction when aligned | `onTrackIndicator` shows instead |
| Arrow Count | 2 when aligned, 3 otherwise | `maxArrows` dynamically set |
