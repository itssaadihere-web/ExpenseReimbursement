import React, { useState, useEffect } from 'react';
import { Settings, Save, Fuel, Gauge, Key, Mail, CheckCircle, RefreshCw } from 'lucide-react';

export default function AdminSettings({ onSettingsUpdated }) {
  const [settings, setSettings] = useState({
    petrol_rate: '267.50',
    mileage_km_per_liter: '10.0',
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
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      })
      .catch(err => console.warn('Error loading settings:', err))
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
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
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

  const handleFetchTariff = async () => {
    try {
      const res = await fetch('/api/petrol-rate/fetch-latest', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data) {
        handleChange('petrol_rate', String(data.data.rate));
        alert(`Checked latest rate: $${data.data.rate} / Gallon (${data.data.source})`);
      }
    } catch (e) {
      alert('Tariff check warning: ' + e.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Reimbursement & Automation Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage fuel mileage efficiency limits, U.S. gasoline tariff benchmarks, and notification channels.
            </p>
          </div>

          {savedSuccess && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5" /> Settings Saved!
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6 mt-6">
          {/* 1. Fuel & Mileage Rules */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Fuel className="w-4 h-4 text-blue-600" />
              Fuel & Mileage Policy Rules
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  U.S. Gasoline Rate ($ per Gallon) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={settings.petrol_rate}
                    onChange={(e) => handleChange('petrol_rate', e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-slate-400">U.S. EIA National Average</span>
                  <button
                    type="button"
                    onClick={handleFetchTariff}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" /> Check Tariff
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Efficiency Limit Allowed (KM per Gallon) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    required
                    value={settings.mileage_km_per_liter || settings.mileage_km_per_gallon || '30.0'}
                    onChange={(e) => {
                      handleChange('mileage_km_per_liter', e.target.value);
                      handleChange('mileage_km_per_gallon', e.target.value);
                    }}
                    className="w-full pl-3 pr-24 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-500">KM / Gallon</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Standard policy ceiling (30 KM/Gallon limit allowed)</span>
              </div>
            </div>
          </div>

          {/* 2. Optional Google Maps API Key */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600" />
              Routing Engine & Google Maps Integration (Optional)
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Maps API Key (Optional)
              </label>
              <input
                type="text"
                value={settings.google_maps_key || ''}
                onChange={(e) => handleChange('google_maps_key', e.target.value)}
                placeholder="AIzaSy... (Leave blank to use free built-in OpenStreetMap / OSRM engine)"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                The system already includes a built-in OpenStreetMap road routing engine that works worldwide without any API key or subscription.
              </span>
            </div>
          </div>

          {/* 3. SMTP Email Configuration */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              Custom SMTP Email Server (Optional)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={settings.smtp_host || ''}
                  onChange={(e) => handleChange('smtp_host', e.target.value)}
                  placeholder="e.g. smtp.gmail.com or mail.company.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Port</label>
                <input
                  type="text"
                  value={settings.smtp_port || '587'}
                  onChange={(e) => handleChange('smtp_port', e.target.value)}
                  placeholder="587 or 465"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Username</label>
                <input
                  type="text"
                  value={settings.smtp_user || ''}
                  onChange={(e) => handleChange('smtp_user', e.target.value)}
                  placeholder="notifications@company.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Password</label>
                <input
                  type="password"
                  value={settings.smtp_pass || ''}
                  onChange={(e) => handleChange('smtp_pass', e.target.value)}
                  placeholder="App password or secret"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              💡 If left blank, the system automatically uses the internal sandbox email logger + Outbox viewer so all approval notification emails can be inspected directly in the app!
            </p>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
