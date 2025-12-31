using UnityEngine;
using UnityEngine.UI;
using TMPro;
using CampusNavigator.AR;

namespace CampusNavigator.AR.Editor
{
    /// <summary>
    /// Runtime UI Builder that creates all AR Navigation UI elements.
    /// This replicates the glassmorphism UI from ARScene.js
    /// </summary>
    public static class ARNavigationUIBuilder
    {
        // Color palette (matching ARScene.js softened colors)
        public static readonly Color32 PrimaryColor = new Color32(0x60, 0xC8, 0xE8, 0xFF);    // #60C8E8
        public static readonly Color32 AlignedColor = new Color32(0x7D, 0xD4, 0xA8, 0xFF);    // #7DD4A8
        public static readonly Color32 OffRouteColor = new Color32(0xF5, 0xD0, 0x60, 0xFF);   // #F5D060
        public static readonly Color32 WrongWayColor = new Color32(0xF5, 0x90, 0x90, 0xFF);   // #F59090
        public static readonly Color32 GlassBg = new Color32(0x18, 0x18, 0x28, 0xD9);         // rgba(24,24,40,0.85)
        public static readonly Color32 GlassBorder = new Color32(0x60, 0x60, 0x80, 0x66);     // rgba(96,96,128,0.4)
        public static readonly Color32 TextWhite = new Color32(0xFF, 0xFF, 0xFF, 0xFF);
        public static readonly Color32 TextMuted = new Color32(0x88, 0x88, 0x99, 0xFF);
        
        /// <summary>
        /// Build the complete AR Navigation UI on a canvas
        /// </summary>
        public static void BuildUI(Canvas canvas, ARNavigationUI uiController)
        {
            RectTransform canvasRect = canvas.GetComponent<RectTransform>();
            
            // Create UI hierarchy
            var statusBar = CreateStatusBar(canvasRect);
            var directionOverlay = CreateDirectionOverlay(canvasRect);
            var onTrackIndicator = CreateOnTrackIndicator(canvasRect);
            var centerReticle = CreateCenterReticle(canvasRect);
            var compassButton = CreateCompassButton(canvasRect);
            var bottomInfoBar = CreateBottomInfoBar(canvasRect);
            var calibrationToast = CreateCalibrationToast(canvasRect);
            var arrivalOverlay = CreateArrivalOverlay(canvasRect);
            
            // Wire up references if controller provided
            if (uiController != null)
            {
                // Use reflection or serialized fields to set references
                // In a real project, you'd expose these via Inspector
                Debug.Log("UI elements created. Please wire up references in Inspector.");
            }
        }
        
        #region Status Bar (Top)
        private static GameObject CreateStatusBar(RectTransform parent)
        {
            var container = CreatePanel("StatusBar", parent);
            var rt = container.GetComponent<RectTransform>();
            
            // Position at top, full width
            rt.anchorMin = new Vector2(0, 1);
            rt.anchorMax = new Vector2(1, 1);
            rt.pivot = new Vector2(0.5f, 1);
            rt.anchoredPosition = new Vector2(0, -20);
            rt.sizeDelta = new Vector2(-40, 60);
            
            // Add glassmorphism background
            AddGlassmorphism(container);
            
            // Destination text (left)
            var destText = CreateText("DestinationText", container.transform);
            var destRt = destText.GetComponent<RectTransform>();
            destRt.anchorMin = new Vector2(0, 0.5f);
            destRt.anchorMax = new Vector2(0.7f, 0.5f);
            destRt.pivot = new Vector2(0, 0.5f);
            destRt.anchoredPosition = new Vector2(16, 0);
            destRt.sizeDelta = new Vector2(0, 40);
            
            var destTmp = destText.GetComponent<TextMeshProUGUI>();
            destTmp.text = "📍 Destination";
            destTmp.fontSize = 16;
            destTmp.alignment = TextAlignmentOptions.MidlineLeft;
            
            // Status icon (right)
            var statusText = CreateText("StatusIcon", container.transform);
            var statusRt = statusText.GetComponent<RectTransform>();
            statusRt.anchorMin = new Vector2(1, 0.5f);
            statusRt.anchorMax = new Vector2(1, 0.5f);
            statusRt.pivot = new Vector2(1, 0.5f);
            statusRt.anchoredPosition = new Vector2(-16, 0);
            statusRt.sizeDelta = new Vector2(40, 40);
            
            var statusTmp = statusText.GetComponent<TextMeshProUGUI>();
            statusTmp.text = "🧭";
            statusTmp.fontSize = 24;
            statusTmp.alignment = TextAlignmentOptions.Midline;
            
            return container;
        }
        #endregion
        
        #region Direction Overlay (Upper center)
        private static GameObject CreateDirectionOverlay(RectTransform parent)
        {
            var container = CreatePanel("DirectionOverlay", parent);
            var rt = container.GetComponent<RectTransform>();
            
            // Position upper center
            rt.anchorMin = new Vector2(0.5f, 1);
            rt.anchorMax = new Vector2(0.5f, 1);
            rt.pivot = new Vector2(0.5f, 1);
            rt.anchoredPosition = new Vector2(0, -100);
            rt.sizeDelta = new Vector2(280, 100);
            
            AddGlassmorphism(container);
            
            // Direction arrow
            var arrowText = CreateText("ArrowText", container.transform);
            var arrowRt = arrowText.GetComponent<RectTransform>();
            arrowRt.anchorMin = new Vector2(0.5f, 0.7f);
            arrowRt.anchorMax = new Vector2(0.5f, 0.7f);
            arrowRt.sizeDelta = new Vector2(60, 50);
            
            var arrowTmp = arrowText.GetComponent<TextMeshProUGUI>();
            arrowTmp.text = "↑";
            arrowTmp.fontSize = 42;
            arrowTmp.alignment = TextAlignmentOptions.Midline;
            arrowTmp.color = PrimaryColor;
            
            // Direction text
            var dirText = CreateText("DirectionText", container.transform);
            var dirRt = dirText.GetComponent<RectTransform>();
            dirRt.anchorMin = new Vector2(0.5f, 0.25f);
            dirRt.anchorMax = new Vector2(0.5f, 0.25f);
            dirRt.sizeDelta = new Vector2(250, 30);
            
            var dirTmp = dirText.GetComponent<TextMeshProUGUI>();
            dirTmp.text = "Continue Straight";
            dirTmp.fontSize = 18;
            dirTmp.alignment = TextAlignmentOptions.Midline;
            
            return container;
        }
        #endregion
        
        #region On Track Indicator
        private static GameObject CreateOnTrackIndicator(RectTransform parent)
        {
            var container = CreatePanel("OnTrackIndicator", parent);
            var rt = container.GetComponent<RectTransform>();
            
            // Position upper center (replaces direction overlay when aligned)
            rt.anchorMin = new Vector2(0.5f, 1);
            rt.anchorMax = new Vector2(0.5f, 1);
            rt.pivot = new Vector2(0.5f, 1);
            rt.anchoredPosition = new Vector2(0, -100);
            rt.sizeDelta = new Vector2(140, 45);
            
            // Green glassmorphism
            var img = container.GetComponent<Image>();
            img.color = new Color32(0x25, 0x40, 0x35, 0xE6); // Dark green tint
            
            AddRoundedCorners(container, 20);
            
            // Checkmark and text
            var text = CreateText("OnTrackText", container.transform);
            var textRt = text.GetComponent<RectTransform>();
            textRt.anchorMin = Vector2.zero;
            textRt.anchorMax = Vector2.one;
            textRt.sizeDelta = Vector2.zero;
            
            var tmp = text.GetComponent<TextMeshProUGUI>();
            tmp.text = "✓ On Track";
            tmp.fontSize = 16;
            tmp.fontStyle = FontStyles.Bold;
            tmp.color = AlignedColor;
            tmp.alignment = TextAlignmentOptions.Midline;
            
            container.SetActive(false); // Hidden by default
            return container;
        }
        #endregion
        
        #region Center Reticle
        private static GameObject CreateCenterReticle(RectTransform parent)
        {
            var container = new GameObject("CenterReticle");
            container.transform.SetParent(parent, false);
            
            var rt = container.AddComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.5f, 0.5f);
            rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(80, 80);
            
            // Outer ring
            var outerRing = CreateText("OuterRing", container.transform);
            var outerRt = outerRing.GetComponent<RectTransform>();
            outerRt.anchorMin = Vector2.zero;
            outerRt.anchorMax = Vector2.one;
            outerRt.sizeDelta = Vector2.zero;
            
            var outerTmp = outerRing.GetComponent<TextMeshProUGUI>();
            outerTmp.text = "○";
            outerTmp.fontSize = 70;
            outerTmp.alignment = TextAlignmentOptions.Midline;
            outerTmp.color = new Color32(0x60, 0xC8, 0xE8, 0x66); // 40% opacity
            
            // Center dot
            var centerDot = CreateText("CenterDot", container.transform);
            var centerRt = centerDot.GetComponent<RectTransform>();
            centerRt.anchorMin = Vector2.zero;
            centerRt.anchorMax = Vector2.one;
            centerRt.sizeDelta = Vector2.zero;
            
            var centerTmp = centerDot.GetComponent<TextMeshProUGUI>();
            centerTmp.text = "●";
            centerTmp.fontSize = 16;
            centerTmp.alignment = TextAlignmentOptions.Midline;
            centerTmp.color = PrimaryColor;
            
            return container;
        }
        #endregion
        
        #region Compass Button
        private static GameObject CreateCompassButton(RectTransform parent)
        {
            var container = CreatePanel("CompassButton", parent);
            var rt = container.GetComponent<RectTransform>();
            
            // Bottom right corner
            rt.anchorMin = new Vector2(1, 0);
            rt.anchorMax = new Vector2(1, 0);
            rt.pivot = new Vector2(1, 0);
            rt.anchoredPosition = new Vector2(-20, 200);
            rt.sizeDelta = new Vector2(56, 56);
            
            AddGlassmorphism(container);
            AddRoundedCorners(container, 28);
            
            // Add button
            var btn = container.AddComponent<Button>();
            btn.transition = Selectable.Transition.ColorTint;
            
            // Compass icon
            var icon = CreateText("CompassIcon", container.transform);
            var iconRt = icon.GetComponent<RectTransform>();
            iconRt.anchorMin = Vector2.zero;
            iconRt.anchorMax = Vector2.one;
            iconRt.sizeDelta = Vector2.zero;
            
            var iconTmp = icon.GetComponent<TextMeshProUGUI>();
            iconTmp.text = "🧭";
            iconTmp.fontSize = 28;
            iconTmp.alignment = TextAlignmentOptions.Midline;
            
            return container;
        }
        #endregion
        
        #region Bottom Info Bar
        private static GameObject CreateBottomInfoBar(RectTransform parent)
        {
            var container = CreatePanel("BottomInfoBar", parent);
            var rt = container.GetComponent<RectTransform>();
            
            // Bottom, full width
            rt.anchorMin = new Vector2(0, 0);
            rt.anchorMax = new Vector2(1, 0);
            rt.pivot = new Vector2(0.5f, 0);
            rt.anchoredPosition = new Vector2(0, 20);
            rt.sizeDelta = new Vector2(-40, 80);
            
            AddGlassmorphism(container);
            
            // Distance (left)
            var distContainer = new GameObject("DistanceContainer");
            distContainer.transform.SetParent(container.transform, false);
            var distContRt = distContainer.AddComponent<RectTransform>();
            distContRt.anchorMin = new Vector2(0, 0);
            distContRt.anchorMax = new Vector2(0.5f, 1);
            distContRt.offsetMin = new Vector2(16, 10);
            distContRt.offsetMax = new Vector2(0, -10);
            
            var distValue = CreateText("DistanceValue", distContainer.transform);
            var distValRt = distValue.GetComponent<RectTransform>();
            distValRt.anchorMin = new Vector2(0, 0.5f);
            distValRt.anchorMax = new Vector2(1, 1);
            distValRt.offsetMin = Vector2.zero;
            distValRt.offsetMax = Vector2.zero;
            
            var distValTmp = distValue.GetComponent<TextMeshProUGUI>();
            distValTmp.text = "-- m";
            distValTmp.fontSize = 26;
            distValTmp.fontStyle = FontStyles.Bold;
            distValTmp.alignment = TextAlignmentOptions.BottomLeft;
            distValTmp.color = PrimaryColor;
            
            var distLabel = CreateText("DistanceLabel", distContainer.transform);
            var distLabRt = distLabel.GetComponent<RectTransform>();
            distLabRt.anchorMin = new Vector2(0, 0);
            distLabRt.anchorMax = new Vector2(1, 0.5f);
            distLabRt.offsetMin = Vector2.zero;
            distLabRt.offsetMax = Vector2.zero;
            
            var distLabTmp = distLabel.GetComponent<TextMeshProUGUI>();
            distLabTmp.text = "Distance";
            distLabTmp.fontSize = 12;
            distLabTmp.alignment = TextAlignmentOptions.TopLeft;
            distLabTmp.color = TextMuted;
            
            // ETA (right)
            var etaContainer = new GameObject("ETAContainer");
            etaContainer.transform.SetParent(container.transform, false);
            var etaContRt = etaContainer.AddComponent<RectTransform>();
            etaContRt.anchorMin = new Vector2(0.5f, 0);
            etaContRt.anchorMax = new Vector2(1, 1);
            etaContRt.offsetMin = new Vector2(0, 10);
            etaContRt.offsetMax = new Vector2(-16, -10);
            
            var etaValue = CreateText("ETAValue", etaContainer.transform);
            var etaValRt = etaValue.GetComponent<RectTransform>();
            etaValRt.anchorMin = new Vector2(0, 0.5f);
            etaValRt.anchorMax = new Vector2(1, 1);
            etaValRt.offsetMin = Vector2.zero;
            etaValRt.offsetMax = Vector2.zero;
            
            var etaValTmp = etaValue.GetComponent<TextMeshProUGUI>();
            etaValTmp.text = "-- min";
            etaValTmp.fontSize = 26;
            etaValTmp.fontStyle = FontStyles.Bold;
            etaValTmp.alignment = TextAlignmentOptions.BottomRight;
            
            var etaLabel = CreateText("ETALabel", etaContainer.transform);
            var etaLabRt = etaLabel.GetComponent<RectTransform>();
            etaLabRt.anchorMin = new Vector2(0, 0);
            etaLabRt.anchorMax = new Vector2(1, 0.5f);
            etaLabRt.offsetMin = Vector2.zero;
            etaLabRt.offsetMax = Vector2.zero;
            
            var etaLabTmp = etaLabel.GetComponent<TextMeshProUGUI>();
            etaLabTmp.text = "Estimated Time";
            etaLabTmp.fontSize = 12;
            etaLabTmp.alignment = TextAlignmentOptions.TopRight;
            etaLabTmp.color = TextMuted;
            
            return container;
        }
        #endregion
        
        #region Calibration Toast
        private static GameObject CreateCalibrationToast(RectTransform parent)
        {
            var container = CreatePanel("CalibrationToast", parent);
            var rt = container.GetComponent<RectTransform>();
            
            // Center screen
            rt.anchorMin = new Vector2(0.5f, 0.5f);
            rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(280, 60);
            
            AddGlassmorphism(container);
            
            var text = CreateText("ToastText", container.transform);
            var textRt = text.GetComponent<RectTransform>();
            textRt.anchorMin = Vector2.zero;
            textRt.anchorMax = Vector2.one;
            textRt.sizeDelta = Vector2.zero;
            
            var tmp = text.GetComponent<TextMeshProUGUI>();
            tmp.text = "🧭 Calibrating compass...";
            tmp.fontSize = 16;
            tmp.alignment = TextAlignmentOptions.Midline;
            
            container.SetActive(false); // Hidden by default
            return container;
        }
        #endregion
        
        #region Arrival Overlay
        private static GameObject CreateArrivalOverlay(RectTransform parent)
        {
            var container = CreatePanel("ArrivalOverlay", parent);
            var rt = container.GetComponent<RectTransform>();
            
            // Full screen overlay
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.sizeDelta = Vector2.zero;
            
            var img = container.GetComponent<Image>();
            img.color = new Color32(0x0A, 0x10, 0x15, 0xE6);
            
            // Content box
            var contentBox = CreatePanel("ContentBox", container.transform);
            var cbRt = contentBox.GetComponent<RectTransform>();
            cbRt.anchorMin = new Vector2(0.5f, 0.5f);
            cbRt.anchorMax = new Vector2(0.5f, 0.5f);
            cbRt.sizeDelta = new Vector2(300, 250);
            
            AddGlassmorphism(contentBox);
            
            // Checkmark
            var checkmark = CreateText("Checkmark", contentBox.transform);
            var chkRt = checkmark.GetComponent<RectTransform>();
            chkRt.anchorMin = new Vector2(0.5f, 0.75f);
            chkRt.anchorMax = new Vector2(0.5f, 0.75f);
            chkRt.sizeDelta = new Vector2(100, 80);
            
            var chkTmp = checkmark.GetComponent<TextMeshProUGUI>();
            chkTmp.text = "✓";
            chkTmp.fontSize = 64;
            chkTmp.alignment = TextAlignmentOptions.Midline;
            chkTmp.color = AlignedColor;
            
            // Title
            var title = CreateText("ArrivalTitle", contentBox.transform);
            var titleRt = title.GetComponent<RectTransform>();
            titleRt.anchorMin = new Vector2(0.5f, 0.45f);
            titleRt.anchorMax = new Vector2(0.5f, 0.45f);
            titleRt.sizeDelta = new Vector2(280, 40);
            
            var titleTmp = title.GetComponent<TextMeshProUGUI>();
            titleTmp.text = "You've Arrived!";
            titleTmp.fontSize = 28;
            titleTmp.fontStyle = FontStyles.Bold;
            titleTmp.alignment = TextAlignmentOptions.Midline;
            
            // Destination name
            var destName = CreateText("DestinationName", contentBox.transform);
            var destRt = destName.GetComponent<RectTransform>();
            destRt.anchorMin = new Vector2(0.5f, 0.25f);
            destRt.anchorMax = new Vector2(0.5f, 0.25f);
            destRt.sizeDelta = new Vector2(280, 30);
            
            var destTmp = destName.GetComponent<TextMeshProUGUI>();
            destTmp.text = "Main Building";
            destTmp.fontSize = 18;
            destTmp.alignment = TextAlignmentOptions.Midline;
            destTmp.color = TextMuted;
            
            container.SetActive(false); // Hidden by default
            return container;
        }
        #endregion
        
        #region Helper Methods
        private static GameObject CreatePanel(string name, Transform parent)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<RectTransform>();
            go.AddComponent<CanvasRenderer>();
            go.AddComponent<Image>();
            return go;
        }
        
        private static GameObject CreateText(string name, Transform parent)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<RectTransform>();
            go.AddComponent<CanvasRenderer>();
            go.AddComponent<TextMeshProUGUI>();
            return go;
        }
        
        private static void AddGlassmorphism(GameObject panel)
        {
            var img = panel.GetComponent<Image>();
            if (img != null)
            {
                img.color = GlassBg;
                img.raycastTarget = true;
            }
            
            AddRoundedCorners(panel, 16);
        }
        
        private static void AddRoundedCorners(GameObject panel, float radius)
        {
            // Note: Unity's default Image doesn't support rounded corners natively.
            // For production, use a 9-sliced sprite with rounded corners,
            // or a custom shader. For now, we'll use the basic Image.
            // The visual appearance can be enhanced with a proper sprite.
        }
        #endregion
    }
}
