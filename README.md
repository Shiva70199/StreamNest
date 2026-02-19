# STREAMNEST

A distinctive streaming landing page — **nest in, stream on.** Browse live movie data from OMDB, sign up with phone OTP, and log in. User data is stored in Aiven MySQL with encrypted passwords.

## Features

- **Landing page** — Search and browse movies via [OMDB API](http://www.omdbapi.com/), with a cozy “nest” theme and clean UI
- **Sign up** — User ID, username, email, password, confirm password, phone number, and **real-time OTP** (SMS via Twilio when configured)
- **Login** — Sign in with User ID or email and password
- **Database** — Aiven MySQL: users and OTP codes; passwords hashed with bcrypt
- **OTP** — In dev mode (`OTP_DEV_MODE=true`), OTP is logged in the server console and shown in the signup form; set Twilio env vars for real SMS

## Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/Shiva70199/StreamNest.git
   cd StreamNest
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env` and set:
     - **Database:** `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=REQUIRED` (Aiven MySQL)
     - **OMDB:** `OMDB_API_KEY`
     - **OTP (optional):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` for SMS; otherwise keep `OTP_DEV_MODE=true` to use console/dev OTP

3. **Run**
   ```bash
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Project layout

- `server.js` — Express server, OMDB proxy, auth and OTP APIs, MySQL
- `db.js` — Aiven MySQL connection and table init (`users`, `otp_codes`)
- `public/` — Static frontend: `index.html` (landing), `signup.html`, `login.html`, `styles.css`, `app.js`, `auth.js`

## Tech

- **Backend:** Node.js, Express, mysql2, bcryptjs, Twilio (optional)
- **Frontend:** Vanilla JS, CSS (Outfit + Playfair Display)
- **Database:** Aiven MySQL (defaultdb)
- **APIs:** OMDB for movies; Twilio for SMS OTP when configured
