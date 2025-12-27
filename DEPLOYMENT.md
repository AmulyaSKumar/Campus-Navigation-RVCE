# Campus Navigator - Deployment Guide

## Quick Start with Docker

The easiest way to deploy the entire application is using Docker Compose:

```bash
# Build and start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

This will start:
- MongoDB on port 27017
- Backend API on port 5001
- Frontend on port 3000

## Platform-Specific Deployment

### Vercel (Frontend Only)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy frontend:
   ```bash
   cd frontend
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `REACT_APP_API_URL` → Your backend URL

### Railway (Backend + Database)

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login and deploy:
   ```bash
   cd backend
   railway login
   railway init
   railway up
   ```

3. Add MongoDB plugin in Railway dashboard
4. Set environment variables in Railway

### Render (Full Stack)

1. Create account at [render.com](https://render.com)

2. Deploy backend:
   - New Web Service
   - Connect GitHub repo
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn -w 4 -b 0.0.0.0:$PORT main:app`

3. Deploy frontend:
   - New Static Site
   - Root directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `build`

4. Add MongoDB database or use MongoDB Atlas

### Netlify (Frontend)

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy via Netlify CLI:
   ```bash
   npm i -g netlify-cli
   netlify deploy --prod
   ```

3. Or drag and drop the `build/` folder to Netlify dashboard

## Environment Configuration

### Backend (.env)
```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/campus_navigator
FLASK_PORT=5001
FLASK_ENV=production
CORS_ORIGINS=https://your-frontend-domain.com
```

### Frontend (.env)
```bash
REACT_APP_API_URL=https://your-backend-domain.com
REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key
```

## Database Setup

### MongoDB Atlas (Recommended)

1. Create free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Add database user
4. Whitelist IP addresses (0.0.0.0/0 for public access)
5. Get connection string
6. Update `MONGO_URI` in backend `.env`
7. Run `python setup_mongodb.py` to populate data

## Post-Deployment Checklist

- [ ] Backend is accessible and returns JSON responses
- [ ] Frontend can connect to backend API
- [ ] MongoDB is properly configured and accessible
- [ ] CORS is configured correctly
- [ ] Environment variables are set properly
- [ ] SSL/HTTPS is enabled (required for geolocation on mobile)
- [ ] API keys are not exposed in frontend code

## Monitoring

### Health Check Endpoints

Add to backend/main.py if not present:

```python
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow()}), 200
```

### Logs

- **Railway**: View in dashboard or use `railway logs`
- **Render**: View in dashboard
- **Docker**: `docker-compose logs -f`

## Troubleshooting

### Backend not responding
- Check if MongoDB connection is successful
- Verify environment variables
- Check server logs

### Frontend shows CORS errors
- Update `CORS_ORIGINS` in backend to include frontend domain
- Ensure backend URL is correct in frontend `.env`

### Database connection failed
- Verify MongoDB URI format
- Check network access settings in MongoDB Atlas
- Ensure IP whitelist includes deployment server

## Scaling

### Horizontal Scaling
- Increase Gunicorn workers: `gunicorn -w 8 ...`
- Use multiple backend instances with load balancer

### Vertical Scaling
- Upgrade server resources (CPU/RAM)
- Optimize MongoDB indexes
- Enable MongoDB connection pooling

## Security Best Practices

1. Never commit `.env` files
2. Use environment variables for all secrets
3. Enable HTTPS on all endpoints
4. Implement rate limiting
5. Use MongoDB authentication
6. Keep dependencies updated
7. Use CORS restrictively in production
