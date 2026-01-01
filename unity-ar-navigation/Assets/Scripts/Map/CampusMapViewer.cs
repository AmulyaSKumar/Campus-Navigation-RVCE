using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

namespace CampusNavigator.AR
{
    /// <summary>
    /// 3D Campus Map Viewer - Displays the FBX campus model with orbit controls
    /// Allows users to view the campus in 3D and see their current location
    /// </summary>
    public class CampusMapViewer : MonoBehaviour
    {
        [Header("Campus Model")]
        [SerializeField] private GameObject campusModel;
        [SerializeField] private Transform modelContainer;
        
        [Header("Camera Settings")]
        [SerializeField] private Camera mapCamera;
        [SerializeField] private float rotationSpeed = 5f;
        [SerializeField] private float zoomSpeed = 10f;
        [SerializeField] private float panSpeed = 0.5f;
        [SerializeField] private float minZoom = 5f;
        [SerializeField] private float maxZoom = 100f;
        [SerializeField] private float initialDistance = 50f;
        [SerializeField] private float initialPitch = 45f;
        [SerializeField] private float initialYaw = 0f;
        
        [Header("Markers")]
        [SerializeField] private GameObject userMarkerPrefab;
        [SerializeField] private GameObject destinationMarkerPrefab;
        [SerializeField] private LineRenderer pathLine;
        
        [Header("GPS to World Mapping")]
        [Tooltip("GPS coordinates of the model's origin point")]
        [SerializeField] private double originLatitude = 12.923383;
        [SerializeField] private double originLongitude = 77.501071;
        [Tooltip("Scale: meters per Unity unit")]
        [SerializeField] private float metersPerUnit = 1f;
        [Tooltip("Rotation offset in degrees (if model North != Unity Z+)")]
        [SerializeField] private float northOffset = 0f;
        
        [Header("UI")]
        [SerializeField] private Button toggleViewButton;
        [SerializeField] private Button resetViewButton;
        [SerializeField] private Button zoomInButton;
        [SerializeField] private Button zoomOutButton;
        [SerializeField] private Slider zoomSlider;
        [SerializeField] private Toggle northUpToggle;
        
        // Camera orbit state
        private float currentDistance;
        private float currentPitch;
        private float currentYaw;
        private Vector3 focusPoint;
        
        // Touch/mouse state
        private Vector2 lastTouchPos;
        private bool isDragging;
        private bool isPanning;
        private float lastPinchDistance;
        
        // Markers
        private GameObject userMarker;
        private GameObject destinationMarker;
        
        // References
        private ARNavigationManager navigationManager;
        
        private void Awake()
        {
            navigationManager = FindObjectOfType<ARNavigationManager>();
            
            // Initialize camera orbit
            currentDistance = initialDistance;
            currentPitch = initialPitch;
            currentYaw = initialYaw;
            focusPoint = Vector3.zero;
            
            // Create markers
            if (userMarkerPrefab != null)
            {
                userMarker = Instantiate(userMarkerPrefab, transform);
                userMarker.SetActive(false);
            }
            
            if (destinationMarkerPrefab != null)
            {
                destinationMarker = Instantiate(destinationMarkerPrefab, transform);
                destinationMarker.SetActive(false);
            }
            
            // Setup UI
            SetupUI();
        }
        
        private void Start()
        {
            // Create default markers if prefabs not assigned
            if (userMarker == null)
            {
                userMarker = CreateDefaultMarker(new Color(0.376f, 0.784f, 0.91f), "UserMarker");
            }
            
            if (destinationMarker == null)
            {
                destinationMarker = CreateDefaultMarker(new Color(0.43f, 0.91f, 0.63f), "DestinationMarker");
            }
            
            // Setup path line
            if (pathLine == null)
            {
                GameObject lineObj = new GameObject("PathLine");
                lineObj.transform.SetParent(transform);
                pathLine = lineObj.AddComponent<LineRenderer>();
                pathLine.startWidth = 0.5f;
                pathLine.endWidth = 0.5f;
                pathLine.material = new Material(Shader.Find("Sprites/Default"));
                pathLine.startColor = new Color(0.376f, 0.784f, 0.91f, 0.8f);
                pathLine.endColor = new Color(0.43f, 0.91f, 0.63f, 0.8f);
                pathLine.positionCount = 0;
            }
            
            UpdateCameraPosition();
        }
        
        private void Update()
        {
            HandleInput();
            UpdateMarkers();
        }
        
        private void SetupUI()
        {
            if (resetViewButton != null)
                resetViewButton.onClick.AddListener(ResetView);
            
            if (zoomInButton != null)
                zoomInButton.onClick.AddListener(() => Zoom(-zoomSpeed));
            
            if (zoomOutButton != null)
                zoomOutButton.onClick.AddListener(() => Zoom(zoomSpeed));
            
            if (zoomSlider != null)
            {
                zoomSlider.minValue = minZoom;
                zoomSlider.maxValue = maxZoom;
                zoomSlider.value = initialDistance;
                zoomSlider.onValueChanged.AddListener(value => {
                    currentDistance = value;
                    UpdateCameraPosition();
                });
            }
            
            if (northUpToggle != null)
            {
                northUpToggle.onValueChanged.AddListener(isNorthUp => {
                    if (isNorthUp)
                    {
                        currentYaw = northOffset;
                        UpdateCameraPosition();
                    }
                });
            }
        }
        
        private void HandleInput()
        {
            // Skip if over UI
            if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject())
                return;
            
            #if UNITY_EDITOR || UNITY_STANDALONE
            HandleMouseInput();
            #else
            HandleTouchInput();
            #endif
        }
        
        private void HandleMouseInput()
        {
            // Right click + drag to rotate
            if (Input.GetMouseButtonDown(1))
            {
                isDragging = true;
                lastTouchPos = Input.mousePosition;
            }
            else if (Input.GetMouseButtonUp(1))
            {
                isDragging = false;
            }
            
            // Middle click + drag to pan
            if (Input.GetMouseButtonDown(2))
            {
                isPanning = true;
                lastTouchPos = Input.mousePosition;
            }
            else if (Input.GetMouseButtonUp(2))
            {
                isPanning = false;
            }
            
            if (isDragging)
            {
                Vector2 delta = (Vector2)Input.mousePosition - lastTouchPos;
                currentYaw += delta.x * rotationSpeed * 0.1f;
                currentPitch -= delta.y * rotationSpeed * 0.1f;
                currentPitch = Mathf.Clamp(currentPitch, 10f, 89f);
                lastTouchPos = Input.mousePosition;
                UpdateCameraPosition();
            }
            
            if (isPanning)
            {
                Vector2 delta = (Vector2)Input.mousePosition - lastTouchPos;
                Pan(delta * panSpeed * 0.01f);
                lastTouchPos = Input.mousePosition;
            }
            
            // Scroll to zoom
            float scroll = Input.mouseScrollDelta.y;
            if (Mathf.Abs(scroll) > 0.01f)
            {
                Zoom(-scroll * zoomSpeed);
            }
        }
        
        private void HandleTouchInput()
        {
            if (Input.touchCount == 1)
            {
                Touch touch = Input.GetTouch(0);
                
                if (touch.phase == TouchPhase.Began)
                {
                    isDragging = true;
                    lastTouchPos = touch.position;
                }
                else if (touch.phase == TouchPhase.Moved && isDragging)
                {
                    Vector2 delta = touch.position - lastTouchPos;
                    currentYaw += delta.x * rotationSpeed * 0.1f;
                    currentPitch -= delta.y * rotationSpeed * 0.1f;
                    currentPitch = Mathf.Clamp(currentPitch, 10f, 89f);
                    lastTouchPos = touch.position;
                    UpdateCameraPosition();
                }
                else if (touch.phase == TouchPhase.Ended)
                {
                    isDragging = false;
                }
            }
            else if (Input.touchCount == 2)
            {
                // Pinch to zoom
                Touch touch0 = Input.GetTouch(0);
                Touch touch1 = Input.GetTouch(1);
                
                float pinchDistance = Vector2.Distance(touch0.position, touch1.position);
                
                if (lastPinchDistance > 0)
                {
                    float delta = lastPinchDistance - pinchDistance;
                    Zoom(delta * zoomSpeed * 0.01f);
                }
                
                lastPinchDistance = pinchDistance;
                
                // Two finger pan
                if (touch0.phase == TouchPhase.Moved && touch1.phase == TouchPhase.Moved)
                {
                    Vector2 avgDelta = (touch0.deltaPosition + touch1.deltaPosition) * 0.5f;
                    Pan(avgDelta * panSpeed * 0.01f);
                }
            }
            else
            {
                lastPinchDistance = 0;
            }
        }
        
        private void Zoom(float delta)
        {
            currentDistance += delta;
            currentDistance = Mathf.Clamp(currentDistance, minZoom, maxZoom);
            
            if (zoomSlider != null)
                zoomSlider.value = currentDistance;
            
            UpdateCameraPosition();
        }
        
        private void Pan(Vector2 delta)
        {
            if (mapCamera == null) return;
            
            Vector3 right = mapCamera.transform.right;
            Vector3 forward = Vector3.Cross(right, Vector3.up).normalized;
            
            focusPoint += right * -delta.x * currentDistance * 0.01f;
            focusPoint += forward * -delta.y * currentDistance * 0.01f;
            
            UpdateCameraPosition();
        }
        
        private void UpdateCameraPosition()
        {
            if (mapCamera == null) return;
            
            // Calculate camera position using spherical coordinates
            float pitchRad = currentPitch * Mathf.Deg2Rad;
            float yawRad = currentYaw * Mathf.Deg2Rad;
            
            Vector3 offset = new Vector3(
                Mathf.Sin(yawRad) * Mathf.Cos(pitchRad),
                Mathf.Sin(pitchRad),
                Mathf.Cos(yawRad) * Mathf.Cos(pitchRad)
            ) * currentDistance;
            
            mapCamera.transform.position = focusPoint + offset;
            mapCamera.transform.LookAt(focusPoint);
        }
        
        public void ResetView()
        {
            currentDistance = initialDistance;
            currentPitch = initialPitch;
            currentYaw = initialYaw;
            focusPoint = Vector3.zero;
            
            if (zoomSlider != null)
                zoomSlider.value = currentDistance;
            
            UpdateCameraPosition();
        }
        
        /// <summary>
        /// Convert GPS coordinates to world position on the 3D model
        /// </summary>
        public Vector3 GPSToWorldPosition(double latitude, double longitude)
        {
            // Calculate offset from origin in meters
            double latOffset = (latitude - originLatitude) * 111320; // meters per degree latitude
            double lonOffset = (longitude - originLongitude) * 111320 * Mathf.Cos((float)(originLatitude * Mathf.Deg2Rad));
            
            // Convert to Unity units
            float x = (float)(lonOffset / metersPerUnit);
            float z = (float)(latOffset / metersPerUnit);
            
            // Apply north offset rotation
            if (northOffset != 0)
            {
                float rad = northOffset * Mathf.Deg2Rad;
                float newX = x * Mathf.Cos(rad) - z * Mathf.Sin(rad);
                float newZ = x * Mathf.Sin(rad) + z * Mathf.Cos(rad);
                x = newX;
                z = newZ;
            }
            
            return new Vector3(x, 0, z);
        }
        
        /// <summary>
        /// Convert world position to GPS coordinates
        /// </summary>
        public void WorldToGPSPosition(Vector3 worldPos, out double latitude, out double longitude)
        {
            float x = worldPos.x;
            float z = worldPos.z;
            
            // Reverse north offset rotation
            if (northOffset != 0)
            {
                float rad = -northOffset * Mathf.Deg2Rad;
                float newX = x * Mathf.Cos(rad) - z * Mathf.Sin(rad);
                float newZ = x * Mathf.Sin(rad) + z * Mathf.Cos(rad);
                x = newX;
                z = newZ;
            }
            
            // Convert to meters
            double latOffset = z * metersPerUnit;
            double lonOffset = x * metersPerUnit;
            
            // Convert to GPS
            latitude = originLatitude + (latOffset / 111320);
            longitude = originLongitude + (lonOffset / (111320 * Mathf.Cos((float)(originLatitude * Mathf.Deg2Rad))));
        }
        
        private void UpdateMarkers()
        {
            if (navigationManager == null) return;
            
            // Update user marker
            // This would be called with actual GPS coordinates
            // For now, we'll use demo coordinates
            
            // Update destination marker if destination is set
            // destinationMarker.transform.position = GPSToWorldPosition(destLat, destLon);
            
            // Update path line between user and destination
            // ...
        }
        
        /// <summary>
        /// Set user position from GPS
        /// </summary>
        public void SetUserPosition(double latitude, double longitude)
        {
            if (userMarker != null)
            {
                Vector3 pos = GPSToWorldPosition(latitude, longitude);
                pos.y = GetTerrainHeight(pos) + 2f; // Slightly above ground
                userMarker.transform.position = pos;
                userMarker.SetActive(true);
            }
        }
        
        /// <summary>
        /// Set destination position
        /// </summary>
        public void SetDestination(double latitude, double longitude)
        {
            if (destinationMarker != null)
            {
                Vector3 pos = GPSToWorldPosition(latitude, longitude);
                pos.y = GetTerrainHeight(pos) + 2f;
                destinationMarker.transform.position = pos;
                destinationMarker.SetActive(true);
                
                // Focus on destination
                FocusOnPosition(pos);
            }
        }
        
        /// <summary>
        /// Focus camera on a specific position
        /// </summary>
        public void FocusOnPosition(Vector3 position)
        {
            focusPoint = position;
            UpdateCameraPosition();
        }
        
        /// <summary>
        /// Get terrain/model height at position (raycast down)
        /// </summary>
        private float GetTerrainHeight(Vector3 position)
        {
            RaycastHit hit;
            if (Physics.Raycast(position + Vector3.up * 100f, Vector3.down, out hit, 200f))
            {
                return hit.point.y;
            }
            return 0f;
        }
        
        private GameObject CreateDefaultMarker(Color color, string name)
        {
            GameObject marker = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            marker.name = name;
            marker.transform.SetParent(transform);
            marker.transform.localScale = Vector3.one * 3f;
            
            // Remove collider
            Destroy(marker.GetComponent<Collider>());
            
            // Set material
            Renderer rend = marker.GetComponent<Renderer>();
            rend.material = new Material(Shader.Find("Standard"));
            rend.material.color = color;
            rend.material.SetFloat("_Metallic", 0f);
            rend.material.SetFloat("_Glossiness", 0.8f);
            
            // Add pulsing animation
            marker.AddComponent<MarkerPulse>();
            
            marker.SetActive(false);
            return marker;
        }
        
        /// <summary>
        /// Update the path line between user and destination
        /// </summary>
        public void UpdatePath(Vector3[] waypoints)
        {
            if (pathLine == null) return;
            
            pathLine.positionCount = waypoints.Length;
            for (int i = 0; i < waypoints.Length; i++)
            {
                Vector3 pos = waypoints[i];
                pos.y = GetTerrainHeight(pos) + 0.5f;
                pathLine.SetPosition(i, pos);
            }
        }
    }
    
    /// <summary>
    /// Simple pulsing animation for markers
    /// </summary>
    public class MarkerPulse : MonoBehaviour
    {
        [SerializeField] private float pulseSpeed = 2f;
        [SerializeField] private float minScale = 0.8f;
        [SerializeField] private float maxScale = 1.2f;
        
        private Vector3 baseScale;
        
        private void Start()
        {
            baseScale = transform.localScale;
        }
        
        private void Update()
        {
            float scale = Mathf.Lerp(minScale, maxScale, (Mathf.Sin(Time.time * pulseSpeed) + 1f) * 0.5f);
            transform.localScale = baseScale * scale;
        }
    }
}
