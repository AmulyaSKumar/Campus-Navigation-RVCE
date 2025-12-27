import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar";
import MapPage from "./Components/MapPage";
import Chatbot from "./Components/chatbot";
import { loadGoogleMapsAPI } from "./api/googleMapsLoader";
import "./App.css";

function App() {
    const [selectedCoordinates, setSelectedCoordinates] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [mapsLoaded, setMapsLoaded] = useState(false);

    // Load Google Maps API on app startup
    useEffect(() => {
        loadGoogleMapsAPI()
            .then(() => {
                setMapsLoaded(true);
                console.log("Google Maps API initialized successfully");
            })
            .catch((error) => {
                console.error("Failed to load Google Maps:", error);
                // App can still work without Maps for some features
            });
    }, []);

    const handlePlaceSelected = (coordinates, location) => {
        setSelectedCoordinates(coordinates);
        setSelectedLocation(location);
    };

    return (
        <Router>
            <div className="app">
                <Routes>
                    <Route path="/" element={<Navbar onPlaceSelected={handlePlaceSelected} />} />
                    <Route path="/map" element={<MapPage coordinates={selectedCoordinates} locationData={selectedLocation} onPlaceSelected={handlePlaceSelected} />} />
                    <Route path="/chat" element={<Chatbot />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;