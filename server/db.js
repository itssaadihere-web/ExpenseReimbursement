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
      expense_type TEXT DEFAULT 'fuel',
      employee_name TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      employee_email TEXT NOT NULL,
      home_location TEXT,
      home_lat REAL,
      home_lng REAL,
      claimed_amount REAL NOT NULL,
      travel_date TEXT,
      date_from TEXT,
      date_to TEXT,
      receipt_url TEXT,
      receipt_name TEXT,
      receipts_json TEXT DEFAULT '[]',
      stops_json TEXT DEFAULT '[]',
      location_summary TEXT,
      status TEXT DEFAULT 'pending_surveillance',
      pending_reason TEXT,
      
      -- Surveillance verification fields (Fuel)
      surveillance_status TEXT DEFAULT 'pending',
      surveillance_notes TEXT,
      surveillance_checked_by TEXT,
      surveillance_checked_at TEXT,

      -- Hotel verification fields (Food)
      hotel_verification_status TEXT DEFAULT 'pending',
      hotel_notes TEXT,
      hotel_checked_by TEXT,
      hotel_checked_at TEXT,
      night_stay_verified INTEGER DEFAULT 0,
      nights_count INTEGER DEFAULT 0,
      night_stay_location TEXT,
      total_tip_deducted REAL DEFAULT 0,
      eligible_food_amount REAL DEFAULT 0,

      -- Fuel weighted average & efficiency fields
      total_distance_km REAL DEFAULT 0,
      fuel_rate_km_per_liter REAL DEFAULT 30,
      fuel_liters REAL DEFAULT 0,
      petrol_rate_pkr REAL DEFAULT 0,
      petrol_rate_date TEXT,
      weighted_avg_fuel_rate REAL DEFAULT 0,
      total_gallons_purchased REAL DEFAULT 0,
      total_fuel_receipts_amount REAL DEFAULT 0,

      -- Calculation & Financials
      calculated_amount REAL DEFAULT 0,
      approved_amount REAL DEFAULT 0,
      route_legs_json TEXT,
      automation_report_json TEXT,
      automation_run_at TEXT,
      
      -- Admin & Review fields
      admin_comment_type TEXT DEFAULT 'policy_standard',
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

  // Safe table schema migrations for existing SQLite databases
  const existingCols = dbInstance.prepare("PRAGMA table_info(claims)").all().map(c => c.name);
  const addCol = (name, type) => {
    if (!existingCols.includes(name)) {
      try {
        dbInstance.exec(`ALTER TABLE claims ADD COLUMN ${name} ${type}`);
      } catch (e) {
        console.warn(`Could not add column ${name}:`, e.message);
      }
    }
  };
  addCol('expense_type', "TEXT DEFAULT 'fuel'");
  addCol('date_from', "TEXT");
  addCol('date_to', "TEXT");
  addCol('receipts_json', "TEXT DEFAULT '[]'");
  addCol('pending_reason', "TEXT");
  addCol('location_summary', "TEXT");
  addCol('surveillance_status', "TEXT DEFAULT 'pending'");
  addCol('surveillance_notes', "TEXT");
  addCol('surveillance_checked_by', "TEXT");
  addCol('surveillance_checked_at', "TEXT");
  addCol('hotel_verification_status', "TEXT DEFAULT 'pending'");
  addCol('hotel_notes', "TEXT");
  addCol('hotel_checked_by', "TEXT");
  addCol('hotel_checked_at', "TEXT");
  addCol('night_stay_verified', "INTEGER DEFAULT 0");
  addCol('nights_count', "INTEGER DEFAULT 0");
  addCol('night_stay_location', "TEXT");
  addCol('total_tip_deducted', "REAL DEFAULT 0");
  addCol('eligible_food_amount', "REAL DEFAULT 0");
  addCol('weighted_avg_fuel_rate', "REAL DEFAULT 0");
  addCol('total_gallons_purchased', "REAL DEFAULT 0");
  addCol('total_fuel_receipts_amount', "REAL DEFAULT 0");
  addCol('admin_comment_type', "TEXT DEFAULT 'policy_standard'");

  // Seed default settings for US Gas & 30 km/gallon rule
  const getSetting = dbInstance.prepare('SELECT value FROM settings WHERE key = ?');
  const insertSetting = dbInstance.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  
  insertSetting.run('petrol_rate', '3.50');
  insertSetting.run('gas_rate', '3.50');
  insertSetting.run('mileage_km_per_gallon', '30.0');
  insertSetting.run('mileage_km_per_liter', '30.0'); // backward compat alias
  insertSetting.run('food_daily_cutoff_limit', '25.00');
  insertSetting.run('fuel_rate_mode', 'weighted_average');
  insertSetting.run('currency', 'USD');
  insertSetting.run('currency_symbol', '$');
  insertSetting.run('fuel_unit', 'Gallon');
  insertSetting.run('country', 'United States');
  console.log('✅ SQLite database initialized and migrated successfully at:', dbPath);
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
    const isFood = (claim.expense_type || '').toLowerCase() === 'food';
    const dateFrom = claim.date_from || claim.travel_date || new Date().toISOString().split('T')[0];
    const dateTo = claim.date_to || dateFrom;
    
    const formatted = {
      id: claim.id || 'CLM-' + Date.now().toString(36).toUpperCase(),
      expense_type: isFood ? 'food' : 'fuel',
      employee_name: claim.employee_name,
      employee_id: claim.employee_id,
      employee_email: claim.employee_email,
      home_location: claim.home_location || (isFood ? 'N/A (Food Expense)' : ''),
      home_lat: claim.home_lat || null,
      home_lng: claim.home_lng || null,
      claimed_amount: Number(claim.claimed_amount) || 0,
      travel_date: dateFrom,
      date_from: dateFrom,
      date_to: dateTo,
      receipt_url: claim.receipt_url || null,
      receipt_name: claim.receipt_name || null,
      receipts_json: typeof claim.receipts === 'string' ? claim.receipts : JSON.stringify(claim.receipts || []),
      stops_json: typeof claim.stops === 'string' ? claim.stops : JSON.stringify(claim.stops || []),
      location_summary: claim.location_summary || (isFood ? (claim.night_stay_location || 'Food & Lodging') : (claim.home_location || 'Travel Itinerary')),
      status: claim.status || (isFood ? 'pending_hotel_verification' : 'pending_surveillance'),
      pending_reason: claim.pending_reason || (isFood ? 'Awaiting Hotel Booking Team night-stay authorization verification' : 'Awaiting Surveillance Team attendance & camera verification'),
      
      surveillance_status: claim.surveillance_status || 'pending',
      surveillance_notes: claim.surveillance_notes || '',
      surveillance_checked_by: claim.surveillance_checked_by || null,
      surveillance_checked_at: claim.surveillance_checked_at || null,

      hotel_verification_status: claim.hotel_verification_status || 'pending',
      hotel_notes: claim.hotel_notes || '',
      hotel_checked_by: claim.hotel_checked_by || null,
      hotel_checked_at: claim.hotel_checked_at || null,
      night_stay_verified: claim.night_stay_verified ? 1 : 0,
      nights_count: Number(claim.nights_count) || 0,
      night_stay_location: claim.night_stay_location || '',
      total_tip_deducted: Number(claim.total_tip_deducted) || 0,
      eligible_food_amount: Number(claim.eligible_food_amount) || 0,

      total_distance_km: Number(claim.total_distance_km) || 0,
      fuel_rate_km_per_liter: Number(claim.fuel_rate_km_per_liter) || 30,
      fuel_liters: Number(claim.fuel_liters) || 0,
      petrol_rate_pkr: Number(claim.petrol_rate_pkr) || 0,
      petrol_rate_date: claim.petrol_rate_date || null,
      weighted_avg_fuel_rate: Number(claim.weighted_avg_fuel_rate) || 0,
      total_gallons_purchased: Number(claim.total_gallons_purchased) || 0,
      total_fuel_receipts_amount: Number(claim.total_fuel_receipts_amount) || 0,

      calculated_amount: Number(claim.calculated_amount) || 0,
      approved_amount: Number(claim.approved_amount) || 0,
      route_legs_json: typeof claim.route_legs === 'string' ? claim.route_legs : JSON.stringify(claim.route_legs || []),
      automation_report_json: claim.automation_report_json || null,
      automation_run_at: claim.automation_run_at || null,
      admin_comment_type: claim.admin_comment_type || 'policy_standard',
      admin_notes: claim.admin_notes || '',
      reviewed_at: null,
      email_sent: 0,
      email_sent_at: null,
      created_at: new Date().toISOString()
    };

    if (!useJsonStore) {
      const stmt = dbInstance.prepare(`
        INSERT INTO claims (
          id, expense_type, employee_name, employee_id, employee_email, home_location, home_lat, home_lng,
          claimed_amount, travel_date, date_from, date_to, receipt_url, receipt_name, receipts_json, stops_json,
          location_summary, status, pending_reason,
          surveillance_status, surveillance_notes, surveillance_checked_by, surveillance_checked_at,
          hotel_verification_status, hotel_notes, hotel_checked_by, hotel_checked_at,
          night_stay_verified, nights_count, night_stay_location, total_tip_deducted, eligible_food_amount,
          total_distance_km, fuel_rate_km_per_liter, fuel_liters, petrol_rate_pkr, petrol_rate_date,
          weighted_avg_fuel_rate, total_gallons_purchased, total_fuel_receipts_amount,
          calculated_amount, approved_amount, route_legs_json, automation_report_json, automation_run_at,
          admin_comment_type, admin_notes, reviewed_at, email_sent, email_sent_at, created_at
        ) VALUES (
          @id, @expense_type, @employee_name, @employee_id, @employee_email, @home_location, @home_lat, @home_lng,
          @claimed_amount, @travel_date, @date_from, @date_to, @receipt_url, @receipt_name, @receipts_json, @stops_json,
          @location_summary, @status, @pending_reason,
          @surveillance_status, @surveillance_notes, @surveillance_checked_by, @surveillance_checked_at,
          @hotel_verification_status, @hotel_notes, @hotel_checked_by, @hotel_checked_at,
          @night_stay_verified, @nights_count, @night_stay_location, @total_tip_deducted, @eligible_food_amount,
          @total_distance_km, @fuel_rate_km_per_liter, @fuel_liters, @petrol_rate_pkr, @petrol_rate_date,
          @weighted_avg_fuel_rate, @total_gallons_purchased, @total_fuel_receipts_amount,
          @calculated_amount, @approved_amount, @route_legs_json, @automation_report_json, @automation_run_at,
          @admin_comment_type, @admin_notes, @reviewed_at, @email_sent, @email_sent_at, @created_at
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
      receipts: safeJsonParse(row.receipts_json, []),
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
