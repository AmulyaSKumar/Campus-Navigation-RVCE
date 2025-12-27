import axios from "axios";

// Primary: OpenRouteService API
const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car";

// Fallback: OSRM (self-hosted or demo)
const OSRM_URL = process.env.REACT_APP_OSRM_URL || "https://router.project-osrm.org";

/**
 * Get route using OpenRouteService (primary)
 * Requires valid API key in environment
 */
const getRouteViaORS = async (start, end) => {
    const apiKey = process.env.REACT_APP_ORS_API_KEY;

    if (!apiKey || apiKey === "YOUR_ORS_API_KEY_HERE") {
        console.warn("OpenRouteService API key not configured. Using OSRM fallback.");
        return null;
    }

    try {
        const response = await axios.post(ORS_URL, {
            coordinates: [
                [start.lng, start.lat],
                [end.lng, end.lat],
            ],
        }, {
            headers: {
                Authorization: apiKey,
            },
        });

        return response.data.features[0].geometry.coordinates;
    } catch (error) {
        console.error("OpenRouteService Error:", error);
        return null;
    }
};

/**
 * Get route using OSRM (fallback)
 * Note: Demo server is not for production use
 * For production, set up your own OSRM server or use a paid service
 */
const getRouteViaOSRM = async (start, end) => {
    try {
        const url = `${OSRM_URL}/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson`;
        
        const response = await axios.get(url);

        if (response.data.routes && response.data.routes.length > 0) {
            return response.data.routes[0].geometry.coordinates;
        }
        return [];
    } catch (error) {
        console.error("OSRM Error:", error);
        return [];
    }
};

/**
 * Get route with fallback logic
 * Primary: OpenRouteService (production)
 * Fallback: OSRM (development only)
 */
export const getRoute = async (start, end) => {
    // Try ORS first (production service)
    const orsRoute = await getRouteViaORS(start, end);
    if (orsRoute && orsRoute.length > 0) {
        console.info("Route retrieved from OpenRouteService");
        return orsRoute;
    }

    // Fallback to OSRM (development service)
    console.warn(
        "Falling back to OSRM. Note: OSRM demo server is NOT suitable for production. " +
        "Please configure OpenRouteService API key or set up your own OSRM server."
    );
    const osrmRoute = await getRouteViaOSRM(start, end);
    return osrmRoute;
};

