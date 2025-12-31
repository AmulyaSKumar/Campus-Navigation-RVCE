using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;

namespace CampusNavigator.AR
{
    /// <summary>
    /// Location Manager - Handles fetching and storing campus locations
    /// Mirrors the location data structure from the backend
    /// </summary>
    public class LocationManager : MonoBehaviour
    {
        [Header("API Settings")]
        [SerializeField] private string apiBaseUrl = "http://localhost:5000/api";
        
        [Header("Demo Locations")]
        [SerializeField] private List<LocationData> demoLocations = new List<LocationData>();

        [Header("UI References")]
        [SerializeField] private Transform locationListContainer;
        [SerializeField] private GameObject locationItemPrefab;
        [SerializeField] private TMP_InputField searchInput;

        private List<LocationData> allLocations = new List<LocationData>();
        private ARNavigationManager navigationManager;

        public event System.Action<LocationData> OnLocationSelected;

        [System.Serializable]
        public class LocationData
        {
            public string id;
            public string name;
            public double latitude;
            public double longitude;
            public string imageUrl;
            public int searchCount;

            // Convert to navigation location
            public ARNavigationManager.Location ToNavigationLocation()
            {
                return new ARNavigationManager.Location
                {
                    name = name,
                    latitude = latitude,
                    longitude = longitude,
                    imageUrl = imageUrl
                };
            }
        }

        [System.Serializable]
        private class LocationListResponse
        {
            public LocationData[] locations;
        }

        private void Awake()
        {
            navigationManager = FindObjectOfType<ARNavigationManager>();
            
            // Initialize with demo locations if provided
            if (demoLocations.Count > 0)
            {
                allLocations.AddRange(demoLocations);
            }
        }

        private void Start()
        {
            // Fetch locations from backend
            StartCoroutine(FetchLocations());
            
            // Setup search
            if (searchInput != null)
            {
                searchInput.onValueChanged.AddListener(OnSearchTextChanged);
            }
        }

        private System.Collections.IEnumerator FetchLocations()
        {
            string url = $"{apiBaseUrl}/locations";
            
            using (var request = UnityEngine.Networking.UnityWebRequest.Get(url))
            {
                yield return request.SendWebRequest();

                if (request.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
                {
                    try
                    {
                        // Parse JSON array
                        string json = "{\"locations\":" + request.downloadHandler.text + "}";
                        var response = JsonUtility.FromJson<LocationListResponse>(json);
                        
                        if (response.locations != null)
                        {
                            allLocations.Clear();
                            allLocations.AddRange(response.locations);
                            PopulateLocationList(allLocations);
                        }
                    }
                    catch (System.Exception e)
                    {
                        Debug.LogError($"Failed to parse locations: {e.Message}");
                        // Use demo locations as fallback
                        PopulateLocationList(demoLocations);
                    }
                }
                else
                {
                    Debug.LogWarning($"Failed to fetch locations: {request.error}");
                    // Use demo locations as fallback
                    PopulateLocationList(demoLocations);
                }
            }
        }

        private void PopulateLocationList(List<LocationData> locations)
        {
            if (locationListContainer == null || locationItemPrefab == null) return;

            // Clear existing items
            foreach (Transform child in locationListContainer)
            {
                Destroy(child.gameObject);
            }

            // Create new items
            foreach (var location in locations)
            {
                var item = Instantiate(locationItemPrefab, locationListContainer);
                SetupLocationItem(item, location);
            }
        }

        private void SetupLocationItem(GameObject item, LocationData location)
        {
            // Set name
            var nameText = item.GetComponentInChildren<TextMeshProUGUI>();
            if (nameText != null)
            {
                nameText.text = location.name;
            }

            // Set image if available
            var image = item.transform.Find("Image")?.GetComponent<Image>();
            if (image != null && !string.IsNullOrEmpty(location.imageUrl))
            {
                StartCoroutine(LoadLocationImage(image, location.imageUrl));
            }

            // Setup click handler
            var button = item.GetComponent<Button>();
            if (button != null)
            {
                button.onClick.AddListener(() => SelectLocation(location));
            }
        }

        private System.Collections.IEnumerator LoadLocationImage(Image image, string url)
        {
            using (var request = UnityEngine.Networking.UnityWebRequestTexture.GetTexture(url))
            {
                yield return request.SendWebRequest();

                if (request.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
                {
                    var texture = UnityEngine.Networking.DownloadHandlerTexture.GetContent(request);
                    image.sprite = Sprite.Create(
                        texture,
                        new Rect(0, 0, texture.width, texture.height),
                        new Vector2(0.5f, 0.5f)
                    );
                }
            }
        }

        private void SelectLocation(LocationData location)
        {
            OnLocationSelected?.Invoke(location);

            if (navigationManager != null)
            {
                navigationManager.SetDestination(location.ToNavigationLocation());
            }
        }

        private void OnSearchTextChanged(string searchText)
        {
            if (string.IsNullOrEmpty(searchText))
            {
                PopulateLocationList(allLocations);
                return;
            }

            var filtered = allLocations.FindAll(loc => 
                loc.name.ToLower().Contains(searchText.ToLower())
            );
            
            PopulateLocationList(filtered);
        }

        public List<LocationData> GetAllLocations() => allLocations;
        
        public LocationData GetLocationByName(string name)
        {
            return allLocations.Find(loc => loc.name.Equals(name, System.StringComparison.OrdinalIgnoreCase));
        }
    }
}
