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
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [directionFaded, setDirectionFaded] = useState(false);
  const [lastBearing, setLastBearing] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const compassHeadingRef = useRef(0);
  const smoothedHeadingRef = useRef(0); // For low-pass filter
  const watchIdRef = useRef(null);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const mediaStreamRef = useRef(null);
  const orientationHandlerRef = useRef(null);
  const fadeTimeoutRef = useRef(null);
  const hasAbsoluteOrientationRef = useRef(false);

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

  // Get turn direction text and arrow
  const getTurnText = (angle) => {
    if (angle > 315 || angle < 45) return { text: "GO STRAIGHT", arrow: "↑", state: "aligned" };
    if (angle >= 45 && angle < 135) return { text: "TURN RIGHT", arrow: "→", state: "off-route" };
    if (angle >= 135 && angle < 225) return { text: "TURN AROUND", arrow: "↓", state: "wrong" };
    return { text: "TURN LEFT", arrow: "←", state: "off-route" };
  };

  // Get direction state color - softened for better daylight/night balance
  const getStateColor = (state) => {
    switch(state) {
      case "aligned": return "#6EE7A0"; // Softer green (less neon)
      case "off-route": return "#F5D060"; // Softer amber/yellow
      case "wrong": return "#F59090"; // Softer red
      default: return "#7DD4E8"; // Softer blue
    }
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
   * Uses deviceorientationabsolute when available (Android), webkitCompassHeading (iOS)
   * Applies low-pass filter to smooth jittery readings
   */
  const startCompassTracking = () => {
    // Low-pass filter coefficient (0-1, higher = more smoothing)
    const SMOOTHING_FACTOR = 0.3;
    
    const handleOrientation = (event) => {
      let heading = null;

      // iOS Safari uses webkitCompassHeading (true north, 0-360)
      if (typeof event.webkitCompassHeading !== "undefined" && event.webkitCompassHeading !== null) {
        heading = event.webkitCompassHeading;
      } 
      // For deviceorientationabsolute or regular deviceorientation
      else if (event.alpha !== null) {
        // Alpha is the compass direction the device faces
        // For absolute orientation, alpha is relative to true north
        // For regular orientation, alpha is relative to arbitrary direction
        
        if (event.absolute === true || hasAbsoluteOrientationRef.current) {
          // Android with absolute orientation: alpha 0 = North
          // But alpha increases counter-clockwise, so we need to invert
          heading = (360 - event.alpha) % 360;
        } else {
          // Fallback for non-absolute (less accurate)
          heading = (360 - event.alpha) % 360;
        }
      }

      if (heading !== null) {
        // Normalize heading
        heading = (heading + 360) % 360;
        
        // Apply low-pass filter for smooth compass movement
        // Handle the wrap-around at 0/360 degrees
        let diff = heading - smoothedHeadingRef.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        
        smoothedHeadingRef.current = (smoothedHeadingRef.current + diff * SMOOTHING_FACTOR + 360) % 360;
        compassHeadingRef.current = smoothedHeadingRef.current;
      }
    };

    // Store handler reference for cleanup
    orientationHandlerRef.current = handleOrientation;
    
    // Try to use absolute orientation first (more accurate on Android)
    if (window.DeviceOrientationAbsoluteEvent) {
      hasAbsoluteOrientationRef.current = true;
      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    } else {
      // Fall back to regular device orientation
      window.addEventListener("deviceorientation", handleOrientation, true);
    }
  };

  /**
   * STOP COMPASS TRACKING
   * Removes device orientation listener
   */
  const stopCompassTracking = () => {
    if (orientationHandlerRef.current) {
      if (hasAbsoluteOrientationRef.current) {
        window.removeEventListener("deviceorientationabsolute", orientationHandlerRef.current, true);
      } else {
        window.removeEventListener("deviceorientation", orientationHandlerRef.current, true);
      }
      orientationHandlerRef.current = null;
    }
  };

  // ============ SIMPLE CLEAN AR NAVIGATION ============
  // Softer, more subtle color palette for daylight/night balance
  const AR_COLOR = "#60C8E8"; // Softer cyan (less intense)
  const AR_COLOR_RGB = "96, 200, 232"; // Muted cyan
  const AR_COLOR_ALIGNED = "#7DD4A8"; // Soft green when aligned
  const AR_COLOR_ALIGNED_RGB = "125, 212, 168";

  /**
   * DRAW LARGE NAVIGATION ARROW
   * Clean, simple, big arrow pointing forward
   * Accepts isAligned parameter to reduce intensity when on track
   */
  const drawNavigationArrow = (ctx, x, y, scale, alpha, isAligned = false) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale * 0.5); // Perspective flatten
    
    // Arrow size - smaller when aligned for less visual clutter
    const w = isAligned ? 70 : 100;
    const h = isAligned ? 85 : 120;
    
    // Use softer color and reduced glow when aligned
    const colorRGB = isAligned ? AR_COLOR_ALIGNED_RGB : AR_COLOR_RGB;
    const glowColor = isAligned ? AR_COLOR_ALIGNED : AR_COLOR;
    const glowIntensity = isAligned ? 10 : 18; // Reduced from 30
    const alphaMultiplier = isAligned ? 0.5 : 0.8; // Fade when aligned
    
    // Glow - reduced intensity
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowIntensity * alpha;
    
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
    
    // Fill with gradient - softer opacity
    const gradient = ctx.createLinearGradient(0, -h/2, 0, h/2);
    gradient.addColorStop(0, `rgba(${colorRGB}, ${alpha * alphaMultiplier})`);
    gradient.addColorStop(1, `rgba(${colorRGB}, ${alpha * alphaMultiplier * 0.3})`);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // White border - thinner when aligned
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * alphaMultiplier * 0.6})`;
    ctx.lineWidth = isAligned ? 2 : 2.5;
    ctx.stroke();
    
    ctx.restore();
  };

  /**
   * DRAW PATH LINE
   * Simple glowing line on the ground
   * Accepts isAligned parameter to show minimal path when on track
   */
  const drawPathLine = (ctx, width, height, offsetX, time, isAligned = false) => {
    const startY = height * 0.3;
    const endY = height * 0.95;
    
    ctx.save();
    
    // Use softer styling when aligned
    const colorRGB = isAligned ? AR_COLOR_ALIGNED_RGB : AR_COLOR_RGB;
    const glowColor = isAligned ? AR_COLOR_ALIGNED : AR_COLOR;
    const glowIntensity = isAligned ? 8 : 12; // Reduced from 20
    const lineOpacity = isAligned ? 0.4 : 0.7; // Much softer when aligned
    const lineWidth = isAligned ? 6 : 10; // Thinner when aligned
    
    // Glow - reduced
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowIntensity;
    
    // Path gradient - softer opacity
    const gradient = ctx.createLinearGradient(0, startY, 0, endY);
    gradient.addColorStop(0, `rgba(${colorRGB}, ${lineOpacity})`);
    gradient.addColorStop(1, `rgba(${colorRGB}, ${lineOpacity * 0.2})`);
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    
    // Animated dash - slower when aligned for calmer feel
    const dashSpeed = isAligned ? 80 : 120;
    const dashOffset = (time * dashSpeed) % 50;
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
   * Simple pin marker - subtle when aligned
   */
  const drawDestinationMarker = (ctx, x, y, name, time, isAligned = false) => {
    // Slower, subtler pulse when aligned
    const pulseSpeed = isAligned ? 1.5 : 3;
    const pulseAmount = isAligned ? 0.05 : 0.1;
    const pulse = Math.sin(time * pulseSpeed) * pulseAmount + 1;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    
    // Softer colors
    const markerColor = isAligned ? "#7DD4A8" : "#5EC489"; // Softer greens
    const glowIntensity = isAligned ? 10 : 15; // Reduced from 25
    const markerSize = isAligned ? 22 : 26; // Smaller when aligned
    const opacity = isAligned ? 0.7 : 0.9;
    
    // Glow - reduced
    ctx.shadowColor = markerColor;
    ctx.shadowBlur = glowIntensity;
    
    // Pin circle
    ctx.beginPath();
    ctx.arc(0, 0, markerSize, 0, Math.PI * 2);
    ctx.fillStyle = markerColor;
    ctx.globalAlpha = opacity;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner dot
    ctx.beginPath();
    ctx.arc(0, 0, markerSize * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.fill();
    
    // Name label - hide when aligned (less clutter)
    if (!isAligned) {
      ctx.shadowBlur = 3;
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.font = "bold 16px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillText(name, 0, -48);
    }
    
    ctx.restore();
  };

  /**
   * DRAW TURN ARROW
   * Turn indicator - softened colors
   */
  const drawTurnArrow = (ctx, x, y, isRight, time) => {
    // Slower flash for calmer feel
    const flash = (Math.sin(time * 4) + 1) / 2;
    
    ctx.save();
    ctx.translate(x, y);
    
    if (!isRight) {
      ctx.scale(-1, 1);
    }
    
    // Softer amber color, reduced glow
    const turnColor = "rgb(230, 170, 50)"; // Softer amber
    ctx.shadowColor = turnColor;
    ctx.shadowBlur = 12; // Reduced from 25
    
    // Draw 2 chevrons instead of 3 (less visual noise)
    for (let i = 0; i < 2; i++) {
      const offset = i * 22;
      const alpha = 0.7 - i * 0.2 + flash * 0.2;
      
      ctx.strokeStyle = `rgba(230, 170, 50, ${alpha})`;
      ctx.lineWidth = 7 - i * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      ctx.beginPath();
      ctx.moveTo(-16 + offset, -32);
      ctx.lineTo(16 + offset, 0);
      ctx.lineTo(-16 + offset, 32);
      ctx.stroke();
    }
    
    // Remove turn text - the direction overlay already shows this
    
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
    let lastTurnDir = "straight"; // For hysteresis
    
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
        // compassHeadingRef.current is degrees from true north that device is facing
        // bearing is degrees from true north to destination
        // relativeBearing is how far off we are from facing the destination
        const relativeBearing = (bearing - compassHeadingRef.current + 360) % 360;
        
        // Determine turn direction with hysteresis to prevent jittering
        // Use wider "straight" zone (45°) but require larger deviation (50°) to change state
        let turnDir = lastTurnDir;
        
        // Define thresholds with hysteresis
        const STRAIGHT_THRESHOLD = 40; // Within 40° = straight
        const TURN_THRESHOLD = 50; // Must exceed 50° to trigger turn (when currently straight)
        
        if (lastTurnDir === "straight") {
          // Currently going straight - need bigger angle to trigger turn
          if (relativeBearing > TURN_THRESHOLD && relativeBearing < 180) {
            turnDir = "right";
          } else if (relativeBearing > 180 && relativeBearing < (360 - TURN_THRESHOLD)) {
            turnDir = "left";
          }
        } else if (lastTurnDir === "right") {
          // Currently showing right turn
          if (relativeBearing <= STRAIGHT_THRESHOLD || relativeBearing >= 320) {
            turnDir = "straight";
          } else if (relativeBearing > 180) {
            turnDir = "left";
          }
        } else if (lastTurnDir === "left") {
          // Currently showing left turn
          if (relativeBearing <= STRAIGHT_THRESHOLD || relativeBearing >= 320) {
            turnDir = "straight";
          } else if (relativeBearing < 180 && relativeBearing > STRAIGHT_THRESHOLD) {
            turnDir = "right";
          }
        }
        
        lastTurnDir = turnDir;
        
        // Calculate path offset based on actual relative bearing
        let pathOffsetX = 0;
        if (relativeBearing > 0 && relativeBearing <= 180) {
          // Destination is to the right
          pathOffsetX = Math.min((relativeBearing / 90) * 150, 200);
        } else if (relativeBearing > 180 && relativeBearing < 360) {
          // Destination is to the left
          pathOffsetX = -Math.min(((360 - relativeBearing) / 90) * 150, 200);
        }
        
        setTurnDirection(turnDir);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Check if aligned (going straight)
        const isOnTrack = turnDir === "straight";
        
        // Draw path line - subtle when aligned
        drawPathLine(ctx, canvas.width, canvas.height, pathOffsetX, time, isOnTrack);
        
        // Draw arrows - fewer and more subtle when aligned
        const numArrows = isOnTrack ? 2 : 3; // Fewer arrows when on track
        const arrowSpeed = isOnTrack ? 0.4 : 0.6; // Slower animation when aligned
        
        for (let i = 0; i < numArrows; i++) {
          const progress = ((time * arrowSpeed + i / numArrows) % 1);
          const arrowY = canvas.height * 0.35 + (canvas.height * 0.55 * progress);
          const scale = 0.5 + (1 - progress) * 0.5;
          const alpha = (1 - progress * 0.6) * (isOnTrack ? 0.6 : 1); // Fade more when aligned
          
          const curveProgress = progress;
          const arrowX = centerX + pathOffsetX * (1 - curveProgress) * curveProgress * 2;
          
          drawNavigationArrow(ctx, arrowX, arrowY, scale, alpha, isOnTrack);
        }
        
        // Draw destination when facing it (within 45 degrees) - subtle when aligned
        if (relativeBearing > 315 || relativeBearing < 45) {
          const markerX = centerX + (relativeBearing > 180 ? -(360 - relativeBearing) : relativeBearing) * 2;
          drawDestinationMarker(ctx, markerX, canvas.height * 0.24, selectedLocation.name, time, isOnTrack);
        }
        
        // Draw turn arrows only when NOT aligned (need attention)
        if (turnDir === "right") {
          drawTurnArrow(ctx, canvas.width - 70, centerY - 20, true, time);
        } else if (turnDir === "left") {
          drawTurnArrow(ctx, 70, centerY - 20, false, time);
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
   * Filters out inaccurate GPS readings
   */
  const startGPSTracking = async () => {
    if (!navigator.geolocation && !USE_FAKE_LOCATION) {
      setArStatus("error");
      return;
    }

    // Maximum acceptable GPS accuracy (in meters)
    const MAX_ACCURACY = 50;

    // Watch user position (updates as they move)
    watchIdRef.current = watchFakeOrRealPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Filter out very inaccurate GPS readings
        if (accuracy && accuracy > MAX_ACCURACY) {
          console.log(`GPS accuracy too low: ${accuracy}m, skipping update`);
          return;
        }
        
        setUserLocation({ latitude, longitude, accuracy });

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

          // Check if user has arrived (within 15 meters considering GPS accuracy)
          const arrivalThreshold = Math.max(15, accuracy || 15);
          if (dist < arrivalThreshold) {
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

  // Handle calibration with toast - resets compass smoothing
  const handleCalibrate = () => {
    setIsCalibrating(true);
    smoothedHeadingRef.current = 0;
    compassHeadingRef.current = 0;
    setTimeout(() => {
      setIsCalibrating(false);
    }, 2500);
  };

  // Direction fade effect after 2s
  useEffect(() => {
    const currentBearing = getCurrentBearing();
    if (currentBearing !== lastBearing) {
      setDirectionFaded(false);
      setLastBearing(currentBearing);
      
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      
      fadeTimeoutRef.current = setTimeout(() => {
        setDirectionFaded(true);
      }, 2000);
    }
    
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [userLocation, lastBearing]);

  // Check if aligned
  const isAligned = () => {
    const bearing = getCurrentBearing();
    return bearing > 315 || bearing < 45;
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
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 -z-10"></div>

      {/* AR Canvas Overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none"></canvas>

      {/* Center Reticle - Subtle reassurance when aligned */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full z-15 pointer-events-none transition-all duration-500 ${
          isAligned() 
            ? 'opacity-80 w-3 h-3 bg-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.4)]' 
            : 'opacity-0 w-2 h-2'
        }`}
      />

      {/* Top Status Bar - Minimal Gradient */}
      <div className="absolute top-0 left-0 right-0 h-12 px-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-20">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full transition-colors ${
            arStatus === 'tracking' ? 'bg-green-400' :
            arStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
          }`}></span>
          <span className="text-white/90 text-sm font-medium drop-shadow-md">
            {arStatus === "initializing" && "Initializing..."}
            {arStatus === "tracking" && "AR Active"}
            {arStatus === "error" && "Error"}
          </span>
        </div>
        <button 
          className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-lg flex items-center justify-center active:scale-95 transition-transform" 
          onClick={handleClose}
        >
          ✕
        </button>
      </div>

      {/* Top Direction Overlay - Hidden when aligned (user doesn't need instructions) */}
      {selectedLocation && !arrived && !isAligned() && (
        <div 
          className={`absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-40 transition-opacity duration-300 ${
            directionFaded ? 'opacity-40' : 'opacity-90'
          }`}
          style={{ maxWidth: '80%' }}
        >
          <span 
            className="text-5xl leading-none transition-all duration-300"
            style={{ 
              color: getStateColor(getTurnText(getCurrentBearing()).state),
              textShadow: `0 0 20px ${getStateColor(getTurnText(getCurrentBearing()).state)}, 0 4px 10px rgba(0,0,0,0.4)`
            }}
          >
            {getTurnText(getCurrentBearing()).arrow}
          </span>
          <span 
            className="text-lg font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10"
            style={{ 
              background: 'rgba(0,0,0,0.4)',
              color: 'rgba(255,255,255,0.9)',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            {getTurnText(getCurrentBearing()).text}
          </span>
        </div>
      )}

      {/* On Track Indicator - Minimal reassurance when aligned */}
      {selectedLocation && !arrived && isAligned() && (
        <div 
          className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full z-40 backdrop-blur-sm border border-emerald-500/20 animate-fade-in"
          style={{ background: 'rgba(16, 185, 129, 0.15)' }}
        >
          <span className="text-emerald-400 text-lg">✓</span>
          <span className="text-emerald-300/90 text-sm font-medium">On Track</span>
        </div>
      )}

      {/* Compass Indicator - Minimal Edge with Calibration Button */}
      {!arrived && (
        <button 
          onClick={handleCalibrate}
          className="absolute top-16 right-4 w-11 h-11 rounded-full flex items-center justify-center z-30 backdrop-blur-md border border-white/15 active:scale-95 transition-transform"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          title="Tap to recalibrate compass"
        >
          <span 
            className="text-base font-bold text-red-400 transition-transform duration-100"
            style={{ 
              transform: `rotate(${-compassHeadingRef.current}deg)`,
              textShadow: '0 1px 3px rgba(0,0,0,0.5)'
            }}
          >
            N
          </span>
        </button>
      )}

      {/* Calibration Toast - Non-intrusive with instructions */}
      {isCalibrating && (
        <div 
          className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 py-3 px-5 rounded-2xl z-50 backdrop-blur-md border border-white/15 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-white/90">Calibrating compass...</span>
          </div>
          <span className="text-xs text-white/60 text-center">Move phone in figure-8 pattern</span>
        </div>
      )}

      {/* Bottom Info Bar - Edge Anchored, Glassmorphism */}
      {selectedLocation && !arrived && (
        <div 
          className="absolute bottom-4 left-4 right-4 rounded-2xl z-30 backdrop-blur-xl border border-white/12 p-3.5"
          style={{ 
            background: 'rgba(0,0,0,0.55)',
            paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0))'
          }}
        >
          <div className="flex items-center justify-between gap-3">
            {/* Destination Badge */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {selectedLocation.image_url && (
                <img
                  src={selectedLocation.image_url}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-white/15"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              <div className="flex flex-col min-w-0">
                <span 
                  className="text-sm font-medium text-white truncate"
                  style={{ textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}
                >
                  {selectedLocation.name}
                </span>
                {/* GPS Accuracy Indicator */}
                {userLocation?.accuracy && (
                  <span 
                    className={`text-xs ${
                      userLocation.accuracy < 15 ? 'text-green-400' :
                      userLocation.accuracy < 30 ? 'text-yellow-400' : 'text-red-400'
                    }`}
                  >
                    GPS ±{Math.round(userLocation.accuracy)}m
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-sm text-white/90">
                <span className="opacity-80">📍</span>
                <span className="font-medium tabular-nums">{formatDistance(distance)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-white/90">
                <span className="opacity-80">⏱</span>
                <span className="font-medium tabular-nums">{eta || "--"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Arrival Overlay */}
      {arrived && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div 
            className="rounded-3xl p-7 text-center max-w-xs mx-4 backdrop-blur-2xl border border-white/15 animate-scale-in"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <div className="text-5xl mb-3 animate-bounce">🎯</div>
            <h2 
              className="text-2xl font-semibold text-green-400 mb-2"
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}
            >
              You've Arrived!
            </h2>
            <p className="text-base font-medium text-white/80 mb-5">{selectedLocation.name}</p>
            {selectedLocation.image_url && (
              <img
                src={selectedLocation.image_url}
                alt=""
                className="w-full h-24 object-cover rounded-xl mb-5 border border-white/10"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <button 
              className="w-full py-3.5 px-6 rounded-xl text-base font-semibold text-black transition-transform active:scale-98"
              style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' }}
              onClick={handleClose}
            >
              End Navigation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARScene;
