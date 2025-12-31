import React, { useEffect, useState, useRef, useCallback } from "react";
import "./ARNavigation.css";

// ============ FAKE LOCATION FOR DEMO ============
const USE_FAKE_LOCATION = false;
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
  const [cameraActive, setCameraActive] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [eta, setEta] = useState(null);
  const [pathPoints, setPathPoints] = useState([]);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);

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

  // Calculate ETA based on walking speed (~5 km/h = 83.33 m/min)
  const calculateETA = (meters) => {
    const walkingSpeedMPerMin = 83.33;
    const minutes = Math.ceil(meters / walkingSpeedMPerMin);
    if (minutes < 1) return "< 1 min";
    if (minutes === 1) return "1 min";
    return `${minutes} min`;
  };

  // Generate path points for AR visualization
  const generatePathPoints = useCallback((userLat, userLon, destLat, destLon) => {
    const points = [];
    const numPoints = 10;
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      points.push({
        lat: userLat + (destLat - userLat) * t,
        lon: userLon + (destLon - userLon) * t,
        index: i
      });
    }
    return points;
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Camera error:", error);
      // Continue without camera - show gradient background
      setCameraActive(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Draw AR overlay on canvas
  const drawAROverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    ctx.clearRect(0, 0, width, height);
    
    if (!userLocation || !selectedLocation || arrived) return;
    
    const bearing = calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      selectedLocation.coordinates[0],
      selectedLocation.coordinates[1]
    );
    
    // Calculate relative angle to destination
    const relativeAngle = (bearing - deviceHeading + 360) % 360;
    
    // Center of screen
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Draw ground path arrows (Google Maps style)
    const time = Date.now() / 1000;
    const arrowCount = 8;
    
    for (let i = 0; i < arrowCount; i++) {
      const progress = ((time * 0.5 + i / arrowCount) % 1);
      const y = height * 0.4 + (height * 0.5 * progress);
      const scale = 1 - progress * 0.5;
      const alpha = 1 - progress;
      
      // Calculate x position based on direction
      let xOffset = 0;
      if (relativeAngle > 45 && relativeAngle < 180) {
        xOffset = Math.min((relativeAngle - 45) / 135 * width * 0.3, width * 0.3);
      } else if (relativeAngle > 180 && relativeAngle < 315) {
        xOffset = -Math.min((315 - relativeAngle) / 135 * width * 0.3, width * 0.3);
      }
      
      const x = centerX + xOffset * (1 - progress);
      
      // Draw glowing arrow
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      
      // Glow effect
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 20 * alpha;
      
      // Arrow path
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(20, 10);
      ctx.lineTo(8, 10);
      ctx.lineTo(8, 30);
      ctx.lineTo(-8, 30);
      ctx.lineTo(-8, 10);
      ctx.lineTo(-20, 10);
      ctx.closePath();
      
      // Gradient fill
      const gradient = ctx.createLinearGradient(0, -30, 0, 30);
      gradient.addColorStop(0, `rgba(0, 255, 136, ${alpha})`);
      gradient.addColorStop(1, `rgba(0, 200, 100, ${alpha * 0.5})`);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Border
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.restore();
    }
    
    // Draw destination marker if in view
    if (relativeAngle > 315 || relativeAngle < 45) {
      const markerX = centerX + (relativeAngle > 180 ? -(360 - relativeAngle) : relativeAngle) * (width / 90);
      const markerY = height * 0.25;
      
      // Pulsing destination marker
      const pulse = Math.sin(time * 3) * 0.2 + 1;
      
      ctx.save();
      ctx.translate(markerX, markerY);
      ctx.scale(pulse, pulse);
      
      // Outer glow
      ctx.shadowColor = "#4CAF50";
      ctx.shadowBlur = 30;
      
      // Pin shape
      ctx.beginPath();
      ctx.arc(0, -15, 20, Math.PI, 0, false);
      ctx.lineTo(0, 20);
      ctx.closePath();
      
      const pinGradient = ctx.createRadialGradient(0, -15, 0, 0, -15, 20);
      pinGradient.addColorStop(0, "#4CAF50");
      pinGradient.addColorStop(1, "#2E7D32");
      ctx.fillStyle = pinGradient;
      ctx.fill();
      
      // White center
      ctx.beginPath();
      ctx.arc(0, -15, 8, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      
      // Destination name
      ctx.shadowBlur = 0;
      ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 3;
      ctx.strokeText(selectedLocation.name, 0, -50);
      ctx.fillText(selectedLocation.name, 0, -50);
      
      ctx.restore();
    }
    
    // Draw direction indicator when destination is not in view
    if (relativeAngle >= 45 && relativeAngle <= 315) {
      const isRight = relativeAngle < 180;
      const indicatorX = isRight ? width - 60 : 60;
      const indicatorY = height * 0.4;
      
      ctx.save();
      ctx.translate(indicatorX, indicatorY);
      ctx.rotate(isRight ? Math.PI / 2 : -Math.PI / 2);
      
      // Pulsing animation
      const pulse = Math.sin(time * 4) * 0.15 + 1;
      ctx.scale(pulse, pulse);
      
      // Glowing chevron
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      ctx.moveTo(-20, -25);
      ctx.lineTo(0, 0);
      ctx.lineTo(-20, 25);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#FFD700";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, -25);
      ctx.lineTo(20, 0);
      ctx.lineTo(0, 25);
      ctx.stroke();
      
      ctx.restore();
      
      // Turn text
      ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
      ctx.fillStyle = "#FFD700";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.fillText(isRight ? "Turn Right" : "Turn Left", indicatorX, indicatorY + 60);
    }
    
    // Request next frame
    animationRef.current = requestAnimationFrame(drawAROverlay);
  }, [userLocation, selectedLocation, deviceHeading, arrived]);

  // Get device orientation (compass heading)
  const getDeviceHeading = (callback) => {
    if (typeof DeviceOrientationEvent !== "undefined") {
      const handler = (event) => {
        let heading = event.alpha; // 0-360 degrees
        if (typeof event.webkitCompassHeading !== "undefined") {
          heading = event.webkitCompassHeading;
        }
        setDeviceHeading(heading || 0);
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
    // Start camera first
    await startCamera();
    
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
          setEta(calculateETA(dist));
          
          // Generate path points for AR visualization
          setPathPoints(generatePathPoints(
            latitude, longitude,
            selectedLocation.coordinates[0],
            selectedLocation.coordinates[1]
          ));

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
      stopCamera();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  };

  // Start AR animation loop
  useEffect(() => {
    if (arStatus === "tracking" && !arrived) {
      animationRef.current = requestAnimationFrame(drawAROverlay);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [arStatus, arrived, drawAROverlay]);

  useEffect(() => {
    const cleanup = startGPSTracking();
    return cleanup;
  }, [selectedLocation]);

  // Get turn direction text
  const getTurnDirection = () => {
    if (direction === null) return "";
    if (direction > 315 || direction < 45) return "Go Straight";
    if (direction >= 45 && direction < 135) return "Turn Right";
    if (direction >= 135 && direction < 225) return "Turn Around";
    return "Turn Left";
  };

  return (
    <div className="ar-navigation-container">
      {/* AR Status Bar */}
      <div className="ar-status-bar">
        <div className="status-indicator">
          <span className={`status-dot ${arStatus}`}></span>
          <span className="status-text">
            {arStatus === "initializing" && "Initializing AR..."}
            {arStatus === "tracking" && "Live View"}
            {arStatus === "error" && "Error"}
          </span>
        </div>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* AR Viewport */}
      <div className="ar-viewport">
        {/* Camera Video Feed */}
        <video 
          ref={videoRef} 
          className={`ar-video ${cameraActive ? 'active' : ''}`}
          autoPlay 
          playsInline 
          muted
        />
        
        {/* Gradient fallback when camera not available */}
        {!cameraActive && (
          <div className="ar-gradient-bg" />
        )}

        {/* AR Overlay Canvas */}
        <canvas ref={canvasRef} className="ar-canvas" />

        {/* Top Navigation Card */}
        {!arrived && selectedLocation && (
          <div className="nav-instruction-card">
            <div className="nav-direction-icon">
              {direction !== null && (
                <>
                  {(direction > 315 || direction < 45) && <span className="direction-icon">↑</span>}
                  {(direction >= 45 && direction < 135) && <span className="direction-icon turn-right">↱</span>}
                  {(direction >= 135 && direction < 225) && <span className="direction-icon turn-around">↓</span>}
                  {(direction >= 225 && direction <= 315) && <span className="direction-icon turn-left">↰</span>}
                </>
              )}
            </div>
            <div className="nav-text">
              <span className="nav-action">{getTurnDirection()}</span>
              <span className="nav-destination">toward {selectedLocation.name}</span>
            </div>
          </div>
        )}

        {/* Compass Ring */}
        {!arrived && (
          <div className="compass-ring">
            <div 
              className="compass-needle"
              style={{ transform: `rotate(${-deviceHeading}deg)` }}
            >
              <span className="compass-n">N</span>
            </div>
          </div>
        )}

        {/* Bottom Info Panel */}
        {selectedLocation && !arrived && (
          <div className="bottom-info-panel">
            <div className="info-row">
              <div className="info-item distance-info">
                <span className="info-value">{distance ? formatDistance(distance) : "--"}</span>
                <span className="info-label">Distance</span>
              </div>
              <div className="info-divider" />
              <div className="info-item eta-info">
                <span className="info-value">{eta || "--"}</span>
                <span className="info-label">Walk time</span>
              </div>
              <div className="info-divider" />
              <div className="info-item accuracy-info">
                <span className="info-value">±{Math.round(gpsAccuracy || 0)}m</span>
                <span className="info-label">GPS</span>
              </div>
            </div>
            
            <div className="destination-preview">
              {selectedLocation.image_url && (
                <img 
                  src={selectedLocation.image_url} 
                  alt={selectedLocation.name}
                  className="destination-thumb"
                />
              )}
              <div className="destination-details">
                <span className="destination-name">{selectedLocation.name}</span>
                <span className="destination-coords">
                  {selectedLocation.coordinates[0].toFixed(5)}, {selectedLocation.coordinates[1].toFixed(5)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Arrival Notification */}
        {arrived && (
          <div className="arrival-popup">
            <div className="arrival-content">
              <div className="arrival-icon">🎯</div>
              <h2>You've Arrived!</h2>
              <p>{selectedLocation.name}</p>
              {selectedLocation.image_url && (
                <img 
                  src={selectedLocation.image_url} 
                  alt={selectedLocation.name}
                  className="arrival-image"
                />
              )}
              <button 
                onClick={onClose}
                className="bg-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-primaryDark transition-colors"
              >
                End Navigation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="ar-control-bar">
        <button
          className="control-button"
          onClick={() => {
            setDeviceHeading(0);
            console.log("Recentering...");
          }}
          title="Recenter View"
        >
          <span className="control-icon">⊕</span>
          <span className="control-label">Center</span>
        </button>
        <button
          className="control-button primary"
          onClick={onClose}
          title="Exit AR"
        >
          <span className="control-icon">✕</span>
          <span className="control-label">Exit AR</span>
        </button>
        <button
          className="control-button"
          onClick={async () => {
            await requestDeviceOrientationPermission();
            console.log("Calibrating compass...");
          }}
          title="Calibrate Compass"
        >
          <span className="control-icon">🧭</span>
          <span className="control-label">Calibrate</span>
        </button>
      </div>
    </div>
  );
};

export default ARNavigation;
