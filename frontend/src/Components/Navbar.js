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
    <div className="flex justify-center items-center min-h-screen w-full bg-bgPage p-3 md:p-4 safe-top safe-bottom">
      {/* Logo */}
      <img 
        src={logo} 
        alt="College Logo" 
        className="absolute top-3 left-3 w-14 h-auto md:w-16 lg:w-20 drop-shadow-md"
      />
      
      {/* Main Card */}
      <div className="flex flex-col items-center justify-center p-5 md:p-8 lg:p-10 
                      bg-bgCard backdrop-blur-sm text-textBody rounded-2xl 
                      shadow-soft border border-gray-100
                      max-w-xl w-full text-center relative mt-14 md:mt-12
                      transition-all duration-300 hover:shadow-xl">
        
        {/* Title */}
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold 
                       text-textHeading mb-2 tracking-tight leading-tight">
          Campus Navigator
        </h1>
        
        {/* Subtitle */}
        <p className="text-xs md:text-sm text-textHelper mb-6 md:mb-8 leading-relaxed max-w-sm px-2">
          Find buildings, departments and popular spots on campus.
        </p>

        {/* Search */}
        <div className="w-full max-w-md mb-6">
          <Search onPlaceSelected={onPlaceSelected} updateTopPlaces={fetchTopPlaces} />
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 w-full max-w-sm md:flex-row md:gap-3">
          <button 
            className="flex-1 py-2.5 md:py-3 px-4 md:px-5 bg-primary 
                       text-white font-semibold rounded-xl shadow-button text-sm md:text-base
                       hover:bg-primaryDark hover:-translate-y-0.5 hover:shadow-lg
                       active:translate-y-0 transition-all duration-200 
                       min-h-[44px] md:min-h-[48px] flex items-center justify-center gap-2"
            onClick={() => navigate("/map")}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            Open Map
          </button>
        </div>

        {/* Popular Locations */}
        {topPlaces.length > 0 && (
          <div className="w-full mt-6 md:mt-10 pt-4 md:pt-6 border-t border-gray-100">
            <h3 className="text-xs md:text-sm font-semibold text-textHelper uppercase tracking-wider mb-3 md:mb-4">
              Popular Locations
            </h3>
            <div className="flex flex-row flex-wrap justify-center items-center gap-1.5 md:gap-2 w-full">
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs md:text-sm text-textHelper">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
                  Loading...
                </div>
              ) : (
                topPlaces.map((place) => (
                  <button
                    key={place.name}
                    className="bg-bgPage hover:bg-primary hover:text-white 
                               border border-gray-200 hover:border-primary
                               py-2 px-3 md:py-2.5 md:px-4 rounded-full cursor-pointer 
                               text-xs md:text-sm font-medium text-textBody whitespace-nowrap 
                               min-h-[36px] md:min-h-[40px] flex items-center justify-center
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