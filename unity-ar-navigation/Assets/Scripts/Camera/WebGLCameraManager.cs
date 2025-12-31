using UnityEngine;
using UnityEngine.UI;

namespace CampusNavigator.AR
{
    /// <summary>
    /// WebGL Camera Manager - Handles webcam feed for AR background
    /// Uses WebCamTexture for Unity WebGL builds
    /// </summary>
    public class WebGLCameraManager : MonoBehaviour
    {
        [Header("Camera Settings")]
        [SerializeField] private RawImage cameraDisplay;
        [SerializeField] private AspectRatioFitter aspectRatioFitter;
        [SerializeField] private bool preferFrontCamera = false;
        [SerializeField] private int requestedWidth = 1920;
        [SerializeField] private int requestedHeight = 1080;
        [SerializeField] private int requestedFPS = 30;

        [Header("Fallback")]
        [SerializeField] private GameObject gradientBackground;

        private WebCamTexture webCamTexture;
        private bool cameraActive = false;

        public bool IsCameraActive => cameraActive;

        private void Start()
        {
            StartCamera();
        }

        public void StartCamera()
        {
            if (cameraActive) return;

            // Check for camera availability
            WebCamDevice[] devices = WebCamTexture.devices;
            
            if (devices.Length == 0)
            {
                Debug.LogWarning("No camera found, using fallback background");
                ShowFallbackBackground();
                return;
            }

            // Find appropriate camera (prefer back camera for AR)
            string cameraName = null;
            foreach (var device in devices)
            {
                if (!preferFrontCamera && !device.isFrontFacing)
                {
                    cameraName = device.name;
                    break;
                }
                else if (preferFrontCamera && device.isFrontFacing)
                {
                    cameraName = device.name;
                    break;
                }
            }

            // Fallback to first available camera
            if (string.IsNullOrEmpty(cameraName))
            {
                cameraName = devices[0].name;
            }

            // Create and start webcam texture
            webCamTexture = new WebCamTexture(cameraName, requestedWidth, requestedHeight, requestedFPS);
            
            if (cameraDisplay != null)
            {
                cameraDisplay.texture = webCamTexture;
                cameraDisplay.gameObject.SetActive(true);
            }

            webCamTexture.Play();
            cameraActive = true;

            // Hide fallback background
            if (gradientBackground != null)
            {
                gradientBackground.SetActive(false);
            }

            // Adjust aspect ratio
            StartCoroutine(AdjustAspectRatio());
        }

        private System.Collections.IEnumerator AdjustAspectRatio()
        {
            // Wait for camera to initialize
            yield return new WaitUntil(() => webCamTexture.width > 100);

            if (aspectRatioFitter != null)
            {
                aspectRatioFitter.aspectRatio = (float)webCamTexture.width / webCamTexture.height;
            }

            // Adjust for camera rotation on mobile devices
            if (cameraDisplay != null)
            {
                int rotationAngle = webCamTexture.videoRotationAngle;
                cameraDisplay.rectTransform.localEulerAngles = new Vector3(0, 0, -rotationAngle);

                // Handle mirroring for front camera
                if (webCamTexture.videoVerticallyMirrored)
                {
                    cameraDisplay.rectTransform.localScale = new Vector3(1, -1, 1);
                }
            }
        }

        public void StopCamera()
        {
            if (webCamTexture != null && webCamTexture.isPlaying)
            {
                webCamTexture.Stop();
            }
            cameraActive = false;
        }

        private void ShowFallbackBackground()
        {
            if (gradientBackground != null)
            {
                gradientBackground.SetActive(true);
            }

            if (cameraDisplay != null)
            {
                cameraDisplay.gameObject.SetActive(false);
            }
        }

        private void OnDestroy()
        {
            StopCamera();
            if (webCamTexture != null)
            {
                Destroy(webCamTexture);
            }
        }

        private void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus)
            {
                StopCamera();
            }
            else if (!cameraActive)
            {
                StartCamera();
            }
        }
    }
}
