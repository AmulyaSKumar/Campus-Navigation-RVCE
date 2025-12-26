// MapComponent.js
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Define the component that will render the map
const MapComponent = ({ coordinates }) => {
  const [currentLocation, setCurrentLocation] = useState(null);

  // Get the user's current location using the Geolocation API
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation([latitude, longitude]);
      },
      (error) => console.error("Geolocation error:", error)
    );
  }, []);

  if (!coordinates || !currentLocation) return null;

  return (
    <div style={{ height: "60vh", position: "relative" }}>
      <MapContainer
        center={coordinates}
        zoom={16}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={coordinates}>
          <Popup>{`Location: ${coordinates[0]}, ${coordinates[1]}`}</Popup>
        </Marker>

        {currentLocation && (
          <Marker position={currentLocation}>
            <Popup>{`Current Location: ${currentLocation[0]}, ${currentLocation[1]}`}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
