import React, { useState, useEffect } from 'react';
import { Settings, Save, Fuel, UtensilsCrossed, CheckCircle, RefreshCw, Info, Key, Mail, ShieldCheck } from 'lucide-react';
import { safeFetch } from '../utils/api';

export default function AdminSettings({ onSettingsUpdated }) {
  const [settings, setSettings] = useState({
    food_daily_cutoff_limit: '25.00',
    mileage_km_per_gallon: '30.0',
    mileage_km_per_liter: '30.0',
    fuel_rate_mode: 'weighted_average',
    require_night_stay_for_food: 'true',
    google_maps_key: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    from_email: 'reimbursements@corporate.internal'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    safeFetch('/api/settings')
      .then(data => {
        if (data.success && data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      })
      .catch(err => console.warn('Error loading settings:', err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const data = await safeFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (data.success) {
        setSavedSuccess(true);
        if (onSettingsUpdated) onSettingsUpdated(data.settings);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading policy settings...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Dynamic Policy & Automation Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Adjust fuel efficiency cut-offs, daily food allowance ceilings, and notification settings dynamically.
            </p>
          </div>

          {savedSuccess && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5" /> Policy Updated!
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6 mt-6">
          {/* 1. FUEL POLICY SECTION */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Fuel className="w-4 h-4 text-sky-600" />
              Fuel Policy & Mileage Efficiency Ceiling
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fuel Efficiency Limit Allowed (KM / Gallon) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={settings.mileage_km_per_gallon || '30.0'}
                    onChange={(e) => {
                      handleChange('mileage_km_per_gallon', e.target.value);
                      handleChange('mileage_km_per_liter', e.target.value);
                    }}
                    className="w-full pl-3 pr-24 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">KM / Gallon</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Reimbursable Gallons = Verified Route Distance ÷ this ceiling.
                </span>
              </div>

              <div className="bg-sky-50/70 p-3.5 rounded-2xl border border-sky-200 text-xs text-sky-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5 text-sky-800">
                  <Info className="w-4 h-4 text-sky-600" />
                  Dynamic Fuel Rate (Weighted Average)
                </div>
                <p className="text-[11px] leading-relaxed text-sky-700">
                  Fixed gas rate has been removed from policy settings. The system dynamically computes the <strong>Weighted Average Fuel Rate</strong> from the actual gallons and rates on the employee’s uploaded receipts.
                </p>
              </div>
            </div>
          </div>

          {/* 2. FOOD POLICY SECTION */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
              Food Allowance Cut-off & Night-Stay Rules
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Daily Food Allowance Cut-Off Limit ($ USD / Day) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="1.00"
                    required
                    value={settings.food_daily_cutoff_limit || '25.00'}
                    onChange={(e) => handleChange('food_daily_cutoff_limit', e.target.value)}
                    className="w-full pl-8 pr-16 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">/ Day</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Maximum daily allowable meal reimbursement per night-stay day.
                </span>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Mandatory Tip Exclusion Policy
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-700">
                  Per corporate rules, tip amounts on food bills are strictly non-reimbursable and are automatically deducted from claim amounts before evaluating daily ceilings.
                </p>
              </div>
            </div>
          </div>

          {/* 3. API & NOTIFICATION CHANNELS */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-600" />
              Routing & Email Notification Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Maps Matrix API Key (Optional)
                </label>
                <input
                  type="password"
                  value={settings.google_maps_key || ''}
                  onChange={(e) => handleChange('google_maps_key', e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">High-accuracy road matrix routing. Built-in OSRM fallback active if empty.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  From Email Address (Notification Dispatcher)
                </label>
                <input
                  type="email"
                  value={settings.from_email || 'reimbursements@corporate.internal'}
                  onChange={(e) => handleChange('from_email', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Policy Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
