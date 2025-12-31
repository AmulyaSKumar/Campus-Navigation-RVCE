// src/api/geolocation.js

// FAKE LOCATION: ISE Dept RVCE - Set to true for demo/presentation
const USE_FAKE_LOCATION = true;
const FAKE_COORDS = {
    latitude: 12.923383,   // ISE Dept RVCE
    longitude: 77.501071
};

export const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        // Use fake location for demo
        if (USE_FAKE_LOCATION) {
            console.log("📍 Using fake location: ISE Dept RVCE");
            resolve(FAKE_COORDS);
            return;
        }

        // Check if the browser supports geolocation
        if (navigator.geolocation) {
            // Get current position
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    resolve({ latitude, longitude }); // Return the coordinates
                },
                (error) => {
                    reject(error); // Reject if there's an error getting the location
                }
            );
        } else {
            reject(new Error("Geolocation not supported by this browser."));
        }
    });
};
