using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

namespace CampusNavigator.AR.UI
{
    /// <summary>
    /// Glassmorphism Panel - Creates the frosted glass effect used in ARScene UI
    /// Uses blur effect and semi-transparent background
    /// </summary>
    [RequireComponent(typeof(Image))]
    public class GlassmorphismPanel : MonoBehaviour
    {
        [Header("Glassmorphism Settings")]
        [SerializeField] private Color backgroundColor = new Color(0f, 0f, 0f, 0.55f);
        [SerializeField] private Color borderColor = new Color(1f, 1f, 1f, 0.12f);
        [SerializeField] private float borderWidth = 1f;
        [SerializeField] private float cornerRadius = 16f;
        
        [Header("Blur Settings")]
        [SerializeField] private bool useBlur = true;
        [SerializeField] [Range(0f, 1f)] private float blurAmount = 0.5f;
        
        private Image backgroundImage;
        private Outline borderOutline;

        private void Awake()
        {
            SetupGlassmorphism();
        }

        private void SetupGlassmorphism()
        {
            // Setup background
            backgroundImage = GetComponent<Image>();
            if (backgroundImage != null)
            {
                backgroundImage.color = backgroundColor;
                
                // Use rounded sprite if available
                // You can create a rounded rect sprite in Unity
            }

            // Setup border
            borderOutline = GetComponent<Outline>();
            if (borderOutline == null)
            {
                borderOutline = gameObject.AddComponent<Outline>();
            }
            borderOutline.effectColor = borderColor;
            borderOutline.effectDistance = new Vector2(borderWidth, borderWidth);
        }

        public void SetBackgroundColor(Color color)
        {
            backgroundColor = color;
            if (backgroundImage != null)
            {
                backgroundImage.color = color;
            }
        }

        public void SetBorderColor(Color color)
        {
            borderColor = color;
            if (borderOutline != null)
            {
                borderOutline.effectColor = color;
            }
        }
    }

    /// <summary>
    /// Pulse Animation - Applies a pulsing scale effect
    /// </summary>
    public class PulseAnimation : MonoBehaviour
    {
        [SerializeField] private float pulseSpeed = 3f;
        [SerializeField] private float pulseAmount = 0.1f;
        [SerializeField] private bool pulseWhenEnabled = true;

        private Vector3 originalScale;
        private bool isPulsing = false;

        private void Awake()
        {
            originalScale = transform.localScale;
        }

        private void OnEnable()
        {
            if (pulseWhenEnabled)
            {
                StartPulsing();
            }
        }

        private void OnDisable()
        {
            StopPulsing();
        }

        private void Update()
        {
            if (isPulsing)
            {
                float pulse = Mathf.Sin(Time.time * pulseSpeed) * pulseAmount + 1f;
                transform.localScale = originalScale * pulse;
            }
        }

        public void StartPulsing()
        {
            isPulsing = true;
        }

        public void StopPulsing()
        {
            isPulsing = false;
            transform.localScale = originalScale;
        }

        public void SetPulseParameters(float speed, float amount)
        {
            pulseSpeed = speed;
            pulseAmount = amount;
        }
    }

    /// <summary>
    /// Fade In Animation - Animates alpha from 0 to 1
    /// </summary>
    [RequireComponent(typeof(CanvasGroup))]
    public class FadeInAnimation : MonoBehaviour
    {
        [SerializeField] private float duration = 0.3f;
        [SerializeField] private bool playOnEnable = true;
        [SerializeField] private AnimationCurve curve = AnimationCurve.EaseInOut(0, 0, 1, 1);

        private CanvasGroup canvasGroup;
        private Coroutine fadeCoroutine;

        private void Awake()
        {
            canvasGroup = GetComponent<CanvasGroup>();
        }

        private void OnEnable()
        {
            if (playOnEnable)
            {
                FadeIn();
            }
        }

        public void FadeIn()
        {
            if (fadeCoroutine != null)
            {
                StopCoroutine(fadeCoroutine);
            }
            fadeCoroutine = StartCoroutine(DoFade(0f, 1f));
        }

        public void FadeOut()
        {
            if (fadeCoroutine != null)
            {
                StopCoroutine(fadeCoroutine);
            }
            fadeCoroutine = StartCoroutine(DoFade(1f, 0f));
        }

        private System.Collections.IEnumerator DoFade(float from, float to)
        {
            float elapsed = 0f;
            canvasGroup.alpha = from;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = curve.Evaluate(elapsed / duration);
                canvasGroup.alpha = Mathf.Lerp(from, to, t);
                yield return null;
            }

            canvasGroup.alpha = to;
        }
    }

    /// <summary>
    /// Scale In Animation - Animates scale from 0 to 1 with bounce
    /// </summary>
    public class ScaleInAnimation : MonoBehaviour
    {
        [SerializeField] private float duration = 0.3f;
        [SerializeField] private bool playOnEnable = true;
        [SerializeField] private AnimationCurve curve = AnimationCurve.EaseInOut(0, 0, 1, 1);

        private Vector3 originalScale;
        private Coroutine scaleCoroutine;

        private void Awake()
        {
            originalScale = transform.localScale;
        }

        private void OnEnable()
        {
            if (playOnEnable)
            {
                ScaleIn();
            }
        }

        public void ScaleIn()
        {
            if (scaleCoroutine != null)
            {
                StopCoroutine(scaleCoroutine);
            }
            scaleCoroutine = StartCoroutine(DoScale(Vector3.zero, originalScale));
        }

        public void ScaleOut()
        {
            if (scaleCoroutine != null)
            {
                StopCoroutine(scaleCoroutine);
            }
            scaleCoroutine = StartCoroutine(DoScale(originalScale, Vector3.zero));
        }

        private System.Collections.IEnumerator DoScale(Vector3 from, Vector3 to)
        {
            float elapsed = 0f;
            transform.localScale = from;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = curve.Evaluate(elapsed / duration);
                transform.localScale = Vector3.Lerp(from, to, t);
                yield return null;
            }

            transform.localScale = to;
        }
    }

    /// <summary>
    /// Slide Animation - Slides element in from edge
    /// </summary>
    public class SlideAnimation : MonoBehaviour
    {
        public enum SlideDirection { Up, Down, Left, Right }
        
        [SerializeField] private SlideDirection direction = SlideDirection.Up;
        [SerializeField] private float duration = 0.3f;
        [SerializeField] private float slideDistance = 100f;
        [SerializeField] private bool playOnEnable = true;
        [SerializeField] private AnimationCurve curve = AnimationCurve.EaseInOut(0, 0, 1, 1);

        private RectTransform rectTransform;
        private Vector2 originalPosition;
        private Coroutine slideCoroutine;

        private void Awake()
        {
            rectTransform = GetComponent<RectTransform>();
            if (rectTransform != null)
            {
                originalPosition = rectTransform.anchoredPosition;
            }
        }

        private void OnEnable()
        {
            if (playOnEnable && rectTransform != null)
            {
                SlideIn();
            }
        }

        public void SlideIn()
        {
            if (slideCoroutine != null)
            {
                StopCoroutine(slideCoroutine);
            }
            
            Vector2 startPosition = GetOffscreenPosition();
            slideCoroutine = StartCoroutine(DoSlide(startPosition, originalPosition));
        }

        public void SlideOut()
        {
            if (slideCoroutine != null)
            {
                StopCoroutine(slideCoroutine);
            }
            
            Vector2 endPosition = GetOffscreenPosition();
            slideCoroutine = StartCoroutine(DoSlide(originalPosition, endPosition));
        }

        private Vector2 GetOffscreenPosition()
        {
            switch (direction)
            {
                case SlideDirection.Up:
                    return originalPosition + new Vector2(0, slideDistance);
                case SlideDirection.Down:
                    return originalPosition - new Vector2(0, slideDistance);
                case SlideDirection.Left:
                    return originalPosition - new Vector2(slideDistance, 0);
                case SlideDirection.Right:
                    return originalPosition + new Vector2(slideDistance, 0);
                default:
                    return originalPosition;
            }
        }

        private System.Collections.IEnumerator DoSlide(Vector2 from, Vector2 to)
        {
            float elapsed = 0f;
            rectTransform.anchoredPosition = from;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = curve.Evaluate(elapsed / duration);
                rectTransform.anchoredPosition = Vector2.Lerp(from, to, t);
                yield return null;
            }

            rectTransform.anchoredPosition = to;
        }
    }
}
