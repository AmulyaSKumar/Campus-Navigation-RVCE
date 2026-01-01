using UnityEngine;
using UnityEditor;
using UnityEngine.UI;
using TMPro;

namespace CampusNavigator.AR.Editor
{
    /// <summary>
    /// Builds the 3D Campus Map scene with viewer, controls, and camera
    /// Run from Unity menu: Tools → Campus Navigator → Build 3D Map Scene
    /// </summary>
    public class CampusMapSceneBuilder : EditorWindow
    {
        private static Color primaryColor = new Color(0.376f, 0.784f, 0.91f, 1f);
        private static Color panelBackground = new Color(0f, 0f, 0f, 0.7f);
        
        [MenuItem("Tools/Campus Navigator/Build 3D Map Scene", false, 2)]
        public static void BuildMapScene()
        {
            if (!EditorUtility.DisplayDialog("Build 3D Campus Map Scene",
                "This will create the 3D campus map viewer scene.\n\n" +
                "Before running:\n" +
                "1. Import your campus FBX file to Assets/Models/\n" +
                "2. Make sure TextMeshPro is imported\n\n" +
                "The scene will include:\n" +
                "• Orbit camera with touch/mouse controls\n" +
                "• User & destination markers\n" +
                "• Path visualization\n" +
                "• Zoom/pan controls\n\n" +
                "Continue?", "Build Scene", "Cancel"))
            {
                return;
            }
            
            try
            {
                // Create cameras
                CreateCameras();
                
                // Create lighting
                CreateLighting();
                
                // Create placeholder for campus model
                CreateCampusModelPlaceholder();
                
                // Create map viewer manager
                CreateMapViewer();
                
                // Create UI
                CreateMapUI();
                
                // Save scene
                UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
                    UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene());
                
                EditorUtility.DisplayDialog("Success!",
                    "3D Campus Map scene built!\n\n" +
                    "Next steps:\n" +
                    "1. Drag your FBX model into 'CampusModelContainer'\n" +
                    "2. Adjust origin GPS coordinates in CampusMapViewer\n" +
                    "3. Set the 'metersPerUnit' scale if needed\n" +
                    "4. Save the scene (Ctrl+S)", "OK");
                
                Debug.Log("3D Campus Map scene built successfully!");
            }
            catch (System.Exception e)
            {
                EditorUtility.DisplayDialog("Error",
                    $"Failed to build scene: {e.Message}", "OK");
                Debug.LogError($"Scene build failed: {e}");
            }
        }
        
        [MenuItem("Tools/Campus Navigator/Setup FBX Import Settings", false, 3)]
        public static void SetupFBXImportSettings()
        {
            EditorUtility.DisplayDialog("FBX Import Guide",
                "To import your campus FBX file:\n\n" +
                "1. Drag the FBX file into Assets/Models/ folder\n\n" +
                "2. Select the FBX in Project window\n\n" +
                "3. In Inspector, set these import settings:\n" +
                "   • Scale Factor: 1 (or adjust to match meters)\n" +
                "   • Mesh Compression: Medium\n" +
                "   • Read/Write: Enabled\n" +
                "   • Generate Colliders: Enabled\n\n" +
                "4. Click 'Apply'\n\n" +
                "5. Drag the imported model into the scene's\n" +
                "   'CampusModelContainer' GameObject", "OK");
        }
        
        private static void CreateCameras()
        {
            // Remove default camera
            Camera existingCam = Camera.main;
            if (existingCam != null)
            {
                DestroyImmediate(existingCam.gameObject);
            }
            
            // Create map camera
            GameObject camObj = new GameObject("MapCamera");
            camObj.tag = "MainCamera";
            Camera cam = camObj.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.Skybox;
            cam.backgroundColor = new Color(0.1f, 0.12f, 0.15f);
            cam.fieldOfView = 60f;
            cam.nearClipPlane = 0.1f;
            cam.farClipPlane = 1000f;
            camObj.AddComponent<AudioListener>();
            
            // Position camera for orbit view
            camObj.transform.position = new Vector3(0, 50, -50);
            camObj.transform.LookAt(Vector3.zero);
        }
        
        private static void CreateLighting()
        {
            // Directional light (sun)
            GameObject sunObj = new GameObject("Sun");
            Light sun = sunObj.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, 0.95f, 0.9f);
            sun.intensity = 1.2f;
            sun.shadows = LightShadows.Soft;
            sunObj.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            
            // Ambient light
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.5f, 0.6f, 0.7f);
            RenderSettings.ambientEquatorColor = new Color(0.4f, 0.45f, 0.5f);
            RenderSettings.ambientGroundColor = new Color(0.2f, 0.2f, 0.2f);
        }
        
        private static void CreateCampusModelPlaceholder()
        {
            // Container for campus model
            GameObject container = new GameObject("CampusModelContainer");
            container.transform.position = Vector3.zero;
            
            // Add helper component
            container.AddComponent<CampusModelHelper>();
            
            // Create placeholder ground plane
            GameObject ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "GroundPlaceholder";
            ground.transform.SetParent(container.transform);
            ground.transform.localScale = new Vector3(50, 1, 50);
            ground.transform.position = Vector3.zero;
            
            // Set material
            Renderer rend = ground.GetComponent<Renderer>();
            rend.material = new Material(Shader.Find("Standard"));
            rend.material.color = new Color(0.3f, 0.35f, 0.3f);
            
            // Add instruction text in scene view
            GameObject instructions = new GameObject("Instructions");
            instructions.transform.SetParent(container.transform);
            instructions.transform.position = new Vector3(0, 10, 0);
        }
        
        private static void CreateMapViewer()
        {
            GameObject viewerObj = new GameObject("CampusMapViewer");
            CampusMapViewer viewer = viewerObj.AddComponent<CampusMapViewer>();
            
            // Wire up references using SerializedObject
            SerializedObject so = new SerializedObject(viewer);
            
            // Find and set camera
            Camera mapCam = Camera.main;
            if (mapCam != null)
            {
                SerializedProperty camProp = so.FindProperty("mapCamera");
                if (camProp != null)
                    camProp.objectReferenceValue = mapCam;
            }
            
            // Find and set model container
            GameObject container = GameObject.Find("CampusModelContainer");
            if (container != null)
            {
                SerializedProperty containerProp = so.FindProperty("modelContainer");
                if (containerProp != null)
                    containerProp.objectReferenceValue = container.transform;
            }
            
            so.ApplyModifiedProperties();
        }
        
        private static void CreateMapUI()
        {
            // Create Canvas
            GameObject canvasObj = new GameObject("MapUICanvas");
            Canvas canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            
            CanvasScaler scaler = canvasObj.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.matchWidthOrHeight = 0.5f;
            
            canvasObj.AddComponent<GraphicRaycaster>();
            
            // Create zoom controls panel (bottom right)
            CreateZoomControls(canvasObj);
            
            // Create info panel (top)
            CreateInfoPanel(canvasObj);
            
            // Create navigation button (bottom)
            CreateNavigationButton(canvasObj);
            
            // Create compass (top right)
            CreateCompass(canvasObj);
            
            // Create EventSystem if needed
            if (FindObjectOfType<UnityEngine.EventSystems.EventSystem>() == null)
            {
                GameObject eventSystem = new GameObject("EventSystem");
                eventSystem.AddComponent<UnityEngine.EventSystems.EventSystem>();
                eventSystem.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
            }
        }
        
        private static void CreateZoomControls(GameObject canvas)
        {
            // Zoom panel
            GameObject panel = CreatePanel("ZoomControls", canvas.transform,
                new Vector2(1f, 0f), new Vector2(1f, 0f), new Vector2(-30, 150),
                new Vector2(60, 180));
            
            VerticalLayoutGroup vlg = panel.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(8, 8, 8, 8);
            vlg.spacing = 8;
            vlg.childAlignment = TextAnchor.MiddleCenter;
            vlg.childControlWidth = true;
            vlg.childControlHeight = false;
            
            // Zoom In button
            CreateButton("ZoomInBtn", panel.transform, "+", 44);
            
            // Reset button
            CreateButton("ResetViewBtn", panel.transform, "⌂", 44);
            
            // Zoom Out button
            CreateButton("ZoomOutBtn", panel.transform, "−", 44);
        }
        
        private static void CreateInfoPanel(GameObject canvas)
        {
            // Top info bar
            GameObject panel = CreatePanel("InfoPanel", canvas.transform,
                new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0, -60),
                new Vector2(350, 80));
            
            VerticalLayoutGroup vlg = panel.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(20, 20, 12, 12);
            vlg.spacing = 4;
            vlg.childAlignment = TextAnchor.MiddleCenter;
            vlg.childControlWidth = true;
            vlg.childControlHeight = false;
            
            // Title
            GameObject titleObj = CreateUIElement("Title", panel.transform);
            RectTransform titleRt = titleObj.GetComponent<RectTransform>();
            titleRt.sizeDelta = new Vector2(310, 30);
            TextMeshProUGUI title = titleObj.AddComponent<TextMeshProUGUI>();
            title.text = "🏫 Campus 3D View";
            title.fontSize = 22;
            title.fontStyle = FontStyles.Bold;
            title.color = Color.white;
            title.alignment = TextAlignmentOptions.Center;
            
            // Subtitle
            GameObject subObj = CreateUIElement("Subtitle", panel.transform);
            RectTransform subRt = subObj.GetComponent<RectTransform>();
            subRt.sizeDelta = new Vector2(310, 24);
            TextMeshProUGUI sub = subObj.AddComponent<TextMeshProUGUI>();
            sub.text = "Drag to rotate • Pinch to zoom";
            sub.fontSize = 14;
            sub.color = new Color(1f, 1f, 1f, 0.6f);
            sub.alignment = TextAlignmentOptions.Center;
        }
        
        private static void CreateNavigationButton(GameObject canvas)
        {
            // Start AR Navigation button
            GameObject btnObj = CreatePanel("StartARButton", canvas.transform,
                new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0, 50),
                new Vector2(280, 56));
            
            Image img = btnObj.GetComponent<Image>();
            img.color = primaryColor;
            
            btnObj.AddComponent<Button>();
            
            // Button text
            GameObject textObj = CreateUIElement("Text", btnObj.transform);
            SetFullStretch(textObj.GetComponent<RectTransform>());
            TextMeshProUGUI text = textObj.AddComponent<TextMeshProUGUI>();
            text.text = "📍 Start AR Navigation";
            text.fontSize = 20;
            text.fontStyle = FontStyles.Bold;
            text.color = Color.white;
            text.alignment = TextAlignmentOptions.Center;
        }
        
        private static void CreateCompass(GameObject canvas)
        {
            GameObject compass = CreatePanel("Compass3D", canvas.transform,
                new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(-40, -60),
                new Vector2(60, 60));
            
            // Compass needle text
            GameObject needleObj = CreateUIElement("Needle", compass.transform);
            SetFullStretch(needleObj.GetComponent<RectTransform>());
            TextMeshProUGUI needle = needleObj.AddComponent<TextMeshProUGUI>();
            needle.text = "N";
            needle.fontSize = 24;
            needle.fontStyle = FontStyles.Bold;
            needle.color = new Color(1f, 0.3f, 0.3f);
            needle.alignment = TextAlignmentOptions.Center;
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
            Vector2 anchorMin, Vector2 anchorMax, Vector2 anchoredPos, Vector2 size)
        {
            GameObject panel = CreateUIElement(name, parent);
            RectTransform rt = panel.GetComponent<RectTransform>();
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.anchoredPosition = anchoredPos;
            rt.sizeDelta = size;
            
            Image img = panel.AddComponent<Image>();
            img.color = panelBackground;
            
            return panel;
        }
        
        private static void CreateButton(string name, Transform parent, string label, float size)
        {
            GameObject btnObj = CreateUIElement(name, parent);
            RectTransform rt = btnObj.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(size, size);
            
            Image img = btnObj.AddComponent<Image>();
            img.color = new Color(1f, 1f, 1f, 0.2f);
            
            btnObj.AddComponent<Button>();
            
            GameObject textObj = CreateUIElement("Text", btnObj.transform);
            SetFullStretch(textObj.GetComponent<RectTransform>());
            TextMeshProUGUI text = textObj.AddComponent<TextMeshProUGUI>();
            text.text = label;
            text.fontSize = 24;
            text.color = Color.white;
            text.alignment = TextAlignmentOptions.Center;
        }
        
        private static void SetFullStretch(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }
        
        #endregion
    }
    
    /// <summary>
    /// Helper component to guide FBX setup
    /// </summary>
    public class CampusModelHelper : MonoBehaviour
    {
        [Header("Instructions")]
        [TextArea(5, 10)]
        public string instructions = 
            "HOW TO ADD YOUR FBX MODEL:\n\n" +
            "1. Import your FBX file to Assets/Models/\n" +
            "2. Drag the imported model as a child of this GameObject\n" +
            "3. Delete the 'GroundPlaceholder' object\n" +
            "4. Adjust position/rotation so the model is centered\n" +
            "5. Update GPS origin coordinates in CampusMapViewer";
        
        [Header("Model Info")]
        public string modelName = "Not loaded";
        public Vector3 modelBounds = Vector3.zero;
        
        private void OnDrawGizmos()
        {
            // Draw origin marker
            Gizmos.color = Color.red;
            Gizmos.DrawLine(Vector3.zero, Vector3.right * 10);
            Gizmos.color = Color.green;
            Gizmos.DrawLine(Vector3.zero, Vector3.up * 10);
            Gizmos.color = Color.blue;
            Gizmos.DrawLine(Vector3.zero, Vector3.forward * 10);
            
            // Draw "N" for north
            Gizmos.color = Color.white;
            Gizmos.DrawWireSphere(Vector3.forward * 15, 2);
        }
    }
}
