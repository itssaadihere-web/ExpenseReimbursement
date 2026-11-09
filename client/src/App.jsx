import React, { useState, useEffect } from 'react';
import { 
  FilePlus2, 
  LayoutDashboard, 
  FileText, 
  Mail, 
  Settings, 
  Fuel, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Sparkles,
  Lock,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import UserForm from './components/UserForm';
import AdminDashboard from './components/AdminDashboard';
import AutomationReports from './components/AutomationReports';
import EmailOutbox from './components/EmailOutbox';
import AdminSettings from './components/AdminSettings';
import AdminLoginModal from './components/AdminLoginModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('user_form'); // 'user_form' | 'admin_dashboard' | 'automation_reports' | 'email_outbox' | 'settings'
  const [claims, setClaims] = useState([]);
  const [stats, setStats] = useState({});
  const [petrolRate, setPetrolRate] = useState(3.50);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Check stored auth session
  useEffect(() => {
    const token = localStorage.getItem('admin_auth_token');
    const storedUser = localStorage.getItem('admin_user');
    if (token) {
      setIsAdminAuthenticated(true);
      if (storedUser) {
        try {
          setAdminUser(JSON.parse(storedUser));
        } catch {}
      }
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setIsAdminAuthenticated(true);
    setAdminUser(user);
    setActiveTab('admin_dashboard');
    showToast(`Welcome back, ${user.name || 'Administrator'}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth_token');
    localStorage.removeItem('admin_user');
    setIsAdminAuthenticated(false);
    setAdminUser(null);
    setActiveTab('user_form');
    showToast('Logged out of Admin Portal.', 'info');
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchClaims = async () => {
    try {
      const res = await fetch('/api/claims');
      const data = await res.json();
      if (data.success) {
        setClaims(data.claims || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.warn('Error fetching claims:', err);
    }
  };

  const fetchPetrolRate = async () => {
    try {
      const res = await fetch('/api/petrol-rate');
      const data = await res.json();
      if (data.success && data.data) {
        setPetrolRate(data.data.rate);
      }
    } catch (err) {
      console.warn('Error fetching gas rate:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchClaims(), fetchPetrolRate()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle run automation
  const handleRunAutomation = async (claimId) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/run-automation`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Automation executed for Claim ${claimId}!`);
        await fetchClaims();
        return data.claim;
      } else {
        showToast(data.error || 'Failed to run automation', 'error');
      }
    } catch (err) {
      showToast('Error running automation: ' + err.message, 'error');
    }
    return null;
  };

  // Handle approve
  const handleApprove = async (claimId, approvedAmount, adminNotes) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_amount: approvedAmount, admin_notes: adminNotes })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Claim ${claimId} approved ($${Number(approvedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}) and automated email dispatched!`);
        await fetchClaims();
        return data;
      } else {
        showToast(data.error || 'Approval failed', 'error');
      }
    } catch (err) {
      showToast('Error approving claim: ' + err.message, 'error');
    }
    return null;
  };

  // Handle reject
  const handleReject = async (claimId, adminNotes) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Claim ${claimId} rejected and notification email dispatched.`, 'info');
        await fetchClaims();
        return data;
      } else {
        showToast(data.error || 'Rejection failed', 'error');
      }
    } catch (err) {
      showToast('Error rejecting claim: ' + err.message, 'error');
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Business Brand Logos */}
            <div className="flex items-center gap-4">
              {/* Mobily Logo */}
              <div className="flex items-center">
                <img 
                  src="/logo-mobily.png" 
                  alt="Mobily Logo" 
                  className="h-12 w-auto object-contain drop-shadow-xs"
                />
              </div>

              {/* Divider */}
              <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />

              {/* Retailer Logo */}
              <div className="flex items-center">
                <img 
                  src="/logo-retailer.png" 
                  alt="Authorized Retailer Logo" 
                  className="h-8 sm:h-9 w-auto object-contain"
                />
              </div>

              {/* Title & Badge */}
              <div className="hidden lg:block pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Travel & Fuel Reimbursement
                  </h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-lime-100 text-lime-800 px-2 py-0.5 rounded-full border border-lime-300">
                    30 KM/Gal Limit
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Automated GPS Matrix &bull; U.S. Benchmark &bull; Instant Email Revert
                </p>
              </div>
            </div>

            {/* Right actions: Gas rate & Admin Login/Logout */}
            <div className="flex items-center gap-3">
              {/* US Gas Benchmark Badge */}
              <div className="hidden sm:flex items-center gap-2 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-sky-700 font-bold">⛽ Gas Benchmark:</span>
                <span className="font-extrabold text-slate-900">${Number(petrolRate || 3.50).toFixed(2)} / Gallon</span>
              </div>

              {/* Refresh button */}
              <button
                onClick={loadData}
                disabled={loading}
                title="Refresh system data"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Admin Auth Pill */}
              {isAdminAuthenticated ? (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                      {adminUser?.name || 'Admin'}
                    </span>
                    <span className="text-[10px] text-lime-700 font-bold uppercase tracking-wider">Authorized</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Log Out of Admin Portal"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Admin Login</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Bar: If Admin is logged in, show Admin management tabs */}
          {isAdminAuthenticated && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-semibold scrollbar-none border-t border-slate-100 pt-2">
              <button
                onClick={() => setActiveTab('admin_dashboard')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg transition-all relative ${
                  activeTab === 'admin_dashboard'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
                {stats.pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                    {stats.pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('automation_reports')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg transition-all ${
                  activeTab === 'automation_reports'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Automation Reports</span>
              </button>

              <button
                onClick={() => setActiveTab('email_outbox')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg transition-all ${
                  activeTab === 'email_outbox'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Sent Emails Outbox</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg transition-all ${
                  activeTab === 'settings'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>

              <span className="text-slate-300">|</span>

              <button
                onClick={() => setActiveTab('user_form')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg transition-all ${
                  activeTab === 'user_form'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>Public Form Preview</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Toast Alert Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-slide-up">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold text-white ${
            toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-sky-600' : 'bg-emerald-600'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* If user is not admin, only the public UserForm is visible */}
        {(!isAdminAuthenticated || activeTab === 'user_form') && (
          <UserForm
            petrolRate={petrolRate}
            onClaimSubmitted={async (newClaim) => {
              showToast(`Claim ${newClaim.id} submitted! Mileage and route calculated successfully.`);
              await fetchClaims();
            }}
          />
        )}

        {/* Protected Admin Views */}
        {isAdminAuthenticated && activeTab === 'admin_dashboard' && (
          <AdminDashboard
            claims={claims}
            stats={stats}
            petrolRate={petrolRate}
            onRefresh={fetchClaims}
            onRunAutomation={handleRunAutomation}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {isAdminAuthenticated && activeTab === 'automation_reports' && (
          <AutomationReports
            claims={claims}
            petrolRate={petrolRate}
          />
        )}

        {isAdminAuthenticated && activeTab === 'email_outbox' && (
          <EmailOutbox />
        )}

        {isAdminAuthenticated && activeTab === 'settings' && (
          <AdminSettings
            onSettingsUpdated={(newSettings) => {
              if (newSettings.petrol_rate) setPetrolRate(parseFloat(newSettings.petrol_rate));
              showToast('System configuration saved successfully!');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-mobily.png" alt="Mobily" className="h-6 w-auto opacity-75" />
            <img src="/logo-retailer.png" alt="Retailer" className="h-5 w-auto opacity-75" />
            <span className="text-slate-400">Authorized Retailer Travel & Fuel Reimbursement System</span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>30.0 KM / Gallon Benchmark</span>
            <span>&bull;</span>
            <span>U.S. Gasoline Rates</span>
            {!isAdminAuthenticated && (
              <>
                <span>&bull;</span>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="text-sky-600 hover:text-sky-700 font-bold"
                >
                  Admin Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
