from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import logging
import json
import os
import time

# Fix for Python 3.8+ - time.clock() was removed
if not hasattr(time, 'clock'):
    time.clock = time.perf_counter

from chatbot.chat import chatbot  
from chatbot.semantic_model import find_best_match
from config import config_dict

app = Flask(__name__)

# Load configuration
config_name = os.getenv('FLASK_ENV', 'development')
app.config.from_object(config_dict[config_name])

# JSON Database Configuration
LOCATIONS_FILE = os.path.join(os.path.dirname(__file__), 'campus_navigator.locations.json')
RECENT_SEARCHES_FILE = os.path.join(os.path.dirname(__file__), 'campus_navigator.recent_searches.json')

class JsonDB:
    @staticmethod
    def read_json(file_path):
        if not os.path.exists(file_path):
            return []
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return []

    @staticmethod
    def write_json(file_path, data):
        try:
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            return True
        except Exception as e:
            print(f"Error writing {file_path}: {e}")
            return False

# CORS configuration - Allow all origins in development
CORS(app, origins=app.config.get('CORS_ORIGINS', ['http://localhost:3000', 'http://127.0.0.1:3000']), supports_credentials=True)

# Test chatbot response in terminal
response = chatbot.get_response("HELLO")
print(response)

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/chat', methods=['POST'])
def chat():
    try:
        message = request.json.get('message')
        if not message:
            return jsonify({'response': 'Please provide a message.'}), 400

        # Find the closest question
        best_match = find_best_match(message.upper())
        
        if best_match:
            # Get response from AIML for the matched question
            response = chatbot.get_response(best_match)
        else:
            response = chatbot.get_response(message.upper())

        logger.info(f"User message: {message}")
        logger.info(f"Bot response: {response}")
        
        return jsonify({'response': str(response)})

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({'response': 'Sorry, I encountered an error!'}), 500
    
@app.route('/api/search', methods=['GET'])
def search_locations():
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify([])
    
    try:
        locations = JsonDB.read_json(LOCATIONS_FILE)
        
        # Filter locations that start with the query (case-insensitive)
        filtered_locations = [
            {k: v for k, v in loc.items() if k != '_id'} # Exclude _id for cleaner response
            for loc in locations 
            if loc.get('name', '').lower().startswith(query.lower())
        ]
        
        # Limit to 10 results
        return jsonify(filtered_locations[:10])
    
    except Exception as e:
        print(f"Search error: {str(e)}")
        return jsonify({"error": "An error occurred while searching"}), 500

@app.route('/api/search', methods=['POST'])
def increment_search_count():
    try:
        data = request.get_json()
        if not data or 'placeName' not in data:
            return jsonify({"error": "Place name is required"}), 400
        
        place_name = data['placeName']
        
        locations = JsonDB.read_json(LOCATIONS_FILE)
        location_found = None
        
        # Find and update location
        for loc in locations:
            if loc.get('name') == place_name:
                loc['search_count'] = loc.get('search_count', 0) + 1
                location_found = loc
                break
        
        if not location_found:
            return jsonify({"error": "Location not found"}), 404

        # Save updated locations
        JsonDB.write_json(LOCATIONS_FILE, locations)
        
        # Add to recent searches
        recent_searches = JsonDB.read_json(RECENT_SEARCHES_FILE)
        
        new_search = {
            "timestamp": datetime.utcnow().isoformat(),
            "location": {
                "name": location_found['name'],
                "coordinates": location_found['coordinates'],
                "image_url": location_found.get('image_url')
            }
        }
        
        recent_searches.append(new_search)
        
        # Keep only the most recent 100 searches
        if len(recent_searches) > 100:
            recent_searches = recent_searches[-100:]
            
        JsonDB.write_json(RECENT_SEARCHES_FILE, recent_searches)
        
        return jsonify({"message": "Search recorded successfully"}), 200
        
    except Exception as e:
        print(f"Error in increment_search_count: {str(e)}")
        return jsonify({"error": "Server error"}), 500

@app.route('/api/top-places', methods=['GET'])
def get_top_places():
    try:
        locations = JsonDB.read_json(LOCATIONS_FILE)
        
        # Filter locations with search_count > 0
        popular_places = [loc for loc in locations if loc.get('search_count', 0) > 0]
        
        if popular_places:
            # Sort by search_count descending
            popular_places.sort(key=lambda x: x.get('search_count', 0), reverse=True)
            popular_places = popular_places[:5]
            logger.info(f"Found {len(popular_places)} popular places with search_count > 0")
        else:
            # Get first 5 locations
            popular_places = locations[:5]
            logger.info(f"No popular places found, returning first {len(popular_places)} locations")
            
        # Clean up response (remove _id)
        cleaned_places = [{k: v for k, v in loc.items() if k != '_id'} for loc in popular_places]
        
        return jsonify(cleaned_places)
    
    except Exception as e:
        logger.error(f"Error fetching top places: {str(e)}")
        return jsonify({"error": "Failed to fetch top places"}), 500

@app.route('/api/debug/locations', methods=['GET'])
def debug_locations():
    try:
        locations = JsonDB.read_json(LOCATIONS_FILE)
        total_count = len(locations)
        
        # Get a sample of up to 5 locations
        sample_locations = [{k: v for k, v in loc.items() if k != '_id'} for loc in locations[:5]]
        
        return jsonify({
            "total_locations": total_count,
            "sample_locations": sample_locations,
            "database_connected": True,
            "source": "json_file"
        })
    except Exception as e:
        logger.error(f"Database debug error: {str(e)}")
        return jsonify({
            "error": str(e),
            "database_connected": False
        }), 500

@app.route('/api/locations', methods=['GET'])
def get_all_locations():
    """
    GET /api/locations
    Returns all campus locations for AR scene initialization
    Used by WebAR to display all nearby locations as reference arrows
    """
    try:
        locations = JsonDB.read_json(LOCATIONS_FILE)
        # Clean up response (remove _id)
        cleaned_locations = [{k: v for k, v in loc.items() if k != '_id'} for loc in locations]
        
        return jsonify(cleaned_locations), 200
    
    except Exception as e:
        logger.error(f"Error fetching locations: {str(e)}")
        return jsonify({"error": "Failed to fetch locations"}), 500

@app.route('/api/locations/<location_name>', methods=['GET'])
def get_location_by_name(location_name):
    """
    GET /api/locations/<location_name>
    Returns a specific location by name
    """
    try:
        locations = JsonDB.read_json(LOCATIONS_FILE)
        location = next((loc for loc in locations if loc.get('name') == location_name), None)
        
        if not location:
            return jsonify({"error": "Location not found"}), 404
        
        # Clean up response
        cleaned_location = {k: v for k, v in location.items() if k != '_id'}
        return jsonify(cleaned_location), 200
    
    except Exception as e:
        logger.error(f"Error fetching location: {str(e)}")
        return jsonify({"error": "Failed to fetch location"}), 500
    
if __name__ == "__main__":
    port = app.config.get('FLASK_PORT', 5001)
    debug = app.config.get('DEBUG', True)
    app.run(host='0.0.0.0', port=port, debug=debug)
    

