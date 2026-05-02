# EduConnect — Quiz School Community Platform

A privacy-first, city-routed school community platform for teachers and students across India.

## Features
- Anonymous member profiles (real identity never exposed)
- City/state-routed event notifications
- Multi-channel delivery: Email (SendGrid) + WhatsApp (Twilio)
- Role-based access: Teacher / Student / Admin
- Admin broadcast panel with city targeting
- Encrypted contact storage

## Tech Stack
- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Vite + TailwindCSS
- **Email**: SendGrid
- **WhatsApp**: Twilio WhatsApp Business API
- **Auth**: JWT + bcrypt
- **DB ORM**: pg (node-postgres)

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- SendGrid account (free tier works)
- Twilio account with WhatsApp sandbox

### 1. Clone and install
```bash
git clone <your-repo>
cd educonnect
npm run install:all
```

### 2. Set up database
```bash
cd backend
psql -U postgres -c "CREATE DATABASE educonnect;"
psql -U postgres -d educonnect -f src/models/schema.sql
```

### 3. Configure environment
```bash
cp backend/.env.example backend/.env
# Fill in your keys (see .env.example for all variables)
```

### 4. Run in development
```bash
npm run dev
# Backend: http://localhost:5000
# Frontend: http://localhost:5173
```

### 5. Deploy to production
See `docs/DEPLOY.md` for Railway / Render / VPS deployment guides.

## Project Structure
```
educonnect/
├── backend/
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── middleware/    # Auth, validation, rate limiting
│   │   ├── services/      # Email, WhatsApp, notification logic
│   │   ├── models/        # DB queries + schema.sql
│   │   └── utils/         # Helpers, crypto, anonymizer
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/         # Login, Feed, Admin, Notifications
│   │   ├── components/    # Shared UI components
│   │   ├── context/       # Auth context
│   │   └── hooks/         # API hooks
│   └── index.html
└── docs/
    └── DEPLOY.md
```
