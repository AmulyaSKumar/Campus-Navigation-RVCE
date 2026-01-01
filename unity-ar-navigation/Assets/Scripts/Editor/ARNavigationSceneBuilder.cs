using UnityEngine;
using UnityEngine.UI;
using UnityEditor;
using TMPro;
using System.IO;

namespace CampusNavigator.AR.Editor
{
    /// <summary>
    /// Automatically builds the complete AR Navigation scene with all UI elements.
    /// Run from Unity menu: Tools → Campus Navigator → Build AR Scene
    /// </summary>
    public class ARNavigationSceneBuilder : EditorWindow
    {
        private static Color primaryColor = new Color(0.376f, 0.784f, 0.91f, 1f);      // #60C8E8
        private static Color alignedColor = new Color(0.43f, 0.91f, 0.63f, 1f);        // #6EE7A0
        private static Color offRouteColor = new Color(0.96f, 0.82f, 0.38f, 1f);       // #F5D060
        private static Color wrongColor = new Color(0.96f, 0.56f, 0.56f, 1f);          // #F59090
        private static Color panelBackground = new Color(0f, 0f, 0f, 0.55f);
        private static Color borderColor = new Color(1f, 1f, 1f, 0.12f);

        [MenuItem("Tools/Campus Navigator/Build Complete AR Scene", false, 1)]
        public static void BuildCompleteScene()
        {
            if (!EditorUtility.DisplayDialog("Build AR Navigation Scene",
                "This will create all GameObjects and UI elements for AR Navigation.\n\n" +
                "Make sure you have:\n" +
                "• TextMeshPro imported\n" +
                "• An empty or new scene open\n\n" +
                "Continue?", "Build Scene", "Cancel"))
            {
                return;
            }

            try
            {
                // Create main camera
                CreateMainCamera();

                // Create managers
                CreateManagers();

                // Create UI Canvas
                GameObject canvas = CreateMainCanvas();

                // Create all UI elements
                CreateCameraBackground(canvas);
                CreateStatusBar(canvas);
                CreateDirectionOverlay(canvas);
                CreateOnTrackIndicator(canvas);
                CreateCenterReticle(canvas);
                CreateCompassButton(canvas);
                CreateBottomInfoBar(canvas);
                CreateCalibrationToast(canvas);
                CreateArrivalOverlay(canvas);

                // Create AR Path Renderer
                CreateARPathRenderer(canvas);

                // Wire up references
                WireUpReferences();

                // Save scene
                UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
                    UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene());

                EditorUtility.DisplayDialog("Success!", 
                    "AR Navigation scene built successfully!\n\n" +
                    "Next steps:\n" +
                    "1. Save the scene (Ctrl+S)\n" +
                    "2. File → Build Settings → Add Open Scenes\n" +
                    "3. Switch to WebGL platform\n" +
                    "4. Build and deploy to HTTPS server", "OK");

                Debug.Log("AR Navigation scene built successfully!");
            }
            catch (System.Exception e)
            {
                EditorUtility.DisplayDialog("Error", 
                    $"Failed to build scene: {e.Message}\n\nMake sure TextMeshPro is imported.", "OK");
                Debug.LogError($"Scene build failed: {e}");
            }
        }

        [MenuItem("Tools/Campus Navigator/Import Required Packages", false, 0)]
        public static void ImportRequiredPackages()
        {
            EditorUtility.DisplayDialog("Import Packages",
                "Please import these packages manually:\n\n" +
                "1. Window → TextMeshPro → Import TMP Essential Resources\n" +
                "2. Window → Package Manager → Input System (if not installed)\n\n" +
                "After importing, run 'Build Complete AR Scene'", "OK");
        }

        private static void CreateMainCamera()
        {
            // Remove default camera if exists
            Camera existingCam = Camera.main;
            if (existingCam != null)
            {
                DestroyImmediate(existingCam.gameObject);
            }

            GameObject camObj = new GameObject("Main Camera");
            camObj.tag = "MainCamera";
            Camera cam = camObj.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.1f, 0.12f, 0.14f, 1f);
            cam.depth = -1;
            camObj.AddComponent<AudioListener>();
            camObj.transform.position = new Vector3(0, 1, -10);
        }

        private static void CreateManagers()
        {
            // ARNavigationManager
            GameObject navManager = new GameObject("ARNavigationManager");
            navManager.AddComponent<ARNavigationManager>();

            // WebGLPlatformBridge
            GameObject bridge = new GameObject("WebGLPlatformBridge");
            bridge.AddComponent<WebGLPlatformBridge>();

            // WebGLCameraManager
            GameObject camManager = new GameObject("WebGLCameraManager");
            camManager.AddComponent<WebGLCameraManager>();

            // LocationManager
            GameObject locManager = new GameObject("LocationManager");
            locManager.AddComponent<LocationManager>();
        }

        private static GameObject CreateMainCanvas()
        {
            GameObject canvasObj = new GameObject("ARCanvas");
            Canvas canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 0;

            CanvasScaler scaler = canvasObj.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;

            canvasObj.AddComponent<GraphicRaycaster>();

            // Add ARNavigationUI
            canvasObj.AddComponent<ARNavigationUI>();

            // Create EventSystem if not exists
            if (FindFirstObjectByType<UnityEngine.EventSystems.EventSystem>() == null)
            {
                GameObject eventSystem = new GameObject("EventSystem");
                eventSystem.AddComponent<UnityEngine.EventSystems.EventSystem>();
                eventSystem.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
            }

            return canvasObj;
        }

        private static void CreateCameraBackground(GameObject canvas)
        {
            GameObject bgObj = CreateUIElement("CameraBackground", canvas.transform);
            RectTransform rt = bgObj.GetComponent<RectTransform>();
            SetFullStretch(rt);

            RawImage rawImage = bgObj.AddComponent<RawImage>();
            rawImage.color = new Color(0.1f, 0.12f, 0.14f, 1f);

            // Move to back
            bgObj.transform.SetAsFirstSibling();
        }

        private static void CreateStatusBar(GameObject canvas)
        {
            // Status Bar Container
            GameObject statusBar = CreatePanel("StatusBar", canvas.transform, 
                new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0, -20),
                new Vector2(300, 44), panelBackground);

            AddRoundedCorners(statusBar, 22f);

            // Horizontal Layout
            HorizontalLayoutGroup hlg = statusBar.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(16, 16, 8, 8);
            hlg.spacing = 10;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = false;
            hlg.childControlHeight = false;
            hlg.childForceExpandWidth = false;

            // Status Dot
            GameObject dotObj = CreateUIElement("StatusDot", statusBar.transform);
            RectTransform dotRt = dotObj.GetComponent<RectTransform>();
            dotRt.sizeDelta = new Vector2(12, 12);
            Image dotImg = dotObj.AddComponent<Image>();
            dotImg.color = alignedColor;
            // Make it circular
            dotImg.type = Image.Type.Simple;

            // Status Text
            GameObject textObj = CreateUIElement("StatusText", statusBar.transform);
            RectTransform textRt = textObj.GetComponent<RectTransform>();
            textRt.sizeDelta = new Vector2(200, 28);
            TextMeshProUGUI statusText = textObj.AddComponent<TextMeshProUGUI>();
            statusText.text = "Tracking";
            statusText.fontSize = 16;
            statusText.color = Color.white;
            statusText.alignment = TextAlignmentOptions.Left;

            // Close Button
            GameObject closeBtn = CreateUIElement("CloseButton", statusBar.transform);
            RectTransform closeRt = closeBtn.GetComponent<RectTransform>();
            closeRt.sizeDelta = new Vector2(28, 28);
            Image closeImg = closeBtn.AddComponent<Image>();
            closeImg.color = new Color(1f, 1f, 1f, 0.3f);
            Button btn = closeBtn.AddComponent<Button>();
            
            GameObject closeText = CreateUIElement("Text", closeBtn.transform);
            TextMeshProUGUI closeTmp = closeText.AddComponent<TextMeshProUGUI>();
            closeTmp.text = "✕";
            closeTmp.fontSize = 18;
            closeTmp.color = Color.white;
            closeTmp.alignment = TextAlignmentOptions.Center;
            SetFullStretch(closeText.GetComponent<RectTransform>());
        }

        private static void CreateDirectionOverlay(GameObject canvas)
        {
            // Direction Overlay Container (hidden when on track)
            GameObject dirOverlay = CreatePanel("DirectionOverlay", canvas.transform,
                new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0, -90),
                new Vector2(200, 120), panelBackground);

            AddRoundedCorners(dirOverlay, 16f);
            dirOverlay.AddComponent<CanvasGroup>();

            VerticalLayoutGroup vlg = dirOverlay.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(20, 20, 15, 15);
            vlg.spacing = 5;
            vlg.childAlignment = TextAnchor.MiddleCenter;
            vlg.childControlWidth = true;
            vlg.childControlHeight = false;

            // Direction Arrow (large emoji/symbol)
            GameObject arrowObj = CreateUIElement("DirectionArrow", dirOverlay.transform);
            RectTransform arrowRt = arrowObj.GetComponent<RectTransform>();
            arrowRt.sizeDelta = new Vector2(160, 50);
            TextMeshProUGUI arrowText = arrowObj.AddComponent<TextMeshProUGUI>();
            arrowText.text = "↑";
            arrowText.fontSize = 48;
            arrowText.color = primaryColor;
            arrowText.alignment = TextAlignmentOptions.Center;

            // Direction Text
            GameObject textObj = CreateUIElement("DirectionText", dirOverlay.transform);
            RectTransform textRt = textObj.GetComponent<RectTransform>();
            textRt.sizeDelta = new Vector2(160, 30);
            TextMeshProUGUI dirText = textObj.AddComponent<TextMeshProUGUI>();
            dirText.text = "Head straight";
            dirText.fontSize = 16;
            dirText.color = new Color(1f, 1f, 1f, 0.8f);
            dirText.alignment = TextAlignmentOptions.Center;
        }

        private static void CreateOnTrackIndicator(GameObject canvas)
        {
            // On Track Indicator (shown when aligned, replaces direction overlay)
            GameObject onTrack = CreatePanel("OnTrackIndicator", canvas.transform,
                new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0, -90),
                new Vector2(140, 44), new Color(0f, 0f, 0f, 0.4f));

            AddRoundedCorners(onTrack, 22f);
            onTrack.SetActive(false); // Hidden by default

            HorizontalLayoutGroup hlg = onTrack.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(16, 16, 8, 8);
            hlg.spacing = 8;
            hlg.childAlignment = TextAnchor.MiddleCenter;
            hlg.childControlWidth = false;
            hlg.childControlHeight = false;

            // Checkmark
            GameObject checkObj = CreateUIElement("Checkmark", onTrack.transform);
            RectTransform checkRt = checkObj.GetComponent<RectTransform>();
            checkRt.sizeDelta = new Vector2(24, 28);
            TextMeshProUGUI checkText = checkObj.AddComponent<TextMeshProUGUI>();
            checkText.text = "✓";
            checkText.fontSize = 20;
            checkText.color = alignedColor;
            checkText.alignment = TextAlignmentOptions.Center;

            // Text
            GameObject textObj = CreateUIElement("OnTrackText", onTrack.transform);
            RectTransform textRt = textObj.GetComponent<RectTransform>();
            textRt.sizeDelta = new Vector2(70, 28);
            TextMeshProUGUI onTrackText = textObj.AddComponent<TextMeshProUGUI>();
            onTrackText.text = "On Track";
            onTrackText.fontSize = 14;
            onTrackText.color = alignedColor;
            onTrackText.alignment = TextAlignmentOptions.Left;
        }

        private static void CreateCenterReticle(GameObject canvas)
        {
            GameObject reticle = CreateUIElement("CenterReticle", canvas.transform);
            RectTransform rt = reticle.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.5f, 0.5f);
            rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = Vector2.zero;
            rt.sizeDelta = new Vector2(24, 24);

            Image img = reticle.AddComponent<Image>();
            img.color = new Color(1f, 1f, 1f, 0.4f);
            // Create circular sprite programmatically or use default
            
            // Add outline effect
            Outline outline = reticle.AddComponent<Outline>();
            outline.effectColor = new Color(0f, 0f, 0f, 0.3f);
            outline.effectDistance = new Vector2(1, -1);
        }

        private static void CreateCompassButton(GameObject canvas)
        {
            GameObject compass = CreatePanel("CompassButton", canvas.transform,
                new Vector2(1f, 0.5f), new Vector2(1f, 0.5f), new Vector2(-30, 0),
                new Vector2(56, 56), panelBackground);

            AddRoundedCorners(compass, 28f);
            compass.AddComponent<Button>();

            // Compass Needle
            GameObject needleObj = CreateUIElement("CompassNeedle", compass.transform);
            SetFullStretch(needleObj.GetComponent<RectTransform>());
            TextMeshProUGUI needleText = needleObj.AddComponent<TextMeshProUGUI>();
            needleText.text = "⬆";
            needleText.fontSize = 28;
            needleText.color = primaryColor;
            needleText.alignment = TextAlignmentOptions.Center;
        }

        private static void CreateBottomInfoBar(GameObject canvas)
        {
            // Bottom Info Bar
            GameObject bottomBar = CreatePanel("BottomInfoBar", canvas.transform,
                new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0, 40),
                new Vector2(340, 100), panelBackground);

            AddRoundedCorners(bottomBar, 20f);

            // Main horizontal layout
            HorizontalLayoutGroup mainHlg = bottomBar.AddComponent<HorizontalLayoutGroup>();
            mainHlg.padding = new RectOffset(16, 16, 12, 12);
            mainHlg.spacing = 12;
            mainHlg.childAlignment = TextAnchor.MiddleLeft;
            mainHlg.childControlWidth = false;
            mainHlg.childControlHeight = true;

            // Destination Image
            GameObject imgObj = CreateUIElement("DestinationImage", bottomBar.transform);
            RectTransform imgRt = imgObj.GetComponent<RectTransform>();
            imgRt.sizeDelta = new Vector2(72, 72);
            Image destImg = imgObj.AddComponent<Image>();
            destImg.color = new Color(0.3f, 0.3f, 0.3f, 1f);

            // Info Container
            GameObject infoContainer = CreateUIElement("InfoContainer", bottomBar.transform);
            RectTransform infoRt = infoContainer.GetComponent<RectTransform>();
            infoRt.sizeDelta = new Vector2(220, 76);

            VerticalLayoutGroup infoVlg = infoContainer.AddComponent<VerticalLayoutGroup>();
            infoVlg.spacing = 4;
            infoVlg.childAlignment = TextAnchor.UpperLeft;
            infoVlg.childControlWidth = true;
            infoVlg.childControlHeight = false;

            // Destination Name
            GameObject nameObj = CreateUIElement("DestinationName", infoContainer.transform);
            RectTransform nameRt = nameObj.GetComponent<RectTransform>();
            nameRt.sizeDelta = new Vector2(220, 24);
            TextMeshProUGUI nameText = nameObj.AddComponent<TextMeshProUGUI>();
            nameText.text = "Main Building";
            nameText.fontSize = 18;
            nameText.fontStyle = FontStyles.Bold;
            nameText.color = Color.white;

            // Distance Row
            GameObject distRow = CreateUIElement("DistanceRow", infoContainer.transform);
            RectTransform distRowRt = distRow.GetComponent<RectTransform>();
            distRowRt.sizeDelta = new Vector2(220, 22);
            
            HorizontalLayoutGroup distHlg = distRow.AddComponent<HorizontalLayoutGroup>();
            distHlg.spacing = 8;
            distHlg.childControlWidth = false;
            distHlg.childControlHeight = true;

            // Distance Text
            GameObject distObj = CreateUIElement("DistanceText", distRow.transform);
            RectTransform distRt = distObj.GetComponent<RectTransform>();
            distRt.sizeDelta = new Vector2(80, 22);
            TextMeshProUGUI distText = distObj.AddComponent<TextMeshProUGUI>();
            distText.text = "250m";
            distText.fontSize = 16;
            distText.color = primaryColor;

            // ETA Text
            GameObject etaObj = CreateUIElement("ETAText", distRow.transform);
            RectTransform etaRt = etaObj.GetComponent<RectTransform>();
            etaRt.sizeDelta = new Vector2(80, 22);
            TextMeshProUGUI etaText = etaObj.AddComponent<TextMeshProUGUI>();
            etaText.text = "~3 min";
            etaText.fontSize = 14;
            etaText.color = new Color(1f, 1f, 1f, 0.6f);

            // GPS Accuracy Row
            GameObject gpsRow = CreateUIElement("GPSRow", infoContainer.transform);
            RectTransform gpsRowRt = gpsRow.GetComponent<RectTransform>();
            gpsRowRt.sizeDelta = new Vector2(220, 18);
            TextMeshProUGUI gpsText = gpsRow.AddComponent<TextMeshProUGUI>();
            gpsText.text = "GPS: ±5m";
            gpsText.fontSize = 12;
            gpsText.color = new Color(1f, 1f, 1f, 0.4f);
        }

        private static void CreateCalibrationToast(GameObject canvas)
        {
            GameObject toast = CreatePanel("CalibrationToast", canvas.transform,
                new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(0, 100),
                new Vector2(280, 50), new Color(0f, 0f, 0f, 0.7f));

            AddRoundedCorners(toast, 25f);
            toast.SetActive(false);

            // Toast Text
            GameObject textObj = CreateUIElement("ToastText", toast.transform);
            SetFullStretch(textObj.GetComponent<RectTransform>());
            TextMeshProUGUI toastText = textObj.AddComponent<TextMeshProUGUI>();
            toastText.text = "🧭 Compass calibrated";
            toastText.fontSize = 16;
            toastText.color = Color.white;
            toastText.alignment = TextAlignmentOptions.Center;
        }

        private static void CreateArrivalOverlay(GameObject canvas)
        {
            // Full screen overlay
            GameObject overlay = CreateUIElement("ArrivalOverlay", canvas.transform);
            RectTransform overlayRt = overlay.GetComponent<RectTransform>();
            SetFullStretch(overlayRt);
            Image overlayBg = overlay.AddComponent<Image>();
            overlayBg.color = new Color(0f, 0f, 0f, 0.85f);
            overlay.SetActive(false);

            // Content Container
            GameObject content = CreateUIElement("Content", overlay.transform);
            RectTransform contentRt = content.GetComponent<RectTransform>();
            contentRt.anchorMin = new Vector2(0.5f, 0.5f);
            contentRt.anchorMax = new Vector2(0.5f, 0.5f);
            contentRt.sizeDelta = new Vector2(320, 400);

            VerticalLayoutGroup vlg = content.AddComponent<VerticalLayoutGroup>();
            vlg.spacing = 20;
            vlg.childAlignment = TextAnchor.MiddleCenter;
            vlg.childControlWidth = true;
            vlg.childControlHeight = false;

            // Checkmark
            GameObject checkObj = CreateUIElement("ArrivalCheckmark", content.transform);
            RectTransform checkRt = checkObj.GetComponent<RectTransform>();
            checkRt.sizeDelta = new Vector2(80, 80);
            TextMeshProUGUI checkText = checkObj.AddComponent<TextMeshProUGUI>();
            checkText.text = "✓";
            checkText.fontSize = 64;
            checkText.color = alignedColor;
            checkText.alignment = TextAlignmentOptions.Center;

            // Title
            GameObject titleObj = CreateUIElement("ArrivalTitle", content.transform);
            RectTransform titleRt = titleObj.GetComponent<RectTransform>();
            titleRt.sizeDelta = new Vector2(300, 40);
            TextMeshProUGUI titleText = titleObj.AddComponent<TextMeshProUGUI>();
            titleText.text = "You've Arrived!";
            titleText.fontSize = 28;
            titleText.fontStyle = FontStyles.Bold;
            titleText.color = Color.white;
            titleText.alignment = TextAlignmentOptions.Center;

            // Destination Name
            GameObject destObj = CreateUIElement("ArrivalDestinationName", content.transform);
            RectTransform destRt = destObj.GetComponent<RectTransform>();
            destRt.sizeDelta = new Vector2(300, 30);
            TextMeshProUGUI destText = destObj.AddComponent<TextMeshProUGUI>();
            destText.text = "Main Building";
            destText.fontSize = 20;
            destText.color = new Color(1f, 1f, 1f, 0.7f);
            destText.alignment = TextAlignmentOptions.Center;

            // Image placeholder
            GameObject imgObj = CreateUIElement("ArrivalImage", content.transform);
            RectTransform imgRt = imgObj.GetComponent<RectTransform>();
            imgRt.sizeDelta = new Vector2(280, 160);
            Image arrImg = imgObj.AddComponent<Image>();
            arrImg.color = new Color(0.2f, 0.2f, 0.2f, 1f);

            // End Navigation Button
            GameObject btnObj = CreateUIElement("EndNavigationButton", content.transform);
            RectTransform btnRt = btnObj.GetComponent<RectTransform>();
            btnRt.sizeDelta = new Vector2(200, 50);
            Image btnBg = btnObj.AddComponent<Image>();
            btnBg.color = primaryColor;
            Button endBtn = btnObj.AddComponent<Button>();

            GameObject btnTextObj = CreateUIElement("ButtonText", btnObj.transform);
            SetFullStretch(btnTextObj.GetComponent<RectTransform>());
            TextMeshProUGUI btnText = btnTextObj.AddComponent<TextMeshProUGUI>();
            btnText.text = "End Navigation";
            btnText.fontSize = 18;
            btnText.color = Color.white;
            btnText.alignment = TextAlignmentOptions.Center;
        }

        private static void CreateARPathRenderer(GameObject canvas)
        {
            GameObject pathRenderer = CreateUIElement("ARPathRenderer", canvas.transform);
            RectTransform rt = pathRenderer.GetComponent<RectTransform>();
            SetFullStretch(rt);

            // Add the path renderer component
            pathRenderer.AddComponent<ARPathRenderer>();

            // Create arrow prefab template (hidden)
            GameObject arrowTemplate = CreateUIElement("ArrowTemplate", pathRenderer.transform);
            RectTransform arrowRt = arrowTemplate.GetComponent<RectTransform>();
            arrowRt.sizeDelta = new Vector2(60, 60);
            TextMeshProUGUI arrowText = arrowTemplate.AddComponent<TextMeshProUGUI>();
            arrowText.text = "▲";
            arrowText.fontSize = 48;
            arrowText.color = primaryColor;
            arrowText.alignment = TextAlignmentOptions.Center;
            arrowTemplate.SetActive(false);
        }

        private static void WireUpReferences()
        {
            // Find all components
            ARNavigationUI navUI = FindFirstObjectByType<ARNavigationUI>();
            ARNavigationManager navManager = FindFirstObjectByType<ARNavigationManager>();
            ARPathRenderer pathRenderer = FindFirstObjectByType<ARPathRenderer>();
            WebGLCameraManager camManager = FindFirstObjectByType<WebGLCameraManager>();

            if (navUI != null)
            {
                // Use SerializedObject to set references
                SerializedObject so = new SerializedObject(navUI);

                // Status Bar
                SetSerializedReference(so, "statusBar", "StatusBar");
                SetSerializedReference(so, "statusDot", "StatusDot", typeof(Image));
                SetSerializedReference(so, "statusText", "StatusText", typeof(TextMeshProUGUI));
                SetSerializedReference(so, "closeButton", "CloseButton", typeof(Button));

                // Direction Overlay
                SetSerializedReference(so, "directionOverlay", "DirectionOverlay");
                SetSerializedReference(so, "directionArrow", "DirectionArrow", typeof(TextMeshProUGUI));
                SetSerializedReference(so, "directionText", "DirectionText", typeof(TextMeshProUGUI));
                SetSerializedReference(so, "directionCanvasGroup", "DirectionOverlay", typeof(CanvasGroup));

                // On Track
                SetSerializedReference(so, "onTrackIndicator", "OnTrackIndicator");
                SetSerializedReference(so, "onTrackText", "OnTrackText", typeof(TextMeshProUGUI));

                // Reticle
                SetSerializedReference(so, "centerReticle", "CenterReticle");
                SetSerializedReference(so, "reticleImage", "CenterReticle", typeof(Image));

                // Compass
                SetSerializedReference(so, "compassButton", "CompassButton", typeof(Button));
                SetSerializedReference(so, "compassNeedle", "CompassNeedle", typeof(TextMeshProUGUI));

                // Bottom Bar
                SetSerializedReference(so, "bottomInfoBar", "BottomInfoBar");
                SetSerializedReference(so, "destinationImage", "DestinationImage", typeof(Image));
                SetSerializedReference(so, "destinationName", "DestinationName", typeof(TextMeshProUGUI));
                SetSerializedReference(so, "distanceText", "DistanceText", typeof(TextMeshProUGUI));
                SetSerializedReference(so, "etaText", "ETAText", typeof(TextMeshProUGUI));
                SetSerializedReference(so, "gpsAccuracyText", "GPSRow", typeof(TextMeshProUGUI));

                // Calibration Toast
                SetSerializedReference(so, "calibrationToast", "CalibrationToast");

                // Arrival Overlay
                SetSerializedReference(so, "arrivalOverlay", "ArrivalOverlay");
                SetSerializedReference(so, "arrivalDestinationName", "ArrivalDestinationName", typeof(TextMeshProUGUI));
                SetSerializedReference(so, "arrivalImage", "ArrivalImage", typeof(Image));
                SetSerializedReference(so, "endNavigationButton", "EndNavigationButton", typeof(Button));

                so.ApplyModifiedProperties();
            }

            // Wire camera background
            if (camManager != null)
            {
                SerializedObject camSo = new SerializedObject(camManager);
                SetSerializedReference(camSo, "cameraDisplay", "CameraBackground", typeof(RawImage));
                camSo.ApplyModifiedProperties();
            }

            // Wire path renderer
            if (pathRenderer != null && navManager != null)
            {
                SerializedObject pathSo = new SerializedObject(pathRenderer);
                
                // Set navigation manager reference
                SerializedProperty navProp = pathSo.FindProperty("navigationManager");
                if (navProp != null)
                {
                    navProp.objectReferenceValue = navManager;
                }

                // Set canvas rect
                GameObject arCanvas = GameObject.Find("ARCanvas");
                if (arCanvas != null)
                {
                    SerializedProperty canvasProp = pathSo.FindProperty("canvasRect");
                    if (canvasProp != null)
                    {
                        canvasProp.objectReferenceValue = arCanvas.GetComponent<RectTransform>();
                    }
                }

                // Set arrow prefab
                GameObject arrowTemplate = GameObject.Find("ArrowTemplate");
                if (arrowTemplate != null)
                {
                    SerializedProperty arrowProp = pathSo.FindProperty("arrowPrefab");
                    if (arrowProp != null)
                    {
                        arrowProp.objectReferenceValue = arrowTemplate;
                    }
                }

                pathSo.ApplyModifiedProperties();
            }

            // Wire nav manager to UI
            if (navManager != null && navUI != null)
            {
                SerializedObject navSo = new SerializedObject(navManager);
                SerializedProperty uiProp = navSo.FindProperty("navigationUI");
                if (uiProp != null)
                {
                    uiProp.objectReferenceValue = navUI;
                }
                navSo.ApplyModifiedProperties();
            }

            Debug.Log("References wired successfully!");
        }

        private static void SetSerializedReference(SerializedObject so, string propertyName, string objectName, System.Type componentType = null)
        {
            SerializedProperty prop = so.FindProperty(propertyName);
            if (prop == null) return;

            GameObject obj = GameObject.Find(objectName);
            if (obj == null) return;

            if (componentType != null)
            {
                prop.objectReferenceValue = obj.GetComponent(componentType);
            }
            else
            {
                prop.objectReferenceValue = obj;
            }
        }

        #region Helper Methods

        private static GameObject CreateUIElement(string name, Transform parent)
        {
            GameObject obj = new GameObject(name);
            obj.transform.SetParent(parent, false);
            obj.AddComponent<RectTransform>();
            return obj;
        }

        private static GameObject CreatePanel(string name, Transform parent, 
            Vector2 anchorMin, Vector2 anchorMax, Vector2 anchoredPos, Vector2 size, Color bgColor)
        {
            GameObject panel = CreateUIElement(name, parent);
            RectTransform rt = panel.GetComponent<RectTransform>();
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.anchoredPosition = anchoredPos;
            rt.sizeDelta = size;

            Image img = panel.AddComponent<Image>();
            img.color = bgColor;

            return panel;
        }

        private static void SetFullStretch(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        private static void AddRoundedCorners(GameObject obj, float radius)
        {
            // Note: Unity UI doesn't have built-in rounded corners
            // This is a placeholder - in real implementation you'd use:
            // 1. UI Soft Mask package
            // 2. Custom shader
            // 3. 9-sliced sprite with rounded corners
            
            // Add a tag so we know this needs rounded corners
            // The Glassmorphism shader handles this
        }

        #endregion
    }
}
