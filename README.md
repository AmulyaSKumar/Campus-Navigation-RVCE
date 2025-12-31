#  Campus Navigator

An intelligent campus navigation system that helps students, visitors, and staff find buildings, departments, and popular spots on campus quickly and easily.

---

##  Table of Contents

- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)

---

##  Problem Statement

### Challenges Faced by Campus Visitors & Students

| Challenge | Description |
|-----------|-------------|
| **Navigation Difficulty** | New students, visitors, and parents struggle to find specific buildings, departments, or facilities on large college campuses |
| **Lack of Real-time Assistance** | Traditional campus maps are static and don't provide interactive guidance |
| **Information Accessibility** | Finding information about department locations, seminar halls, hostels is fragmented |
| **No Personalized Help** | Users cannot ask natural language questions and get immediate responses |
| **Mobile Accessibility** | Existing solutions often don't work well on mobile devices |

---

##  Solution

**Campus Navigator** is a full-stack web application that provides:

| Solution | Benefit |
|----------|---------|
|  **Interactive Map** | Visual navigation with Leaflet/Google Maps |
|  **Smart Search** | Autocomplete-enabled search for locations |
|  **AI Chatbot** | Natural language queries using semantic similarity |
|  **Popular Places** | Dynamic tracking of frequently searched locations |
|  **AR Navigation** | Augmented reality overlays for real-world navigation |
|  **Mobile-Responsive** | Works on phones, tablets, and desktops |

---

##  Features

###  Interactive Campus Map
- Leaflet maps with campus overlay
- Real-time GPS location tracking
- Visual markers for all campus buildings
- Turn-by-turn navigation

###  Smart Search
- **Autocomplete suggestions** as you type
- **Fuzzy matching** for location names
- Debounced API calls for performance

###  AI Chatbot Assistant
- **Semantic similarity matching** using Sentence Transformers
- **all-MiniLM-L6-v2** model (384-dim embeddings)
- AIML pattern matching fallback
- Context-aware responses

###  AR Navigation
- Camera-based augmented reality view
- Compass heading for direction
- Distance overlay to destination
- Real-time position updates

###  Popular Places
- Tracks most searched locations
- Dynamic ranking based on user interest
- Quick access buttons

---

##  Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React.js 18** | UI Framework |
| **React Router v6** | Navigation |
| **Axios** | HTTP Client |
| **Leaflet** | Map Rendering |
| **CSS3** | Styling |

### Backend
| Technology | Purpose |
|------------|---------|
| **Flask 3.x** | Web Framework |
| **Flask-CORS** | Cross-Origin Requests |
| **Gunicorn** | Production Server |
| **Transformers** | NLP Models |
| **PyTorch** | ML Framework |
| **AIML** | Pattern Chatbot |

### AI/ML Components
| Component | Technology |
|-----------|------------|
| **Semantic Search** | sentence-transformers/all-MiniLM-L6-v2 |
| **Embeddings** | 384-dimensional vectors |
| **Similarity** | Cosine Similarity (threshold: 0.7) |
| **Lazy Loading** | Memory optimization |

---

##  Architecture

```

                    FRONTEND (React.js)                       
         
   Navbar     Search     MapPage    Chatbot/AR Nav   
         
                  
                     Axios HTTP Client                        

                              HTTP/HTTPS

                    BACKEND (Flask)                           
   
                REST API Endpoints                          
    /api/search    /api/top-places    /chat              
   
                                                           
      
   JSON Database   Location       Chatbot Module       
   (locations,     Service          
    searches)                   Semantic Model       
      (Transformers)       
                                        
                                    AIML Patterns        
                                        
                                    

```

---

##  Installation

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+
- Git

### Backend Setup

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

Backend runs at: **http://localhost:5001**

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs at: **http://localhost:3000**

---

##  API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/search?q={query} | Search locations |
| POST | /api/search | Record search (update popularity) |
| GET | /api/top-places | Get top 5 popular places |
| POST | /chat | Send message to AI chatbot |

### Example Requests

```bash
# Search locations
curl "http://localhost:5001/api/search?q=computer"

# Get popular places
curl "http://localhost:5001/api/top-places"

# Chat with bot
curl -X POST "http://localhost:5001/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Where is the library?"}'
```

---

##  Project Structure

```
campus-navigator/
 backend/
    main.py                 # Flask entry point
    config.py               # Configuration
    requirements.txt        # Python dependencies
    Dockerfile              # Container config
    Procfile                # Deployment config
    chatbot/
       chat.py             # AIML handler
       bot.aiml            # Chat patterns
       semantic_model.py   # ML semantic search
       questions.json      # FAQ knowledge base
    *.json                  # Location databases

 frontend/
    src/
       App.js              # Main component
       Components/
          Navbar.js       # Navigation + search
          Search.js       # Autocomplete search
          MapPage.js      # Map + navigation
          chatbot.js      # AI chat interface
          ARScene.js      # AR navigation
          ARNavigation.js # AR overlay
       api/
           geolocation.js  # GPS utilities
    package.json

 README.md
```

---

##  Implementation Highlights

### Semantic Search Algorithm
```python
# 1. Load pre-trained model (lazy loaded)
model = "sentence-transformers/all-MiniLM-L6-v2"

# 2. Generate 384-dim embedding for query
user_embedding = get_embedding(user_query)

# 3. Compare with FAQ using cosine similarity
for question in FAQ:
    similarity = cosine_similarity(user_embedding, question_embedding)
    if similarity > 0.7:
        return get_answer(question)

# 4. Fallback to AIML patterns
return aiml_response(user_query)
```

### Memory Optimization
- **Lazy loading**: ML models load only when chatbot is used
- **Single worker**: Gunicorn uses 1 worker for 512MB limit
- Startup: ~100MB  After chatbot use: ~300MB

---

##  Future Enhancements

| Feature | Description |
|---------|-------------|
|  Voice Commands | Voice-based search |
|  Indoor Mapping | Floor-by-floor navigation |
|  Event Integration | Campus events & schedules |
|  Multi-language | Regional language support |
|  Accessibility | Screen reader support |

---




