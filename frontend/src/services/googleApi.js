import axios from "axios";

const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";

if (!API_KEY) {
    console.warn(
        "REACT_APP_GOOGLE_MAPS_API_KEY is not set. Add it to your .env file for map features to work."
    );
}

export const getCoordinates = async (address) => {
    if (!API_KEY) throw new Error("Google Maps API key is not configured.");

    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
        params: {
            address,
            key: API_KEY,
        },
    });

    if (!response.data || !response.data.results || response.data.results.length === 0) {
        throw new Error("No geocoding results returned");
    }

    return response.data.results[0].geometry.location;
};
