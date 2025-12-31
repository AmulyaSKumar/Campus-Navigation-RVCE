import React, { useEffect, useState, useRef } from "react";
import { API_ENDPOINTS } from "../config/apiConfig";

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

const ARScene = ({ selectedLocation, onClose }) => {
  const [arStatus, setArStatus] = useState("initializing");
  const [distance, setDistance] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [arrived, setArrived] = useState(false);
  const [eta, setEta] = useState(null);
  const [turnDirection, setTurnDirection] = useState("straight");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const compassHeadingRef = useRef(0);
  const watchIdRef = useRef(null);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const mediaStreamRef = useRef(null); // Store media stream for proper cleanup
  const orientationHandlerRef = useRef(null); // Store orientation handler for cleanup

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
      // Stop any existing stream first
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        mediaStreamRef.current = null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false,
      });
      
      // Store stream reference for cleanup
      mediaStreamRef.current = stream;

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
      // Start AR rendering anyway with gradient background
      startARRendering();
    }
  };

  /**
   * STOP CAMERA STREAM
   * Properly releases camera resources
   */
  const stopCameraStream = () => {
    // Stop all tracks in the media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
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

    // Store handler reference for cleanup
    orientationHandlerRef.current = handleOrientation;
    window.addEventListener("deviceorientation", handleOrientation);
  };

  /**
   * STOP COMPASS TRACKING
   * Removes device orientation listener
   */
  const stopCompassTracking = () => {
    if (orientationHandlerRef.current) {
      window.removeEventListener("deviceorientation", orientationHandlerRef.current);
      orientationHandlerRef.current = null;
    }
  };

  // ============ SIMPLE CLEAN AR NAVIGATION ============
  // Single color: Cyan Blue (#00D4FF)
  const AR_COLOR = "#00D4FF";
  const AR_COLOR_RGB = "0, 212, 255";

  /**
   * DRAW LARGE NAVIGATION ARROW
   * Clean, simple, big arrow pointing forward
   */
  const drawNavigationArrow = (ctx, x, y, scale, alpha) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale * 0.5); // Perspective flatten
    
    // Arrow size - BIG
    const w = 100;
    const h = 120;
    
    // Glow
    ctx.shadowColor = AR_COLOR;
    ctx.shadowBlur = 30 * alpha;
    
    // Simple arrow shape
    ctx.beginPath();
    ctx.moveTo(0, -h/2);           // Top point
    ctx.lineTo(w/2, h * 0.1);      // Right wing
    ctx.lineTo(w * 0.25, h * 0.1); // Right inner
    ctx.lineTo(w * 0.25, h/2);     // Right bottom
    ctx.lineTo(-w * 0.25, h/2);    // Left bottom
    ctx.lineTo(-w * 0.25, h * 0.1);// Left inner
    ctx.lineTo(-w/2, h * 0.1);     // Left wing
    ctx.closePath();
    
    // Fill with gradient
    const gradient = ctx.createLinearGradient(0, -h/2, 0, h/2);
    gradient.addColorStop(0, `rgba(${AR_COLOR_RGB}, ${alpha})`);
    gradient.addColorStop(1, `rgba(${AR_COLOR_RGB}, ${alpha * 0.3})`);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // White border
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.restore();
  };

  /**
   * DRAW PATH LINE
   * Simple glowing line on the ground
   */
  const drawPathLine = (ctx, width, height, offsetX, time) => {
    const startY = height * 0.3;
    const endY = height * 0.95;
    
    ctx.save();
    
    // Glow
    ctx.shadowColor = AR_COLOR;
    ctx.shadowBlur = 20;
    
    // Path gradient
    const gradient = ctx.createLinearGradient(0, startY, 0, endY);
    gradient.addColorStop(0, `rgba(${AR_COLOR_RGB}, 0.9)`);
    gradient.addColorStop(1, `rgba(${AR_COLOR_RGB}, 0.2)`);
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    
    // Animated dash
    const dashOffset = (time * 150) % 50;
    ctx.setLineDash([30, 20]);
    ctx.lineDashOffset = -dashOffset;
    
    // Draw curved path
    ctx.beginPath();
    ctx.moveTo(width/2, endY);
    ctx.quadraticCurveTo(width/2 + offsetX * 0.5, height * 0.55, width/2 + offsetX, startY);
    ctx.stroke();
    
    ctx.restore();
  };

  /**
   * DRAW DESTINATION MARKER
   * Simple pin marker
   */
  const drawDestinationMarker = (ctx, x, y, name, time) => {
    const pulse = Math.sin(time * 3) * 0.1 + 1;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    
    // Glow
    ctx.shadowColor = "#00FF88";
    ctx.shadowBlur = 25;
    
    // Pin circle
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fillStyle = "#00FF88";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Inner dot
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    
    // Name label
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.font = "bold 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(name, 0, -55);
    
    ctx.restore();
  };

  /**
   * DRAW TURN ARROW
   * Big turn indicator
   */
  const drawTurnArrow = (ctx, x, y, isRight, time) => {
    const flash = (Math.sin(time * 6) + 1) / 2;
    
    ctx.save();
    ctx.translate(x, y);
    
    if (!isRight) {
      ctx.scale(-1, 1);
    }
    
    // Glow
    ctx.shadowColor = "#FFB800";
    ctx.shadowBlur = 25;
    
    // Draw 3 chevrons
    for (let i = 0; i < 3; i++) {
      const offset = i * 25;
      const alpha = 1 - i * 0.25 + flash * 0.25;
      
      ctx.strokeStyle = `rgba(255, 184, 0, ${alpha})`;
      ctx.lineWidth = 10 - i * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      ctx.beginPath();
      ctx.moveTo(-20 + offset, -40);
      ctx.lineTo(20 + offset, 0);
      ctx.lineTo(-20 + offset, 40);
      ctx.stroke();
    }
    
    // Turn text
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFB800";
    ctx.fillText(isRight ? "TURN" : "TURN", isRight ? -30 : 30, 70);
    
    ctx.restore();
  };

  /**
   * START AR RENDERING
   * Clean simple AR rendering loop
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
     * Clean simple AR navigation
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
        
        // Draw path line
        drawPathLine(ctx, canvas.width, canvas.height, pathOffsetX, time);
        
        // Draw large arrows
        const numArrows = 4;
        for (let i = 0; i < numArrows; i++) {
          const progress = ((time * 0.7 + i / numArrows) % 1);
          const arrowY = canvas.height * 0.30 + (canvas.height * 0.60 * progress);
          const scale = 0.6 + (1 - progress) * 0.6;
          const alpha = 1 - progress * 0.5;
          
          const curveProgress = progress;
          const arrowX = centerX + pathOffsetX * (1 - curveProgress) * curveProgress * 2;
          
          drawNavigationArrow(ctx, arrowX, arrowY, scale, alpha);
        }
        
        // Draw destination when facing it
        if (relativeBearing > 315 || relativeBearing < 45) {
          const markerX = centerX + (relativeBearing > 180 ? -(360 - relativeBearing) : relativeBearing) * 2;
          drawDestinationMarker(ctx, markerX, canvas.height * 0.22, selectedLocation.name, time);
        }
        
        // Draw turn arrows when needed
        if (turnDir === "right") {
          drawTurnArrow(ctx, canvas.width - 80, centerY - 30, true, time);
        } else if (turnDir === "left") {
          drawTurnArrow(ctx, 80, centerY - 30, false, time);
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
        // Data fetched but not used in this component
        console.log("Locations fetched:", data.length);
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

    // Cleanup - IMPORTANT: Properly release all resources
    return () => {
      // Stop camera stream
      stopCameraStream();
      
      // Stop GPS tracking
      if (watchIdRef.current) {
        clearFakeOrRealWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      // Stop animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Stop compass tracking
      stopCompassTracking();
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

  /**
   * HANDLE CLOSE
   * Properly cleanup all resources before closing AR view
   */
  const handleClose = () => {
    // Stop camera stream first
    stopCameraStream();
    
    // Stop GPS tracking
    if (watchIdRef.current) {
      clearFakeOrRealWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop compass tracking
    stopCompassTracking();
    
    // Call parent's onClose
    onClose();
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black z-[9999] overflow-hidden font-sans">
      {/* Camera Stream */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      ></video>
      
      {/* Gradient background when no camera */}
      <div className="absolute inset-0 bg-ar-gradient -z-10"></div>

      {/* AR Canvas Overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none"></canvas>

      {/* Top Status Bar */}
      <div className="absolute top-0 left-0 right-0 h-18 px-6 safe-top flex justify-between items-center
                      bg-gradient-to-b from-black/80 via-black/60 to-transparent z-20 backdrop-blur-sm">
        <div className="flex items-center gap-3 bg-black/70 py-3 px-5 rounded-2xl text-white text-sm font-semibold backdrop-blur-xl
                        border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          <span className={`w-3 h-3 rounded-full animate-pulse ${
            arStatus === 'tracking' ? 'bg-green-400 shadow-[0_0_12px_#00E676]' :
            arStatus === 'error' ? 'bg-red-500 shadow-[0_0_12px_#EF4444]' : 'bg-blue-400 shadow-[0_0_12px_#60A5FA]'
          }`}></span>
          <span className="drop-shadow-lg">
            {arStatus === "initializing" && "Initializing AR..."}
            {arStatus === "tracking" && "AR Navigation Active"}
            {arStatus === "error" && "Camera Error"}
          </span>
        </div>
        <button className="w-12 h-12 rounded-2xl bg-red-600/80 backdrop-blur-xl border-2 border-red-400/50 text-white
                          text-xl flex items-center justify-center cursor-pointer shadow-lg
                          hover:bg-red-500/90 hover:shadow-red-500/30 active:scale-95 transition-all
                          hover:border-red-300/70" onClick={handleClose}>✕</button>
      </div>

      {/* Navigation Instruction Card - Unity Style */}
      {selectedLocation && !arrived && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-xl rounded-2xl
                        py-6 px-8 flex flex-col items-center gap-3 min-w-[280px] max-w-[90%] z-40 border-2 border-blue-400/30
                        shadow-[0_0_30px_rgba(59,130,246,0.3)] animate-pulse-subtle">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800
                         flex items-center justify-center shadow-2xl border-2 border-blue-300/50
                         relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-300/20 to-transparent rounded-2xl"></div>

            {turnDirection === "straight" && (
              <svg className="w-14 h-14 text-white relative z-10 drop-shadow-lg animate-bounce-gentle" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4L13.5 9.5H16.5L14 12L15 16.5L12 14L9 16.5L10 12L7.5 9.5H10.5L12 4Z"/>
              </svg>
            )}
            {turnDirection === "right" && (
              <svg className="w-14 h-14 text-white relative z-10 drop-shadow-lg animate-bounce-gentle" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 6L14 12L12 12L12 18L10 18L10 12L8 12L8 6Z" transform="rotate(90 11 12)"/>
              </svg>
            )}
            {turnDirection === "left" && (
              <svg className="w-14 h-14 text-white relative z-10 drop-shadow-lg animate-bounce-gentle" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 6L14 12L12 12L12 18L10 18L10 12L8 12L8 6Z" transform="rotate(-90 11 12)"/>
              </svg>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-bold text-white text-lg drop-shadow-2xl tracking-wide text-center">{getTurnText(getCurrentBearing()).text}</span>
            <span className="text-sm text-blue-200 drop-shadow-lg font-medium text-center">→ {selectedLocation.name}</span>
          </div>
        </div>
      )}

      {/* Bottom Info Panel */}
      {selectedLocation && !arrived && (
        <div className="absolute bottom-20 safe-bottom left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl
                        rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.2)] p-4 z-30 border border-blue-400/20 max-w-sm">
          <div className="flex justify-around items-center mb-3">
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-bold text-blue-300 drop-shadow-lg">{formatDistance(distance)}</span>
              <span className="text-xs text-blue-200 uppercase tracking-wider font-semibold">Distance</span>
            </div>
            <div className="w-px h-8 bg-blue-400/30"></div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-bold text-green-300 drop-shadow-lg">{eta || "--"}</span>
              <span className="text-xs text-green-200 uppercase tracking-wider font-semibold">Walk time</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-blue-400/20">
            {selectedLocation.image_url && (
              <img
                src={selectedLocation.image_url}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-blue-400/30"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <div className="flex flex-col flex-1">
              <span className="font-bold text-white text-sm drop-shadow-lg">{selectedLocation.name}</span>
              <span className="text-xs text-blue-200 drop-shadow-md font-mono">
                {selectedLocation.coordinates[0].toFixed(4)}°, {selectedLocation.coordinates[1].toFixed(4)}°
              </span>
            </div>
            <button
              className="flex items-center justify-center gap-1 bg-blue-600/80 text-white py-2 px-3
                         rounded-lg border border-blue-400/50 hover:bg-blue-500/90 transition-all duration-200
                         shadow-lg hover:shadow-blue-500/25 font-semibold text-xs"
              onClick={() => compassHeadingRef.current = 0}
              title="Calibrate Compass"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Calibrate</span>
            </button>
          </div>
        </div>
      )}

      {/* Arrival Celebration */}
      {arrived && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-black/95 backdrop-blur-xl rounded-3xl p-8 text-center max-w-sm mx-4
                          shadow-[0_0_50px_rgba(34,197,94,0.3)] border-2 border-green-400/30 animate-pulse-subtle">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-400 via-green-500 to-green-600
                           flex items-center justify-center shadow-2xl border-2 border-green-300/50
                           relative overflow-hidden">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-300/30 to-transparent rounded-2xl animate-pulse"></div>
              <svg className="w-12 h-12 text-white relative z-10 drop-shadow-2xl" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-2xl tracking-wide">ARRIVED!</h2>
            <p className="text-green-200 mb-6 text-lg font-semibold drop-shadow-lg">🎯 {selectedLocation.name}</p>
            {selectedLocation.image_url && (
              <img
                src={selectedLocation.image_url}
                alt=""
                className="w-full h-36 object-cover rounded-2xl mb-6 border-2 border-green-400/30 shadow-lg"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <button className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-2xl
                              hover:from-green-400 hover:to-green-500 transition-all duration-300 shadow-2xl
                              border-2 border-green-300/50 hover:border-green-200/70 text-lg tracking-wide
                              hover:shadow-green-500/30 active:scale-95" onClick={handleClose}>
              EXIT NAVIGATION
            </button>
          </div>
        </div>
      )}

      {/* Arrival Celebration */}
    </div>
  );
};

export default ARScene;
