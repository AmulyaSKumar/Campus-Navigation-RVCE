// src/api/geolocation.js

export const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
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
