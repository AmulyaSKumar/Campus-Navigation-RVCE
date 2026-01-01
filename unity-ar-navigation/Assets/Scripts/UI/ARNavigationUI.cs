using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections;
using static CampusNavigator.AR.ARNavigationManager;

namespace CampusNavigator.AR
{
    /// <summary>
    /// AR Navigation UI - Replicates the ARScene.js glassmorphism UI
    /// Edge-anchored overlays with state-driven colors
    /// </summary>
    public class ARNavigationUI : MonoBehaviour
    {
        [Header("Status Bar")]
        [SerializeField] private GameObject statusBar;
        [SerializeField] private Image statusDot;
        [SerializeField] private TextMeshProUGUI statusText;
        [SerializeField] private Button closeButton;

        [Header("Direction Overlay")]
        [SerializeField] private GameObject directionOverlay;
        [SerializeField] private TextMeshProUGUI directionArrow;
        [SerializeField] private TextMeshProUGUI directionText;
        [SerializeField] private CanvasGroup directionCanvasGroup;

        [Header("On Track Indicator")]
        [SerializeField] private GameObject onTrackIndicator;
        [SerializeField] private TextMeshProUGUI onTrackText;

        [Header("Center Reticle")]
        [SerializeField] private GameObject centerReticle;
        [SerializeField] private Image reticleImage;

        [Header("Compass")]
        [SerializeField] private Button compassButton;
        [SerializeField] private TextMeshProUGUI compassNeedle;

        [Header("Bottom Info Bar")]
        [SerializeField] private GameObject bottomInfoBar;
        [SerializeField] private Image destinationImage;
        [SerializeField] private TextMeshProUGUI destinationName;
        [SerializeField] private TextMeshProUGUI distanceText;
        [SerializeField] private TextMeshProUGUI etaText;
        [SerializeField] private TextMeshProUGUI gpsAccuracyText;

        [Header("Calibration Toast")]
        [SerializeField] private GameObject calibrationToast;
        [SerializeField] private float calibrationDuration = 2.5f;

        [Header("Arrival Overlay")]
        [SerializeField] private GameObject arrivalOverlay;
        [SerializeField] private TextMeshProUGUI arrivalDestinationName;
        [SerializeField] private Image arrivalImage;
        [SerializeField] private Button endNavigationButton;

        [Header("Color Settings - Softened for daylight/night")]
        [SerializeField] private Color alignedColor = new Color(0.43f, 0.91f, 0.63f, 1f);    // #6EE7A0
        [SerializeField] private Color offRouteColor = new Color(0.96f, 0.82f, 0.38f, 1f);   // #F5D060
        [SerializeField] private Color wrongColor = new Color(0.96f, 0.56f, 0.56f, 1f);       // #F59090
        [SerializeField] private Color neutralColor = new Color(0.49f, 0.83f, 0.91f, 1f);    // #7DD4E8

        [Header("Animation Settings")]
        [SerializeField] private float fadeInDuration = 0.3f;
        [SerializeField] private float directionFadeDelay = 2f;

        private ARNavigationManager navigationManager;
        private Coroutine fadeCoroutine;
        private bool isDirectionFaded = false;

        private void Awake()
        {
            navigationManager = FindObjectOfType<ARNavigationManager>();
            
            // Setup button listeners
            if (closeButton != null)
                closeButton.onClick.AddListener(OnCloseClicked);
            
            if (compassButton != null)
                compassButton.onClick.AddListener(OnCompassClicked);
            
            if (endNavigationButton != null)
                endNavigationButton.onClick.AddListener(OnCloseClicked);

            // Initialize UI state
            HideAll();
        }

        private void HideAll()
        {
            if (directionOverlay != null) directionOverlay.SetActive(false);
            if (onTrackIndicator != null) onTrackIndicator.SetActive(false);
            if (calibrationToast != null) calibrationToast.SetActive(false);
            if (arrivalOverlay != null) arrivalOverlay.SetActive(false);
            if (centerReticle != null) centerReticle.SetActive(false);
        }

        public void SetStatus(NavigationStatus status)
        {
            if (statusDot == null || statusText == null) return;

            switch (status)
            {
                case NavigationStatus.Initializing:
                    statusDot.color = new Color(0.98f, 0.8f, 0.08f, 1f); // Yellow
                    statusText.text = "Initializing...";
                    break;
                case NavigationStatus.Tracking:
                    statusDot.color = alignedColor;
                    statusText.text = "AR Active";
                    break;
                case NavigationStatus.Error:
                    statusDot.color = wrongColor;
                    statusText.text = "Error";
                    break;
            }
        }

        public void SetDestination(string name, string imageUrl)
        {
            if (destinationName != null)
                destinationName.text = name;

            if (bottomInfoBar != null)
                bottomInfoBar.SetActive(true);

            // Load image if URL provided
            if (!string.IsNullOrEmpty(imageUrl) && destinationImage != null)
            {
                StartCoroutine(LoadDestinationImage(imageUrl));
            }
        }

        private IEnumerator LoadDestinationImage(string url)
        {
            using (var www = UnityEngine.Networking.UnityWebRequestTexture.GetTexture(url))
            {
                yield return www.SendWebRequest();

                if (www.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
                {
                    var texture = UnityEngine.Networking.DownloadHandlerTexture.GetContent(www);
                    destinationImage.sprite = Sprite.Create(
                        texture,
                        new Rect(0, 0, texture.width, texture.height),
                        new Vector2(0.5f, 0.5f)
                    );
                    destinationImage.gameObject.SetActive(true);
                }
            }
        }

        public void UpdateNavigationState(NavigationState state)
        {
            // Update compass
            if (compassNeedle != null)
            {
                compassNeedle.transform.rotation = Quaternion.Euler(0, 0, state.compassHeading);
            }

            // Update distance and ETA
            if (distanceText != null)
                distanceText.text = FormatDistance(state.distance);

            if (etaText != null)
                etaText.text = state.eta ?? "--";

            // Update GPS accuracy indicator
            if (gpsAccuracyText != null)
            {
                gpsAccuracyText.text = $"GPS ±{Mathf.Round(state.gpsAccuracy)}m";
                gpsAccuracyText.color = GetGPSAccuracyColor(state.gpsAccuracy);
            }

            // Update center reticle
            if (centerReticle != null)
            {
                centerReticle.SetActive(state.isOnTrack);
                if (reticleImage != null)
                {
                    reticleImage.color = new Color(0.2f, 0.83f, 0.6f, state.isOnTrack ? 0.8f : 0f);
                }
            }

            // Show appropriate overlay based on track status
            if (state.isOnTrack)
            {
                ShowOnTrackIndicator();
            }
            else
            {
                ShowDirectionOverlay(state.turnDirection, state.relativeBearing);
            }
        }

        private void ShowOnTrackIndicator()
        {
            // Hide direction overlay
            if (directionOverlay != null)
                directionOverlay.SetActive(false);

            // Show on track indicator
            if (onTrackIndicator != null)
            {
                onTrackIndicator.SetActive(true);
                StartFadeAnimation(onTrackIndicator.GetComponent<CanvasGroup>(), true);
            }
        }

        private void ShowDirectionOverlay(TurnDirection direction, float relativeBearing)
        {
            // Hide on track indicator
            if (onTrackIndicator != null)
                onTrackIndicator.SetActive(false);

            // Show direction overlay
            if (directionOverlay != null)
            {
                directionOverlay.SetActive(true);

                // Set arrow and text based on direction
                string arrow = "↑";
                string text = "GO STRAIGHT";
                Color color = alignedColor;

                if (relativeBearing >= 45 && relativeBearing < 135)
                {
                    arrow = "→";
                    text = "TURN RIGHT";
                    color = offRouteColor;
                }
                else if (relativeBearing >= 135 && relativeBearing < 225)
                {
                    arrow = "↓";
                    text = "TURN AROUND";
                    color = wrongColor;
                }
                else if (relativeBearing >= 225 && relativeBearing < 315)
                {
                    arrow = "←";
                    text = "TURN LEFT";
                    color = offRouteColor;
                }

                if (directionArrow != null)
                {
                    directionArrow.text = arrow;
                    directionArrow.color = color;
                }

                if (directionText != null)
                {
                    directionText.text = text;
                }

                // Handle fade after delay
                ResetDirectionFade();
            }
        }

        private void ResetDirectionFade()
        {
            isDirectionFaded = false;
            
            if (directionCanvasGroup != null)
                directionCanvasGroup.alpha = 0.9f;

            if (fadeCoroutine != null)
                StopCoroutine(fadeCoroutine);

            fadeCoroutine = StartCoroutine(FadeDirectionAfterDelay());
        }

        private IEnumerator FadeDirectionAfterDelay()
        {
            yield return new WaitForSeconds(directionFadeDelay);

            if (directionCanvasGroup != null)
            {
                float elapsed = 0f;
                float startAlpha = directionCanvasGroup.alpha;
                float targetAlpha = 0.4f;

                while (elapsed < fadeInDuration)
                {
                    elapsed += Time.deltaTime;
                    directionCanvasGroup.alpha = Mathf.Lerp(startAlpha, targetAlpha, elapsed / fadeInDuration);
                    yield return null;
                }

                directionCanvasGroup.alpha = targetAlpha;
                isDirectionFaded = true;
            }
        }

        private void StartFadeAnimation(CanvasGroup canvasGroup, bool fadeIn)
        {
            if (canvasGroup != null)
            {
                StartCoroutine(AnimateFade(canvasGroup, fadeIn));
            }
        }

        private IEnumerator AnimateFade(CanvasGroup canvasGroup, bool fadeIn)
        {
            float elapsed = 0f;
            float startAlpha = canvasGroup.alpha;
            float targetAlpha = fadeIn ? 1f : 0f;

            while (elapsed < fadeInDuration)
            {
                elapsed += Time.deltaTime;
                canvasGroup.alpha = Mathf.Lerp(startAlpha, targetAlpha, elapsed / fadeInDuration);
                yield return null;
            }

            canvasGroup.alpha = targetAlpha;
        }

        private Color GetGPSAccuracyColor(float accuracy)
        {
            if (accuracy < 15f) return alignedColor;
            if (accuracy < 30f) return offRouteColor;
            return wrongColor;
        }

        public void ShowCalibrationToast()
        {
            if (calibrationToast != null)
            {
                StartCoroutine(ShowCalibrationToastCoroutine());
            }
        }

        private IEnumerator ShowCalibrationToastCoroutine()
        {
            calibrationToast.SetActive(true);
            
            var canvasGroup = calibrationToast.GetComponent<CanvasGroup>();
            if (canvasGroup != null)
            {
                StartFadeAnimation(canvasGroup, true);
            }

            yield return new WaitForSeconds(calibrationDuration);

            if (canvasGroup != null)
            {
                StartFadeAnimation(canvasGroup, false);
                yield return new WaitForSeconds(fadeInDuration);
            }

            calibrationToast.SetActive(false);
        }

        /// <summary>
        /// Show arrival overlay without parameters (uses current destination)
        /// </summary>
        public void ShowArrivalOverlay()
        {
            ShowArrivalOverlay(destinationName?.text ?? "Destination", null);
        }
        
        public void ShowArrivalOverlay(string destName, string imageUrl)
        {
            if (arrivalOverlay != null)
            {
                arrivalOverlay.SetActive(true);

                if (arrivalDestinationName != null)
                    arrivalDestinationName.text = destName;

                if (!string.IsNullOrEmpty(imageUrl) && arrivalImage != null)
                {
                    StartCoroutine(LoadArrivalImage(imageUrl));
                }

                // Hide other elements
                if (directionOverlay != null) directionOverlay.SetActive(false);
                if (onTrackIndicator != null) onTrackIndicator.SetActive(false);
                if (bottomInfoBar != null) bottomInfoBar.SetActive(false);
            }
        }
        
        /// <summary>
        /// Hide the arrival overlay
        /// </summary>
        public void HideArrivalOverlay()
        {
            if (arrivalOverlay != null)
            {
                arrivalOverlay.SetActive(false);
            }
            
            // Show navigation elements again
            if (bottomInfoBar != null) bottomInfoBar.SetActive(true);
        }
        
        /// <summary>
        /// Set destination info (alias for SetDestination)
        /// </summary>
        public void SetDestinationInfo(string name, string imageUrl)
        {
            SetDestination(name, imageUrl);
        }

        private IEnumerator LoadArrivalImage(string url)
        {
            using (var www = UnityEngine.Networking.UnityWebRequestTexture.GetTexture(url))
            {
                yield return www.SendWebRequest();

                if (www.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
                {
                    var texture = UnityEngine.Networking.DownloadHandlerTexture.GetContent(www);
                    arrivalImage.sprite = Sprite.Create(
                        texture,
                        new Rect(0, 0, texture.width, texture.height),
                        new Vector2(0.5f, 0.5f)
                    );
                    arrivalImage.gameObject.SetActive(true);
                }
            }
        }

        private string FormatDistance(float meters)
        {
            if (meters < 1000)
                return $"{Mathf.Round(meters)} m";
            return $"{(meters / 1000f):F2} km";
        }

        private void OnCloseClicked()
        {
            if (navigationManager != null)
                navigationManager.Close();

            // Return to map or close AR view
            gameObject.SetActive(false);
        }

        private void OnCompassClicked()
        {
            if (navigationManager != null)
                navigationManager.Recalibrate();
        }
    }
}
