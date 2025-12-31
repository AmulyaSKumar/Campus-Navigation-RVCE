import React, { useEffect, useState, useRef, useCallback } from "react";
import { API_ENDPOINTS } from "../config/apiConfig";
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
  const [eta, setEta] = useState(null);
  const [turnDirection, setTurnDirection] = useState("straight");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const compassHeadingRef = useRef(0);
  const watchIdRef = useRef(null);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(Date.now());

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

  // Calculate ETA based on walking speed
  const calculateETA = (meters) => {
    const walkingSpeedMPerMin = 80; // ~5 km/h
    const minutes = Math.ceil(meters / walkingSpeedMPerMin);
    if (minutes < 1) return "< 1 min";
    return `${minutes} min`;
  };

  // Get turn direction text
  const getTurnText = (angle) => {
    if (angle > 315 || angle < 45) return { text: "Head straight", icon: "↑" };
    if (angle >= 45 && angle < 135) return { text: "Turn right", icon: "→" };
    if (angle >= 135 && angle < 225) return { text: "Turn around", icon: "↓" };
    return { text: "Turn left", icon: "←" };
  };

  /**
   * REQUEST CAMERA PERMISSION
   * Prompts user for camera access and starts video stream
   */
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
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
      // Start AR rendering anyway with gradient background
      startARRendering();
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
   * DRAW ANIMATED GROUND ARROW
   * Google Maps Live View style arrow on the ground
   */
  const drawGroundArrow = (ctx, x, y, scale, alpha, time) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    // Glow effect
    ctx.shadowColor = "#00E5FF";
    ctx.shadowBlur = 25 * alpha;
    
    // Main arrow shape - chevron style
    const arrowWidth = 50;
    const arrowHeight = 60;
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, -arrowHeight/2, 0, arrowHeight/2);
    gradient.addColorStop(0, `rgba(0, 229, 255, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(0, 200, 255, ${alpha * 0.9})`);
    gradient.addColorStop(1, `rgba(0, 150, 255, ${alpha * 0.6})`);
    
    // Draw arrow body
    ctx.beginPath();
    ctx.moveTo(0, -arrowHeight/2);
    ctx.lineTo(arrowWidth/2, arrowHeight/4);
    ctx.lineTo(arrowWidth/4, arrowHeight/4);
    ctx.lineTo(arrowWidth/4, arrowHeight/2);
    ctx.lineTo(-arrowWidth/4, arrowHeight/2);
    ctx.lineTo(-arrowWidth/4, arrowHeight/4);
    ctx.lineTo(-arrowWidth/2, arrowHeight/4);
    ctx.closePath();
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // White border
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner highlight
    ctx.beginPath();
    ctx.moveTo(0, -arrowHeight/2 + 10);
    ctx.lineTo(arrowWidth/3, arrowHeight/6);
    ctx.lineTo(0, arrowHeight/6 - 5);
    ctx.lineTo(-arrowWidth/3, arrowHeight/6);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
    ctx.fill();
    
    ctx.restore();
  };

  /**
   * DRAW PATH LINE
   * Draws a glowing path line on the ground
   */
  const drawPathLine = (ctx, width, height, offsetX, time) => {
    const lineWidth = 8;
    const startY = height * 0.35;
    const endY = height * 0.95;
    
    // Animated dash offset
    const dashOffset = (time * 100) % 40;
    
    ctx.save();
    
    // Glow effect
    ctx.shadowColor = "#00E5FF";
    ctx.shadowBlur = 15;
    
    // Path gradient
    const gradient = ctx.createLinearGradient(0, startY, 0, endY);
    gradient.addColorStop(0, "rgba(0, 229, 255, 0.9)");
    gradient.addColorStop(0.5, "rgba(0, 200, 255, 0.7)");
    gradient.addColorStop(1, "rgba(0, 150, 255, 0.3)");
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.setLineDash([20, 15]);
    ctx.lineDashOffset = -dashOffset;
    
    // Draw curved path
    ctx.beginPath();
    ctx.moveTo(width/2, endY);
    
    // Bezier curve based on direction
    const controlX = width/2 + offsetX * 0.5;
    ctx.quadraticCurveTo(controlX, height * 0.6, width/2 + offsetX, startY);
    ctx.stroke();
    
    // White center line
    ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  };

  /**
   * DRAW DESTINATION MARKER
   * Floating destination pin with pulsing effect
   */
  const drawDestinationMarker = (ctx, x, y, name, time) => {
    const pulse = Math.sin(time * 4) * 0.15 + 1;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    
    // Glow
    ctx.shadowColor = "#4CAF50";
    ctx.shadowBlur = 30;
    
    // Pin body
    const pinGradient = ctx.createRadialGradient(0, -20, 0, 0, -20, 30);
    pinGradient.addColorStop(0, "#4CAF50");
    pinGradient.addColorStop(1, "#2E7D32");
    
    ctx.beginPath();
    ctx.arc(0, -20, 25, Math.PI, 0, false);
    ctx.lineTo(0, 25);
    ctx.closePath();
    ctx.fillStyle = pinGradient;
    ctx.fill();
    
    // White border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner circle
    ctx.beginPath();
    ctx.arc(0, -20, 10, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    
    // Name label
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(name, 0, -60);
    
    ctx.restore();
  };

  /**
   * DRAW TURN INDICATOR
   * Shows arrow when user needs to turn
   */
  const drawTurnIndicator = (ctx, x, y, isRight, time) => {
    const pulse = Math.sin(time * 5) * 0.2 + 1;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    
    if (!isRight) {
      ctx.scale(-1, 1); // Flip for left turn
    }
    
    // Glow
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 20;
    
    // Draw chevrons
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // First chevron
    ctx.beginPath();
    ctx.moveTo(-20, -30);
    ctx.lineTo(10, 0);
    ctx.lineTo(-20, 30);
    ctx.stroke();
    
    // Second chevron
    ctx.beginPath();
    ctx.moveTo(5, -30);
    ctx.lineTo(35, 0);
    ctx.lineTo(5, 30);
    ctx.stroke();
    
    ctx.restore();
  };

  /**
   * START AR RENDERING
   * Main AR rendering loop with Google Maps Live View style
   */
  const startARRendering = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    setArStatus("tracking");

    /**
     * ANIMATION LOOP
     * Renders Google Maps Live View style AR
     */
    const animate = () => {
      const time = (Date.now() - startTimeRef.current) / 1000;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (userLocation && selectedLocation && distance !== null && !arrived) {
        // Calculate bearing to destination
        const bearing = calculateBearing(
          userLocation.latitude,
          userLocation.longitude,
          selectedLocation.coordinates[0],
          selectedLocation.coordinates[1]
        );

        // Adjust bearing by device heading
        const relativeBearing = (bearing - compassHeadingRef.current + 360) % 360;
        
        // Determine turn direction
        let turnDir = "straight";
        let pathOffsetX = 0;
        
        if (relativeBearing > 30 && relativeBearing < 180) {
          turnDir = "right";
          pathOffsetX = Math.min((relativeBearing / 90) * 150, 200);
        } else if (relativeBearing > 180 && relativeBearing < 330) {
          turnDir = "left";
          pathOffsetX = -Math.min(((360 - relativeBearing) / 90) * 150, 200);
        }
        
        setTurnDirection(turnDir);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Draw glowing path line
        drawPathLine(ctx, canvas.width, canvas.height, pathOffsetX, time);
        
        // Draw animated ground arrows (Google Maps style)
        const numArrows = 6;
        for (let i = 0; i < numArrows; i++) {
          const progress = ((time * 0.8 + i / numArrows) % 1);
          const arrowY = canvas.height * 0.35 + (canvas.height * 0.55 * progress);
          const scale = 0.4 + (1 - progress) * 0.6;
          const alpha = 1 - progress * 0.7;
          
          // Calculate x position based on path curve
          const curveProgress = progress;
          const arrowX = centerX + pathOffsetX * (1 - curveProgress) * curveProgress * 2;
          
          drawGroundArrow(ctx, arrowX, arrowY, scale, alpha, time);
        }
        
        // Draw destination marker when facing correct direction
        if (relativeBearing > 315 || relativeBearing < 45) {
          const markerX = centerX + (relativeBearing > 180 ? -(360 - relativeBearing) : relativeBearing) * 3;
          drawDestinationMarker(ctx, markerX, canvas.height * 0.25, selectedLocation.name, time);
        }
        
        // Draw turn indicators when not facing destination
        if (turnDir === "right") {
          drawTurnIndicator(ctx, canvas.width - 80, centerY - 50, true, time);
        } else if (turnDir === "left") {
          drawTurnIndicator(ctx, 80, centerY - 50, false, time);
        }
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  };

  /**
   * FETCH ALL LOCATIONS FROM BACKEND
   * Gets location data from MongoDB via Flask API
   */
  const fetchAllLocations = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.locations.all());
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
      return;
    }

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
          setEta(calculateETA(dist));

          // Check if user has arrived (within 10 meters)
          if (dist < 10) {
            setArrived(true);
            clearFakeOrRealWatch(watchIdRef.current);
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
        timeout: 15000,
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedLocation]);

  // Format distance for display
  const formatDistance = (meters) => {
    if (!meters) return "--";
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Get current bearing
  const getCurrentBearing = () => {
    if (!userLocation || !selectedLocation) return 0;
    return (calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      selectedLocation.coordinates[0],
      selectedLocation.coordinates[1]
    ) - compassHeadingRef.current + 360) % 360;
  };

  return (
    <div className="ar-scene-container">
      {/* Camera Stream */}
      <video
        ref={videoRef}
        className="ar-video"
        playsInline
        muted
      ></video>
      
      {/* Gradient background when no camera */}
      <div className="ar-bg-gradient"></div>

      {/* AR Canvas Overlay */}
      <canvas ref={canvasRef} className="ar-canvas"></canvas>

      {/* Top Status Bar */}
      <div className="ar-top-bar">
        <div className="status-pill">
          <span className={`status-dot ${arStatus}`}></span>
          <span>
            {arStatus === "initializing" && "Starting..."}
            {arStatus === "tracking" && "Live View"}
            {arStatus === "error" && "Error"}
          </span>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Navigation Instruction Card - Google Maps Style */}
      {selectedLocation && !arrived && (
        <div className="nav-instruction-card">
          <div className="nav-icon-box">
            {turnDirection === "straight" && <span className="nav-arrow">↑</span>}
            {turnDirection === "right" && <span className="nav-arrow right">↱</span>}
            {turnDirection === "left" && <span className="nav-arrow left">↰</span>}
          </div>
          <div className="nav-text-box">
            <span className="nav-action">{getTurnText(getCurrentBearing()).text}</span>
            <span className="nav-dest">toward {selectedLocation.name}</span>
          </div>
        </div>
      )}

      {/* Bottom Info Panel */}
      {selectedLocation && !arrived && (
        <div className="bottom-info-panel">
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-value primary">{formatDistance(distance)}</span>
              <span className="stat-label">Distance</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value secondary">{eta || "--"}</span>
              <span className="stat-label">Walk time</span>
            </div>
          </div>
          
          <div className="dest-preview">
            {selectedLocation.image_url && (
              <img 
                src={selectedLocation.image_url} 
                alt=""
                className="dest-thumb"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <div className="dest-details">
              <span className="dest-name">{selectedLocation.name}</span>
              <span className="dest-coords">
                {selectedLocation.coordinates[0].toFixed(4)}°, {selectedLocation.coordinates[1].toFixed(4)}°
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Arrival Celebration */}
      {arrived && (
        <div className="arrival-overlay">
          <div className="arrival-modal">
            <div className="arrival-emoji">🎯</div>
            <h2>You've Arrived!</h2>
            <p>{selectedLocation.name}</p>
            {selectedLocation.image_url && (
              <img 
                src={selectedLocation.image_url} 
                alt=""
                className="arrival-img"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <button className="arrival-btn" onClick={onClose}>End Navigation</button>
          </div>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div className="control-bar">
        <button className="ctrl-btn exit" onClick={onClose}>
          <span>✕</span>
          <small>Exit</small>
        </button>
        <button className="ctrl-btn" onClick={() => compassHeadingRef.current = 0}>
          <span>🧭</span>
          <small>Calibrate</small>
        </button>
      </div>
    </div>
  );
};

export default ARScene;
