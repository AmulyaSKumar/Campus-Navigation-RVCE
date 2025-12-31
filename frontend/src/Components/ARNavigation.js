import React, { useEffect, useState } from "react";
import "./ARNavigation.css";

// ============ FAKE LOCATION FOR DEMO ============
const USE_FAKE_LOCATION = true;
const FAKE_LOCATION = {
  coords: {
    latitude: 12.923383,   // ISE Dept RVCE
    longitude: 77.501071,
    accuracy: 10
  }
};

let fakeWatchId = 0;
const fakeWatchIntervals = {};

const watchFakeOrRealPosition = (successCallback, errorCallback, options) => {
  if (USE_FAKE_LOCATION) {
    fakeWatchId++;
    const id = fakeWatchId;
    fakeWatchIntervals[id] = setInterval(() => successCallback(FAKE_LOCATION), 2000);
    setTimeout(() => successCallback(FAKE_LOCATION), 100);
    return id;
  }
  return navigator.geolocation.watchPosition(successCallback, errorCallback, options);
};

const clearFakeOrRealWatch = (watchId) => {
  if (USE_FAKE_LOCATION && fakeWatchIntervals[watchId]) {
    clearInterval(fakeWatchIntervals[watchId]);
    delete fakeWatchIntervals[watchId];
    return;
  }
  if (watchId) navigator.geolocation.clearWatch(watchId);
};
// ============ END FAKE LOCATION ============

const ARNavigation = ({ selectedLocation, onClose }) => {
  const [arStatus, setArStatus] = useState("initializing");
  const [distance, setDistance] = useState(null);
  const [direction, setDirection] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [arrived, setArrived] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  // Haversine formula to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate bearing (direction) from user to destination
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.cos(dLon);
    let bearing = Math.atan2(y, x);
    bearing = ((bearing * 180) / Math.PI + 360) % 360;
    return bearing;
  };

  // Format distance for display
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // Get device orientation (compass heading)
  const getDeviceHeading = (callback) => {
    if (typeof DeviceOrientationEvent !== "undefined") {
      const handler = (event) => {
        let heading = event.alpha; // 0-360 degrees
        if (typeof event.webkitCompassHeading !== "undefined") {
          heading = event.webkitCompassHeading;
        }
        callback(heading);
      };

      window.addEventListener("deviceorientation", handler);
      return () => window.removeEventListener("deviceorientation", handler);
    } else {
      console.warn("Device orientation not supported");
      callback(0);
      return () => {};
    }
  };

  // Request device orientation permission (iOS 13+)
  const requestDeviceOrientationPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        return permission === "granted";
      } catch (error) {
        console.error("Permission request error:", error);
        return false;
      }
    }
    return true; // Android doesn't require explicit permission
  };

  // Start GPS tracking
  const startGPSTracking = async () => {
    // Request device orientation permission first (iOS)
    const orientationGranted = await requestDeviceOrientationPermission();
    if (!orientationGranted) {
      setArStatus("error");
      alert("Device orientation permission required for AR navigation");
      return;
    }

    if (!navigator.geolocation && !USE_FAKE_LOCATION) {
      setArStatus("error");
      alert("Geolocation not supported in this browser");
      return;
    }

    setArStatus("tracking");

    // Start getting device heading
    const stopHeading = getDeviceHeading((heading) => {
      if (userLocation && selectedLocation) {
        const bearing = calculateBearing(
          userLocation.latitude,
          userLocation.longitude,
          selectedLocation.coordinates[0],
          selectedLocation.coordinates[1]
        );
        // Adjust bearing by device heading for real-world orientation
        const adjustedBearing = (bearing - heading + 360) % 360;
        setDirection(adjustedBearing);
      }
    });

    // Watch user position
    const watchId = watchFakeOrRealPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({ latitude, longitude });
        setGpsAccuracy(accuracy || 10);

        if (selectedLocation) {
          const dist = calculateDistance(
            latitude,
            longitude,
            selectedLocation.coordinates[0],
            selectedLocation.coordinates[1]
          );
          setDistance(dist);

          // Check arrival
          if (dist < 10) {
            setArrived(true);
          }
        }
      },
      (error) => {
        console.error("GPS Error:", error);
        setArStatus("error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      }
    );

    // Cleanup function
    return () => {
      clearFakeOrRealWatch(watchId);
      stopHeading();
    };
  };

  useEffect(() => {
    const cleanup = startGPSTracking();
    return cleanup;
  }, [selectedLocation]);

  return (
    <div className="ar-navigation-container">
      {/* AR Status Bar */}
      <div className="ar-status-bar">
        <div className="status-indicator">
          <span className={`status-dot ${arStatus}`}></span>
          <span className="status-text">
            {arStatus === "initializing" && "Initializing AR..."}
            {arStatus === "tracking" && "Tracking Active"}
            {arStatus === "error" && "Error"}
          </span>
        </div>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* AR Viewport */}
      <div className="ar-viewport">
        <video id="arVideo" autoPlay playsInline></video>

        {/* AR Overlay Canvas */}
        <canvas id="arCanvas" className="ar-canvas"></canvas>

        {/* Direction Indicator */}
        {!arrived && direction !== null && (
          <div className="direction-indicator">
            <div
              className="direction-arrow"
              style={{
                transform: `rotate(${direction}deg)`,
              }}
            >
              ↑
            </div>
          </div>
        )}

        {/* Destination Info */}
        {selectedLocation && (
          <div className={`destination-info ${arrived ? "arrived" : ""}`}>
            <h3>{selectedLocation.name}</h3>
            {distance !== null && (
              <p className="distance-text">{formatDistance(distance)}</p>
            )}
            {gpsAccuracy !== null && (
              <p className="accuracy-text">Accuracy: ±{Math.round(gpsAccuracy)}m</p>
            )}
          </div>
        )}

        {/* Arrival Notification */}
        {arrived && (
          <div className="arrival-popup">
            <div className="arrival-content">
              <h2>🎉 You have arrived!</h2>
              <p>{selectedLocation.name}</p>
              <button onClick={onClose}>Close AR View</button>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="ar-control-bar">
        <button
          className="control-button"
          onClick={() => {
            // Recenter camera - implementation in canvas drawing
            console.log("Recentering...");
          }}
          title="Recenter View"
        >
          ⊕ Center
        </button>
        <button
          className="control-button"
          onClick={() => {
            // Toggle compass calibration
            console.log("Calibrating compass...");
          }}
          title="Calibrate Compass"
        >
          🧭 Calibrate
        </button>
      </div>
    </div>
  );
};

export default ARNavigation;
