# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Elixir Short Video Attribution AI is a full-stack video content analysis system for the beauty brand Elixir (怡丽丝尔). It uses AI (Google Gemini) to analyze short-form videos, tag content, and provide attribution insights for marketing campaigns.

**Architecture**: Frontend-backend separation
- **Frontend**: React 19 + TypeScript + Vite (port 3000)
- **Backend**: Node.js + Express (port 3001)
- **Database**: MySQL
- **AI Service**: Google Gemini API

## Common Commands

### Language 
Always responce in Chinese

### Development Workflow

```bash
# First-time setup: Initialize database
cd backend
npm run init-db

# Start both services (recommended)
./start.sh

# Or manually in separate terminals:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
npm run dev

# Update database schema (after DB changes)
cd backend && npm run update-db
```

### Frontend Commands
```bash
npm run dev      # Start dev server with hot reload (Vite)
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend Commands
```bash
cd backend
npm run dev      # Start with nodemon (hot reload)
npm start        # Start production server
npm run init-db  # Initialize/reset database (drops and recreates tables)
npm run update-db # Update database schema
```

### Database Operations
```bash
# Access MySQL CLI
mysql -u root -p
use short_video_attribution;

# Check tables
show tables;
describe videos;
```

## Architecture & Data Flow

### Core Workflow: Video Analysis Pipeline

The system supports two modes for analyzing videos:

**1. Passive Tagging (videoTagger.js)**
- Uses predefined tag taxonomy from database
- Tags videos against known categories (content format, protagonist persona, scene, etc.)
- Stores results in `video_tags` table

**2. Active Discovery (videoDiscoverer.js)**
- Open-ended analysis to discover new video elements
- Identifies viral potential characteristics
- Stores results in `video_discovery_tags` table

Both services use a **queue-based processing system** to handle concurrent video analysis with rate limiting.

### Key Services (backend/src/services/)

- **videoTagger.js**: Tag videos against predefined taxonomy
- **videoDiscoverer.js**: Discover new tags/patterns in videos
- **videoDownloader.js**: Download videos from URLs to local storage
- **projectDiscoverySummarizer.js**: Aggregate discovery results across projects

### Database Schema

**Core Tables**:
- `projects`: Project metadata and status tracking
- `videos`: Video metadata, download status, file paths
- `video_tags`: Passive tagging results (predefined taxonomy)
- `video_discovery_tags`: Active discovery results (emergent patterns)
- `tag_categories` + `tags`: Hierarchical tag taxonomy
- `api_configs`: Gemini API key management

**Important**: Videos table uses `ai_tagging_status` enum ('pending', 'processing', 'completed', 'error') to track processing state.

### AI Integration

**Model**: Configured in `backend/src/config/aiConfig.js` and `services/aiConfig.ts`
- Default: `gemini-2.0-flash-exp` (configured as `DEFAULT_MODEL`)
- API keys stored in `api_configs` table
- Both frontend (`geminiService.ts`) and backend services use the same model

**Video Analysis Prompts**:
- **Tagging**: Structured JSON output matching taxonomy categories
- **Discovery**: Narrative analysis including:
  - First 5 seconds hook analysis
  - Full video structure breakdown (痛点引入 → 产品引入 → 信任背书 → CTA)
  - Evidence-based timestamped observations

### Frontend Architecture

**Pages** (pages/):
- `ProjectList.tsx`: List all projects
- `ProjectWizard.tsx`: Create new project with CSV upload
- `ProjectDetail.tsx`: Video management, tagging mode toggle, download progress
- `Dashboard.tsx`: Analytics overview
- `Report.tsx`: Detailed analysis reports
- `Settings.tsx`: Tag taxonomy and API config management
- `VideoPlayground.tsx`: Individual video analysis tool

**Services** (services/):
- `apiService.ts`: Centralized backend API calls
- `geminiService.ts`: Direct Gemini API calls from frontend (for VideoPlayground)
- `aiConfig.ts`: Shared AI model configuration

**State Management**: React Context (App.tsx) for tag taxonomy and API key

## Important Patterns & Conventions

### API Response Format
All backend endpoints return:
```javascript
{
  success: boolean,
  data?: any,
  message?: string,
  error?: string
}
```

### Video Status Flow
```
pending → downloading → ready (or error)
           ↓
        ai_tagging_status: pending → processing → completed (or error)
```

### File Paths
- Backend root: `backend/`
- Video storage: `backend/storage/` (configured via `STORAGE_PATH` env var)
- Static file serving: `/storage` endpoint
- Frontend expects `local_path` from API to construct download URLs

### Tag Taxonomy Structure
Tags are hierarchical:
```
TagCategory (tag_categories table)
  ├── id: string (e.g., 'content_format')
  ├── name: string (e.g., '内容形式标签')
  └── tags[] (tags table via category_id foreign key)
```

Default taxonomy defined in:
- Backend: `backend/src/scripts/initDatabase.js`
- Frontend fallback: `constants.ts` (INITIAL_TAG_TAXONOMY)

## Configuration Files

### Backend Environment (.env)
```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=short_video_attribution

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Storage
STORAGE_PATH=./storage
```

### Frontend Environment (.env.local)
```bash
# Optional: Can also configure in Settings page
GEMINI_API_KEY=your_api_key

# Backend API
VITE_API_BASE_URL=http://localhost:3001
```

## Code Organization Principles

### Backend MVC Pattern
- **Models** (models/): Database operations only, no business logic
- **Controllers** (controllers/): Business logic, validation, error handling
- **Routes** (routes/): URL mapping to controllers
- **Services** (services/): Complex business logic (video processing, AI calls)

### Frontend Component Structure
- Pages are feature-complete, self-contained
- Minimal shared components (only Sidebar.tsx currently)
- Types centralized in `types.ts`
- Constants in `constants.ts` (tag taxonomy, mock data)

## Testing & Debugging

### Health Check
```bash
curl http://localhost:3001/health
```

### API Testing Examples
```bash
# Get all projects
curl http://localhost:3001/api/projects

# Get tag taxonomy
curl http://localhost:3001/api/tags

# Get active API config
curl http://localhost:3001/api/config/active

# Create project
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"Testing"}'
```

### Common Issues

**Database connection errors**:
- Verify MySQL is running: `brew services start mysql` (macOS) or `sudo systemctl start mysql` (Linux)
- Check credentials in `backend/.env`

**Port conflicts**:
- Frontend (3000): Change in `vite.config.ts` → `server.port`
- Backend (3001): Change in `backend/.env` → `PORT`

**Video download failures**:
- Check `backend/storage/` directory exists and is writable
- Verify video URLs are accessible
- Check backend logs in `backend.log` or console

## Database Schema Updates

When modifying database schema:

1. Update `backend/src/scripts/initDatabase.js` with new table definitions
2. Create migration in `backend/src/scripts/updateDatabase.js` if needed
3. Update corresponding model file in `backend/src/models/`
4. Update TypeScript types in `types.ts`
5. Run `npm run init-db` (dev) or `npm run update-db` (production)

## AI Analysis Customization

To modify AI analysis behavior:

**For tagging** (videoTagger.js):
- Modify `buildTaxonomyPrompt()` for tag detection logic
- Update taxonomy in database via Settings page or `initDatabase.js`

**For discovery** (videoDiscoverer.js):
- Modify prompt in `discoverVideo()` method
- Adjust JSON output schema expectations
- Update `video_discovery_tags` table schema if changing output structure

**For narrative analysis**:
- Edit `buildNarrativePrompt()` in videoTagger.js
- Modify `first5s_analysis` and `video_summary` structure expectations

**Model changes**:
- Update `DEFAULT_MODEL` in `backend/src/config/aiConfig.js` AND `services/aiConfig.ts`
- Both files must stay in sync
