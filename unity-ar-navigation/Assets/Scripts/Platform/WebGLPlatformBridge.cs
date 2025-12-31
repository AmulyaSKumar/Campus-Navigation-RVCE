using UnityEngine;
using System.Runtime.InteropServices;

namespace CampusNavigator.AR
{
    /// <summary>
    /// WebGL Platform Bridge - Provides access to browser APIs via JavaScript interop
    /// </summary>
    public class WebGLPlatformBridge : MonoBehaviour
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        
        [DllImport("__Internal")]
        private static extern void RequestGeolocationPermission();
        
        [DllImport("__Internal")]
        private static extern void StartWatchingPosition();
        
        [DllImport("__Internal")]
        private static extern void StopWatchingPosition();
        
        [DllImport("__Internal")]
        private static extern void RequestDeviceOrientationPermission();
        
        [DllImport("__Internal")]
        private static extern void StartOrientationTracking();
        
        [DllImport("__Internal")]
        private static extern void StopOrientationTracking();
        
        [DllImport("__Internal")]
        private static extern void RequestCameraPermission();
        
        [DllImport("__Internal")]
        private static extern void StopCamera();
        
        #endif

        public static WebGLPlatformBridge Instance { get; private set; }

        // Events
        public event System.Action OnGeolocationGranted;
        public event System.Action<string> OnGeolocationDenied;
        public event System.Action<GeolocationData> OnPositionUpdated;
        public event System.Action<string> OnPositionErrorReceived;
        public event System.Action OnOrientationGranted;
        public event System.Action OnOrientationDenied;
        public event System.Action<float> OnCompassUpdated;
        public event System.Action OnCameraGranted;
        public event System.Action<string> OnCameraDenied;

        [System.Serializable]
        public struct GeolocationData
        {
            public double latitude;
            public double longitude;
            public float accuracy;
            public float heading;
            public float speed;
        }

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        // Public API methods
        public void RequestGeolocation()
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            RequestGeolocationPermission();
            #else
            Debug.Log("WebGL Geolocation: Not running in WebGL, using Unity location services");
            OnGeolocationGranted?.Invoke();
            #endif
        }

        public void StartGeolocationTracking()
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            StartWatchingPosition();
            #endif
        }

        public void StopGeolocationTracking()
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            StopWatchingPosition();
            #endif
        }

        public void RequestOrientation()
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            RequestDeviceOrientationPermission();
            #else
            Debug.Log("WebGL Orientation: Not running in WebGL, using Unity compass");
            OnOrientationGranted?.Invoke();
            #endif
        }

        public void StartCompassTracking()
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            StartOrientationTracking();
            #endif
        }

        public void StopCompassTracking()
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            StopOrientationTracking();
            #endif
        }

        public void RequestWebCamera()
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            RequestCameraPermission();
            #else
            Debug.Log("WebGL Camera: Not running in WebGL, using WebCamTexture");
            OnCameraGranted?.Invoke();
            #endif
        }

        public void StopWebCamera()
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            StopCamera();
            #endif
        }

        // Callback methods called from JavaScript
        public void OnGeolocationPermissionGranted()
        {
            OnGeolocationGranted?.Invoke();
        }

        public void OnGeolocationPermissionDenied(string error)
        {
            OnGeolocationDenied?.Invoke(error);
        }

        public void OnPositionUpdate(string jsonData)
        {
            try
            {
                var data = JsonUtility.FromJson<GeolocationData>(jsonData);
                OnPositionUpdated?.Invoke(data);
            }
            catch (System.Exception e)
            {
                Debug.LogError($"Failed to parse position data: {e.Message}");
            }
        }

        public void OnPositionError(string error)
        {
            OnPositionErrorReceived?.Invoke(error);
        }

        public void OnOrientationPermissionGranted()
        {
            OnOrientationGranted?.Invoke();
        }

        public void OnOrientationPermissionDenied()
        {
            OnOrientationDenied?.Invoke();
        }

        public void OnCompassUpdate(string heading)
        {
            if (float.TryParse(heading, out float compassHeading))
            {
                OnCompassUpdated?.Invoke(compassHeading);
            }
        }

        public void OnCameraPermissionGranted()
        {
            OnCameraGranted?.Invoke();
        }

        public void OnCameraPermissionDenied(string error)
        {
            OnCameraDenied?.Invoke(error);
        }
    }
}
