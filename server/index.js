import express from 'express';
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(rootDir, '.env');

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'notes_app',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
};

const app = express();
app.use(express.json({ limit: '1mb' }));

let pool;
const scrypt = promisify(scryptCallback);
const captchaChallenges = new Map();
const SESSION_COOKIE = 'notes_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const SESSION_SECRET = process.env.SESSION_SECRET || randomBytes(48).toString('hex');

function createSessionToken(account) {
  const payload = Buffer.from(JSON.stringify({
    id: account.id,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  })).toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function getSession(req) {
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map((part) => {
    const separator = part.indexOf('=');
    return separator < 0 ? ['', ''] : [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
  }));
  const [payload, signature] = (cookies[SESSION_COOKIE] || '').split('.');
  if (!payload || !signature) return null;

  const expected = createHmac('sha256', SESSION_SECRET).update(payload).digest();
  let received;
  try {
    received = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.exp > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}

function setSessionCookie(res, account) {
  res.cookie(SESSION_COOKIE, createSessionToken(account), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE * 1000,
    path: '/',
  });
}

function requireAccount(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Silakan masuk ke akun Anda.' });
  req.accountId = session.id;
  return next();
}

function validateRegistration({ name, email, password, confirmPassword }) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) return 'Nama wajib diisi dan maksimal 100 karakter.';
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Alamat email tidak valid.';
  if (typeof password !== 'string' || password.length < 8) return 'Password minimal 8 karakter.';
  if (password !== confirmPassword) return 'Konfirmasi password tidak sama.';
  return null;
}

async function passwordMatches(password, salt, expectedHash) {
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function serializeNote(row) {
  return {
    id: Number(row.id),
    title: row.title,
    body: row.body,
    createdAt: new Date(`${row.created_at.replace(' ', 'T')}Z`).toISOString(),
    archived: false,
  };
}

app.get('/api/auth/captcha', (_req, res) => {
  const left = Math.floor(Math.random() * 9) + 2;
  const right = Math.floor(Math.random() * 9) + 1;
  const id = randomBytes(18).toString('hex');
  captchaChallenges.set(id, { answer: String(left + right), expiresAt: Date.now() + 5 * 60 * 1000 });
  for (const [challengeId, challenge] of captchaChallenges) {
    if (challenge.expiresAt < Date.now()) captchaChallenges.delete(challengeId);
  }
  res.json({ id, question: `Berapakah ${left} + ${right}?` });
});

app.post('/api/auth/register', async (req, res, next) => {
  const input = req.body || {};
  const validationError = validateRegistration(input);
  if (validationError) return res.status(400).json({ error: validationError });

  const captcha = captchaChallenges.get(input.captchaId);
  captchaChallenges.delete(input.captchaId);
  if (!captcha || captcha.expiresAt < Date.now() || String(input.captchaAnswer).trim() !== captcha.answer) {
    return res.status(400).json({ error: 'Jawaban CAPTCHA tidak benar atau sudah kedaluwarsa.' });
  }

  const guestNotes = Array.isArray(input.notes) ? input.notes : [];
  if (guestNotes.length > 2000 || guestNotes.some((note) => validateNote(note || {}))) {
    return res.status(400).json({ error: 'Data catatan tamu tidak valid.' });
  }

  const connection = await pool.getConnection();
  try {
    const email = input.email.trim().toLowerCase();
    const salt = randomBytes(16).toString('hex');
    const passwordHash = (await scrypt(input.password, salt, 64)).toString('hex');
    await connection.beginTransaction();
    const [accountResult] = await connection.execute(
      'INSERT INTO accounts (name, email, password_hash, password_salt) VALUES (?, ?, ?, ?)',
      [input.name.trim(), email, passwordHash, salt],
    );
    const account = { id: Number(accountResult.insertId), name: input.name.trim(), email };

    for (const note of guestNotes) {
      const createdAt = new Date(note.createdAt || Date.now());
      const timestamp = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
      await connection.execute(
        'INSERT INTO notes (user_id, title, body, created_at) VALUES (?, ?, ?, ?)',
        [account.id, note.title.trim(), note.body, timestamp],
      );
    }

    await connection.commit();
    setSessionCookie(res, account);
    return res.status(201).json({ account, importedNotes: guestNotes.length });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email sudah terdaftar.' });
    return next(error);
  } finally {
    connection.release();
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, password_hash, password_salt FROM accounts WHERE email = ?',
      [email.trim().toLowerCase()],
    );
    if (!rows.length || !(await passwordMatches(password, rows[0].password_salt, rows[0].password_hash))) {
      return res.status(401).json({ error: 'Email atau password tidak sesuai.' });
    }
    const account = { id: Number(rows[0].id), name: rows[0].name, email: rows[0].email };
    setSessionCookie(res, account);
    return res.json({ account });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/me', requireAccount, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, email FROM accounts WHERE id = ?', [req.accountId]);
    if (!rows.length) return res.status(401).json({ error: 'Akun tidak ditemukan.' });
    return res.json({ account: { id: Number(rows[0].id), name: rows[0].name, email: rows[0].email } });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', path: '/' });
  res.status(204).end();
});

function validateNote({ title, body }) {
  if (typeof title !== 'string' || !title.trim()) return 'Judul catatan wajib diisi.';
  if (typeof body !== 'string' || !body.trim()) return 'Isi catatan wajib diisi.';
  if (title.trim().length > 255) return 'Judul maksimal 255 karakter.';
  return null;
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: dbConfig.database });
  } catch {
    res.status(503).json({ error: 'Database MySQL tidak dapat diakses.' });
  }
});

app.get('/api/notes', requireAccount, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT id, title, body, created_at FROM notes WHERE user_id = ? ORDER BY created_at DESC, id DESC', [req.accountId]);
    res.json(rows.map(serializeNote));
  } catch (error) {
    next(error);
  }
});

app.get('/api/notes/:id', requireAccount, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT id, title, body, created_at FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.accountId]);
    if (!rows.length) return res.status(404).json({ error: 'Catatan tidak ditemukan.' });
    return res.json(serializeNote(rows[0]));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/notes', requireAccount, async (req, res, next) => {
  const validationError = validateNote(req.body || {});
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const [result] = await pool.execute('INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)', [req.accountId, req.body.title.trim(), req.body.body]);
    const [rows] = await pool.execute('SELECT id, title, body, created_at FROM notes WHERE id = ? AND user_id = ?', [result.insertId, req.accountId]);
    return res.status(201).json(serializeNote(rows[0]));
  } catch (error) {
    return next(error);
  }
});

app.put('/api/notes/:id', requireAccount, async (req, res, next) => {
  const validationError = validateNote(req.body || {});
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const [result] = await pool.execute('UPDATE notes SET title = ?, body = ? WHERE id = ? AND user_id = ?', [req.body.title.trim(), req.body.body, req.params.id, req.accountId]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Catatan tidak ditemukan.' });
    const [rows] = await pool.execute('SELECT id, title, body, created_at FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.accountId]);
    return res.json(serializeNote(rows[0]));
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/notes/:id', requireAccount, async (req, res, next) => {
  try {
    const [result] = await pool.execute('DELETE FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.accountId]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Catatan tidak ditemukan.' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, next) => {
  void next;
  console.error(error.message);
  res.status(500).json({ error: 'Terjadi kesalahan saat mengakses database.' });
});

const distDir = path.join(rootDir, 'dist');
app.use(express.static(distDir));
app.get(/.*/, (_req, res, next) => {
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) return next();
  return res.sendFile(indexPath);
});

async function start() {
  const bootstrap = await mysql.createConnection({ ...dbConfig, database: undefined });
  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await bootstrap.end();
  pool = mysql.createPool(dbConfig);
  await pool.query(`CREATE TABLE IF NOT EXISTS accounts (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash CHAR(128) NOT NULL,
    password_salt CHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS notes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);

  const [noteColumns] = await pool.query("SHOW COLUMNS FROM notes LIKE 'user_id'");
  if (!noteColumns.length) await pool.query('ALTER TABLE notes ADD COLUMN user_id INT UNSIGNED NULL AFTER id');
  const [noteIndexes] = await pool.query("SHOW INDEX FROM notes WHERE Key_name = 'idx_notes_user_id'");
  if (!noteIndexes.length) await pool.query('CREATE INDEX idx_notes_user_id ON notes (user_id)');
  const [foreignKeys] = await pool.execute(
    "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'user_id' AND REFERENCED_TABLE_NAME = 'accounts'",
    [dbConfig.database],
  );
  if (!foreignKeys.length) {
    await pool.query('ALTER TABLE notes ADD CONSTRAINT fk_notes_user_id FOREIGN KEY (user_id) REFERENCES accounts(id) ON DELETE CASCADE');
  }
  app.listen(Number(process.env.API_PORT || 3001), '127.0.0.1', () => {
    console.log(`API catatan aktif di http://127.0.0.1:${process.env.API_PORT || 3001}`);
    console.log(`Database MySQL aktif: ${dbConfig.database}`);
  });
}

start().catch((error) => {
  console.error(`Gagal menghubungkan ke MySQL: ${error.message}`);
  process.exitCode = 1;
});
