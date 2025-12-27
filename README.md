# Campus Navigator

A full-stack web application for campus navigation with AI chatbot assistance.

## Project Structure

```
campus-navigator/
├── backend/              # Flask API server
│   ├── chatbot/         # AI chatbot module
│   ├── main.py          # Main Flask application
│   ├── config.py        # Configuration management
│   ├── requirements.txt # Python dependencies
│   └── .env.example     # Environment variables template
│
├── frontend/            # React web application
│   ├── src/            # React source files
│   ├── public/         # Static assets
│   ├── package.json    # Node dependencies
│   └── .env.example    # Frontend env template
│
└── README.md
```

## About

Campus Navigator is a real-time GPS navigation system built specifically for RVCE campus. It integrates location-based services with a rule-based AIML chatbot to help students and visitors find their way around campus. The system features turn-by-turn navigation with visual building recognition, popular location tracking, and a campus information assistant.

The project uses React.js with Leaflet maps for the frontend, Flask with MongoDB for the backend, and AIML for the chatbot component.

---

## Prerequisites

- Python 3.8+
- Node.js 14+
- MongoDB (local or cloud instance)

## Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create `.env` file from example:
   ```bash
   cp .env.example .env
   ```

6. Configure your MongoDB URI in `.env`:
   ```
   MONGO_URI=mongodb://localhost:27017/campus_navigator
   FLASK_PORT=5001
   FLASK_ENV=development
   CORS_ORIGINS=http://localhost:3000
   ```

7. Set up MongoDB database:
   ```bash
   python setup_mongodb.py
   ```

8. Run the backend server:
   ```bash
   python main.py
   ```

Backend will run on `http://localhost:5001`

## Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from example:
   ```bash
   cp .env.example .env
   ```

4. Configure environment variables in `.env`:
   ```
   REACT_APP_API_URL=http://localhost:5001
   REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

5. Run the development server:
   ```bash
   npm start
   ```

Frontend will run on `http://localhost:3000`

## Production Deployment

### Backend (Flask)

**Option 1: Using Gunicorn (Recommended for Linux/Mac)**
```bash
cd backend
gunicorn -w 4 -b 0.0.0.0:5001 main:app
```

**Option 2: Using Waitress (Windows)**
```bash
cd backend
pip install waitress
waitress-serve --host=0.0.0.0 --port=5001 main:app
```

**Environment Variables for Production:**
- Set `FLASK_ENV=production`
- Update `MONGO_URI` to your production MongoDB instance
- Update `CORS_ORIGINS` to your production frontend URL

### Frontend (React)

1. Build for production:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy the `build/` folder to your hosting platform

3. Update `.env` for production:
   ```
   REACT_APP_API_URL=https://your-backend-domain.com
   ```

## Deployment Platforms

### Recommended Platforms

**Backend:**
- [Railway](https://railway.app/) - Easy Python deployment
- [Render](https://render.com/) - Free tier available
- [Heroku](https://heroku.com/) - Established platform
- [AWS EC2](https://aws.amazon.com/ec2/) - Full control

**Frontend:**
- [Vercel](https://vercel.com/) - Optimized for React
- [Netlify](https://netlify.com/) - Free tier with CI/CD
- [GitHub Pages](https://pages.github.com/) - Free static hosting

**Database:**
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Free tier available

## API Endpoints

- `POST /chat` - Chatbot conversation
- `GET /api/search?q=query` - Search locations
- `POST /api/search` - Record search
- `GET /api/top-places` - Get popular locations
- `GET /api/locations` - Get all locations
- `GET /api/locations/<name>` - Get specific location

## Technologies Used

**Backend:**
- Flask - Web framework
- PyMongo - MongoDB integration
- Flask-CORS - CORS handling
- AIML - Chatbot logic
- Transformers - Semantic matching

**Frontend:**
- React - UI framework
- Axios - HTTP client
- Leaflet - Maps integration
- React Router - Navigation

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

