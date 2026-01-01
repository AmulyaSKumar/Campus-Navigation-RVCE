using UnityEngine;
using UnityEngine.EventSystems;

namespace CampusNavigator.AR
{
    /// <summary>
    /// Makes 3D buildings/locations clickable to set as destination
    /// Attach this to any building in your FBX model that should be selectable
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public class ClickableBuilding : MonoBehaviour, IPointerClickHandler, IPointerEnterHandler, IPointerExitHandler
    {
        [Header("Building Info")]
        [SerializeField] private string buildingName = "Building Name";
        [TextArea(2, 4)]
        [SerializeField] private string description = "";
        
        [Header("GPS Coordinates")]
        [SerializeField] private double latitude;
        [SerializeField] private double longitude;
        
        [Header("Visual Feedback")]
        [SerializeField] private Color normalColor = Color.white;
        [SerializeField] private Color hoverColor = new Color(0.376f, 0.784f, 0.91f);
        [SerializeField] private Color selectedColor = new Color(0.43f, 0.91f, 0.63f);
        [SerializeField] private bool useEmission = true;
        
        [Header("Label (Optional)")]
        [SerializeField] private GameObject labelPrefab;
        [SerializeField] private Vector3 labelOffset = new Vector3(0, 5, 0);
        
        private Renderer[] renderers;
        private Material[] originalMaterials;
        private GameObject labelInstance;
        private bool isSelected;
        private CampusMapViewer mapViewer;
        
        private void Awake()
        {
            renderers = GetComponentsInChildren<Renderer>();
            
            // Store original materials
            originalMaterials = new Material[renderers.Length];
            for (int i = 0; i < renderers.Length; i++)
            {
                originalMaterials[i] = renderers[i].material;
            }
            
            // Find map viewer
            mapViewer = FindObjectOfType<CampusMapViewer>();
            
            // Ensure collider exists
            Collider col = GetComponent<Collider>();
            if (col == null)
            {
                // Add mesh collider if no collider exists
                MeshCollider meshCol = gameObject.AddComponent<MeshCollider>();
                MeshFilter mf = GetComponent<MeshFilter>();
                if (mf != null)
                {
                    meshCol.sharedMesh = mf.sharedMesh;
                }
            }
        }
        
        private void Start()
        {
            // Create floating label if prefab assigned
            if (labelPrefab != null)
            {
                CreateLabel();
            }
        }
        
        private void CreateLabel()
        {
            labelInstance = Instantiate(labelPrefab, transform.position + labelOffset, Quaternion.identity);
            labelInstance.transform.SetParent(transform);
            
            // Try to set label text
            TMPro.TextMeshPro tmp = labelInstance.GetComponentInChildren<TMPro.TextMeshPro>();
            if (tmp != null)
            {
                tmp.text = buildingName;
            }
            
            // Make label always face camera
            labelInstance.AddComponent<Billboard>();
        }
        
        public void OnPointerClick(PointerEventData eventData)
        {
            SelectBuilding();
        }
        
        public void OnPointerEnter(PointerEventData eventData)
        {
            if (!isSelected)
            {
                SetColor(hoverColor);
            }
        }
        
        public void OnPointerExit(PointerEventData eventData)
        {
            if (!isSelected)
            {
                ResetColor();
            }
        }
        
        /// <summary>
        /// Select this building as destination
        /// </summary>
        public void SelectBuilding()
        {
            // Deselect other buildings
            ClickableBuilding[] allBuildings = FindObjectsOfType<ClickableBuilding>();
            foreach (var building in allBuildings)
            {
                if (building != this)
                {
                    building.Deselect();
                }
            }
            
            isSelected = true;
            SetColor(selectedColor);
            
            // Set as destination
            MapARSwitcher.SetGlobalDestination(buildingName, latitude, longitude);
            
            // Focus map viewer on this building
            if (mapViewer != null)
            {
                mapViewer.SetDestination(latitude, longitude);
            }
            
            Debug.Log($"Selected: {buildingName}");
        }
        
        public void Deselect()
        {
            isSelected = false;
            ResetColor();
        }
        
        private void SetColor(Color color)
        {
            foreach (var rend in renderers)
            {
                if (rend == null) continue;
                
                foreach (var mat in rend.materials)
                {
                    mat.color = color;
                    
                    if (useEmission)
                    {
                        mat.EnableKeyword("_EMISSION");
                        mat.SetColor("_EmissionColor", color * 0.3f);
                    }
                }
            }
        }
        
        private void ResetColor()
        {
            for (int i = 0; i < renderers.Length; i++)
            {
                if (renderers[i] == null) continue;
                
                renderers[i].material = originalMaterials[i];
                
                if (useEmission)
                {
                    renderers[i].material.DisableKeyword("_EMISSION");
                }
            }
        }
        
        /// <summary>
        /// Set building info at runtime
        /// </summary>
        public void SetBuildingInfo(string name, double lat, double lon, string desc = "")
        {
            buildingName = name;
            latitude = lat;
            longitude = lon;
            description = desc;
        }
        
        /// <summary>
        /// Auto-calculate GPS from world position using CampusMapViewer
        /// </summary>
        public void CalculateGPSFromPosition()
        {
            if (mapViewer != null)
            {
                mapViewer.WorldToGPSPosition(transform.position, out latitude, out longitude);
                Debug.Log($"{buildingName} GPS: {latitude}, {longitude}");
            }
        }
        
        private void OnDrawGizmosSelected()
        {
            // Draw label position
            Gizmos.color = Color.cyan;
            Gizmos.DrawWireSphere(transform.position + labelOffset, 1f);
            Gizmos.DrawLine(transform.position, transform.position + labelOffset);
        }
    }
    
    /// <summary>
    /// Makes an object always face the camera
    /// </summary>
    public class Billboard : MonoBehaviour
    {
        private Camera mainCamera;
        
        private void Start()
        {
            mainCamera = Camera.main;
        }
        
        private void LateUpdate()
        {
            if (mainCamera != null)
            {
                transform.LookAt(transform.position + mainCamera.transform.rotation * Vector3.forward,
                    mainCamera.transform.rotation * Vector3.up);
            }
        }
    }
}
