import axios from "axios";

const PELIAS_BASE_URL = "https://api.geocode.earth/v1";

export const geocodeLocation = async (location) => {
    try {
        const response = await axios.get(`${PELIAS_BASE_URL}/search`, {
            params: {
                text: location,
                api_key: process.env.REACT_APP_PELIAS_API_KEY,
            },
        });
        return response.data.features[0].geometry.coordinates; // [lng, lat]
    } catch (error) {
        console.error("Pelias geocoding error:", error);
        throw error;
    }
};
