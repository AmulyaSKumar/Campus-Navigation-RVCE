/**
 * Google Maps API Loader
 * Dynamically loads Google Maps JavaScript API with environment variables
 * This ensures environment variables are properly substituted
 */

let mapsLoaded = false;
let loadingPromise = null;

/**
 * Load Google Maps API script dynamically
 * Uses environment variable for API key
 * Supports async loading for optimal performance
 */
export const loadGoogleMapsAPI = () => {
  // Return cached promise if already loaded or loading
  if (mapsLoaded) {
    return Promise.resolve();
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve, reject) => {
    // Check if already loaded by another method
    if (window.google && window.google.maps) {
      mapsLoaded = true;
      resolve();
      return;
    }

    // Get API key from environment
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
      console.warn(
        "Google Maps API key not configured. " +
        "Please add REACT_APP_GOOGLE_MAPS_API_KEY to your .env file"
      );
      // Don't reject, just warn - app can still work with some features disabled
      resolve();
      return;
    }

    try {
      // Create script element
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      // Handle successful load
      script.onload = () => {
        console.log("✓ Google Maps API loaded successfully");
        mapsLoaded = true;
        resolve();
      };

      // Handle errors
      script.onerror = (error) => {
        console.error("✗ Failed to load Google Maps API:", error);
        // Check for common API key issues
        if (apiKey.includes("%") || apiKey.includes("YOUR_")) {
          console.error("Invalid API key. Please check your .env file.");
        }
        reject(new Error("Failed to load Google Maps API"));
      };

      // Add to document
      document.head.appendChild(script);
    } catch (error) {
      console.error("Error loading Google Maps API:", error);
      reject(error);
    }
  });

  return loadingPromise;
};

/**
 * Wait for Google Maps to be available
 * Useful for ensuring Maps is ready before using it
 */
export const waitForGoogleMaps = async (maxWaitTime = 10000) => {
  const startTime = Date.now();

  while (!window.google || !window.google.maps) {
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error("Google Maps API took too long to load");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return window.google.maps;
};

/**
 * Check if Google Maps is already loaded
 */
export const isGoogleMapsLoaded = () => {
  return mapsLoaded && window.google && window.google.maps;
};

/**
 * Get Google Maps API
 * Throws error if not loaded
 */
export const getGoogleMapsAPI = () => {
  if (!isGoogleMapsLoaded()) {
    throw new Error(
      "Google Maps API not loaded. Call loadGoogleMapsAPI() first."
    );
  }
  return window.google.maps;
};
