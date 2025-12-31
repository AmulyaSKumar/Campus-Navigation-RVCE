import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";
import ARScene from "./ARScene";
import { API_ENDPOINTS } from "../config/apiConfig";

// ============ FAKE LOCATION FOR DEMO ============
// Set to true for presentation/demo mode
const USE_FAKE_LOCATION = false;
const FAKE_LOCATION = {
  coords: {
    latitude: 12.923383,   // ISE Dept RVCE
    longitude: 77.501071,
    accuracy: 10,
    speed: 1.5
  }
};

// Helper function to get location (fake or real)
const getFakeOrRealLocation = (successCallback, errorCallback, options) => {
  if (USE_FAKE_LOCATION) {
    console.log("📍 Using fake location: ISE Dept RVCE");
    setTimeout(() => successCallback(FAKE_LOCATION), 100);
    return;
  }
  navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
};

// Helper to simulate watchPosition for fake location
let fakeWatchId = 0;
const fakeWatchIntervals = {};
const watchFakeOrRealPosition = (successCallback, errorCallback, options) => {
  if (USE_FAKE_LOCATION) {
    fakeWatchId++;
    const id = fakeWatchId;
    // Simulate periodic location updates
    fakeWatchIntervals[id] = setInterval(() => {
      console.log("📍 Fake location update");
      successCallback(FAKE_LOCATION);
    }, 2000);
    // Initial call
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
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
  }
};
// ============ END FAKE LOCATION ============

const MapPage = ({ coordinates, locationData, onPlaceSelected }) => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [map, setMap] = useState(null);
  const [routingControl, setRoutingControl] = useState(null);
  const [directions, setDirections] = useState([]);
  const [totalDistance, setTotalDistance] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [error, setError] = useState(null);
  const [isARMode, setIsARMode] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const routingMachineRef = useRef(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const destinationMarkerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const lastUpdateTimeRef = useRef(Date.now());
  const speedReadingsRef = useRef([]);
  const lastLocationRef = useRef(null);
  const lastLocationTimeRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const watchPositionIdRef = useRef(null);
  const mapUpdateTimeoutRef = useRef(null);
  const isFirstUpdateRef = useRef(true);
  const debounceTimerRef = useRef(null);



  const [locationImage, setLocationImage] = useState(null);

  const locationOptions = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000  // Increased from 5000ms to 15000ms for more reliable GPS
  };

  const createCustomIcon = (color, text) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="background-color: ${color}; width: 24px; height: 24px; 
                    border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);
                    display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
          ${text}
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
  };

  const userIcon = createCustomIcon('#4285F4', 'U');
  const destinationIcon = createCustomIcon('#EA4335', 'D');

  const formatDistance = (meters) => {
    if (!meters || isNaN(meters)) return '0 m';
    return meters >= 1000 
      ? `${(meters / 1000).toFixed(1)} km`
      : `${Math.round(meters)} m`;
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0 min';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const handleBackAndChangeDestination = () => {
    // Stop navigation
    setIsNavigating(false);
    if (watchPositionIdRef.current) {
      clearFakeOrRealWatch(watchPositionIdRef.current);
    }
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    // Navigate back to home
    navigate("/");
  };

  // Request location permission (will trigger browser prompt)
  const requestLocationPermission = () => {
    if (!navigator.geolocation && !USE_FAKE_LOCATION) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    getFakeOrRealLocation(
      () => {
        setLocationPermission("granted");
        setShowPermissionBanner(false);
        console.log("Location permission granted.");
      },
      (err) => {
        setLocationPermission("denied");
        setShowPermissionBanner(true);
        console.warn("Location permission denied:", err);
        alert("Location access denied. Some features may not work.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Check permission status where supported
  useEffect(() => {
    let mounted = true;
    async function checkPermission() {
      if (navigator.permissions) {
        try {
          const status = await navigator.permissions.query({ name: "geolocation" });
          if (!mounted) return;
          setLocationPermission(status.state);
          setShowPermissionBanner(status.state !== "granted");
          status.onchange = () => {
            setLocationPermission(status.state);
            setShowPermissionBanner(status.state !== "granted");
          };
        } catch (e) {
          setShowPermissionBanner(true);
        }
      } else {
        setShowPermissionBanner(true);
      }
    }
    checkPermission();
    return () => { mounted = false; };
  }, []);

  // Request camera permission and enable AR if granted
  const handleStartAR = async () => {
    if (!locationData) {
      alert("Please select a location first");
      return;
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Stop tracks immediately; we only needed permission
        stream.getTracks().forEach((t) => t.stop());
        setCameraPermission("granted");
        setIsARMode(true);
      } catch (err) {
        setCameraPermission("denied");
        alert("Camera access denied. AR requires camera permission.");
      }
    } else {
      alert("Camera API not supported on this device/browser.");
    }
  }; 

  const handleSidebarSearch = async (query) => {
    setSearchQuery(query);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setSearchSuggestions([]);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearchLoading(true);
      try {
        const response = await axios.get(
          API_ENDPOINTS.search.autocomplete(query.trim())
        );

        if (Array.isArray(response.data)) {
          setSearchSuggestions(
            response.data.filter(
              (location) =>
                location.name &&
                Array.isArray(location.coordinates) &&
                location.coordinates.length === 2
            )
          );
        } else {
          setSearchSuggestions([]);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSearchSuggestions([]);
      } finally {
        setIsSearchLoading(false);
      }
    }, 300);
  };

  const handleSelectFromSidebar = (location) => {
    if (!location || !location.name || !location.coordinates) {
      console.error("Invalid location data:", location);
      return;
    }

    // Update search query and clear suggestions
    setSearchQuery(location.name);
    setSearchSuggestions([]);

    // Stop current navigation
    setIsNavigating(false);
    if (watchPositionIdRef.current) {
      clearFakeOrRealWatch(watchPositionIdRef.current);
    }
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Prefer using parent's handler so App state updates; otherwise update locally
    if (typeof onPlaceSelected === "function") {
      onPlaceSelected(location.coordinates, location);
    } else {
      // Fallback: update destination marker and center map
      if (map) {
        if (destinationMarkerRef.current) {
          destinationMarkerRef.current.remove();
        }
        destinationMarkerRef.current = L.marker(location.coordinates, {
          icon: destinationIcon
        }).addTo(map);
        map.panTo(location.coordinates, { animate: true, duration: 1 });
      }
    }
  };

  const calculateSpeed = (prevLocation, currentLocation, timeDiff) => {
    if (!prevLocation || !currentLocation || !timeDiff) return 0;
    
    const distance = map.distance(
      [prevLocation[0], prevLocation[1]], 
      [currentLocation[0], currentLocation[1]]
    );
    const timeInSeconds = timeDiff / 1000;
    const speedMPS = distance / timeInSeconds;
    const speedKMH = (speedMPS * 3.6).toFixed(1);
    
    return parseFloat(speedKMH);
  };

  const updateAverageSpeed = (newSpeed) => {
    if (newSpeed > 0) {
      speedReadingsRef.current.push(newSpeed);
      
      if (speedReadingsRef.current.length > 5) {
        speedReadingsRef.current.shift();
      }
      
      const avg = speedReadingsRef.current.reduce((a, b) => a + b, 0) / 
                  speedReadingsRef.current.length;
      setAverageSpeed(parseFloat(avg.toFixed(1)));
    }
  };

  const updateRoute = (start, end) => {
    if (!map || !start || !end) return;

    try {
      if (routingControl) {
        map.removeControl(routingControl);
      }

      const baseSpeed = 50;
      const speedFactor = currentSpeed > 0 ? currentSpeed / baseSpeed : 1;

      const newRoutingControl = L.Routing.control({
        waypoints: [
          L.latLng(start[0], start[1]),
          L.latLng(end[0], end[1])
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        addWaypoints: false,
        fitSelectedRoutes: false,
        show: false,
        lineOptions: {
          styles: [{ color: '#4285F4', opacity: 0.8, weight: 6 }],
          extendToWaypoints: true,
          missingRouteTolerance: 0
        },
        createMarker: () => null,
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'driving',
          parameters: {
            multiplicator: speedFactor
          }
        })
      });

      newRoutingControl.on('routesfound', (e) => {
        const routes = e.routes;
        if (!routes || !routes[0]) return;

        const instructions = routes[0].instructions.map(instruction => ({
          text: instruction.text,
          distance: instruction.distance,
          time: Math.round(instruction.time / speedFactor),
          type: instruction.type
        }));
        
        setDirections(instructions);
        setTotalDistance(routes[0].summary.totalDistance);
        setEstimatedTime(Math.round(routes[0].summary.totalTime / speedFactor));
      });

      newRoutingControl.addTo(map);
      setRoutingControl(newRoutingControl);
      routingMachineRef.current = newRoutingControl;

    } catch (error) {
      console.error('Error updating route:', error);
      setError('Failed to update route. Please try again.');
    }
  };

  const handleLocationUpdate = (position) => {
    const { latitude, longitude, accuracy, speed } = position.coords;
    const newUserLocation = [latitude, longitude];
    const currentTime = Date.now();

    setLocationAccuracy(accuracy);
    setUserLocation(newUserLocation);

    // Update speed calculations
    if (lastLocationRef.current && lastLocationTimeRef.current) {
      const calculatedSpeed = calculateSpeed(
        lastLocationRef.current,
        newUserLocation,
        currentTime - lastLocationTimeRef.current
      );
      
      const newSpeed = speed ? speed * 3.6 : calculatedSpeed;
      setCurrentSpeed(parseFloat(newSpeed.toFixed(1)));
      updateAverageSpeed(newSpeed);
    }

    lastLocationRef.current = newUserLocation;
    lastLocationTimeRef.current = currentTime;

    // Update user marker position with smooth animation
    if (map) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(newUserLocation, {
          icon: userIcon
        }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng(newUserLocation);
      }

      // Smooth map centering with animation
      if (isFirstUpdateRef.current || map.distance(newUserLocation, map.getCenter()) > 50) {
        map.panTo(newUserLocation, {
          animate: true,
          duration: 1,
          easeLinearity: 0.5
        });
        isFirstUpdateRef.current = false;
      }

      // Update route if navigating
      if (isNavigating && coordinates) {
        // Debounce route updates to prevent too frequent recalculation
        if (mapUpdateTimeoutRef.current) {
          clearTimeout(mapUpdateTimeoutRef.current);
        }
        mapUpdateTimeoutRef.current = setTimeout(() => {
          updateRoute(newUserLocation, coordinates);
        }, 1000); // More frequent updates
      }
    }
  };

  const handleGetDirections = () => {
    setError(null);
    if (!userLocation) {
      getFakeOrRealLocation(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = [latitude, longitude];
          setUserLocation(newLocation);
          setIsNavigating(true);
          startNavigation(newLocation);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get your location. Please enable location services.');
        },
        locationOptions
      );
    } else {
      setIsNavigating(true);
      startNavigation(userLocation);
    }
  };

  const startNavigation = (startLocation) => {
    if (coordinates) {
      updateRoute(startLocation, coordinates);

      // Clear any existing watchers
      if (watchPositionIdRef.current) {
        clearFakeOrRealWatch(watchPositionIdRef.current);
      }

      // Start continuous location tracking
      watchPositionIdRef.current = watchFakeOrRealPosition(
        handleLocationUpdate,
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get your location. Please enable location services.');
          setIsNavigating(false);
        },
        locationOptions
      );

      // Backup interval for consistent updates
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      refreshIntervalRef.current = setInterval(() => {
        getFakeOrRealLocation(
          handleLocationUpdate,
          null,
          locationOptions
        );
      }, 1000);
    }
  };

  useEffect(() => {
    const mapInstance = L.map("map", {
      zoomControl: true,
      attributionControl: true
    }).setView(coordinates || [12.924870, 77.499360], 16);
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(mapInstance);

    L.control.scale({ imperial: false }).addTo(mapInstance);

    setMap(mapInstance);

    // Get initial user location
    getFakeOrRealLocation(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
      },
      (error) => {
        console.error('Initial geolocation error:', error);
        setError('Unable to get your location. Please enable location services.');
      },
      locationOptions
    );

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
      if (watchPositionIdRef.current) {
        clearFakeOrRealWatch(watchPositionIdRef.current);
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (mapUpdateTimeoutRef.current) {
        clearTimeout(mapUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Update destination marker and center map when coordinates prop changes
  useEffect(() => {
    if (!map) return;

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    if (coordinates) {
      destinationMarkerRef.current = L.marker(coordinates, { icon: destinationIcon }).addTo(map);
      try {
        map.panTo(coordinates, { animate: true, duration: 1 });
      } catch (e) {
        // Ignored - panTo may fail if map not ready
      }
    }
  }, [coordinates, map]);

  const getDirectionIcon = (type) => {
    switch (type) {
      case 'SharpLeft':
      case 'SlightLeft':
      case 'Left':
        return '←';
      case 'SharpRight':
      case 'SlightRight':
      case 'Right':
        return '→';
      case 'Straight':
        return '↑';
      case 'DestinationReached':
        return '◉';
      default:
        return '•';
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden font-sans bg-slate-100">
      {isARMode && locationData ? (
        <ARScene 
          selectedLocation={locationData} 
          onClose={() => setIsARMode(false)} 
        />
      ) : (
        <>
          {/* Enhanced Back Button */}
          <button
            className="fixed top-5 left-5 z-[1100] w-12 h-12 flex items-center justify-center 
                       bg-white/95 backdrop-blur-sm border-0 text-gray-700 rounded-xl 
                       shadow-lg shadow-gray-200/50 cursor-pointer text-xl 
                       min-h-[48px] min-w-[48px] transition-all duration-300
                       hover:-translate-y-1 hover:shadow-xl hover:bg-white
                       active:translate-y-0 active:scale-95"
            onClick={handleBackAndChangeDestination}
            title="Back to Home"
            aria-label="Go back"
          >
            <span className="transform hover:scale-110 transition-transform">←</span>
          </button>

          {/* Enhanced Permission Banner */}
          {showPermissionBanner && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-50 to-orange-50
                           text-gray-800 border border-amber-200/50 py-3 px-5 rounded-xl 
                           flex items-center gap-3 shadow-lg shadow-amber-100/50 z-[1100] text-sm
                           backdrop-blur-sm" role="status" aria-live="polite">
              <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
              <span className="font-medium">Location required for navigation</span>
              <button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white 
                                border-none py-2 px-4 rounded-lg cursor-pointer font-semibold 
                                min-h-[36px] shadow-md hover:shadow-lg hover:-translate-y-0.5
                                transition-all duration-300" 
                      onClick={requestLocationPermission}>Enable</button>
            </div>
          )}

          <div id="map" className="h-full w-full z-[1]"></div>

          {/* Enhanced Search Sidebar */}
          <div className="fixed top-5 right-5 w-72 z-[1001] bg-white/95 backdrop-blur-md rounded-2xl 
                         shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100/50
                         sm:w-56 sm:top-3 sm:right-3">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSidebarSearch(e.target.value)}
                placeholder="Search destination..."
                className="w-full py-3.5 pl-12 pr-4 border-none text-sm bg-transparent min-h-[48px]
                          focus:outline-none focus:bg-gray-50/50 transition-all placeholder:text-gray-400"
                autoComplete="off"
              />
              {isSearchLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 
                               border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
              )}
            </div>
            {searchSuggestions.length > 0 && (
              <ul className="list-none p-2 m-0 bg-white/95 border-t border-gray-100 max-h-52 overflow-y-auto">
                {searchSuggestions.map((place, index) => (
                  <li
                    key={`${place.name}-${index}`}
                    onClick={() => handleSelectFromSidebar(place)}
                    className="py-3 px-4 rounded-xl cursor-pointer text-sm text-gray-700 
                              min-h-[44px] flex items-center gap-3 transition-all duration-200 mb-1
                              hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 
                              hover:text-blue-600 hover:font-medium"
                  >
                    <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                    {place.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Enhanced Location Image Card */}
          {locationData && locationData.image_url && (
            <div className="absolute top-24 right-5 bg-white/95 backdrop-blur-sm p-4 rounded-2xl 
                           shadow-xl shadow-gray-200/50 z-[1000] max-w-[280px] 
                           border border-gray-100/50 hidden md:block
                           hover:shadow-2xl transition-shadow duration-300">
              <img 
                src={locationData.image_url} 
                alt={locationData.name || 'Location'}
                className="w-60 h-40 object-cover rounded-xl block mb-3"
              />
              <h3 className="m-0 text-base text-gray-800 font-semibold px-1 
                            bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text">
                {locationData.name}
              </h3>
            </div>
          )}


          {/* Enhanced Error Toast */}
          {error && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 
                           bg-gradient-to-r from-red-500 to-rose-500 text-white 
                           py-3.5 px-6 rounded-xl text-sm z-[2000] shadow-lg shadow-red-200/50
                           flex items-center gap-2 font-medium">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg> {error}
            </div>
          )}

          {/* Enhanced Speed Panel */}
          {isNavigating && (
            <div className="fixed top-20 left-5 bg-white/95 backdrop-blur-sm rounded-2xl 
                           shadow-lg shadow-gray-200/50 p-4 z-[1000] border border-gray-100/50">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span className="font-medium">{currentSpeed} km/h</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <span>Avg: {averageSpeed} km/h</span>
                </div>
                {locationAccuracy && (
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
                    <span>GPS: +/-{Math.round(locationAccuracy)}m</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Directions Panel */}
          {isNavigating && directions.length > 0 && (
            <div className="absolute top-5 left-20 w-80 max-w-[85%] max-h-[calc(100vh-120px)] 
                           bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl shadow-gray-200/50 
                           p-5 z-[1000] overflow-hidden flex flex-col border border-gray-100/50
                           md:bottom-28 md:top-auto md:left-1/2 md:-translate-x-1/2 md:w-[90%] md:max-h-[40vh]
                           sm:hidden">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                <h3 className="m-0 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 
                              bg-clip-text text-transparent">Directions</h3>
                {totalDistance !== null && (
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full">
                    <span className="text-blue-600 text-sm font-semibold">{formatDistance(totalDistance)}</span>
                    <span className="text-blue-300">•</span>
                    <span className="text-blue-500 text-sm">{formatTime(estimatedTime)}</span>
                  </div>
                )}
              </div>
              <div className="overflow-y-auto flex-grow pr-2 space-y-1">
                {directions.map((direction, index) => (
                  <div key={index} className="flex items-start py-3 px-3 rounded-xl transition-colors
                                             hover:bg-gray-50 group">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3 
                                  text-lg bg-blue-100 text-blue-600 rounded-lg
                                  group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      {getDirectionIcon(direction.type)}
                    </div>
                    <div className="flex-grow flex flex-col gap-1">
                      <span className="text-sm text-gray-700 leading-relaxed font-medium">
                        {direction.text}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {formatDistance(direction.distance)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Enhanced Action Buttons */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 z-[1000] 
                         flex-wrap justify-center w-[90%] max-w-lg px-4
                         sm:bottom-4 sm:gap-2 sm:w-full">
            <button 
              className="py-4 px-8 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 
                        text-white border-none rounded-2xl text-base font-semibold 
                        cursor-pointer shadow-lg shadow-blue-200/50 flex-1 min-w-[160px] min-h-[52px] 
                        flex items-center justify-center gap-2 transition-all duration-300
                        hover:shadow-xl hover:shadow-blue-300/50 hover:-translate-y-1 hover:scale-[1.02]
                        active:translate-y-0 active:scale-100
                        disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed 
                        disabled:opacity-60 disabled:shadow-none
                        sm:py-3 sm:px-4 sm:text-sm sm:min-w-[120px]"
              onClick={handleGetDirections}
              disabled={!coordinates}
            >
              {isNavigating ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              )}
              {isNavigating ? "Recalculate" : "Start Navigation"}
            </button>
            
            <button 
              className="py-4 px-8 bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 
                        text-white border-none rounded-2xl text-base font-semibold 
                        cursor-pointer shadow-lg shadow-purple-200/50 flex-1 min-w-[160px] min-h-[52px] 
                        flex items-center justify-center gap-2 transition-all duration-300
                        hover:shadow-xl hover:shadow-purple-300/50 hover:-translate-y-1 hover:scale-[1.02]
                        active:translate-y-0 active:scale-100
                        disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed 
                        disabled:opacity-60 disabled:shadow-none
                        sm:py-3 sm:px-4 sm:text-sm sm:min-w-[120px]"
              onClick={handleStartAR}
              disabled={!coordinates}
              title="Launch AR Navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> AR Navigation
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MapPage;