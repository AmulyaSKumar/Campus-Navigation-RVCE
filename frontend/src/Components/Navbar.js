import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Search from "./Search";
import { API_ENDPOINTS } from "../config/apiConfig";
import "./Navbar.css";
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
    <div className="navbar-container">
      <img src={logo} alt="College Logo" className="logo" />
      <div className="navbar">
        <h1>Campus Navigator</h1>
        <div className="subtitle">Find buildings, departments and popular spots on campus — fast and simply.</div>

        <Search onPlaceSelected={onPlaceSelected} updateTopPlaces={fetchTopPlaces} />
        <button className="enable-location-btn" onClick={requestLocationFromNavbar}>Enable Location</button>
                {/* Open Map CTA */}
        <button className="open-map-button" onClick={() => navigate("/map") }>
          Open Map
        </button>
        {/* Chatbot Button */}
  {/*      <button className="chatbot-button" onClick={() => navigate("/chat")}>
          Open Chatbot
        </button>
*/}
        {topPlaces.length > 0 && (
          <div className="top-places-section">
            <h3>Popular Locations</h3>
            <div className="top-places">
              {isLoading ? (
                <span className="loading-text">Loading...</span>
              ) : (
                topPlaces.map((place) => (
                  <button
                    key={place.name}
                    className="top-place-button"
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