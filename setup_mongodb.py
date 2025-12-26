"""
MongoDB Setup Script
This script loads JSON data from files and inserts them into MongoDB collections
"""

import json
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

# MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client['campus_navigator']

def convert_json_to_bson(data):
    """
    Convert MongoDB Extended JSON format to BSON types
    Converts $oid to ObjectId and $date to datetime
    """
    if isinstance(data, dict):
        # Handle MongoDB Extended JSON ObjectId format
        if '_id' in data and isinstance(data['_id'], dict) and '$oid' in data['_id']:
            data['_id'] = ObjectId(data['_id']['$oid'])
        
        # Handle MongoDB Extended JSON timestamp format
        if 'timestamp' in data and isinstance(data['timestamp'], dict) and '$date' in data['timestamp']:
            # Parse ISO format datetime string
            date_str = data['timestamp']['$date']
            data['timestamp'] = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        
        # Recursively process nested dictionaries
        for key, value in data.items():
            if isinstance(value, dict):
                data[key] = convert_json_to_bson(value)
            elif isinstance(value, list):
                data[key] = [convert_json_to_bson(item) if isinstance(item, dict) else item for item in value]
    
    return data

def load_and_insert_locations():
    """Load locations from JSON file and insert into MongoDB"""
    try:
        # Load locations data
        with open('campus_navigator.locations (1).json', 'r', encoding='utf-8') as f:
            locations_data = json.load(f)
        
        # Convert Extended JSON format to BSON
        locations_data = [convert_json_to_bson(loc) for loc in locations_data]
        
        # Get or create locations collection
        locations_collection = db['locations']
        
        # Clear existing data (optional - comment out if you want to preserve existing data)
        locations_collection.delete_many({})
        
        # Insert locations
        if locations_data:
            result = locations_collection.insert_many(locations_data)
            print(f"✓ Inserted {len(result.inserted_ids)} locations into 'locations' collection")
            return True
        else:
            print("✗ No location data found")
            return False
            
    except FileNotFoundError:
        print("✗ Error: 'campus_navigator.locations (1).json' file not found")
        return False
    except json.JSONDecodeError:
        print("✗ Error: Invalid JSON format in locations file")
        return False
    except Exception as e:
        print(f"✗ Error inserting locations: {str(e)}")
        return False

def load_and_insert_recent_searches():
    """Load recent searches from JSON file and insert into MongoDB"""
    try:
        # Load recent searches data
        with open('campus_navigator.recent_searches.json', 'r', encoding='utf-8') as f:
            searches_data = json.load(f)
        
        # Convert Extended JSON format to BSON
        searches_data = [convert_json_to_bson(search) for search in searches_data]
        
        # Get or create recent_searches collection
        searches_collection = db['recent_searches']
        
        # Clear existing data (optional - comment out if you want to preserve existing data)
        searches_collection.delete_many({})
        
        # Insert searches
        if searches_data:
            result = searches_collection.insert_many(searches_data)
            print(f"✓ Inserted {len(result.inserted_ids)} records into 'recent_searches' collection")
            return True
        else:
            print("✗ No search data found")
            return False
            
    except FileNotFoundError:
        print("✗ Error: 'campus_navigator.recent_searches.json' file not found")
        return False
    except json.JSONDecodeError:
        print("✗ Error: Invalid JSON format in recent searches file")
        return False
    except Exception as e:
        print(f"✗ Error inserting recent searches: {str(e)}")
        return False

def create_indexes():
    """Create indexes for better query performance"""
    try:
        locations_collection = db['locations']
        searches_collection = db['recent_searches']
        
        # Create indexes
        locations_collection.create_index('name')
        locations_collection.create_index('coordinates')
        searches_collection.create_index('timestamp')
        searches_collection.create_index([('location.name', 1)])
        
        print("✓ Indexes created successfully")
        return True
    except Exception as e:
        print(f"✗ Error creating indexes: {str(e)}")
        return False

def display_collection_stats():
    """Display statistics about the collections"""
    try:
        locations_collection = db['locations']
        searches_collection = db['recent_searches']
        
        print("\n" + "="*60)
        print("MongoDB Collections Statistics")
        print("="*60)
        print(f"Database: campus_navigator")
        print(f"  • locations collection: {locations_collection.count_documents({})} documents")
        print(f"  • recent_searches collection: {searches_collection.count_documents({})} documents")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"✗ Error displaying stats: {str(e)}")

if __name__ == '__main__':
    print("\n" + "="*60)
    print("Starting MongoDB Setup...")
    print("="*60 + "\n")
    
    try:
        # Test connection
        client.admin.command('ping')
        print("✓ Connected to MongoDB successfully\n")
        
        # Load and insert data
        locations_success = load_and_insert_locations()
        searches_success = load_and_insert_recent_searches()
        
        # Create indexes
        if locations_success or searches_success:
            create_indexes()
        
        # Display stats
        display_collection_stats()
        
        if locations_success and searches_success:
            print("✓ MongoDB setup completed successfully!")
        else:
            print("⚠ MongoDB setup completed with some warnings")
            
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB: {str(e)}")
        print("\nMake sure MongoDB is running on localhost:27017")
        print("To start MongoDB on Windows:")
        print("  • If installed as a service: Net start MongoDB")
        print("  • If using MongoDB Community: mongod.exe from MongoDB installation bin folder")
    
    finally:
        client.close()
