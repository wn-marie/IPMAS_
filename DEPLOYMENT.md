# 🚀 IPMAS Deployment Guide - Render

This guide will help you deploy IPMAS to Render.com.

## 🎯 Quick Answer: Blueprint vs Web Service

**✅ USE BLUEPRINT** (Recommended)

**Why?**
- **One-click deployment**: Creates both **Web Service** (backend + frontend) AND **PostgreSQL Database** automatically
- **Infrastructure as Code**: Everything defined in `render.yaml`
- **Easier management**: Update everything from one file
- **No manual setup**: Render handles all the configuration

**What gets deployed:**
- ✅ **1 Web Service** (`ipmas-backend`) - Serves both backend API and frontend
- ✅ **1 PostgreSQL Database** (`ipmas-db`) - With PostGIS extension

**You DON'T need:**
- ❌ Separate frontend service (frontend is served by backend)
- ❌ Manual database creation (Blueprint creates it)
- ❌ Manual service linking (Blueprint links them automatically)

---

## 📋 Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository (✅ Already done: https://github.com/wn-marie/IPMAS_.git)
2. **Render Account**: Sign up at [render.com](https://render.com) (free tier available)
3. **PostgreSQL Database**: Render provides managed PostgreSQL databases

## 🎯 Deployment Steps

### ✅ RECOMMENDED: Use Blueprint (render.yaml) - One-Click Deployment

**Why Blueprint?**
- Deploys **Backend Web Service** + **PostgreSQL Database** in one step
- Frontend is served by the backend (monorepo setup)
- Infrastructure as Code - everything defined in `render.yaml`
- Easier to manage and update

**Steps:**

1. **Log in to Render Dashboard**
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Sign in with GitHub

2. **Create New Blueprint**
   - Click **"New"** → **"Blueprint"**
   - Connect your GitHub repository: `wn-marie/IPMAS_`
   - Render will automatically detect `render.yaml`
   - Click **"Apply"** to create:
     - ✅ Web Service (backend + frontend)
     - ✅ PostgreSQL Database (with PostGIS)

3. **Wait for Services to be Created**
   - Render will create both services automatically
   - Database will be created first
   - Web service will be created second

4. **Configure Environment Variables**
   - Go to your **Web Service** settings (not the database)
   - Click **"Environment"** tab
   - The following variables are already set in `render.yaml`:
     - `NODE_ENV=production`
     - `DB_PORT=5432`
     - `JWT_SECRET` (auto-generated)
   - **You need to add these manually:**
     ```
     DB_HOST=<copy-from-database-internal-host>
     DB_NAME=ipmas_db
     DB_USER=<copy-from-database-credentials>
     DB_PASSWORD=<copy-from-database-credentials>
     CORS_ORIGIN=https://ipmas-backend.onrender.com
     ```
   - **How to get database credentials:**
     1. Go to your **Database** service in Render dashboard
     2. Click **"Info"** tab
     3. Copy:
        - **Internal Database URL** → Use this for `DB_HOST`
        - **Database** → Use for `DB_NAME`
        - **User** → Use for `DB_USER`
        - **Password** → Use for `DB_PASSWORD`
     - Or use the **Internal Database URL** format:
       ```
       postgres://user:password@host:port/database
       ```

5. **Enable PostGIS Extension**
   - Go to your **Database** service
   - Click **"Connect"** → **"psql"** (or use external client)
   - Run these commands:
     ```sql
     CREATE EXTENSION postgis;
     CREATE EXTENSION postgis_topology;
     ```
   - Verify:
     ```sql
     SELECT PostGIS_version();
     ```

6. **Deploy**
   - Render will automatically build and deploy
   - Monitor the build logs in the Render dashboard
   - Your app will be available at: `https://ipmas-backend.onrender.com`

### ⚠️ Alternative: Manual Setup (Not Recommended)

**Use this only if Blueprint doesn't work for you.**

This requires creating services manually:

1. **Create PostgreSQL Database**
   - Click "New" → "PostgreSQL"
   - Name: `ipmas-db`
   - Database: `ipmas_db`
   - User: `ipmas_user`
   - Region: Choose closest to you
   - Plan: Free (or paid for production)
   - Click "Create Database"
   - **Save the connection details** (Internal Database URL)

2. **Enable PostGIS Extension**
   - Go to your database → **"Connect"** → **"psql"**
   - Run:
     ```sql
     CREATE EXTENSION postgis;
     CREATE EXTENSION postgis_topology;
     ```

3. **Create Web Service** (This serves both frontend and backend)
   - Click **"New"** → **"Web Service"**
   - Connect repository: `wn-marie/IPMAS_`
   - Select branch: `main`
   - Name: `ipmas-backend`
   - Region: Same as database
   - Environment: `Node`
   - Build Command: `npm run install:all && cd frontend && npm run build && cd ../backend && npm install`
   - Start Command: `cd backend && npm start`
   - Plan: Free (or paid for production)

4. **Add Environment Variables**
   - In the web service settings, go to **"Environment"**
   - Add all variables (see list below)
   - Use the Internal Database URL from step 1

5. **Deploy**
   - Click **"Create Web Service"**
   - Render will build and deploy automatically

## 📦 What Gets Deployed

### Monorepo Structure
Your IPMAS repository contains:
- **Frontend**: Static files in `frontend/public/` → built to `frontend/dist/`
- **Backend**: Node.js/Express API in `backend/`
- **Database**: PostgreSQL with PostGIS (created by Render)

### Deployment Architecture
```
┌─────────────────────────────────────┐
│   Render Web Service                │
│   (ipmas-backend)                   │
│                                     │
│   ┌──────────────┐                 │
│   │   Backend     │                 │
│   │   (Express)   │                 │
│   └──────┬───────┘                  │
│          │                          │
│          ├── Serves API: /api/*    │
│          │                          │
│          └── Serves Frontend: /*   │
│             (from frontend/dist/)   │
└──────────────┬──────────────────────┘
               │
               │ Connects to
               ▼
┌─────────────────────────────────────┐
│   Render PostgreSQL Database        │
│   (ipmas-db)                        │
│   - Database: ipmas_db              │
│   - Extensions: PostGIS, PostGIS    │
│     Topology                        │
└─────────────────────────────────────┘
```

**Important:** You only need **ONE Web Service** because:
- Backend serves the frontend (monorepo setup)
- No separate frontend deployment needed
- Everything runs on one service

## 🔧 Configuration Details

### Build Command
```bash
npm run install:all && cd frontend && npm run build && cd ../backend && npm install
```
This command:
1. Installs all dependencies (root, backend, frontend)
2. Builds the frontend (outputs to `frontend/dist/`)
3. Installs backend dependencies

### Start Command
```bash
cd backend && npm start
```
The backend automatically:
- Serves the built frontend from `frontend/dist/` (if exists)
- Falls back to `frontend/public/` for development
- Listens on `process.env.PORT` (automatically set by Render)
- Handles both API routes (`/api/*`) and frontend routes (`/*`)

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

### Using Blueprint (Recommended)
- [ ] Repository pushed to GitHub with `render.yaml`
- [ ] Render account created
- [ ] Blueprint created (creates both web service + database)
- [ ] Environment variables configured in web service
- [ ] PostGIS extension enabled in database
- [ ] Build successful (check logs)
- [ ] Health check passing (`/health` endpoint)
- [ ] Frontend accessible (root URL)
- [ ] API endpoints working (`/api/v1/*`)
- [ ] Database seeded (optional: run `seed-locations.js`)
- [ ] Auto-deploy enabled (optional: in service settings)

### Using Manual Setup
- [ ] Repository pushed to GitHub
- [ ] Render account created
- [ ] PostgreSQL database created
- [ ] PostGIS extension enabled
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

