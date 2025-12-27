import axios from "axios";

const PELIAS_URL = "https://api.geocode.earth/v1/search";

export const searchLocation = async (query) => {
    const apiKey = process.env.REACT_APP_PELIAS_API_KEY;

    try {
        const response = await axios.get(PELIAS_URL, {
            params: {
                text: query,
                api_key: apiKey,
            },
        });
        return response.data.features; // Returns an array of matching locations
    } catch (error) {
        console.error("Error fetching location:", error);
        return [];
    }
};
