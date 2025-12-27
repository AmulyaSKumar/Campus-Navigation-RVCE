# Quick Start Guide - Mobile Access

## Current Setup Issue

Your app needs **MongoDB running** before the backend will work!

## ✅ Complete Setup Steps:

### 1. Start MongoDB
```powershell
# If MongoDB is installed as a service:
net start MongoDB

# OR if you installed MongoDB manually, run:
mongod
```

### 2. Verify MongoDB is Running
```powershell
# Should connect successfully:
mongo
# Then type: exit
```

### 3. Setup Database (First Time Only)
```powershell
cd backend
python setup_mongodb.py
```

### 4. Start Backend
```powershell
cd backend
python main.py
```
**You should see:**
- "Loading AIML from..."
- "AIML file loaded successfully"
- "Running on http://0.0.0.0:5001"

### 5. Start Frontend (New Terminal)
```powershell
cd frontend
npm start
```

### 6. Start ngrok (New Terminal)
```powershell
ngrok http 3000
```

### 7. Access on Mobile
Copy the ngrok HTTPS URL and open it on your phone!

---

## 🔧 Troubleshooting

### "Failed to fetch" Error
**Cause:** Backend not running or MongoDB not started

**Fix:**
1. Check backend terminal - should show "Running on..."
2. Start MongoDB: `net start MongoDB`
3. Test backend: Open http://localhost:5001/api/top-places in browser

### "Invalid Host header"
**Already fixed** - restart frontend if you see this

### Can't connect on mobile
**Fix:** Make sure ngrok is running and showing the forwarding URL

---

## 📝 Quick Command Reference

**Start Everything (in separate terminals):**

Terminal 1 - Backend:
```powershell
cd backend
python main.py
```

Terminal 2 - Frontend:
```powershell
cd frontend
npm start
```

Terminal 3 - ngrok:
```powershell
ngrok http 3000
```

**Your mobile URL:** Copy from ngrok terminal (https://xxx.ngrok-free.app)
