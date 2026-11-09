const fs = require('fs');
const path = require('path');

const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel ? path.join('/tmp', 'data') : path.join(__dirname, '..', 'data');
const uploadsDir = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

let dbInstance = null;
let useJsonStore = false;

// Attempt to use better-sqlite3
try {
  const Database = require('better-sqlite3');
  const dbPath = path.join(dataDir, 'reimbursement.db');
  dbInstance = new Database(dbPath);
  
  // Enable WAL mode for performance
  dbInstance.pragma('journal_mode = WAL');

  // Initialize tables
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      employee_name TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      employee_email TEXT NOT NULL,
      home_location TEXT NOT NULL,
      home_lat REAL,
      home_lng REAL,
      claimed_amount REAL NOT NULL,
      travel_date TEXT NOT NULL,
      receipt_url TEXT,
      receipt_name TEXT,
      stops_json TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      
      -- Automation calculation fields
      total_distance_km REAL DEFAULT 0,
      fuel_rate_km_per_liter REAL DEFAULT 10,
      fuel_liters REAL DEFAULT 0,
      petrol_rate_pkr REAL DEFAULT 0,
      petrol_rate_date TEXT,
      calculated_amount REAL DEFAULT 0,
      approved_amount REAL DEFAULT 0,
      route_legs_json TEXT,
      automation_report_json TEXT,
      automation_run_at TEXT,
      
      -- Admin & Review fields
      admin_notes TEXT,
      reviewed_at TEXT,
      email_sent INTEGER DEFAULT 0,
      email_sent_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      claim_id TEXT,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      preview_url TEXT,
      status TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );
  `);

  // Seed default settings for US Gas & 30 km/gallon rule
  const getSetting = dbInstance.prepare('SELECT value FROM settings WHERE key = ?');
  const insertSetting = dbInstance.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  
  insertSetting.run('petrol_rate', '3.50');
  insertSetting.run('gas_rate', '3.50');
  insertSetting.run('mileage_km_per_gallon', '30.0');
  insertSetting.run('mileage_km_per_liter', '30.0'); // backward compat alias
  insertSetting.run('currency', 'USD');
  insertSetting.run('currency_symbol', '$');
  insertSetting.run('fuel_unit', 'Gallon');
  insertSetting.run('country', 'United States');
  console.log('✅ SQLite database initialized successfully at:', dbPath);
} catch (err) {
  console.warn('⚠️ SQLite initialization notice, using JSON store fallback:', err.message);
  useJsonStore = true;
}

// Fallback JSON-based store in case better-sqlite3 has binary issues on certain Windows node versions
const jsonDbPath = path.join(dataDir, 'db.json');
let jsonData = {
  settings: {
    petrol_rate: '3.50',
    gas_rate: '3.50',
    mileage_km_per_gallon: '30.0',
    mileage_km_per_liter: '30.0',
    currency: 'USD',
    currency_symbol: '$',
    fuel_unit: 'Gallon',
    country: 'United States'
  },
  claims: [],
  emails: []
};

if (useJsonStore) {
  if (fs.existsSync(jsonDbPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));
      jsonData = {
        ...jsonData,
        ...parsed,
        settings: { ...jsonData.settings, ...(parsed.settings || {}) }
      };
    } catch (e) {
      console.error('Failed to parse existing json db:', e);
    }
  } else {
    fs.writeFileSync(jsonDbPath, JSON.stringify(jsonData, null, 2));
  }
}

function saveJsonDb() {
  if (useJsonStore) {
    fs.writeFileSync(jsonDbPath, JSON.stringify(jsonData, null, 2));
  }
}

const db = {
  getSettings() {
    if (!useJsonStore) {
      const rows = dbInstance.prepare('SELECT key, value FROM settings').all();
      const result = {};
      rows.forEach(r => { result[r.key] = r.value; });
      return result;
    }
    return { ...jsonData.settings };
  },

  setSetting(key, value) {
    if (!useJsonStore) {
      dbInstance.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
    } else {
      jsonData.settings[key] = String(value);
      saveJsonDb();
    }
  },

  getAllClaims() {
    if (!useJsonStore) {
      const claims = dbInstance.prepare('SELECT * FROM claims ORDER BY created_at DESC').all();
      return claims.map(c => this._formatClaim(c));
    }
    return [...jsonData.claims]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(c => this._formatClaim(c));
  },

  getClaimById(id) {
    if (!useJsonStore) {
      const row = dbInstance.prepare('SELECT * FROM claims WHERE id = ?').get(id);
      return row ? this._formatClaim(row) : null;
    }
    const row = jsonData.claims.find(c => c.id === id) || null;
    return row ? this._formatClaim(row) : null;
  },

  createClaim(claim) {
    const formatted = {
      id: claim.id || 'CLM-' + Date.now().toString(36).toUpperCase(),
      employee_name: claim.employee_name,
      employee_id: claim.employee_id,
      employee_email: claim.employee_email,
      home_location: claim.home_location,
      home_lat: claim.home_lat || null,
      home_lng: claim.home_lng || null,
      claimed_amount: Number(claim.claimed_amount) || 0,
      travel_date: claim.travel_date || new Date().toISOString().split('T')[0],
      receipt_url: claim.receipt_url || null,
      receipt_name: claim.receipt_name || null,
      stops_json: typeof claim.stops === 'string' ? claim.stops : JSON.stringify(claim.stops || []),
      status: 'pending',
      total_distance_km: 0,
      fuel_rate_km_per_liter: 10,
      fuel_liters: 0,
      petrol_rate_pkr: 0,
      petrol_rate_date: null,
      calculated_amount: 0,
      approved_amount: 0,
      route_legs_json: '[]',
      automation_report_json: null,
      automation_run_at: null,
      admin_notes: '',
      reviewed_at: null,
      email_sent: 0,
      email_sent_at: null,
      created_at: new Date().toISOString()
    };

    if (!useJsonStore) {
      const stmt = dbInstance.prepare(`
        INSERT INTO claims (
          id, employee_name, employee_id, employee_email, home_location, home_lat, home_lng,
          claimed_amount, travel_date, receipt_url, receipt_name, stops_json, status,
          total_distance_km, fuel_rate_km_per_liter, fuel_liters, petrol_rate_pkr, petrol_rate_date,
          calculated_amount, approved_amount, route_legs_json, automation_report_json, automation_run_at,
          admin_notes, reviewed_at, email_sent, email_sent_at, created_at
        ) VALUES (
          @id, @employee_name, @employee_id, @employee_email, @home_location, @home_lat, @home_lng,
          @claimed_amount, @travel_date, @receipt_url, @receipt_name, @stops_json, @status,
          @total_distance_km, @fuel_rate_km_per_liter, @fuel_liters, @petrol_rate_pkr, @petrol_rate_date,
          @calculated_amount, @approved_amount, @route_legs_json, @automation_report_json, @automation_run_at,
          @admin_notes, @reviewed_at, @email_sent, @email_sent_at, @created_at
        )
      `);
      stmt.run(formatted);
    } else {
      jsonData.claims.push(formatted);
      saveJsonDb();
    }
    return this.getClaimById(formatted.id);
  },

  updateClaim(id, updates) {
    const existing = this.getClaimById(id);
    if (!existing) return null;

    if (!useJsonStore) {
      const keys = Object.keys(updates);
      const setClauses = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => {
        const val = updates[k];
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val);
        }
        return val;
      });
      values.push(id);
      dbInstance.prepare(`UPDATE claims SET ${setClauses} WHERE id = ?`).run(...values);
    } else {
      const idx = jsonData.claims.findIndex(c => c.id === id);
      if (idx !== -1) {
        jsonData.claims[idx] = { ...jsonData.claims[idx], ...updates };
        saveJsonDb();
      }
    }
    return this.getClaimById(id);
  },

  addEmailLog(emailData) {
    const record = {
      id: 'EML-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      claim_id: emailData.claim_id || null,
      to_email: emailData.to_email,
      subject: emailData.subject,
      body_html: emailData.body_html,
      preview_url: emailData.preview_url || null,
      status: emailData.status || 'sent',
      sent_at: new Date().toISOString()
    };

    if (!useJsonStore) {
      dbInstance.prepare(`
        INSERT INTO emails (id, claim_id, to_email, subject, body_html, preview_url, status, sent_at)
        VALUES (@id, @claim_id, @to_email, @subject, @body_html, @preview_url, @status, @sent_at)
      `).run(record);
    } else {
      jsonData.emails.push(record);
      saveJsonDb();
    }
    return record;
  },

  getEmailLogs() {
    if (!useJsonStore) {
      return dbInstance.prepare('SELECT * FROM emails ORDER BY sent_at DESC').all();
    }
    return [...jsonData.emails].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  },

  _formatClaim(row) {
    if (!row) return null;
    return {
      ...row,
      stops: safeJsonParse(row.stops_json, []),
      route_legs: safeJsonParse(row.route_legs_json, []),
      automation_report: safeJsonParse(row.automation_report_json, null)
    };
  }
};

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

module.exports = { db, dataDir, uploadsDir };
