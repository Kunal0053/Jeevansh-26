# Jeevansh — Blood Donor Coordination Platform

Built for INNOTECH26 — Category 1: Smart Solutions, Smarter Society.

## Structure
- `jeevansh-frontend/` — React + Tailwind CSS + Vite
- `jeevansh-backend/` — FastAPI + MongoDB

## Quick Start

### Frontend
cd jeevansh-frontend
npm install
npm run dev

### Backend
cd jeevansh-backend
python -m venv venv
source venv/bin/activate   # Mac/Linux
venv\Scripts\activate       # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload