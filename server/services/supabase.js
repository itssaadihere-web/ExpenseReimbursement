const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
  console.log('⚡ Connected to Supabase Cloud Database at:', supabaseUrl);
}

function isSupabaseConfigured() {
  return Boolean(supabase);
}

const supabaseDb = {
  isConfigured: isSupabaseConfigured,
  client: supabase,

  async getSettings() {
    if (!supabase) return null;
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error) {
      console.warn('Supabase getSettings error:', error.message);
      return null;
    }
    const result = {};
    (data || []).forEach(r => { result[r.key] = r.value; });
    return result;
  },

  async setSetting(key, value) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('settings')
      .upsert({ key, value: String(value) }, { onConflict: 'key' })
      .select();
    if (error) console.warn('Supabase setSetting error:', error.message);
    return data;
  },

  async getAllClaims() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Supabase getAllClaims error:', error.message);
      return null;
    }
    return (data || []).map(c => this._formatClaim(c));
  },

  async getClaimById(id) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      console.warn(`Supabase getClaimById (${id}) error:`, error.message);
      return null;
    }
    return this._formatClaim(data);
  },

  async createClaim(claim) {
    if (!supabase) return null;
    const row = {
      ...claim,
      receipts_json: typeof claim.receipts === 'string' ? JSON.parse(claim.receipts) : (claim.receipts || []),
      stops_json: typeof claim.stops === 'string' ? JSON.parse(claim.stops) : (claim.stops || []),
      route_legs_json: typeof claim.route_legs === 'string' ? JSON.parse(claim.route_legs) : (claim.route_legs || []),
      automation_report_json: typeof claim.automation_report === 'string' ? JSON.parse(claim.automation_report) : (claim.automation_report || null)
    };

    const { data, error } = await supabase
      .from('claims')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Supabase createClaim error:', error.message);
      throw error;
    }
    return this._formatClaim(data);
  },

  async updateClaim(id, updates) {
    if (!supabase) return null;
    const formattedUpdates = { ...updates };
    if (updates.receipts) {
      formattedUpdates.receipts_json = typeof updates.receipts === 'string' ? JSON.parse(updates.receipts) : updates.receipts;
      delete formattedUpdates.receipts;
    }
    if (updates.stops) {
      formattedUpdates.stops_json = typeof updates.stops === 'string' ? JSON.parse(updates.stops) : updates.stops;
      delete formattedUpdates.stops;
    }
    if (updates.route_legs) {
      formattedUpdates.route_legs_json = typeof updates.route_legs === 'string' ? JSON.parse(updates.route_legs) : updates.route_legs;
      delete formattedUpdates.route_legs;
    }
    if (updates.automation_report) {
      formattedUpdates.automation_report_json = typeof updates.automation_report === 'string' ? JSON.parse(updates.automation_report) : updates.automation_report;
      delete formattedUpdates.automation_report;
    }

    const { data, error } = await supabase
      .from('claims')
      .update(formattedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase updateClaim error:', error.message);
      throw error;
    }
    return this._formatClaim(data);
  },

  async uploadReceipt(fileBuffer, originalName, mimeType) {
    if (!supabase) return null;
    try {
      const ext = originalName.split('.').pop();
      const path = `receipt-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(path, fileBuffer, {
          contentType: mimeType,
          upsert: false
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(path);

      return {
        url: publicUrlData.publicUrl,
        name: originalName
      };
    } catch (err) {
      console.warn('Supabase uploadReceipt fallback warning:', err.message);
      return null;
    }
  },

  async addEmailLog(emailData) {
    if (!supabase) return null;
    const row = {
      id: 'EML-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      claim_id: emailData.claim_id || null,
      to_email: emailData.to_email,
      subject: emailData.subject,
      body_html: emailData.body_html,
      preview_url: emailData.preview_url || null,
      status: emailData.status || 'sent',
      sent_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('emails').insert(row).select().single();
    if (error) console.warn('Supabase addEmailLog error:', error.message);
    return data || row;
  },

  async getEmailLogs() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .order('sent_at', { ascending: false });
    if (error) console.warn('Supabase getEmailLogs error:', error.message);
    return data || [];
  },

  _formatClaim(row) {
    if (!row) return null;
    return {
      ...row,
      stops: row.stops_json || [],
      receipts: row.receipts_json || [],
      route_legs: row.route_legs_json || [],
      automation_report: row.automation_report_json || null
    };
  }
};

module.exports = { supabaseDb, isSupabaseConfigured };
