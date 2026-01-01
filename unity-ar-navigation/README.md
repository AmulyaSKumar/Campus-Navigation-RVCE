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

### Step 3: Build RVCE Campus 3D Model (One Click!)
1. Go to **Campus Navigator → Build RVCE Campus 3D Model (Quick)**
2. The entire 3D campus will be automatically generated! 🎉
3. Save the scene: **Ctrl+S** → name it `RVCECampusScene`
4. Done! ✅

---

## 🏛️ RVCE Campus 3D Model

The campus builder automatically creates a complete 3D model matching the RVCE campus layout:

### Buildings Included:
| Area | Buildings |
|------|-----------|
| **North** | Design Thinking Huddle, Mechanical Dept, Admin Block, Civil Dept, Security, Kotak Bank |
| **Central** | IEM Auditorium, KRIYAKALPA, EEE Dept, ECE Dept, Biotech Quadrangle |
| **East** | PE & Sports Dept, CSE Dept, Health Centre, Temple, Krishna Hostel |
| **South** | Library, ISE & Aerospace Dept, Chem Engg & Physics, Telecom Dept |
| **Hostels** | Krishna Hostel, Cauvery Boys Hostel |
| **Sports** | Football & Cricket Ground with field markings |

### Features:
- ✅ **30+ Buildings** with accurate positions
- ✅ **Roads and pathways** between buildings
- ✅ **Gardens and greenery** with trees
- ✅ **Sports grounds** with field markings
- ✅ **Floating labels** on all buildings (billboard style)
- ✅ **Clickable buildings** - click any building to select it
- ✅ **Orbit camera** - rotate, zoom, and pan the view
- ✅ **Main entrance** with pillars

### Camera Controls:
| Action | Mouse | Touch |
|--------|-------|-------|
| Rotate | Left-click + drag | One finger drag |
| Zoom | Scroll wheel | Pinch |
| Pan | Right-click + drag | Two finger drag |
| Reset | Press **R** key | - |

---

## 🎯 AR Navigation Scene (Optional)

The script automatically creates:
- ✅ Main Camera
- ✅ All manager GameObjects (ARNavigationManager, WebGLPlatformBridge, etc.)
- ✅ Complete UI Canvas with all elements:
---

## 🏫 Custom FBX Model (Alternative)

If you have your own FBX model of the campus, you can import it instead:

### Import Your FBX Model

1. **Create folder**: `Assets/Models/`
2. **Drag your FBX file** into the Models folder
3. **Select the FBX** in Project window, set Import Settings:
   - Scale Factor: `1` (adjust if model isn't in meters)
   - Mesh Compression: `Medium`
   - Read/Write: ✅ Enabled
   - Generate Colliders: ✅ Enabled
4. Click **Apply**

### Make Buildings Clickable

For each building you want to be selectable:

1. **Select the building** in hierarchy (from your FBX)
2. **Add Component → ClickableBuilding**
3. Fill in:
   - `Building Name`: Display name
   - `Latitude/Longitude`: GPS coordinates
4. Buildings will highlight on hover and select on click!

---

## 🎮 AR Navigation Scene

To build the AR navigation scene with camera and directions overlay:

1. **File → New Scene**
2. Go to **Tools → Campus Navigator → Build Complete AR Scene**
3. Click **"Build Scene"**
4. Save as `ARNavigationScene`

This creates:
- ✅ Main Camera
- ✅ All manager GameObjects
- ✅ Complete UI Canvas with glassmorphism design
- ✅ AR Path Renderer

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
