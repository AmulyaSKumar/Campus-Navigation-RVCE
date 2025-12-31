import React, { useEffect, useState, useRef, useCallback } from "react";
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

  // ============ UNITY-STYLE PARTICLE SYSTEM ============
  const particlesRef = useRef([]);
  const energyRingsRef = useRef([]);
  
  // Initialize particles
  const initParticles = (count = 50) => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 4 + 1,
        speedY: Math.random() * 0.3 + 0.1,
        speedX: (Math.random() - 0.5) * 0.1,
        opacity: Math.random() * 0.8 + 0.2,
        hue: Math.random() * 60 + 160, // Cyan to blue range
      });
    }
    particlesRef.current = particles;
  };

  // Initialize energy rings
  const initEnergyRings = () => {
    energyRingsRef.current = [
      { progress: 0, delay: 0 },
      { progress: 0, delay: 0.33 },
      { progress: 0, delay: 0.66 },
    ];
  };

  /**
   * DRAW HOLOGRAPHIC 3D ARROW - UNITY STYLE
   * Large futuristic arrow with 3D perspective and glow effects
   */
  const drawHolographicArrow = (ctx, x, y, scale, alpha, time, index) => {
    ctx.save();
    ctx.translate(x, y);
    
    // 3D perspective scaling
    const perspectiveScale = scale * (1 + index * 0.1);
    ctx.scale(perspectiveScale, perspectiveScale * 0.6); // Flatten for ground perspective
    
    // Pulsing effect
    const pulse = Math.sin(time * 4 + index) * 0.1 + 1;
    ctx.scale(pulse, pulse);
    
    // Large arrow dimensions
    const arrowWidth = 120;
    const arrowHeight = 140;
    
    // Outer glow layers (multiple for intensity)
    for (let glow = 3; glow >= 0; glow--) {
      ctx.shadowColor = `hsla(${185 + glow * 5}, 100%, 60%, ${alpha * 0.3})`;
      ctx.shadowBlur = 40 + glow * 15;
      
      // Main holographic gradient
      const gradient = ctx.createLinearGradient(0, -arrowHeight/2, 0, arrowHeight/2);
      gradient.addColorStop(0, `hsla(190, 100%, 70%, ${alpha * 0.9})`);
      gradient.addColorStop(0.3, `hsla(200, 100%, 60%, ${alpha * 0.8})`);
      gradient.addColorStop(0.6, `hsla(210, 100%, 50%, ${alpha * 0.6})`);
      gradient.addColorStop(1, `hsla(220, 100%, 40%, ${alpha * 0.2})`);
      
      // Draw 3D chevron arrow
      ctx.beginPath();
      ctx.moveTo(0, -arrowHeight/2);
      ctx.lineTo(arrowWidth/2, arrowHeight * 0.1);
      ctx.lineTo(arrowWidth * 0.3, arrowHeight * 0.1);
      ctx.lineTo(arrowWidth * 0.3, arrowHeight/2);
      ctx.lineTo(-arrowWidth * 0.3, arrowHeight/2);
      ctx.lineTo(-arrowWidth * 0.3, arrowHeight * 0.1);
      ctx.lineTo(-arrowWidth/2, arrowHeight * 0.1);
      ctx.closePath();
      
      if (glow === 0) {
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }
    
    // Neon edge effect
    ctx.shadowColor = "#00FFFF";
    ctx.shadowBlur = 20;
    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.9})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner energy lines
    ctx.beginPath();
    ctx.moveTo(0, -arrowHeight/2 + 20);
    ctx.lineTo(arrowWidth * 0.25, arrowHeight * 0.05);
    ctx.lineTo(0, arrowHeight * 0.05 - 10);
    ctx.lineTo(-arrowWidth * 0.25, arrowHeight * 0.05);
    ctx.closePath();
    
    const innerGradient = ctx.createLinearGradient(0, -arrowHeight/2, 0, arrowHeight * 0.1);
    innerGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.6})`);
    innerGradient.addColorStop(1, `rgba(0, 255, 255, ${alpha * 0.2})`);
    ctx.fillStyle = innerGradient;
    ctx.fill();
    
    // Scanning line effect
    const scanY = ((time * 2 + index * 0.5) % 1) * arrowHeight - arrowHeight/2;
    ctx.beginPath();
    ctx.moveTo(-arrowWidth/2, scanY);
    ctx.lineTo(arrowWidth/2, scanY);
    const scanGradient = ctx.createLinearGradient(-arrowWidth/2, 0, arrowWidth/2, 0);
    scanGradient.addColorStop(0, `rgba(0, 255, 255, 0)`);
    scanGradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.8})`);
    scanGradient.addColorStop(1, `rgba(0, 255, 255, 0)`);
    ctx.strokeStyle = scanGradient;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  };

  /**
   * DRAW ENERGY PARTICLES
   * Floating particles around the navigation path
   */
  const drawParticles = (ctx, width, height, time) => {
    if (particlesRef.current.length === 0) {
      initParticles();
    }
    
    ctx.save();
    
    particlesRef.current.forEach((p, i) => {
      // Update position
      p.y -= p.speedY * 0.01;
      p.x += p.speedX * 0.01;
      
      // Reset if out of bounds
      if (p.y < 0) {
        p.y = 1;
        p.x = Math.random();
      }
      
      const px = p.x * width;
      const py = p.y * height;
      
      // Only draw in path area
      if (px > width * 0.2 && px < width * 0.8) {
        // Glowing particle
        const glowSize = p.size * (1 + Math.sin(time * 5 + i) * 0.3);
        
        ctx.beginPath();
        ctx.arc(px, py, glowSize, 0, Math.PI * 2);
        
        const particleGradient = ctx.createRadialGradient(px, py, 0, px, py, glowSize * 3);
        particleGradient.addColorStop(0, `hsla(${p.hue}, 100%, 80%, ${p.opacity})`);
        particleGradient.addColorStop(0.5, `hsla(${p.hue}, 100%, 60%, ${p.opacity * 0.5})`);
        particleGradient.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
        
        ctx.fillStyle = particleGradient;
        ctx.fill();
      }
    });
    
    ctx.restore();
  };

  /**
   * DRAW ENERGY RINGS
   * Pulsating rings that travel along the path
   */
  const drawEnergyRings = (ctx, centerX, bottomY, time) => {
    if (energyRingsRef.current.length === 0) {
      initEnergyRings();
    }
    
    ctx.save();
    
    energyRingsRef.current.forEach((ring, i) => {
      const cycleTime = (time * 0.5 + ring.delay) % 1;
      const y = bottomY - cycleTime * bottomY * 0.6;
      const scale = 0.3 + cycleTime * 0.7;
      const alpha = 1 - cycleTime;
      
      // Draw elliptical ring (perspective)
      ctx.beginPath();
      ctx.ellipse(centerX, y, 80 * scale, 20 * scale, 0, 0, Math.PI * 2);
      
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 30;
      
      const ringGradient = ctx.createRadialGradient(centerX, y, 0, centerX, y, 80 * scale);
      ringGradient.addColorStop(0, `rgba(0, 255, 255, 0)`);
      ringGradient.addColorStop(0.7, `rgba(0, 255, 255, ${alpha * 0.3})`);
      ringGradient.addColorStop(0.9, `rgba(0, 255, 255, ${alpha * 0.8})`);
      ringGradient.addColorStop(1, `rgba(0, 255, 255, 0)`);
      
      ctx.strokeStyle = ringGradient;
      ctx.lineWidth = 4;
      ctx.stroke();
    });
    
    ctx.restore();
  };

  /**
   * DRAW HOLOGRAPHIC PATH BEAM
   * Futuristic energy beam path with Unity-style effects
   */
  const drawHolographicPath = (ctx, width, height, offsetX, time) => {
    const startY = height * 0.30;
    const endY = height * 0.98;
    
    ctx.save();
    
    // Draw multiple path layers for depth
    for (let layer = 2; layer >= 0; layer--) {
      const layerWidth = 60 - layer * 15;
      const layerAlpha = 0.3 + layer * 0.2;
      
      // Outer glow
      ctx.shadowColor = layer === 0 ? "#00FFFF" : "#0088FF";
      ctx.shadowBlur = 40 - layer * 10;
      
      // Path gradient
      const gradient = ctx.createLinearGradient(0, startY, 0, endY);
      gradient.addColorStop(0, `rgba(0, 255, 255, ${layerAlpha})`);
      gradient.addColorStop(0.3, `rgba(0, 200, 255, ${layerAlpha * 0.8})`);
      gradient.addColorStop(0.7, `rgba(0, 150, 255, ${layerAlpha * 0.5})`);
      gradient.addColorStop(1, `rgba(0, 100, 255, ${layerAlpha * 0.2})`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = layerWidth;
      ctx.lineCap = "round";
      
      // Animated energy flow
      if (layer === 0) {
        const dashLength = 30;
        const gapLength = 20;
        const dashOffset = (time * 200) % (dashLength + gapLength);
        ctx.setLineDash([dashLength, gapLength]);
        ctx.lineDashOffset = -dashOffset;
      } else {
        ctx.setLineDash([]);
      }
      
      // Draw curved path
      ctx.beginPath();
      ctx.moveTo(width/2, endY);
      
      const controlX = width/2 + offsetX * 0.6;
      const controlY = height * 0.55;
      ctx.quadraticCurveTo(controlX, controlY, width/2 + offsetX, startY);
      ctx.stroke();
    }
    
    // Energy wave effect traveling up the path
    const waveCount = 3;
    for (let w = 0; w < waveCount; w++) {
      const waveProgress = ((time * 0.8 + w / waveCount) % 1);
      const waveY = endY - waveProgress * (endY - startY);
      const waveX = width/2 + offsetX * (1 - waveProgress) * waveProgress * 2;
      const waveAlpha = Math.sin(waveProgress * Math.PI);
      
      ctx.beginPath();
      ctx.arc(waveX, waveY, 15 + waveAlpha * 10, 0, Math.PI * 2);
      
      const waveGradient = ctx.createRadialGradient(waveX, waveY, 0, waveX, waveY, 25);
      waveGradient.addColorStop(0, `rgba(255, 255, 255, ${waveAlpha * 0.9})`);
      waveGradient.addColorStop(0.4, `rgba(0, 255, 255, ${waveAlpha * 0.6})`);
      waveGradient.addColorStop(1, `rgba(0, 200, 255, 0)`);
      
      ctx.fillStyle = waveGradient;
      ctx.fill();
    }
    
    ctx.restore();
  };

  /**
   * DRAW HOLOGRAPHIC DESTINATION MARKER
   * Futuristic floating destination with energy effects
   */
  const drawHolographicDestination = (ctx, x, y, name, time) => {
    const pulse = Math.sin(time * 3) * 0.15 + 1;
    const rotate = time * 0.5;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Rotating outer ring
    ctx.save();
    ctx.rotate(rotate);
    ctx.beginPath();
    ctx.arc(0, 0, 60 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 150, 0.3)`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.restore();
    
    // Counter-rotating inner ring
    ctx.save();
    ctx.rotate(-rotate * 1.5);
    ctx.beginPath();
    ctx.arc(0, 0, 45 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 200, 0.5)`;
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 8]);
    ctx.stroke();
    ctx.restore();
    
    // Energy field glow
    ctx.shadowColor = "#00FF88";
    ctx.shadowBlur = 50;
    
    // Main beacon
    const beaconGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 35 * pulse);
    beaconGradient.addColorStop(0, `rgba(100, 255, 180, 0.9)`);
    beaconGradient.addColorStop(0.5, `rgba(50, 200, 150, 0.6)`);
    beaconGradient.addColorStop(1, `rgba(0, 150, 100, 0.2)`);
    
    ctx.beginPath();
    ctx.arc(0, 0, 35 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = beaconGradient;
    ctx.fill();
    
    // Inner core
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fill();
    
    // Destination icon (checkmark/pin)
    ctx.fillStyle = "#00AA66";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", 0, 0);
    
    // Holographic label with background
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    
    // Label background
    const labelWidth = ctx.measureText(name).width + 30;
    ctx.fillStyle = "rgba(0, 50, 40, 0.85)";
    ctx.beginPath();
    ctx.roundRect(-labelWidth/2, -90, labelWidth, 32, 8);
    ctx.fill();
    
    // Label border
    ctx.strokeStyle = "rgba(0, 255, 150, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Label text
    ctx.shadowBlur = 0;
    ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#00FF99";
    ctx.fillText(name, 0, -74);
    
    // Connecting line to marker
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.lineTo(0, -35 * pulse);
    ctx.strokeStyle = "rgba(0, 255, 150, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();
    
    ctx.restore();
  };

  /**
   * DRAW HOLOGRAPHIC TURN INDICATOR
   * Large animated turn arrows with Unity-style effects
   */
  const drawHolographicTurnIndicator = (ctx, x, y, isRight, time, screenWidth) => {
    const pulse = Math.sin(time * 6) * 0.15 + 1;
    const flash = (Math.sin(time * 8) + 1) / 2; // 0 to 1 flash
    
    ctx.save();
    ctx.translate(x, y);
    
    if (!isRight) {
      ctx.scale(-1, 1);
    }
    
    // Multiple layered chevrons for depth
    for (let i = 2; i >= 0; i--) {
      const offset = i * 35;
      const alpha = 1 - i * 0.3 + flash * 0.2;
      const scale = pulse - i * 0.1;
      
      ctx.save();
      ctx.translate(offset, 0);
      ctx.scale(scale, scale);
      
      // Glow
      ctx.shadowColor = i === 0 ? "#FFDD00" : "#FF8800";
      ctx.shadowBlur = 30 - i * 8;
      
      // Chevron gradient
      const chevronGradient = ctx.createLinearGradient(-40, 0, 40, 0);
      chevronGradient.addColorStop(0, `rgba(255, 200, 0, ${alpha})`);
      chevronGradient.addColorStop(0.5, `rgba(255, 150, 0, ${alpha})`);
      chevronGradient.addColorStop(1, `rgba(255, 100, 0, ${alpha * 0.7})`);
      
      ctx.strokeStyle = chevronGradient;
      ctx.lineWidth = 12 - i * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      // Draw large chevron
      ctx.beginPath();
      ctx.moveTo(-30, -50);
      ctx.lineTo(20, 0);
      ctx.lineTo(-30, 50);
      ctx.stroke();
      
      // White edge highlight
      if (i === 0) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    // Turn text label
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 6;
    
    const turnText = isRight ? "TURN RIGHT" : "TURN LEFT";
    const textX = isRight ? -60 : 60;
    
    ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255, 200, 0, ${0.8 + flash * 0.2})`;
    ctx.fillText(turnText, textX * (isRight ? -1 : 1), 80);
    
    ctx.restore();
  };

  /**
   * DRAW HUD OVERLAY
   * Futuristic heads-up display frame
   */
  const drawHUDOverlay = (ctx, width, height, time) => {
    ctx.save();
    
    // Corner brackets
    const bracketSize = 60;
    const bracketThickness = 3;
    const margin = 30;
    const alpha = 0.4 + Math.sin(time * 2) * 0.1;
    
    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
    ctx.lineWidth = bracketThickness;
    ctx.lineCap = "square";
    
    // Top-left bracket
    ctx.beginPath();
    ctx.moveTo(margin, margin + bracketSize);
    ctx.lineTo(margin, margin);
    ctx.lineTo(margin + bracketSize, margin);
    ctx.stroke();
    
    // Top-right bracket
    ctx.beginPath();
    ctx.moveTo(width - margin - bracketSize, margin);
    ctx.lineTo(width - margin, margin);
    ctx.lineTo(width - margin, margin + bracketSize);
    ctx.stroke();
    
    // Bottom-left bracket
    ctx.beginPath();
    ctx.moveTo(margin, height - margin - bracketSize);
    ctx.lineTo(margin, height - margin);
    ctx.lineTo(margin + bracketSize, height - margin);
    ctx.stroke();
    
    // Bottom-right bracket
    ctx.beginPath();
    ctx.moveTo(width - margin - bracketSize, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.lineTo(width - margin, height - margin - bracketSize);
    ctx.stroke();
    
    // Scanning line effect
    const scanY = ((time * 0.3) % 1) * height;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(width, scanY);
    const scanGradient = ctx.createLinearGradient(0, 0, width, 0);
    scanGradient.addColorStop(0, `rgba(0, 255, 255, 0)`);
    scanGradient.addColorStop(0.5, `rgba(0, 255, 255, 0.15)`);
    scanGradient.addColorStop(1, `rgba(0, 255, 255, 0)`);
    ctx.strokeStyle = scanGradient;
    ctx.lineWidth = 1;
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
    
    // Initialize particle systems
    initParticles(60);
    initEnergyRings();

    /**
     * ANIMATION LOOP
     * Renders Unity-style futuristic AR navigation
     */
    const animate = () => {
      const time = (Date.now() - startTimeRef.current) / 1000;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw HUD overlay (always visible)
      drawHUDOverlay(ctx, canvas.width, canvas.height, time);

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
          pathOffsetX = Math.min((relativeBearing / 90) * 200, 250);
        } else if (relativeBearing > 180 && relativeBearing < 330) {
          turnDir = "left";
          pathOffsetX = -Math.min(((360 - relativeBearing) / 90) * 200, 250);
        }
        
        setTurnDirection(turnDir);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Draw floating particles in the path area
        drawParticles(ctx, canvas.width, canvas.height, time);
        
        // Draw holographic energy path
        drawHolographicPath(ctx, canvas.width, canvas.height, pathOffsetX, time);
        
        // Draw pulsating energy rings
        drawEnergyRings(ctx, centerX, canvas.height * 0.95, time);
        
        // Draw large holographic arrows (Unity style)
        const numArrows = 5;
        for (let i = 0; i < numArrows; i++) {
          const progress = ((time * 0.6 + i / numArrows) % 1);
          const arrowY = canvas.height * 0.30 + (canvas.height * 0.60 * progress);
          const scale = 0.5 + (1 - progress) * 0.8;
          const alpha = 1 - progress * 0.6;
          
          // Calculate x position based on path curve
          const curveProgress = progress;
          const arrowX = centerX + pathOffsetX * (1 - curveProgress) * curveProgress * 2.5;
          
          drawHolographicArrow(ctx, arrowX, arrowY, scale, alpha, time, i);
        }
        
        // Draw holographic destination marker when facing correct direction
        if (relativeBearing > 315 || relativeBearing < 45) {
          const markerX = centerX + (relativeBearing > 180 ? -(360 - relativeBearing) : relativeBearing) * 2;
          drawHolographicDestination(ctx, markerX, canvas.height * 0.22, selectedLocation.name, time);
        }
        
        // Draw large turn indicators when not facing destination
        if (turnDir === "right") {
          drawHolographicTurnIndicator(ctx, canvas.width - 100, centerY - 30, true, time, canvas.width);
        } else if (turnDir === "left") {
          drawHolographicTurnIndicator(ctx, 100, centerY - 30, false, time, canvas.width);
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
    <div className="fixed inset-0 w-full h-full bg-black z-[9999] overflow-hidden font-google">
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
      <div className="absolute top-0 left-0 right-0 h-16 px-4 safe-top flex justify-between items-center 
                      bg-gradient-to-b from-black/60 to-transparent z-20">
        <div className="flex items-center gap-2 bg-black/50 py-2 px-4 rounded-full text-white text-sm font-medium backdrop-blur-lg">
          <span className={`w-2 h-2 rounded-full ${
            arStatus === 'tracking' ? 'bg-green-400 shadow-[0_0_10px_#00E676]' :
            arStatus === 'error' ? 'bg-red-500' : 'bg-orange-400'
          }`}></span>
          <span>
            {arStatus === "initializing" && "Starting..."}
            {arStatus === "tracking" && "Live View"}
            {arStatus === "error" && "Error"}
          </span>
        </div>
        <button className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-lg border-none text-white 
                          text-xl flex items-center justify-center cursor-pointer
                          hover:bg-black/60 active:scale-95 transition-all" onClick={onClose}>✕</button>
      </div>

      {/* Navigation Instruction Card - Google Maps Style */}
      {selectedLocation && !arrived && (
        <div className="absolute top-20 safe-top left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-ar 
                        py-3 px-5 flex items-center gap-4 min-w-[260px] max-w-[90%] z-30">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 
                         flex items-center justify-center shadow-md">
            {turnDirection === "straight" && <span className="text-white text-3xl font-bold">↑</span>}
            {turnDirection === "right" && <span className="text-white text-3xl font-bold">↱</span>}
            {turnDirection === "left" && <span className="text-white text-3xl font-bold">↰</span>}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-gray-900 text-lg">{getTurnText(getCurrentBearing()).text}</span>
            <span className="text-sm text-gray-500">toward {selectedLocation.name}</span>
          </div>
        </div>
      )}

      {/* Bottom Info Panel */}
      {selectedLocation && !arrived && (
        <div className="absolute bottom-28 safe-bottom left-4 right-4 bg-white/95 backdrop-blur-lg 
                        rounded-3xl shadow-ar p-5 z-30">
          <div className="flex justify-around items-center mb-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-blue-600">{formatDistance(distance)}</span>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Distance</span>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-gray-700">{eta || "--"}</span>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Walk time</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            {selectedLocation.image_url && (
              <img 
                src={selectedLocation.image_url} 
                alt=""
                className="w-12 h-12 rounded-lg object-cover"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 text-sm">{selectedLocation.name}</span>
              <span className="text-xs text-gray-400">
                {selectedLocation.coordinates[0].toFixed(4)}°, {selectedLocation.coordinates[1].toFixed(4)}°
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Arrival Celebration */}
      {arrived && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4 shadow-2xl animate-bounce">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You've Arrived!</h2>
            <p className="text-gray-600 mb-4">{selectedLocation.name}</p>
            {selectedLocation.image_url && (
              <img 
                src={selectedLocation.image_url} 
                alt=""
                className="w-full h-32 object-cover rounded-xl mb-4"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <button className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl 
                              hover:bg-blue-700 transition-colors" onClick={onClose}>End Navigation</button>
          </div>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div className="absolute bottom-4 safe-bottom left-1/2 -translate-x-1/2 flex gap-4 z-40">
        <button className="flex flex-col items-center gap-1 bg-red-500/90 text-white py-2.5 px-5 
                          rounded-2xl backdrop-blur-lg min-h-[56px] border-none cursor-pointer
                          hover:bg-red-600 active:scale-95 transition-all" onClick={onClose}>
          <span className="text-lg">✕</span>
          <small className="text-[10px] uppercase tracking-wider">Exit</small>
        </button>
        <button className="flex flex-col items-center gap-1 bg-white/20 text-white py-2.5 px-5 
                          rounded-2xl backdrop-blur-lg min-h-[56px] border border-white/30 cursor-pointer
                          hover:bg-white/30 active:scale-95 transition-all" 
                onClick={() => compassHeadingRef.current = 0}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <small className="text-[10px] uppercase tracking-wider">Calibrate</small>
        </button>
      </div>
    </div>
  );
};

export default ARScene;
