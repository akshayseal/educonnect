# EduConnect — Deployment Guide

## Option 1: Railway (Recommended — easiest, free tier available)

### Step 1 — Create a PostgreSQL database
1. Go to https://railway.app and create an account
2. New Project → Add PostgreSQL
3. Copy the `DATABASE_URL` from the Connect tab

### Step 2 — Deploy the backend
1. New Service → GitHub Repo → select your repo
2. Set root directory: `backend`
3. Add environment variables (from `.env.example`):
   - `DATABASE_URL` = paste from step 1
   - `JWT_SECRET` = generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - `ENCRYPTION_KEY` = generate with: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`
   - `SENDGRID_API_KEY` = from https://sendgrid.com (free 100 emails/day)
   - `SENDGRID_FROM_EMAIL` = your verified sender email
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` = from https://twilio.com
   - `ADMIN_SECRET` = any secret string you choose
   - `FRONTEND_URL` = your frontend URL (set after deploying frontend)
4. Railway auto-detects Node.js and runs `npm start`
5. Run DB migration: Railway terminal → `node src/models/migrate.js`
   OR connect to DB and run `schema.sql` manually

### Step 3 — Deploy the frontend
1. New Service → GitHub Repo → root directory: `frontend`
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add env var: `VITE_API_URL` = your backend Railway URL
5. Update backend `FRONTEND_URL` to your frontend Railway URL

---

## Option 2: Render (Also free tier)

### Backend
1. New Web Service → connect GitHub repo
2. Root directory: `backend`
3. Build: `npm install`
4. Start: `npm start`
5. Add all env vars as in Railway step 2

### Frontend
1. New Static Site → connect GitHub repo
2. Root directory: `frontend`
3. Build: `npm run build`
4. Publish directory: `dist`

### Database
1. New PostgreSQL instance on Render
2. Copy Internal Database URL → set as `DATABASE_URL` in backend

---

## Option 3: VPS (Ubuntu 22.04)

```bash
# Install dependencies
sudo apt update && sudo apt install -y nodejs npm postgresql nginx certbot

# Clone your repo
git clone <your-repo> /var/www/educonnect
cd /var/www/educonnect

# Setup database
sudo -u postgres psql -c "CREATE DATABASE educonnect; CREATE USER eduuser WITH PASSWORD 'yourpass'; GRANT ALL ON DATABASE educonnect TO eduuser;"
sudo -u postgres psql -d educonnect -f backend/src/models/schema.sql

# Backend setup
cd backend
cp .env.example .env
nano .env   # fill in all values
npm install
npm install -g pm2
pm2 start src/index.js --name educonnect-api
pm2 save && pm2 startup

# Frontend build
cd ../frontend
npm install
npm run build
# dist/ folder is your static site

# Nginx config
sudo nano /etc/nginx/sites-available/educonnect
```

Nginx config:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    root /var/www/educonnect/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/educonnect /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL (replace yourdomain.com)
sudo certbot --nginx -d yourdomain.com
```

---

## WhatsApp Setup (Twilio)

1. Sign up at https://twilio.com
2. Go to Messaging → Try it out → Send a WhatsApp message
3. Note your sandbox number: `whatsapp:+14155238886`
4. For production: apply for WhatsApp Business API approval (takes 1-3 days)
5. Set `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886` (sandbox) or your approved number

## SendGrid Setup

1. Sign up at https://sendgrid.com (free: 100 emails/day)
2. Settings → API Keys → Create API Key (Full Access)
3. Verify your sender email/domain
4. Set `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`

## First Admin Account

After deployment, register with role `admin` and your `ADMIN_SECRET` value.
Keep the admin secret confidential — only share with trusted community managers.

---

## Environment Variables Checklist

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` or `DB_*` | ✅ | PostgreSQL connection |
| `JWT_SECRET` | ✅ | 64+ char random string |
| `ENCRYPTION_KEY` | ✅ | Exactly 32 chars |
| `SENDGRID_API_KEY` | ✅ for email | SendGrid key |
| `SENDGRID_FROM_EMAIL` | ✅ for email | Verified sender |
| `TWILIO_ACCOUNT_SID` | ✅ for WhatsApp | Twilio SID |
| `TWILIO_AUTH_TOKEN` | ✅ for WhatsApp | Twilio token |
| `TWILIO_WHATSAPP_FROM` | ✅ for WhatsApp | WhatsApp number |
| `ADMIN_SECRET` | ✅ | Admin registration code |
| `FRONTEND_URL` | ✅ | Frontend URL for CORS |
