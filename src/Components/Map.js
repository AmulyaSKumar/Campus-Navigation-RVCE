import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'; // Import Leaflet components
import L from 'leaflet'; // Import Leaflet for routing

const Map = ({ selectedLocation, directions }) => {
  const mapRef = useRef();

  useEffect(() => {
    if (directions && mapRef.current) {
      const map = mapRef.current.leafletElement; // Get the map instance
      const routeCoordinates = directions.routes[0].segments[0].steps.map(step => [
        step.lonlat[1], step.lonlat[0]
      ]);

      // Add a polyline for the route
      const polyline = L.polyline(routeCoordinates, { color: 'blue' }).addTo(map);
      map.fitBounds(polyline.getBounds()); // Fit the map to the route
    }
  }, [directions]);

  return (
    <MapContainer
      center={selectedLocation.coordinates}
      zoom={13}
      style={{ width: '100%', height: '100%' }}
      ref={mapRef}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={selectedLocation.coordinates}>
        <Popup>{selectedLocation.name}</Popup>
      </Marker>
      {/* Render the route polyline if directions are available */}
      {directions && (
        <Polyline
          positions={directions.routes[0].segments[0].steps.map(step => [
            step.lonlat[1], step.lonlat[0]
          ])}
          color="blue"
        />
      )}
    </MapContainer>
  );
};

export default Map;
