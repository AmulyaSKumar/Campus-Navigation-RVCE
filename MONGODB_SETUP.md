# MongoDB Setup Instructions for Campus Navigator

## Prerequisites

### Option 1: Use MongoDB Community Edition (Recommended)

1. **Download MongoDB**
   - Go to https://www.mongodb.com/try/download/community
   - Download the Windows MSI installer for your Windows version (64-bit)

2. **Install MongoDB**
   - Run the installer (`mongodb-windows-x86_64-xxx.msi`)
   - Choose "Complete" installation
   - Check "Install MongoDB as a Service" during installation
   - Default installation path: `C:\Program Files\MongoDB\Server\<version>`

3. **Verify Installation**
   ```powershell
   mongod --version
   ```

### Option 2: Use MongoDB via Docker (If you have Docker installed)

```powershell
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Running the Setup Script

### Prerequisites
Make sure you have pymongo installed:

```powershell
# Activate your Python virtual environment (venv38)
venv38\Scripts\Activate.ps1

# Install pymongo if not already installed
pip install pymongo
```

### Steps to Setup MongoDB with Your Data

1. **Start MongoDB Service** (if not running):
   ```powershell
   # If installed as a service
   net start MongoDB
   
   # Or run mongod from terminal
   mongod
   ```

2. **Run the Setup Script**:
   ```powershell
   # Navigate to your project directory
   cd C:\Users\rashm\Downloads\campus-navigator-main\campus-navigator-main

   # Activate virtual environment
   venv38\Scripts\Activate.ps1

   # Run the setup script
   python setup_mongodb.py
   ```

3. **Expected Output**:
   ```
   ============================================================
   Starting MongoDB Setup...
   ============================================================

   ✓ Connected to MongoDB successfully

   ✓ Inserted 50 locations into 'locations' collection
   ✓ Inserted 58 records into 'recent_searches' collection
   ✓ Indexes created successfully

   ============================================================
   MongoDB Collections Statistics
   ============================================================
   Database: campus_navigator
     • locations collection: 50 documents
     • recent_searches collection: 58 documents
   ============================================================

   ✓ MongoDB setup completed successfully!
   ```

## Verifying the Setup

### Option 1: Using MongoDB Compass (GUI)
1. Download: https://www.mongodb.com/products/tools/compass
2. Connect to `mongodb://localhost:27017`
3. Browse the `campus_navigator` database
4. View `locations` and `recent_searches` collections

### Option 2: Using MongoDB Shell
```powershell
mongosh

# Inside mongosh shell:
use campus_navigator
db.locations.count()           # Should show 50
db.recent_searches.count()     # Should show 58
db.locations.findOne()         # Show one location document
```

### Option 3: Using Python
```python
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['campus_navigator']

print(f"Locations: {db.locations.count_documents({})}")
print(f"Recent Searches: {db.recent_searches.count_documents({})}")

# View a sample location
location = db.locations.find_one()
print(location)
```

## Collections Schema

### locations Collection
```json
{
  "_id": { "$oid": "..." },
  "name": "Location Name",
  "coordinates": [latitude, longitude],
  "image_url": "/location_images/imagename.png",
  "search_count": 0
}
```

### recent_searches Collection
```json
{
  "_id": { "$oid": "..." },
  "timestamp": { "$date": "2025-02-04T19:13:40.719Z" },
  "location": {
    "name": "Location Name",
    "coordinates": [latitude, longitude],
    "image_url": "/location_images/imagename.png"
  }
}
```

## Troubleshooting

### MongoDB Connection Error
- **Error**: "Failed to connect to MongoDB: connection refused"
- **Solution**: Make sure MongoDB service is running
  ```powershell
  # Check if service is running
  Get-Service -Name MongoDB
  
  # Start the service
  net start MongoDB
  ```

### File Not Found Error
- Make sure you run the script from the project root directory where the JSON files are located
- Verify the exact filenames match:
  - `campus_navigator.locations (1).json`
  - `campus_navigator.recent_searches.json`

### PyMongo Not Installed
```powershell
pip install pymongo
```

### Port Already in Use
If MongoDB can't start because port 27017 is in use:
```powershell
# Find process using port 27017
Get-NetTCPConnection -LocalPort 27017

# Kill the process (replace PID with actual process ID)
Stop-Process -Id <PID> -Force
```

## Next Steps

After successful setup, your Flask app can now:
- Query locations from the database
- Store recent searches
- Run the campus navigator application

To start your Flask app:
```powershell
venv38\Scripts\Activate.ps1
python main.py
```

The app will connect to `mongodb://localhost:27017/campus_navigator` automatically.
