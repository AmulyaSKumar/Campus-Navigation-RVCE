# Campus Navigator AR - Unity WebGL Project

A Unity 6 (6000.0.62f1) project that replicates the AR navigation functionality from the React-based Campus Navigator app, designed for WebGL export.

## 🚀 Quick Setup (3 Steps!)

### Step 1: Open in Unity 6
1. Open **Unity Hub**
2. Click **"Add"** → **"Add project from disk"**
3. Select the `unity-ar-navigation` folder
4. Open with Unity version **6000.0.62f1**

### Step 2: Import TextMeshPro
1. Unity will prompt you to import TMP Essentials - click **Import**
2. Or manually: **Window → TextMeshPro → Import TMP Essential Resources**

### Step 3: Build the Scene (Automatic!)
1. Go to **Tools → Campus Navigator → Build Complete AR Scene**
2. Click **"Build Scene"** in the dialog
3. Save the scene: **Ctrl+S** → name it `ARNavigationScene`
4. Done! ✅

The script automatically creates:
- ✅ Main Camera
- ✅ All manager GameObjects (ARNavigationManager, WebGLPlatformBridge, etc.)
- ✅ Complete UI Canvas with all elements:
  - Status bar (top)
  - Direction overlay
  - On Track indicator
  - Center reticle
  - Compass button
  - Bottom info bar
  - Calibration toast
  - Arrival overlay
- ✅ AR Path Renderer
- ✅ All component references wired up

---

## 🏫 3D Campus Map (FBX Integration)

### Import Your FBX Model

1. **Create folder**: `Assets/Models/`
2. **Drag your FBX file** into the Models folder
3. **Select the FBX** in Project window, set Import Settings:
   - Scale Factor: `1` (adjust if model isn't in meters)
   - Mesh Compression: `Medium`
   - Read/Write: ✅ Enabled
   - Generate Colliders: ✅ Enabled
4. Click **Apply**

### Build 3D Map Scene (Automatic!)

1. **File → New Scene** (create a fresh scene)
2. **Tools → Campus Navigator → Build 3D Map Scene**
3. **Drag your imported FBX model** into the `CampusModelContainer` object
4. **Delete** the `GroundPlaceholder` object
5. **Configure GPS mapping** in `CampusMapViewer`:
   - `Origin Latitude/Longitude`: GPS coords of model's center point
   - `Meters Per Unit`: Scale factor (usually 1 if model is in meters)
   - `North Offset`: Rotation if model's north ≠ Unity Z+
6. **Save scene**: `CampusMapScene`

### Make Buildings Clickable

For each building you want to be selectable:

1. **Select the building** in hierarchy (from your FBX)
2. **Add Component → ClickableBuilding**
3. Fill in:
   - `Building Name`: Display name
   - `Latitude/Longitude`: GPS coordinates
   - Or click **"Calculate GPS From Position"** in context menu
4. Buildings will highlight on hover and select on click!

### Features Included:

| Feature | Description |
|---------|-------------|
| **Orbit Camera** | Drag to rotate, scroll/pinch to zoom |
| **User Marker** | Shows your GPS location on the 3D map |
| **Destination Marker** | Shows selected destination |
| **Path Line** | Visual path between user and destination |
| **Clickable Buildings** | Tap to select as destination |
| **AR Switch** | Button to start AR navigation to selected building |

---

## 🔨 Build for WebGL

1. **File → Build Settings**
2. Select **WebGL** → Click **"Switch Platform"** (wait for it to finish)
3. Click **"Add Open Scenes"** to add your scene
4. **Player Settings** (gear icon):
   - Resolution: `1920 x 1080`
   - WebGL Template: Select **"ARNavigation"** (custom template with permissions)
   - Memory Size: `512` MB
   - Compression: **Gzip**
5. Click **"Build"** → Choose output folder
6. **Deploy to HTTPS server** (required for GPS/camera)

---

## 📁 Project Structure

```
unity-ar-navigation/
├── Assets/
│   ├── Materials/
│   │   ├── Glassmorphism.shader          # Glass effect shader
│   │   └── GlassmorphismMaterial.mat
│   ├── Plugins/WebGL/
│   │   └── WebGLGeolocation.jslib        # Browser API interop
│   ├── Scripts/
│   │   ├── Core/
│   │   │   └── ARNavigationBootstrap.cs  # Entry point
│   │   ├── Editor/
│   │   │   └── ARNavigationSceneBuilder.cs  # ⭐ Auto scene builder
│   │   ├── Navigation/
│   │   │   └── ARNavigationManager.cs    # GPS, compass, bearing
│   │   ├── UI/
│   │   │   ├── ARNavigationUI.cs         # UI controller
│   │   │   └── Components/UIAnimations.cs
│   │   ├── Rendering/
│   │   │   └── ARPathRenderer.cs         # AR arrows
│   │   ├── Camera/
│   │   │   └── WebGLCameraManager.cs     # Webcam feed
│   │   ├── Platform/
│   │   │   └── WebGLPlatformBridge.cs    # JS bridge
│   │   └── Data/
│   │       └── LocationManager.cs         # Locations API
│   ├── Settings/
│   │   └── ARNavigationInputActions.inputactions
│   └── WebGLTemplates/ARNavigation/
│       └── index.html                     # Custom HTML with permission flow
├── Packages/manifest.json
└── ProjectSettings/
```

---

## ✨ Features (Matching ARScene.js)

| Feature | Implementation |
|---------|---------------|
| **Haversine Distance** | `ARNavigationManager.CalculateDistance()` |
| **Forward Azimuth Bearing** | `ARNavigationManager.CalculateBearing()` |
| **Compass Smoothing** | 0.3 low-pass filter |
| **Turn Hysteresis** | 40°/50° thresholds |
| **GPS Accuracy Filter** | < 50m readings only |
| **Glassmorphism UI** | Semi-transparent panels with blur |
| **Softened Colors** | #60C8E8, #7DD4A8, #F5D060, #F59090 |
| **Relaxed UI When Aligned** | Hides direction, shows "✓ On Track" |

---

## 🎨 Color Palette

```csharp
// Softened colors for daylight/night
primaryColor  = #60C8E8  // Soft cyan
alignedColor  = #6EE7A0  // Soft green  
offRouteColor = #F5D060  // Soft amber
wrongColor    = #F59090  // Soft red
```

---

## 🧪 Testing in Editor

1. Open the AR scene
2. Select **ARNavigationManager** in Hierarchy
3. In Inspector:
   - ✅ Enable **"Use Fake Location"**
   - Set test coordinates
4. Press **Play**

---

## ⚠️ Deployment Requirements

| Requirement | Why |
|-------------|-----|
| **HTTPS** | Geolocation API requires secure context |
| **HTTPS** | Camera access requires secure context |
| **HTTPS** | DeviceOrientation (iOS 13+) requires secure context |

### Hosting Options:
- GitHub Pages (free, HTTPS)
- Netlify (free, HTTPS)
- Vercel (free, HTTPS)
- Your own server with SSL certificate

---

## 🔧 Troubleshooting

### "TextMeshPro not found" error
→ Import TMP: **Window → TextMeshPro → Import TMP Essential Resources**

### GPS not working in WebGL
→ Must deploy to **HTTPS** (not http:// or file://)

### Compass not working on iOS
→ iOS 13+ requires user gesture to request permission (handled by WebGL template)

### Build fails with memory errors
→ Increase WebGL Memory Size in Player Settings (try 512 or 1024 MB)

### Camera not showing
→ Check browser permissions, must be HTTPS

---

## 📱 Menu Options

After opening the project, you'll find:

**Tools → Campus Navigator →**
- **Import Required Packages** - Shows manual import instructions
- **Build Complete AR Scene** - ⭐ Creates everything automatically!

---

## 🎯 What Gets Created Automatically

When you run **"Build Complete AR Scene"**, the script creates:

### GameObjects:
1. **Main Camera** - Tagged as MainCamera
2. **ARNavigationManager** - Core navigation logic
3. **WebGLPlatformBridge** - JavaScript interop
4. **WebGLCameraManager** - Camera feed handler
5. **LocationManager** - Campus locations data
6. **EventSystem** - For UI interaction
7. **ARCanvas** - Screen-space overlay canvas

### UI Elements (all inside ARCanvas):
1. **CameraBackground** - RawImage for webcam feed
2. **StatusBar** - Top status with dot, text, close button
3. **DirectionOverlay** - Arrow and direction text
4. **OnTrackIndicator** - "✓ On Track" badge (hidden when not aligned)
5. **CenterReticle** - Small targeting circle
6. **CompassButton** - Rotating compass needle
7. **BottomInfoBar** - Destination info, distance, ETA
8. **CalibrationToast** - Compass calibrated message
9. **ArrivalOverlay** - Full screen arrival celebration
10. **ARPathRenderer** - Navigation arrows container

### All References Wired:
- ARNavigationUI ← all UI elements
- ARNavigationManager ← ARNavigationUI
- WebGLCameraManager ← CameraBackground
- ARPathRenderer ← NavigationManager, Canvas, ArrowTemplate
- Check browser permissions
- Test on real mobile device

### Compass not accurate
- Move phone in figure-8 pattern to calibrate
- Avoid metal objects nearby
- Tap compass button to recalibrate

### Camera not showing
- Check browser camera permissions
- Fallback gradient background will show if camera unavailable

## License

MIT License - Campus Navigator Project
