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
    <div className="flex justify-center items-center min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 safe-top safe-bottom">
      {/* Logo */}
      <img 
        src={logo} 
        alt="College Logo" 
        className="absolute top-5 left-5 w-20 h-auto md:w-16 sm:w-14 drop-shadow-md"
      />
      
      {/* Main Card */}
      <div className="flex flex-col items-center justify-center p-8 sm:p-6 md:p-10 
                      bg-white/90 backdrop-blur-sm text-gray-900 rounded-2xl 
                      shadow-xl shadow-blue-500/10 border border-white/50
                      max-w-xl w-full text-center relative mt-12 sm:mt-16
                      transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/15">
        
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold 
                       bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 
                       bg-clip-text text-transparent mb-2 tracking-tight leading-tight">
          Campus Navigator
        </h1>
        
        {/* Subtitle */}
        <p className="text-sm sm:text-base text-gray-500 mb-8 leading-relaxed max-w-sm">
          Find buildings, departments and popular spots on campus — fast and simply.
        </p>

        {/* Search */}
        <div className="w-full max-w-md mb-6">
          <Search onPlaceSelected={onPlaceSelected} updateTopPlaces={fetchTopPlaces} />
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <button 
            className="flex-1 py-3 px-5 bg-white text-gray-700 font-semibold rounded-xl 
                       border-2 border-gray-200 shadow-sm
                       hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-md
                       active:translate-y-0 transition-all duration-200 
                       min-h-[48px] flex items-center justify-center gap-2"
            onClick={requestLocationFromNavbar}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
            Enable Location
          </button>

          <button 
            className="flex-1 py-3 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 
                       text-white font-bold rounded-xl shadow-lg shadow-blue-500/30
                       hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5 hover:shadow-xl
                       active:translate-y-0 transition-all duration-200 
                       min-h-[48px] flex items-center justify-center gap-2"
            onClick={() => navigate("/map")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            Open Map
          </button>
        </div>

        {/* Popular Locations */}
        {topPlaces.length > 0 && (
          <div className="w-full mt-10 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Popular Locations
            </h3>
            <div className="flex flex-row flex-wrap justify-center items-center gap-2 sm:gap-3 w-full">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  Loading...
                </div>
              ) : (
                topPlaces.map((place) => (
                  <button
                    key={place.name}
                    className="bg-gray-100 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-500 
                               hover:text-white border-none py-2.5 px-4 rounded-full cursor-pointer 
                               text-sm font-medium text-gray-700 whitespace-nowrap 
                               min-h-[40px] flex items-center justify-center
                               hover:-translate-y-0.5 hover:shadow-md
                               active:translate-y-0 transition-all duration-200"
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