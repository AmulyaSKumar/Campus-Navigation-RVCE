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
    <div className="relative w-full">
      <div className="relative w-full group">
        {/* Search Icon */}
        <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-textHelper 
                        group-focus-within:text-primary transition-colors">
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search for a location..."
          className="w-full py-3 md:py-3.5 pl-10 md:pl-12 pr-10 md:pr-12 border-2 border-gray-200 rounded-xl text-sm md:text-base 
                     transition-all duration-300 bg-bgCard shadow-sm text-textBody
                     focus:border-primary focus:ring-4 focus:ring-primary/10 
                     focus:bg-bgCard focus:outline-none focus:shadow-lg
                     min-h-[48px] md:min-h-[52px] placeholder:text-textHelper"
          autoComplete="off"
        />
        
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 
                          w-5 h-5 border-2 border-gray-200 border-t-primary 
                          rounded-full animate-spin" />
        )}
      </div>

      {error && (
        <div className="text-red-600 text-sm mt-2 p-3 bg-red-50 rounded-lg border border-red-100 
                        flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg> {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-2 p-1.5 md:p-2
                       list-none bg-bgCard border border-gray-100 rounded-xl 
                       shadow-soft z-[1000] max-h-60 md:max-h-72 overflow-y-auto
                       backdrop-blur-sm">
          {suggestions.map((place, index) => (
            <li
              key={`${place.name}-${index}`}
              onClick={() => handleSelect(place)}
              className="py-2.5 md:py-3 px-3 md:px-4 cursor-pointer transition-all duration-200 
                         text-textBody text-xs md:text-sm rounded-lg mb-1
                         min-h-[40px] md:min-h-[44px] flex items-center gap-2 md:gap-3
                         hover:bg-primary/5 
                         hover:text-primary hover:font-medium
                         active:bg-primary/10"
            >
              <svg className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
              {place.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Search;