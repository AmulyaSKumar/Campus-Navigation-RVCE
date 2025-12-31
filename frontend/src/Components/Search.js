import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "../config/apiConfig";

const Search = ({ onPlaceSelected, updateTopPlaces }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimer = useRef(null);
  const navigate = useNavigate();

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setQuery(value);
    setError(null);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          API_ENDPOINTS.search.autocomplete(value.trim())
        );

        if (Array.isArray(response.data)) {
          setSuggestions(
            response.data.filter(
              (location) =>
                location.name &&
                Array.isArray(location.coordinates) &&
                location.coordinates.length === 2
            )
          );
        } else {
          console.error("Unexpected response format:", response.data);
          setSuggestions([]);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setError("Failed to fetch suggestions. Please try again.");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSelect = async (location) => {
    if (!location || !location.name || !location.coordinates) {
      console.error("Invalid location data:", location);
      return;
    }

    setQuery(location.name);
    setSuggestions([]);

    try {
      await axios.post(API_ENDPOINTS.search.submit(), {
        placeName: location.name,
      });
      
      // Update top places immediately after successful search
      await updateTopPlaces();
      
      onPlaceSelected(location.coordinates, location);
      navigate("/map");
    } catch (error) {
      console.error("Error updating search count:", error);
      onPlaceSelected(location.coordinates, location);
      navigate("/map");
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative w-full group">
        {/* Search Icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 
                        group-focus-within:text-blue-500 transition-colors">
          🔍
        </div>
        
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search for a location..."
          className="w-full py-3.5 pl-12 pr-12 border-2 border-gray-200 rounded-xl text-base 
                     transition-all duration-300 bg-white shadow-sm
                     focus:border-blue-500 focus:ring-4 focus:ring-blue-100 
                     focus:bg-white focus:outline-none focus:shadow-lg
                     min-h-[52px] placeholder:text-gray-400"
          autoComplete="off"
        />
        
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 
                          w-5 h-5 border-2 border-gray-200 border-t-blue-500 
                          rounded-full animate-spin" />
        )}
      </div>

      {error && (
        <div className="text-red-600 text-sm mt-2 p-3 bg-red-50 rounded-lg border border-red-100 
                        flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-2 p-2
                       list-none bg-white border border-gray-100 rounded-xl 
                       shadow-xl shadow-gray-200/50 z-[1000] max-h-72 overflow-y-auto
                       backdrop-blur-sm">
          {suggestions.map((place, index) => (
            <li
              key={`${place.name}-${index}`}
              onClick={() => handleSelect(place)}
              className="py-3 px-4 cursor-pointer transition-all duration-200 
                         text-gray-700 text-sm rounded-lg mb-1
                         min-h-[44px] flex items-center gap-3
                         hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 
                         hover:text-blue-600 hover:font-medium
                         active:bg-blue-100"
            >
              <span className="text-blue-400">📍</span>
              {place.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Search;