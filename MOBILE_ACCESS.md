# Quick Mobile Access Guide

## Option 1: Local Network Access (Easiest)

**Requirements:** 
- Your computer and phone on same WiFi network
- No HTTPS (some features like camera may not work)

**Steps:**

1. Run the mobile startup script:
   ```powershell
   .\start-mobile.ps1
   ```

2. The script will show your device IP, e.g., `http://192.168.1.100:3000`

3. Open that URL on your mobile browser

4. Done! ✅

---

## Option 2: HTTPS Access (For Camera/GPS Features)

**Requirements:**
- Internet connection
- ngrok (free account recommended)

**Steps:**

1. Sign up at [ngrok.com](https://ngrok.com) (free)

2. Get your auth token from [dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)

3. Configure ngrok (one-time):
   ```powershell
   ngrok authtoken YOUR_TOKEN_HERE
   ```

4. Run the HTTPS startup script:
   ```powershell
   .\start-mobile-https.ps1
   ```

5. Copy the HTTPS URLs from the ngrok windows:
   - Backend URL (e.g., `https://abc123.ngrok.io`)
   - Frontend URL (e.g., `https://xyz789.ngrok.io`)

6. Update `frontend\.env`:
   ```
   REACT_APP_API_URL=https://abc123.ngrok.io
   ```

7. Restart frontend (in the frontend window, press Ctrl+C then run `npm start`)

8. Open the Frontend ngrok URL on your mobile! 📱

---

## Troubleshooting

### Can't connect on local network?

1. Check Windows Firewall:
   ```powershell
   netsh advfirewall firewall add rule name="Node 3000" dir=in action=allow protocol=TCP localport=3000
   netsh advfirewall firewall add rule name="Flask 5001" dir=in action=allow protocol=TCP localport=5001
   ```

2. Verify you're on the same WiFi (not mobile data)

3. Try your computer's IP manually: Settings → Network → Properties → IPv4 Address

### Camera/GPS not working?

- You need HTTPS (Option 2)
- Modern browsers require HTTPS for security-sensitive features

### ngrok authentication error?

- Run: `ngrok authtoken YOUR_TOKEN`
- Free tier allows 1 tunnel at a time (you'll need paid for 2 simultaneous)
- Alternative: Use `npx localtunnel --port 3000` (no signup needed)

### CORS errors?

Update `backend\.env`:
```
CORS_ORIGINS=http://192.168.1.100:3000,https://xyz789.ngrok.io
```
Restart backend.

---

## Alternative: Localtunnel (No Signup)

If you don't want to sign up for ngrok:

```powershell
# Terminal 1: Backend
cd backend
venv\Scripts\activate
python main.py

# Terminal 2: Backend tunnel
npx localtunnel --port 5001

# Terminal 3: Frontend
cd frontend
npm start

# Terminal 4: Frontend tunnel
npx localtunnel --port 3000
```

Copy the URLs and update frontend .env accordingly.

---

## Mobile Testing Checklist

- [ ] Backend running on port 5001
- [ ] Frontend running on port 3000  
- [ ] Mobile device on same network (Option 1) OR ngrok running (Option 2)
- [ ] CORS configured in backend .env
- [ ] API URL configured in frontend .env
- [ ] Firewall allows incoming connections
- [ ] Test on mobile browser: navigation works
- [ ] Test on mobile: camera access works (HTTPS only)
- [ ] Test on mobile: GPS/geolocation works (HTTPS only)
