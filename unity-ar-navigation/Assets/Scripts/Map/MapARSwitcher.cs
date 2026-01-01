using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;

namespace CampusNavigator.AR
{
    /// <summary>
    /// Manages switching between 3D Map view and AR Navigation view
    /// Allows users to select destination on 3D map then start AR navigation
    /// </summary>
    public class MapARSwitcher : MonoBehaviour
    {
        [Header("Scene Names")]
        [SerializeField] private string mapSceneName = "CampusMapScene";
        [SerializeField] private string arSceneName = "ARNavigationScene";
        
        [Header("UI Buttons")]
        [SerializeField] private Button switchToARButton;
        [SerializeField] private Button switchToMapButton;
        
        [Header("Current Destination")]
        [SerializeField] private string destinationName;
        [SerializeField] private double destinationLatitude;
        [SerializeField] private double destinationLongitude;
        
        // Static instance for cross-scene data persistence
        private static MapARSwitcher instance;
        private static DestinationData pendingDestination;
        
        [System.Serializable]
        public class DestinationData
        {
            public string name;
            public double latitude;
            public double longitude;
            public string imageUrl;
        }
        
        private void Awake()
        {
            // Singleton pattern for cross-scene persistence
            if (instance == null)
            {
                instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else if (instance != this)
            {
                // Transfer pending destination to existing instance
                Destroy(gameObject);
                return;
            }
            
            SetupButtons();
        }
        
        private void Start()
        {
            // Check if we have a pending destination from map scene
            if (pendingDestination != null)
            {
                ApplyPendingDestination();
            }
        }
        
        private void SetupButtons()
        {
            if (switchToARButton != null)
            {
                switchToARButton.onClick.AddListener(SwitchToAR);
            }
            
            if (switchToMapButton != null)
            {
                switchToMapButton.onClick.AddListener(SwitchToMap);
            }
        }
        
        /// <summary>
        /// Set destination from 3D map (called when user taps a building)
        /// </summary>
        public void SetDestination(string name, double lat, double lon, string imageUrl = "")
        {
            destinationName = name;
            destinationLatitude = lat;
            destinationLongitude = lon;
            
            pendingDestination = new DestinationData
            {
                name = name,
                latitude = lat,
                longitude = lon,
                imageUrl = imageUrl
            };
            
            Debug.Log($"Destination set: {name} ({lat}, {lon})");
        }
        
        /// <summary>
        /// Switch to AR Navigation scene
        /// </summary>
        public void SwitchToAR()
        {
            if (string.IsNullOrEmpty(destinationName))
            {
                Debug.LogWarning("No destination selected!");
                return;
            }
            
            SceneManager.LoadScene(arSceneName);
        }
        
        /// <summary>
        /// Switch to 3D Map scene
        /// </summary>
        public void SwitchToMap()
        {
            SceneManager.LoadScene(mapSceneName);
        }
        
        /// <summary>
        /// Apply pending destination after scene load
        /// </summary>
        private void ApplyPendingDestination()
        {
            if (pendingDestination == null) return;
            
            // Find AR Navigation Manager and set destination
            ARNavigationManager navManager = FindObjectOfType<ARNavigationManager>();
            if (navManager != null)
            {
                navManager.SetDestination(
                    pendingDestination.latitude,
                    pendingDestination.longitude,
                    pendingDestination.name
                );
            }
            
            // Find UI and update
            ARNavigationUI navUI = FindObjectOfType<ARNavigationUI>();
            if (navUI != null)
            {
                navUI.SetDestination(
                    pendingDestination.name,
                    pendingDestination.imageUrl
                );
            }
            
            // Clear pending
            pendingDestination = null;
        }
        
        /// <summary>
        /// Get current destination
        /// </summary>
        public DestinationData GetCurrentDestination()
        {
            return new DestinationData
            {
                name = destinationName,
                latitude = destinationLatitude,
                longitude = destinationLongitude
            };
        }
        
        /// <summary>
        /// Static access to set destination from anywhere
        /// </summary>
        public static void SetGlobalDestination(string name, double lat, double lon)
        {
            pendingDestination = new DestinationData
            {
                name = name,
                latitude = lat,
                longitude = lon
            };
            
            if (instance != null)
            {
                instance.destinationName = name;
                instance.destinationLatitude = lat;
                instance.destinationLongitude = lon;
            }
        }
    }
}
