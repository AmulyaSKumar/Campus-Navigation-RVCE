import axios from "axios";

const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions";

export const getDirections = async (start, end) => {
    try {
        const response = await axios.post(`${ORS_BASE_URL}/foot-walking`, {
            coordinates: [start, end],
        }, {
            headers: { Authorization: process.env.REACT_APP_ORS_API_KEY },
        });
        return response.data.routes[0].geometry.coordinates; // Array of [lng, lat]
    } catch (error) {
        console.error("ORS routing error:", error);
        throw error;
    }
};
