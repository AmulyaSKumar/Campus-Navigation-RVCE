from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from flask_cors import CORS
from bson import json_util
from datetime import datetime
import logging
import json
from chatbot.chat import chatbot  
from chatbot.semantic_model import find_best_match

app = Flask(__name__)
CORS(app)

# MongoDB connection
app.config["MONGO_URI"] = "mongodb://localhost:27017/campus_navigator"
mongo = PyMongo(app)

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
        # Case-insensitive regex pattern to match locations that START with the query
        regex_pattern = {'$regex': f'^{query}', '$options': 'i'}
        
        # Query MongoDB for locations that start with the input
        cursor = mongo.db.locations.find(
            {"name": regex_pattern},
            {"name": 1, "coordinates": 1, "image_url": 1, "_id": 0}
        ).limit(10)
        
        # Convert cursor to list of locations
        locations = list(cursor)
        
        return jsonify(locations)
    
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
        
        # First, get the location details
        location = mongo.db.locations.find_one(
            {"name": place_name},
            {"name": 1, "coordinates": 1, "image_url": 1, "_id": 0}
        )
        
        if not location:
            return jsonify({"error": "Location not found"}), 404

        # Update search count in locations collection
        mongo.db.locations.update_one(
            {"name": place_name},
            {"$inc": {"search_count": 1}}
        )
        
        # Add to recent searches collection with timestamp
        mongo.db.recent_searches.insert_one({
            "timestamp": datetime.utcnow(),
            "location": location
        })
        
        # Keep only the most recent 100 searches (to prevent unlimited growth)
        total_searches = mongo.db.recent_searches.count_documents({})
        if total_searches > 100:
            # Find and delete older searches
            oldest_searches = mongo.db.recent_searches.find().sort("timestamp", 1).limit(total_searches - 100)
            old_ids = [doc["_id"] for doc in oldest_searches]
            mongo.db.recent_searches.delete_many({"_id": {"$in": old_ids}})
        
        return jsonify({"message": "Search recorded successfully"}), 200
        
    except Exception as e:
        print(f"Error in increment_search_count: {str(e)}")
        return jsonify({"error": "Server error"}), 500

@app.route('/api/top-places', methods=['GET'])
def get_top_places():
    try:
        # Check if any documents have search_count > 0
        has_popular = mongo.db.locations.count_documents({"search_count": {"$gt": 0}})
        
        if has_popular:
            # Get locations with search_count > 0
            popular_places = list(mongo.db.locations.find(
                {"search_count": {"$gt": 0}},
                {"name": 1, "coordinates": 1, "image_url": 1, "search_count": 1, "_id": 0}
            ).sort("search_count", -1).limit(5))
            logger.info(f"Found {len(popular_places)} popular places with search_count > 0")
        else:
            # Get first 5 locations regardless of search_count
            popular_places = list(mongo.db.locations.find(
                {},
                {"name": 1, "coordinates": 1, "image_url": 1, "search_count": 1, "_id": 0}
            ).limit(5))
            logger.info(f"No popular places found, returning first {len(popular_places)} locations")
        
        return jsonify(popular_places)
    
    except Exception as e:
        logger.error(f"Error fetching top places: {str(e)}")
        return jsonify({"error": "Failed to fetch top places"}), 500

@app.route('/api/debug/locations', methods=['GET'])
def debug_locations():
    try:
        # Count total locations
        total_count = mongo.db.locations.count_documents({})
        
        # Get a sample of up to 5 locations
        sample_locations = list(mongo.db.locations.find({}, {"name": 1, "search_count": 1, "_id": 0}).limit(5))
        
        return jsonify({
            "total_locations": total_count,
            "sample_locations": sample_locations,
            "database_connected": True
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
        # Fetch all locations from MongoDB
        # Convert ObjectId to string for JSON serialization
        locations = mongo.db.locations.find({})
        locations_list = json.loads(json_util.dumps(list(locations)))
        
        return jsonify(locations_list), 200
    
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
        location = mongo.db.locations.find_one({"name": location_name})
        
        if not location:
            return jsonify({"error": "Location not found"}), 404
        
        # Convert ObjectId to string for JSON serialization
        location_data = json.loads(json_util.dumps(location))
        return jsonify(location_data), 200
    
    except Exception as e:
        logger.error(f"Error fetching location: {str(e)}")
        return jsonify({"error": "Failed to fetch location"}), 500
    
if __name__ == "__main__":
    app.run(port=5001, debug=True,)
    

