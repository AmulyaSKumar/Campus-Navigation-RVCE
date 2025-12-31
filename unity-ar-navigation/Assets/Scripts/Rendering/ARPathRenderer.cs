using UnityEngine;
using UnityEngine.UI;
using static CampusNavigator.AR.ARNavigationManager;

namespace CampusNavigator.AR
{
    /// <summary>
    /// AR Path Renderer - Draws navigation arrows and path on the AR canvas
    /// Replicates the canvas drawing from ARScene.js with softened colors
    /// </summary>
    public class ARPathRenderer : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private ARNavigationManager navigationManager;
        [SerializeField] private RectTransform canvasRect;

        [Header("Arrow Settings")]
        [SerializeField] private GameObject arrowPrefab;
        [SerializeField] private int maxArrows = 3;
        [SerializeField] private float arrowSpacing = 0.25f;
        [SerializeField] private float arrowSpeed = 0.4f;

        [Header("Path Line")]
        [SerializeField] private LineRenderer pathLine;
        [SerializeField] private int pathSegments = 20;

        [Header("Destination Marker")]
        [SerializeField] private GameObject destinationMarker;
        [SerializeField] private RectTransform destinationMarkerRect;

        [Header("Turn Indicators")]
        [SerializeField] private GameObject leftTurnIndicator;
        [SerializeField] private GameObject rightTurnIndicator;

        [Header("Colors - Softened palette")]
        [SerializeField] private Color primaryColor = new Color(0.376f, 0.784f, 0.910f, 1f);      // #60C8E8 - Soft cyan
        [SerializeField] private Color alignedColor = new Color(0.490f, 0.831f, 0.659f, 1f);      // #7DD4A8 - Soft green
        [SerializeField] private Color turnColor = new Color(0.902f, 0.667f, 0.196f, 0.7f);       // Soft amber

        [Header("Aligned Mode Settings")]
        [SerializeField] private float alignedArrowScale = 0.7f;
        [SerializeField] private float alignedArrowAlpha = 0.5f;
        [SerializeField] private float alignedPathWidth = 0.06f;
        [SerializeField] private float normalPathWidth = 0.1f;

        private GameObject[] arrows;
        private float animationTime = 0f;
        private bool isOnTrack = false;
        private float relativeBearing = 0f;
        private TurnDirection currentTurnDirection = TurnDirection.Straight;

        private void Start()
        {
            InitializeArrows();
            InitializePathLine();

            if (navigationManager != null)
            {
                navigationManager.OnNavigationStateChanged += OnNavigationStateChanged;
            }
        }

        private void OnDestroy()
        {
            if (navigationManager != null)
            {
                navigationManager.OnNavigationStateChanged -= OnNavigationStateChanged;
            }
        }

        private void InitializeArrows()
        {
            if (arrowPrefab == null) return;

            arrows = new GameObject[maxArrows];
            for (int i = 0; i < maxArrows; i++)
            {
                arrows[i] = Instantiate(arrowPrefab, transform);
                arrows[i].name = $"NavigationArrow_{i}";
            }
        }

        private void InitializePathLine()
        {
            if (pathLine == null) return;

            pathLine.positionCount = pathSegments;
            pathLine.startWidth = normalPathWidth;
            pathLine.endWidth = normalPathWidth * 0.3f;

            // Set material for glow effect
            var material = pathLine.material;
            if (material != null)
            {
                material.SetColor("_Color", primaryColor);
            }
        }

        private void OnNavigationStateChanged(NavigationState state)
        {
            isOnTrack = state.isOnTrack;
            relativeBearing = state.relativeBearing;
            currentTurnDirection = state.turnDirection;

            UpdatePathVisuals();
            UpdateTurnIndicators();
        }

        private void Update()
        {
            animationTime += Time.deltaTime;
            UpdateArrows();
            UpdatePathLine();
            UpdateDestinationMarker();
        }

        private void UpdateArrows()
        {
            if (arrows == null || canvasRect == null) return;

            // Fewer arrows when on track, slower animation
            int activeArrowCount = isOnTrack ? 2 : 3;
            float speed = isOnTrack ? 0.4f : 0.6f;

            for (int i = 0; i < arrows.Length; i++)
            {
                if (i >= activeArrowCount)
                {
                    arrows[i].SetActive(false);
                    continue;
                }

                arrows[i].SetActive(true);

                float progress = ((animationTime * speed + (float)i / activeArrowCount) % 1f);
                
                // Calculate position
                float canvasHeight = canvasRect.rect.height;
                float canvasWidth = canvasRect.rect.width;

                float y = Mathf.Lerp(canvasHeight * 0.35f, canvasHeight * 0.9f, progress);
                float scale = Mathf.Lerp(1.2f, 0.5f, progress);
                
                // Apply aligned mode adjustments
                if (isOnTrack)
                {
                    scale *= alignedArrowScale;
                }

                // Calculate X offset based on bearing
                float pathOffsetX = CalculatePathOffset(relativeBearing, canvasWidth);
                float curveProgress = progress;
                float x = (canvasWidth / 2f) + pathOffsetX * (1f - curveProgress) * curveProgress * 2f;

                // Position arrow
                var rectTransform = arrows[i].GetComponent<RectTransform>();
                if (rectTransform != null)
                {
                    rectTransform.anchoredPosition = new Vector2(x - canvasWidth / 2f, -y + canvasHeight / 2f);
                    rectTransform.localScale = Vector3.one * scale;
                }

                // Set alpha based on progress and aligned state
                float alpha = (1f - progress * 0.6f);
                if (isOnTrack) alpha *= alignedArrowAlpha;

                var image = arrows[i].GetComponent<Image>();
                if (image != null)
                {
                    Color color = isOnTrack ? alignedColor : primaryColor;
                    color.a = alpha;
                    image.color = color;
                }

                // Apply glow via outline or shadow
                var outline = arrows[i].GetComponent<Outline>();
                if (outline != null)
                {
                    Color glowColor = isOnTrack ? alignedColor : primaryColor;
                    glowColor.a = alpha * 0.5f;
                    outline.effectColor = glowColor;
                    outline.effectDistance = new Vector2(isOnTrack ? 2f : 4f, isOnTrack ? 2f : 4f);
                }
            }
        }

        private void UpdatePathLine()
        {
            if (pathLine == null || canvasRect == null) return;

            float canvasHeight = canvasRect.rect.height;
            float canvasWidth = canvasRect.rect.width;
            float pathOffsetX = CalculatePathOffset(relativeBearing, canvasWidth);

            // Update path width based on aligned state
            float width = isOnTrack ? alignedPathWidth : normalPathWidth;
            pathLine.startWidth = width;
            pathLine.endWidth = width * 0.3f;

            // Update path color
            Color pathColor = isOnTrack ? alignedColor : primaryColor;
            pathColor.a = isOnTrack ? 0.4f : 0.7f;
            
            if (pathLine.material != null)
            {
                pathLine.material.SetColor("_Color", pathColor);
            }

            // Draw curved path
            Vector3[] positions = new Vector3[pathSegments];
            for (int i = 0; i < pathSegments; i++)
            {
                float t = (float)i / (pathSegments - 1);
                float startY = canvasHeight * 0.3f;
                float endY = canvasHeight * 0.95f;
                
                float y = Mathf.Lerp(startY, endY, t);
                float x = canvasWidth / 2f;

                // Apply quadratic curve based on offset
                float curveT = t;
                x += pathOffsetX * 0.5f * (1f - curveT) + pathOffsetX * curveT * (1f - curveT) * 2f;

                positions[i] = new Vector3(x - canvasWidth / 2f, -y + canvasHeight / 2f, 0);
            }

            pathLine.SetPositions(positions);
        }

        private void UpdateDestinationMarker()
        {
            if (destinationMarker == null || canvasRect == null) return;

            // Show destination marker when facing it (within 45 degrees)
            bool showMarker = relativeBearing > 315f || relativeBearing < 45f;
            destinationMarker.SetActive(showMarker);

            if (showMarker && destinationMarkerRect != null)
            {
                float canvasWidth = canvasRect.rect.width;
                float canvasHeight = canvasRect.rect.height;

                // Calculate X position based on bearing
                float adjustedBearing = relativeBearing > 180f ? -(360f - relativeBearing) : relativeBearing;
                float markerX = adjustedBearing * 2f;

                destinationMarkerRect.anchoredPosition = new Vector2(markerX, canvasHeight * 0.24f);

                // Apply pulse animation - slower when on track
                float pulseSpeed = isOnTrack ? 1.5f : 3f;
                float pulseAmount = isOnTrack ? 0.05f : 0.1f;
                float pulse = Mathf.Sin(animationTime * pulseSpeed) * pulseAmount + 1f;
                destinationMarkerRect.localScale = Vector3.one * pulse;

                // Adjust alpha when on track (less prominent)
                var image = destinationMarker.GetComponent<Image>();
                if (image != null)
                {
                    Color color = image.color;
                    color.a = isOnTrack ? 0.7f : 0.9f;
                    image.color = color;
                }
            }
        }

        private void UpdateTurnIndicators()
        {
            // Only show turn indicators when NOT on track
            if (leftTurnIndicator != null)
                leftTurnIndicator.SetActive(currentTurnDirection == TurnDirection.Left);

            if (rightTurnIndicator != null)
                rightTurnIndicator.SetActive(currentTurnDirection == TurnDirection.Right);
        }

        private void UpdatePathVisuals()
        {
            // Update colors and effects based on on-track state
            if (pathLine != null && pathLine.material != null)
            {
                Color color = isOnTrack ? alignedColor : primaryColor;
                color.a = isOnTrack ? 0.4f : 0.7f;
                pathLine.material.SetColor("_Color", color);
            }
        }

        private float CalculatePathOffset(float bearing, float canvasWidth)
        {
            if (bearing > 0 && bearing <= 180)
            {
                // Destination is to the right
                return Mathf.Min((bearing / 90f) * 150f, 200f);
            }
            else if (bearing > 180 && bearing < 360)
            {
                // Destination is to the left
                return -Mathf.Min(((360f - bearing) / 90f) * 150f, 200f);
            }
            return 0f;
        }
    }
}
