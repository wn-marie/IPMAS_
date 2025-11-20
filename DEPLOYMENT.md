# 🚀 IPMAS Deployment Guide - Render

This guide will help you deploy IPMAS to Render.com.

## 📋 Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository (✅ Already done: https://github.com/wn-marie/IPMAS_.git)
2. **Render Account**: Sign up at [render.com](https://render.com) (free tier available)
3. **PostgreSQL Database**: Render provides managed PostgreSQL databases

## 🎯 Deployment Steps

### Option 1: Using render.yaml (Infrastructure as Code) - Recommended

1. **Log in to Render Dashboard**
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Sign in with GitHub

2. **Create New Blueprint**
   - Click "New" → "Blueprint"
   - Connect your GitHub repository: `wn-marie/IPMAS_`
   - Render will automatically detect `render.yaml`
   - Click "Apply" to create all services

3. **Configure Environment Variables**
   - After services are created, go to your web service settings
   - Add the following environment variables:
     ```
     DB_HOST=<from-database-internal-host>
     DB_PORT=5432
     DB_NAME=ipmas_db
     DB_USER=<from-database-credentials>
     DB_PASSWORD=<from-database-credentials>
     JWT_SECRET=<generate-a-random-secret>
     CORS_ORIGIN=https://your-app-name.onrender.com
     REDIS_HOST=<optional-if-using-redis>
     REDIS_PORT=6379
     REDIS_PASSWORD=<optional>
     ```

4. **Deploy**
   - Render will automatically build and deploy
   - Monitor the build logs in the Render dashboard
   - Your app will be available at: `https://your-app-name.onrender.com`

### Option 2: Manual Setup (Alternative)

1. **Create PostgreSQL Database**
   - Click "New" → "PostgreSQL"
   - Name: `ipmas-db`
   - Database: `ipmas_db`
   - User: `ipmas_user`
   - Region: Choose closest to you
   - Plan: Free (or paid for production)
   - Click "Create Database"
   - **Save the connection details** (Internal Database URL)

2. **Create Web Service**
   - Click "New" → "Web Service"
   - Connect repository: `wn-marie/IPMAS_`
   - Select branch: `main`
   - Name: `ipmas-backend`
   - Region: Same as database
   - Branch: `main`
   - Root Directory: (leave empty)
   - Environment: `Node`
   - Build Command: `npm run install:all && cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Plan: Free (or paid for production)

3. **Add Environment Variables**
   - In the web service settings, go to "Environment"
   - Add all variables from the list above
   - Use the Internal Database URL from step 1

4. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically

## 🔧 Configuration Details

### Build Command
```bash
npm run install:all && cd backend && npm install
```

### Start Command
```bash
cd backend && npm start
```

### Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port (auto-set by Render) | (auto) |
| `DB_HOST` | Database host | `dpg-xxxxx-a.oregon-postgres.render.com` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `ipmas_db` |
| `DB_USER` | Database user | `ipmas_user` |
| `DB_PASSWORD` | Database password | (from Render) |
| `JWT_SECRET` | JWT signing secret | (generate random) |
| `CORS_ORIGIN` | Allowed CORS origin | `https://your-app.onrender.com` |
| `REDIS_HOST` | Redis host (optional) | (if using Redis) |
| `REDIS_PORT` | Redis port (optional) | `6379` |

## 📊 Database Setup

After deployment, you need to:

1. **Enable PostGIS Extension**
   - Go to your database in Render dashboard
   - Click "Connect" → "psql" (or use external client)
   - Run:
     ```sql
     CREATE EXTENSION postgis;
     CREATE EXTENSION postgis_topology;
     ```

2. **Seed Database (Optional)**
   - Connect to your Render service via SSH (if available)
   - Or run locally with database connection:
     ```bash
     cd backend
     node src/scripts/seed-locations.js
     ```

## 🔍 Monitoring & Debugging

### View Logs
- Go to your service in Render dashboard
- Click "Logs" tab
- Monitor build and runtime logs

### Health Check
- Your app has a health endpoint: `https://your-app.onrender.com/health`
- Render will use this for health checks

### Common Issues

1. **Build Fails**
   - Check Node.js version (requires >= 18.0.0)
   - Verify all dependencies in `package.json`
   - Check build logs for specific errors

2. **Database Connection Fails**
   - Verify environment variables are set correctly
   - Check database is running
   - Ensure PostGIS extension is enabled

3. **Port Issues**
   - Render automatically sets `PORT` environment variable
   - Backend already uses `process.env.PORT || 3001`
   - No changes needed

4. **Static Files Not Loading**
   - Backend now serves frontend from `frontend/public/`
   - Verify build includes frontend files
   - Check file paths in browser console

## 🚀 Post-Deployment

### Enable Auto-Deploy
- In service settings → "Auto-Deploy"
- Enable "Auto-Deploy" for `main` branch
- Every push to `main` will trigger a new deployment

### Custom Domain (Optional)
- In service settings → "Custom Domains"
- Add your domain
- Update DNS records as instructed

### SSL/HTTPS
- Render automatically provides SSL certificates
- Your app will be available at `https://your-app.onrender.com`

## 📝 Notes

- **Free Tier Limitations**: 
  - Services spin down after 15 minutes of inactivity
  - First request after spin-down may be slow
  - Consider paid tier for production

- **Python ML Features**:
  - Python dependencies are in `requirements.txt`
  - ML models are in `datasets/processed/models/`
  - Ensure Python 3.8+ is available if using ML features

- **File Storage**:
  - Generated reports are stored in `backend/reports/`
  - Consider using external storage (S3, etc.) for production

## 🔗 Useful Links

- [Render Documentation](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/node)
- [PostgreSQL on Render](https://render.com/docs/databases)

## ✅ Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Render account created
- [ ] Database created and PostGIS enabled
- [ ] Web service created
- [ ] Environment variables configured
- [ ] Build successful
- [ ] Health check passing
- [ ] Frontend accessible
- [ ] API endpoints working
- [ ] Database seeded (optional)
- [ ] Auto-deploy enabled (optional)

---

**Need Help?** Check the [Backend README](backend/README.md) for more details on configuration and setup.

