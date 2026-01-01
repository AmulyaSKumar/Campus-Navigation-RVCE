using UnityEngine;
using UnityEngine.UI;
using TMPro;
using CampusNavigator.AR;

namespace CampusNavigator.AR
{
    /// <summary>
    /// Main entry point for AR Navigation.
    /// Sets up all required components and initializes the scene.
    /// Attach this to a GameObject in your scene.
    /// </summary>
    public class ARNavigationBootstrap : MonoBehaviour
    {
        [Header("Navigation Settings")]
        [SerializeField] private string destinationName = "Main Building";
        [SerializeField] private double destinationLatitude = 12.923383;
        [SerializeField] private double destinationLongitude = 77.501071;
        
        [Header("References (Auto-created if null)")]
        [SerializeField] private ARNavigationManager navigationManager;
        [SerializeField] private ARNavigationUI navigationUI;
        [SerializeField] private ARPathRenderer pathRenderer;
        [SerializeField] private WebGLCameraManager cameraManager;
        [SerializeField] private WebGLPlatformBridge platformBridge;
        
        [Header("UI Canvas (Auto-created if null)")]
        [SerializeField] private Canvas mainCanvas;
        
        private void Awake()
        {
            // Ensure required components exist
            EnsureComponentsExist();
            
            // Set up event connections
            ConnectEvents();
        }
        
        private void Start()
        {
            // Start navigation to destination
            if (navigationManager != null)
            {
                navigationManager.SetDestination(
                    destinationLatitude, 
                    destinationLongitude, 
                    destinationName
                );
            }
            
            Debug.Log($"AR Navigation initialized. Destination: {destinationName}");
        }
        
        private void EnsureComponentsExist()
        {
            // Platform Bridge
            if (platformBridge == null)
            {
                var bridgeObj = GameObject.Find("WebGLPlatformBridge");
                if (bridgeObj == null)
                {
                    bridgeObj = new GameObject("WebGLPlatformBridge");
                }
                platformBridge = bridgeObj.GetComponent<WebGLPlatformBridge>() 
                    ?? bridgeObj.AddComponent<WebGLPlatformBridge>();
            }
            
            // Navigation Manager
            if (navigationManager == null)
            {
                var navObj = GameObject.Find("ARNavigationManager");
                if (navObj == null)
                {
                    navObj = new GameObject("ARNavigationManager");
                }
                navigationManager = navObj.GetComponent<ARNavigationManager>() 
                    ?? navObj.AddComponent<ARNavigationManager>();
            }
            
            // Camera Manager
            if (cameraManager == null)
            {
                var camManagerObj = GameObject.Find("WebGLCameraManager");
                if (camManagerObj == null)
                {
                    camManagerObj = new GameObject("WebGLCameraManager");
                }
                cameraManager = camManagerObj.GetComponent<WebGLCameraManager>() 
                    ?? camManagerObj.AddComponent<WebGLCameraManager>();
            }
            
            // Main Canvas
            if (mainCanvas == null)
            {
                var canvasObj = GameObject.Find("ARCanvas");
                if (canvasObj == null)
                {
                    canvasObj = new GameObject("ARCanvas");
                    mainCanvas = canvasObj.AddComponent<Canvas>();
                    mainCanvas.renderMode = RenderMode.ScreenSpaceOverlay;
                    canvasObj.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                    canvasObj.GetComponent<CanvasScaler>().referenceResolution = new Vector2(1080, 1920);
                    canvasObj.AddComponent<GraphicRaycaster>();
                }
                else
                {
                    mainCanvas = canvasObj.GetComponent<Canvas>();
                }
            }
            
            // Navigation UI
            if (navigationUI == null)
            {
                navigationUI = mainCanvas.GetComponent<ARNavigationUI>() 
                    ?? mainCanvas.gameObject.AddComponent<ARNavigationUI>();
            }
            
            // Path Renderer
            if (pathRenderer == null)
            {
                var pathObj = GameObject.Find("ARPathRenderer");
                if (pathObj == null)
                {
                    pathObj = new GameObject("ARPathRenderer");
                    pathObj.transform.SetParent(mainCanvas.transform, false);
                    var rt = pathObj.AddComponent<RectTransform>();
                    rt.anchorMin = Vector2.zero;
                    rt.anchorMax = Vector2.one;
                    rt.offsetMin = Vector2.zero;
                    rt.offsetMax = Vector2.zero;
                }
                pathRenderer = pathObj.GetComponent<ARPathRenderer>() 
                    ?? pathObj.AddComponent<ARPathRenderer>();
            }
        }
        
        private void ConnectEvents()
        {
            if (navigationManager != null && navigationUI != null)
            {
                // Connect navigation events to UI
                navigationManager.OnNavigationStateChanged += state => 
                {
                    navigationUI.UpdateNavigationState(state);
                };
                
                navigationManager.OnArrived += () =>
                {
                    navigationUI.ShowArrivalOverlay();
                };
            }
            
            // Note: ARPathRenderer already subscribes to OnNavigationStateChanged in its own Start()
            // No additional wiring needed here
        }
        
        /// <summary>
        /// Set a new navigation destination at runtime
        /// </summary>
        public void SetDestination(double latitude, double longitude, string name)
        {
            destinationName = name;
            destinationLatitude = latitude;
            destinationLongitude = longitude;
            
            if (navigationManager != null)
            {
                navigationManager.SetDestination(latitude, longitude, name);
            }
            
            if (navigationUI != null)
            {
                navigationUI.HideArrivalOverlay();
            }
        }
        
        /// <summary>
        /// Recalibrate compass
        /// </summary>
        public void RecalibrateCompass()
        {
            if (navigationManager != null)
            {
                navigationManager.RecalibrateCompass();
            }
            
            if (navigationUI != null)
            {
                navigationUI.ShowCalibrationToast();
            }
        }
    }
}
