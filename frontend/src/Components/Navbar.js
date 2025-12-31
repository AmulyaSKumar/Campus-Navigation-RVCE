import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Search from "./Search";
import { API_ENDPOINTS } from "../config/apiConfig";
import logo from "./logo.png";

const Navbar = ({ onPlaceSelected }) => {
  const navigate = useNavigate();
  const [topPlaces, setTopPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTopPlaces = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.topPlaces());
      if (Array.isArray(response.data) && response.data.length > 0) {
        setTopPlaces(response.data);
      } else {
        console.warn("No places returned from API:", response.data);
      }
    } catch (error) {
      const status = error.response?.status;
      const url = error.config?.url;
      console.error("Error fetching top places:", status, error.message, url);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch top places initially
  useEffect(() => {
    fetchTopPlaces();
    
    // Refresh top places periodically
    const interval = setInterval(fetchTopPlaces, 30000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const handleTopPlaceClick = async (place) => {
    try {
      await axios.post(API_ENDPOINTS.search.submit(), {
        placeName: place.name,
      });
      
      // Fetch updated top places after clicking
      await fetchTopPlaces();
      
      onPlaceSelected(place.coordinates, place);
      navigate("/map");
    } catch (error) {
      console.error("Error updating search count:", error);
      // Still navigate even if the update fails
      onPlaceSelected(place.coordinates, place);
      navigate("/map");
    }
  };

  const requestLocationFromNavbar = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => alert("Location access granted. You can now use navigation features."),
      (err) => alert("Location access denied: " + (err && err.message)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-white p-4 safe-top safe-bottom">
      <img 
        src={logo} 
        alt="College Logo" 
        className="absolute top-5 left-5 w-20 h-auto md:w-16 sm:w-14"
      />
      <div className="flex flex-col items-center justify-center p-6 md:p-8 bg-white text-gray-900 rounded-xl shadow-lg border border-gray-100 max-w-xl w-full text-center relative mt-12 sm:mt-16">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 tracking-tight leading-tight">
          Campus Navigator
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mb-6 leading-relaxed">
          Find buildings, departments and popular spots on campus — fast and simply.
        </p>

        <div className="w-full max-w-md mb-5">
          <Search onPlaceSelected={onPlaceSelected} updateTopPlaces={fetchTopPlaces} />
        </div>

        <button 
          className="btn-secondary w-full max-w-xs mt-3"
          onClick={requestLocationFromNavbar}
        >
          Enable Location
        </button>

        <button 
          className="btn-primary w-full max-w-xs mt-4 font-bold"
          onClick={() => navigate("/map")}
        >
          Open Map
        </button>

        {topPlaces.length > 0 && (
          <div className="w-full mt-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
              Popular Locations
            </h3>
            <div className="flex flex-row flex-wrap justify-center items-center gap-2 sm:gap-3 w-full">
              {isLoading ? (
                <span className="text-sm text-gray-500">Loading...</span>
              ) : (
                topPlaces.map((place) => (
                  <button
                    key={place.name}
                    className="btn-place flex-grow-0 flex-shrink-0"
                    onClick={() => handleTopPlaceClick(place)}
                  >
                    {place.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;