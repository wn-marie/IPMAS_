# IPMAS - Integrated Poverty Mapping & Analysis System

A comprehensive full-stack application for poverty mapping and analysis with real-time data visualization.

## 🏗️ Project Structure

```
IPMAS2/
├── backend/                 # Backend API (Node.js/Express)
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Custom middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── models/          # Data models
│   │   ├── utils/           # Utility functions
│   │   ├── config/          # Configuration files
│   │   └── app.js           # Main application file
│   ├── tests/               # Backend tests
│   ├── docs/                # Backend documentation
│   └── package.json         # Backend dependencies
├── frontend/                # Frontend (HTML/CSS/JS)
│   ├── public/              # Static files
│   │   ├── index.html       # Main dashboard
│   │   ├── scripts/         # JavaScript files
│   │   ├── styles/          # CSS files
│   │   └── data/            # Sample data
│   ├── tests/               # Frontend tests
│   ├── docs/                # Frontend documentation
│   └── package.json         # Frontend dependencies
├── shared/                  # Shared utilities
│   ├── constants.js         # Common constants
│   └── types.js             # Type definitions
├── docs/                    # Project documentation
├── docker-compose.yml       # Docker orchestration
└── package.json             # Root package.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL (optional, for production)
- Redis (optional, for caching)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd IPMAS2
   npm run install:all
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Production Setup

1. **Using Docker (Recommended):**
   ```bash
   docker-compose up -d
   ```

2. **Manual setup:**
   ```bash
   # Backend
   cd backend
   npm install
   npm start
   
   # Frontend (in another terminal)
   cd frontend
   npm install
   npm start
   ```

## 📚 Documentation

- [Backend API Documentation](backend/docs/)
- [Frontend Documentation](frontend/docs/)
- [Deployment Guide](docs/deployment.md)
- [Development Guide](docs/development.md)

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev          # Start with nodemon
npm test            # Run tests
npm run lint        # Lint code
```

### Frontend Development
```bash
cd frontend
npm run dev         # Start development server
npm run build       # Build for production
npm test            # Run tests
npm run lint        # Lint code
```

## 🔧 Configuration

### Environment Variables

Create `.env` files in both backend and frontend directories:

**Backend (.env):**
```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ipmas_db
DB_USER=ipmas_user
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_MAPBOX_TOKEN=your_mapbox_token
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run tests with coverage
npm run test:coverage
```

## 📦 Deployment

### Docker Deployment
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment
1. Build frontend: `cd frontend && npm run build`
2. Start backend: `cd backend && npm start`
3. Serve frontend with a web server (nginx, Apache, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in the `docs/` folder
