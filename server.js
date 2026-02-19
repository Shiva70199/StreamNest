require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { query } = require('./db');

let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const app = express();
const PORT = process.env.PORT || 3000;
const OTP_DEV_MODE = process.env.OTP_DEV_MODE === 'true';
const OMDB_API_KEY = process.env.OMDB_API_KEY || '1d7caeda';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOTP(phone, code) {
  if (OTP_DEV_MODE || !twilioClient) {
    console.log('[OTP DEV] Phone:', phone, 'Code:', code);
    return { success: true, devCode: code };
  }
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    console.warn('TWILIO_PHONE_NUMBER not set, logging OTP:', code);
    return { success: true, devCode: code };
  }
  await twilioClient.messages.create({
    body: `Your STREAMNEST verification code is: ${code}. Valid for 10 minutes.`,
    from,
    to: phone,
  });
  return { success: true };
}

// OMDB proxy (avoid exposing API key in frontend)
app.get('/api/movies', async (req, res) => {
  try {
    const search = req.query.s || 'movie';
    const page = req.query.page || 1;
    const type = req.query.type || 'movie'; // movie | series
    const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(search)}&type=${type}&page=${page}`;
    const resp = await fetch(url);
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/movie/:id', async (req, res) => {
  try {
    const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${req.params.id}`;
    const resp = await fetch(url);
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Request OTP
app.post('/api/otp/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\+?[\d\s-]{10,}$/.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await query(
      'INSERT INTO otp_codes (phone, code, expires_at) VALUES (?, ?, ?)',
      [phone.replace(/\s/g, ''), code, expiresAt]
    );
    const result = await sendOTP(phone, code);
    res.json({ success: true, message: 'OTP sent', ...(result.devCode && { devCode: result.devCode }) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Verify OTP (returns success only)
app.post('/api/otp/verify', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });
    const normalized = phone.replace(/\s/g, '');
    const rows = await query(
      'SELECT id FROM otp_codes WHERE phone = ? AND code = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [normalized, String(code)]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    await query('DELETE FROM otp_codes WHERE phone = ?', [normalized]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { userId, username, email, password, confirmPassword, phone, otp } = req.body;
    if (!userId || !username || !email || !password || !confirmPassword || !phone || !otp) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const normalized = phone.replace(/\s/g, '');
    const otpRows = await query(
      'SELECT id FROM otp_codes WHERE phone = ? AND code = ? AND expires_at > NOW() LIMIT 1',
      [normalized, String(otp)]
    );
    if (otpRows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' });
    }
    const existing = await query('SELECT id FROM users WHERE email = ? OR user_id = ?', [email, userId]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User ID or Email already registered' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    await query(
      'INSERT INTO users (user_id, username, email, password_hash, phone) VALUES (?, ?, ?, ?, ?)',
      [userId, username, email, password_hash, normalized]
    );
    await query('DELETE FROM otp_codes WHERE phone = ?', [normalized]);
    res.json({ success: true, message: 'Registration successful' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ error: 'User ID/Email and password required' });
    }
    const rows = await query(
      'SELECT id, user_id, username, email, password_hash FROM users WHERE user_id = ? OR email = ? LIMIT 1',
      [loginId, loginId]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({
      success: true,
      user: { userId: user.user_id, username: user.username, email: user.email },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`STREAMNEST running at http://localhost:${PORT}`);
});
