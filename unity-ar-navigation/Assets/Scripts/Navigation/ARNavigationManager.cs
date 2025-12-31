using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System;
using System.Collections;

namespace CampusNavigator.AR
{
    /// <summary>
    /// Main AR Navigation Manager - Handles GPS tracking, compass, and navigation logic
    /// Replicates the functionality of ARScene.js for Unity WebGL
    /// </summary>
    public class ARNavigationManager : MonoBehaviour
    {
        [Header("Navigation Settings")]
        [SerializeField] private float arrivalThreshold = 15f;
        [SerializeField] private float gpsAccuracyThreshold = 50f;
        [SerializeField] private float compassSmoothingFactor = 0.3f;
        [SerializeField] private float walkingSpeedMPerMin = 80f;

        [Header("Turn Detection")]
        [SerializeField] private float straightThreshold = 40f;
        [SerializeField] private float turnThreshold = 50f;

        [Header("UI References")]
        [SerializeField] private ARNavigationUI navigationUI;

        [Header("Demo Mode")]
        [SerializeField] private bool useFakeLocation = false;
        [SerializeField] private double fakeLatitude = 12.923383;
        [SerializeField] private double fakeLongitude = 77.501071;

        // Navigation state
        private Location destination;
        private double userLatitude;
        private double userLongitude;
        private float gpsAccuracy;
        private float compassHeading;
        private float smoothedHeading;
        private float distanceToDestination;
        private string eta;
        private TurnDirection currentTurnDirection = TurnDirection.Straight;
        private TurnDirection lastTurnDirection = TurnDirection.Straight;
        private bool hasArrived = false;
        private bool isTracking = false;

        // Events
        public event Action<NavigationState> OnNavigationStateChanged;
        public event Action OnArrived;
        public event Action<string> OnError;

        public enum TurnDirection { Straight, Left, Right }
        public enum NavigationStatus { Initializing, Tracking, Error }

        [Serializable]
        public class Location
        {
            public string name;
            public double latitude;
            public double longitude;
            public string imageUrl;
        }

        public struct NavigationState
        {
            public float distance;
            public string eta;
            public TurnDirection turnDirection;
            public float relativeBearing;
            public bool isOnTrack;
            public float gpsAccuracy;
            public float compassHeading;
        }

        private void Start()
        {
            StartCoroutine(InitializeNavigation());
        }

        private IEnumerator InitializeNavigation()
        {
            navigationUI?.SetStatus(NavigationStatus.Initializing);

            // Request location permission
            if (!Input.location.isEnabledByUser)
            {
                #if UNITY_WEBGL && !UNITY_EDITOR
                // WebGL uses JavaScript geolocation
                yield return StartCoroutine(RequestWebGLPermissions());
                #else
                OnError?.Invoke("Location services not enabled");
                navigationUI?.SetStatus(NavigationStatus.Error);
                yield break;
                #endif
            }

            // Start location service
            Input.location.Start(gpsAccuracyThreshold, 1f);

            // Wait for location service to initialize
            int maxWait = 20;
            while (Input.location.status == LocationServiceStatus.Initializing && maxWait > 0)
            {
                yield return new WaitForSeconds(1);
                maxWait--;
            }

            if (maxWait < 1 || Input.location.status == LocationServiceStatus.Failed)
            {
                if (!useFakeLocation)
                {
                    OnError?.Invoke("Unable to determine device location");
                    navigationUI?.SetStatus(NavigationStatus.Error);
                    yield break;
                }
            }

            // Start compass
            Input.compass.enabled = true;
            yield return new WaitForSeconds(0.5f);

            isTracking = true;
            navigationUI?.SetStatus(NavigationStatus.Tracking);
        }

        private IEnumerator RequestWebGLPermissions()
        {
            // WebGL permission request handled by JavaScript interop
            yield return new WaitForSeconds(1f);
        }

        private void Update()
        {
            if (!isTracking || destination == null || hasArrived) return;

            UpdateLocation();
            UpdateCompass();
            UpdateNavigation();
        }

        private void UpdateLocation()
        {
            if (useFakeLocation)
            {
                userLatitude = fakeLatitude;
                userLongitude = fakeLongitude;
                gpsAccuracy = 10f;
            }
            else if (Input.location.status == LocationServiceStatus.Running)
            {
                var locationData = Input.location.lastData;
                
                // Filter out inaccurate readings
                if (locationData.horizontalAccuracy > gpsAccuracyThreshold)
                {
                    Debug.Log($"GPS accuracy too low: {locationData.horizontalAccuracy}m");
                    return;
                }

                userLatitude = locationData.latitude;
                userLongitude = locationData.longitude;
                gpsAccuracy = locationData.horizontalAccuracy;
            }
        }

        private void UpdateCompass()
        {
            float rawHeading;

            if (Input.compass.enabled)
            {
                rawHeading = Input.compass.trueHeading;
            }
            else
            {
                rawHeading = 0f;
            }

            // Apply low-pass filter for smooth compass movement
            float diff = rawHeading - smoothedHeading;
            if (diff > 180f) diff -= 360f;
            if (diff < -180f) diff += 360f;

            smoothedHeading = (smoothedHeading + diff * compassSmoothingFactor + 360f) % 360f;
            compassHeading = smoothedHeading;
        }

        private void UpdateNavigation()
        {
            // Calculate distance using Haversine formula
            distanceToDestination = CalculateDistance(
                userLatitude, userLongitude,
                destination.latitude, destination.longitude
            );

            // Calculate ETA
            eta = CalculateETA(distanceToDestination);

            // Calculate bearing to destination
            float bearing = CalculateBearing(
                userLatitude, userLongitude,
                destination.latitude, destination.longitude
            );

            // Calculate relative bearing (how much user needs to turn)
            float relativeBearing = (bearing - compassHeading + 360f) % 360f;

            // Determine turn direction with hysteresis
            currentTurnDirection = DetermineTurnDirection(relativeBearing);

            // Check if on track
            bool isOnTrack = currentTurnDirection == TurnDirection.Straight;

            // Check arrival
            float arrivalThresholdAdjusted = Mathf.Max(arrivalThreshold, gpsAccuracy);
            if (distanceToDestination < arrivalThresholdAdjusted)
            {
                hasArrived = true;
                OnArrived?.Invoke();
                navigationUI?.ShowArrivalOverlay(destination.name, destination.imageUrl);
                return;
            }

            // Update UI
            var state = new NavigationState
            {
                distance = distanceToDestination,
                eta = eta,
                turnDirection = currentTurnDirection,
                relativeBearing = relativeBearing,
                isOnTrack = isOnTrack,
                gpsAccuracy = gpsAccuracy,
                compassHeading = compassHeading
            };

            OnNavigationStateChanged?.Invoke(state);
            navigationUI?.UpdateNavigationState(state);
        }

        private TurnDirection DetermineTurnDirection(float relativeBearing)
        {
            TurnDirection turnDir = lastTurnDirection;

            if (lastTurnDirection == TurnDirection.Straight)
            {
                if (relativeBearing > turnThreshold && relativeBearing < 180f)
                    turnDir = TurnDirection.Right;
                else if (relativeBearing > 180f && relativeBearing < (360f - turnThreshold))
                    turnDir = TurnDirection.Left;
            }
            else if (lastTurnDirection == TurnDirection.Right)
            {
                if (relativeBearing <= straightThreshold || relativeBearing >= 320f)
                    turnDir = TurnDirection.Straight;
                else if (relativeBearing > 180f)
                    turnDir = TurnDirection.Left;
            }
            else if (lastTurnDirection == TurnDirection.Left)
            {
                if (relativeBearing <= straightThreshold || relativeBearing >= 320f)
                    turnDir = TurnDirection.Straight;
                else if (relativeBearing < 180f && relativeBearing > straightThreshold)
                    turnDir = TurnDirection.Right;
            }

            lastTurnDirection = turnDir;
            return turnDir;
        }

        /// <summary>
        /// Haversine formula to calculate distance between two coordinates
        /// </summary>
        private float CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371000; // Earth's radius in meters
            double dLat = (lat2 - lat1) * Mathf.Deg2Rad;
            double dLon = (lon2 - lon1) * Mathf.Deg2Rad;

            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(lat1 * Mathf.Deg2Rad) * Math.Cos(lat2 * Mathf.Deg2Rad) *
                       Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return (float)(R * c);
        }

        /// <summary>
        /// Calculate bearing from point A to point B
        /// </summary>
        private float CalculateBearing(double lat1, double lon1, double lat2, double lon2)
        {
            double dLon = (lon2 - lon1) * Mathf.Deg2Rad;
            double y = Math.Sin(dLon) * Math.Cos(lat2 * Mathf.Deg2Rad);
            double x = Math.Cos(lat1 * Mathf.Deg2Rad) * Math.Sin(lat2 * Mathf.Deg2Rad) -
                       Math.Sin(lat1 * Mathf.Deg2Rad) * Math.Cos(lat2 * Mathf.Deg2Rad) * Math.Cos(dLon);

            float bearing = (float)(Math.Atan2(y, x) * Mathf.Rad2Deg);
            return (bearing + 360f) % 360f;
        }

        private string CalculateETA(float meters)
        {
            int minutes = Mathf.CeilToInt(meters / walkingSpeedMPerMin);
            if (minutes < 1) return "< 1 min";
            return $"{minutes} min";
        }

        public string FormatDistance(float meters)
        {
            if (meters < 1000)
                return $"{Mathf.Round(meters)} m";
            return $"{(meters / 1000f):F2} km";
        }

        // Public methods
        public void SetDestination(Location location)
        {
            destination = location;
            hasArrived = false;
            lastTurnDirection = TurnDirection.Straight;
            navigationUI?.SetDestination(location.name, location.imageUrl);
        }

        public void Recalibrate()
        {
            smoothedHeading = 0f;
            compassHeading = 0f;
            navigationUI?.ShowCalibrationToast();
        }

        public void Close()
        {
            isTracking = false;
            Input.location.Stop();
            Input.compass.enabled = false;
        }

        public bool IsOnTrack => currentTurnDirection == TurnDirection.Straight;
        public float Distance => distanceToDestination;
        public string ETA => eta;
        public bool HasArrived => hasArrived;
    }
}
