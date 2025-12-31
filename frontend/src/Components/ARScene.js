import React, { useEffect, useState, useRef } from "react";
import "./ARScene.css";

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

const ARScene = ({ selectedLocation, onClose }) => {
  const [arStatus, setArStatus] = useState("initializing");
  const [distance, setDistance] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [arrived, setArrived] = useState(false);
  const [allLocations, setAllLocations] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const compassHeadingRef = useRef(0);
  const watchIdRef = useRef(null);

  /**
   * HAVERSINE FORMULA
   * Calculates the great-circle distance between two points on Earth
   * given their latitude and longitude in decimal degrees
   *
   * @param {number} lat1 - User latitude
   * @param {number} lon1 - User longitude
   * @param {number} lat2 - Destination latitude
   * @param {number} lon2 - Destination longitude
   * @returns {number} Distance in meters
   */
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  /**
   * BEARING CALCULATION
   * Calculates the bearing (initial compass direction) from point A to point B
   * using the forward azimuth formula
   *
   * @param {number} lat1 - Starting latitude
   * @param {number} lon1 - Starting longitude
   * @param {number} lat2 - Destination latitude
   * @param {number} lon2 - Destination longitude
   * @returns {number} Bearing in degrees (0-360)
   */
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;

    const dLon = toRad(lon2 - lon1);

    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

    let bearing = Math.atan2(y, x);
    bearing = (toDeg(bearing) + 360) % 360;
    return bearing;
  };

  /**
   * REQUEST CAMERA PERMISSION
   * Prompts user for camera access and starts video stream
   */
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use rear camera
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startARRendering();
        };
      }
    } catch (error) {
      console.error("Camera permission denied:", error);
      setArStatus("error");
      alert("Camera permission required for AR navigation");
    }
  };

  /**
   * REQUEST DEVICE ORIENTATION PERMISSION
   * iOS 13+ requires explicit user permission for device orientation
   */
  const requestDeviceOrientationPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        return permission === "granted";
      } catch (error) {
        console.error("Orientation permission denied:", error);
        return false;
      }
    }
    return true; // Android doesn't require explicit permission
  };

  /**
   * GET DEVICE COMPASS HEADING
   * Listens to device orientation events and extracts compass heading
   * Falls back to alpha rotation for non-iOS devices
   */
  const startCompassTracking = () => {
    const handleOrientation = (event) => {
      let heading = event.alpha; // 0-360 degrees (compass)

      // iOS Safari uses webkitCompassHeading
      if (typeof event.webkitCompassHeading !== "undefined") {
        heading = event.webkitCompassHeading;
      }

      // Normalize heading
      heading = (heading + 360) % 360;
      compassHeadingRef.current = heading;
    };

    window.addEventListener("deviceorientation", handleOrientation);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  };

  /**
   * START AR RENDERING
   * Main AR rendering loop using canvas to draw AR elements
   * - Gets user's camera feed
   * - Calculates object positions based on GPS
   * - Draws AR arrows pointing toward destination
   * - Updates in real-time as user moves
   */
  const startARRendering = () => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    /**
     * DRAW AR ARROW
     * Renders an arrow pointing in a specific direction
     * Arrow rotates based on bearing and device heading
     *
     * @param {number} x - Screen X position
     * @param {number} y - Screen Y position
     * @param {number} angle - Rotation angle in degrees
     * @param {string} color - Arrow color
     * @param {string} label - Label text
     */
    const drawArrow = (x, y, angle, color, label) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((angle * Math.PI) / 180);

      // Draw arrow shape
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;

      // Triangle pointing up
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(-20, 20);
      ctx.lineTo(0, 10);
      ctx.lineTo(20, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Label below arrow
      ctx.fillStyle = "white";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(label, 0, 45);

      ctx.restore();
    };

    /**
     * ANIMATION LOOP
     * Continuously renders AR scene:
     * 1. Clears canvas
     * 2. Draws video feed
     * 3. Calculates bearing from user to destination
     * 4. Adjusts bearing by device heading (compass)
     * 5. Draws AR arrow at screen center
     * 6. Updates distance and status
     */
    const animate = () => {
      // Clear canvas
      ctx.fillStyle = "rgba(0, 0, 0, 0)";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw destination arrow at screen center
      if (userLocation && selectedLocation && distance !== null) {
        // Calculate bearing to destination
        const bearing = calculateBearing(
          userLocation.latitude,
          userLocation.longitude,
          selectedLocation.coordinates[0],
          selectedLocation.coordinates[1]
        );

        // Adjust bearing by device heading for real-world orientation
        // This makes the arrow point toward the actual destination
        const screenBearing = (bearing - compassHeadingRef.current + 360) % 360;

        // Draw main destination arrow (center)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        drawArrow(
          centerX,
          centerY,
          screenBearing,
          "rgba(76, 175, 80, 0.8)",
          selectedLocation.name
        );

        // Draw nearby locations as reference arrows (semi-transparent)
        if (allLocations.length > 0) {
          allLocations.forEach((location) => {
            if (location.name !== selectedLocation.name) {
              const dist = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                location.coordinates[0],
                location.coordinates[1]
              );

              // Only show nearby locations (within 500m)
              if (dist < 500) {
                const locBearing = calculateBearing(
                  userLocation.latitude,
                  userLocation.longitude,
                  location.coordinates[0],
                  location.coordinates[1]
                );
                const locScreenBearing = (locBearing - compassHeadingRef.current + 360) % 360;

                // Draw reference arrow (smaller, at side)
                const sideX = centerX + Math.cos((locScreenBearing * Math.PI) / 180) * 150;
                const sideY = centerY + Math.sin((locScreenBearing * Math.PI) / 180) * 150;
                drawArrow(sideX, sideY, locScreenBearing, "rgba(255, 193, 7, 0.4)", "");
              }
            }
          });
        }
      }

      // Draw compass heading indicator (top-left)
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(10, 70, 120, 40);
      ctx.fillStyle = "white";
      ctx.font = "14px Arial";
      ctx.fillText(`Heading: ${Math.round(compassHeadingRef.current)}°`, 20, 90);
      ctx.fillText(`Accuracy: ${distance !== null ? Math.round(distance) + "m" : "---"}`, 20, 110);

      // Continue animation loop
      requestAnimationFrame(animate);
    };

    animate();
  };

  /**
   * FETCH ALL LOCATIONS FROM BACKEND
   * Gets location data from MongoDB via Flask API
   */
  const fetchAllLocations = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/locations`);
      if (response.ok) {
        const data = await response.json();
        setAllLocations(data);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  /**
   * START GPS TRACKING
   * Continuously monitors user's location using geolocation API
   * Updates distance to destination in real-time
   */
  const startGPSTracking = async () => {
    if (!navigator.geolocation && !USE_FAKE_LOCATION) {
      setArStatus("error");
      alert("Geolocation not supported");
      return;
    }

    setArStatus("tracking");

    // Watch user position (updates as they move)
    watchIdRef.current = watchFakeOrRealPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });

        if (selectedLocation) {
          // Calculate real-time distance using Haversine formula
          const dist = calculateDistance(
            latitude,
            longitude,
            selectedLocation.coordinates[0],
            selectedLocation.coordinates[1]
          );
          setDistance(dist);

          // Check if user has arrived (within 10 meters)
          if (dist < 10) {
            setArrived(true);
            clearFakeOrRealWatch(watchIdRef.current);
          }
        }
      },
      (error) => {
        console.error("GPS Error:", error);
        let errorMessage = "GPS Error: ";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Location permission denied. Please enable location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location unavailable. Please check your internet connection and GPS signal.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out. Please try again.";
            break;
          default:
            errorMessage += error.message || "Unknown error";
        }
        
        console.error(errorMessage);
        setArStatus("error");
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true, // Better accuracy but uses more battery
        maximumAge: 1000, // Accept position if < 1 second old
        timeout: 15000, // Wait max 15 seconds for position (increased from 5s)
      }
    );
  };

  // Initialize AR on component mount
  useEffect(() => {
    const initializeAR = async () => {
      const orientationOK = await requestDeviceOrientationPermission();
      if (orientationOK) {
        fetchAllLocations();
        requestCameraPermission();
        startGPSTracking();
        startCompassTracking();
      }
    };

    initializeAR();

    // Cleanup
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
      if (watchIdRef.current) {
        clearFakeOrRealWatch(watchIdRef.current);
      }
    };
  }, [selectedLocation]);

  return (
    <div className="ar-scene-container">
      {/* Camera Stream */}
      <video
        ref={videoRef}
        className="ar-video"
        playsInline
        muted
      ></video>

      {/* AR Canvas Overlay */}
      <canvas ref={canvasRef} className="ar-canvas"></canvas>

      {/* Status Bar */}
      <div className="ar-status-bar">
        <div className="status-info">
          <span className={`status-dot ${arStatus}`}></span>
          <span className="status-text">
            {arStatus === "initializing" && "Initializing AR..."}
            {arStatus === "tracking" && "AR Active"}
            {arStatus === "error" && "Error - Check permissions"}
          </span>
        </div>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Destination Info */}
      {selectedLocation && !arrived && (
        <div className="destination-card">
          <h3>{selectedLocation.name}</h3>
          {distance !== null && (
            <p className="distance">{Math.round(distance)} meters away</p>
          )}
          <p className="instruction">Follow the arrow →</p>
        </div>
      )}

      {/* Arrival Notification */}
      {arrived && (
        <div className="arrival-overlay">
          <div className="arrival-modal">
            <h2>🎉 Arrived!</h2>
            <p>{selectedLocation.name}</p>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="ar-controls">
        <button
          className="control-btn"
          onClick={() => {
            // Trigger compass calibration
            console.log("Calibrating compass...");
          }}
          title="Calibrate Compass"
        >
          🧭
        </button>
      </div>
    </div>
  );
};

export default ARScene;
