# Campus Navigator

Campus Navigator is a real-time GPS navigation system built specifically for RVCE campus. It integrates location-based services with a rule-based AIML chatbot to help students and visitors find their way around campus. The system features turn-by-turn navigation with visual building recognition, popular location tracking, and a campus information assistant.

The project uses React.js with Leaflet maps for the frontend, Flask with MongoDB for the backend, and AIML for the chatbot component. Location data was manually collected by recording precise GPS coordinates of campus buildings, alongside photographs for visual confirmation. The navigation system provides real-time speed tracking, route estimation, and direction guidance with custom markers, while the AIML chatbot offers information about building locations, facility hours, and campus amenities through pattern matching and predefined responses.

---

## Mobile testing (quick ngrok setup)

If you want to test the app on your mobile device (camera + geolocation require HTTPS on many mobile browsers), use ngrok to create a secure tunnel to your local dev server:

1. Ensure your dev machine and phone are on the same network when using the local IP approach, or use ngrok for an HTTPS URL.
2. Start the dev server on your machine:
   - npm start
   - (optional) On Windows you can run `npm run start:public:win` to bind the dev server to all interfaces (HOST=0.0.0.0).
3. In a separate terminal run:
   - npm run ngrok
   - or run the helper script (Windows PowerShell): `.\scripts\start-with-ngrok.ps1` which opens the dev server in a new window and runs ngrok in the current window.
4. ngrok will print an https:// URL. Open that URL on your phone browser to access your local app over HTTPS (camera & geolocation will work on most mobile browsers).

Troubleshooting ngrok authentication errors:
- If you see an error mentioning `ERR_NGROK_4018` or `authentication failed`, it means ngrok requires an account authtoken on your machine. Fix it by running one of the following in a terminal (do NOT commit your token into source control):

  ngrok authtoken <YOUR_AUTHTOKEN>
  OR
  ngrok config add-authtoken <YOUR_AUTHTOKEN>

  You can get your token after signing up at https://dashboard.ngrok.com/signup and visiting the "Get Started" / "Auth" section: https://dashboard.ngrok.com/get-started/your-authtoken

- Quick fallback if you don't want to sign up: run a localtunnel session instead (no signup required, less stable):

  npx localtunnel --port 3000

Notes:
- Update `.env` (copy `.env.example`) and set `REACT_APP_API_BASE` to your ngrok URL (https) or your machine IP when testing on mobile so API calls reach the backend.
- If the backend (Flask) is running on localhost:5001, you may also need to expose it via ngrok or set CORS accordingly.

---

