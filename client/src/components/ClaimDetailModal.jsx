import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Car, 
  Droplet, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Play, 
  Mail, 
  ExternalLink, 
  AlertTriangle,
  Receipt,
  Clock,
  Sparkles,
  Info,
  Fuel,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import RouteMap from './RouteMap';

export default function ClaimDetailModal({ 
  claim, 
  onClose, 
  onRunAutomation, 
  onApprove, 
  onReject,
  onViewExpenseReport,
  loading 
}) {
  if (!claim) return null;

  const [approvedAmount, setApprovedAmount] = useState(
    claim.approved_amount || claim.calculated_amount || claim.claimed_amount || 0
  );
  const [adminNotes, setAdminNotes] = useState(
    claim.admin_notes || 'Approved as per 30.0 KM/Gallon corporate fuel efficiency limit.'
  );
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'map' | 'receipt'
  const [actionInProgress, setActionInProgress] = useState(false);

  const claimed = Number(claim.claimed_amount) || 0;
  const calculated = Number(claim.calculated_amount) || 0;
  const variance = claimed - calculated;
  const isOverClaimed = variance > 0;

  const report = claim.automation_report || null;
  const legs = claim.route_legs || [];

  const fuelGallons = Number(claim.fuel_liters || (Number(claim.total_distance_km || 0) / 30)).toFixed(2);
  const gasPrice = Number(claim.petrol_rate_pkr || 3.50).toFixed(2);

  const handleApproveClick = async () => {
    setActionInProgress(true);
    try {
      await onApprove(claim.id, approvedAmount, adminNotes);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRejectClick = async () => {
    setActionInProgress(true);
    try {
      await onReject(claim.id, adminNotes);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRunAutomationClick = async () => {
    setActionInProgress(true);
    try {
      await onRunAutomation(claim.id);
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              CLM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">
                  Fuel Claim {claim.id}
                </h2>
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  claim.status === 'approved' 
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                    : claim.status === 'rejected'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}>
                  {claim.status}
                </span>
                {claim.email_sent ? (
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email Dispatched
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">
                Submitted by <strong>{claim.employee_name}</strong> ({claim.employee_id}) &bull; Travel Date: {claim.travel_date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onViewExpenseReport && (
              <button
                onClick={() => {
                  onClose();
                  onViewExpenseReport(claim.id);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#993300] hover:bg-[#802a00] text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                title="View in Official Expense Report Web View"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Expense Report</span>
              </button>
            )}

            <a
              href={`/api/reports/expense-report/excel?claimId=${claim.id}`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
              title="Download Excel (.xlsx) Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </a>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-4 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Automation Audit & Calculations
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'map'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Trip Route Map
          </button>
          <button
            onClick={() => setActiveTab('receipt')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'receipt'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Receipt Attachment {claim.receipt_url && '(1)'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Top Comparison Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Claimed */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                User Claimed Amount
              </span>
              <div className="text-2xl font-extrabold text-slate-800 mt-1">
                ${claimed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Requested by employee
              </span>
            </div>

            {/* 2. System Calculated */}
            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 shadow-2xs">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                System Allowable Ceiling
              </span>
              <div className="text-2xl font-extrabold text-blue-700 mt-1">
                ${calculated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-blue-600 mt-0.5 block font-medium">
                Calculated @ 30 KM / Gallon limit
              </span>
            </div>

            {/* 3. Variance / Savings */}
            <div className={`p-4 rounded-xl border shadow-2xs ${
              isOverClaimed
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}>
              <span className="text-xs font-semibold uppercase tracking-wider block flex items-center gap-1">
                {isOverClaimed ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                {isOverClaimed ? 'Over-Claimed Difference' : 'Policy Compliance'}
              </span>
              <div className="text-2xl font-extrabold mt-1">
                {isOverClaimed ? `+$${variance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '100% Compliant'}
              </div>
              <span className="text-[11px] mt-0.5 block opacity-80">
                {isOverClaimed ? 'Company policy safeguards this difference' : 'Within allowable efficiency ceiling'}
              </span>
            </div>
          </div>

          {/* TAB 1: Automation Audit & Calculations */}
          {activeTab === 'audit' && (
            <div className="space-y-5">
              {/* Policy formula banner */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Car className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm">
                      Automated Route & Fuel Verification Engine
                    </h3>
                  </div>
                  <button
                    onClick={handleRunAutomationClick}
                    disabled={actionInProgress}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 text-blue-600" />
                    Re-run Automation
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px] font-medium">Round-Trip Distance</span>
                    <span className="text-base font-bold text-slate-800">{Number(claim.total_distance_km || 0).toFixed(2)} KM</span>
                    <span className="text-[10px] text-slate-500 block">Home ➔ Stops ➔ Home</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px] font-medium">Efficiency Limit Allowed</span>
                    <span className="text-base font-bold text-slate-800">30.0 KM / Gal</span>
                    <span className="text-[10px] text-slate-500 block">Standard ceiling</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px] font-medium">Allowable Fuel Needed</span>
                    <span className="text-base font-bold text-blue-600">{fuelGallons} Gallons</span>
                    <span className="text-[10px] text-slate-500 block">({claim.total_distance_km} ÷ 30)</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px] font-medium">Gas Price / Gallon</span>
                    <span className="text-base font-bold text-slate-800">${gasPrice}</span>
                    <span className="text-[10px] text-emerald-600 block font-medium">National Benchmark</span>
                  </div>
                </div>

                {/* Mathematical calculation explanation */}
                <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>System Calculation Formula:</strong>
                    <div className="mt-0.5 font-mono text-[11px] text-blue-800">
                      ({Number(claim.total_distance_km || 0).toFixed(1)} km ÷ 30 km/gal) = {fuelGallons} Gallons × ${gasPrice}/gal = <strong>${calculated.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Leg-by-leg Journey breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
                  Leg-by-Leg Route Distances (Includes Home Origin & Return)
                </h4>

                {legs.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Transit Segment (From ➔ To)</th>
                          <th className="py-2.5 px-3 text-right">Distance (KM)</th>
                          <th className="py-2.5 px-3 text-right">Est. Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {legs.map((leg, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-medium text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 text-slate-800 font-medium">{leg.description}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-700">{leg.distanceKm} km</td>
                            <td className="py-2 px-3 text-right text-slate-500">{leg.durationMin || Math.round(leg.distanceKm * 1.3)} mins</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                          <td colSpan="2" className="py-2.5 px-3 text-right">Total Round-Trip Distance:</td>
                          <td className="py-2.5 px-3 text-right text-blue-700 font-extrabold">{Number(claim.total_distance_km || 0).toFixed(2)} km</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {legs.reduce((acc, l) => acc + (l.durationMin || 0), 0)} mins
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic p-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    Route legs will be displayed upon running the automation.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Trip Route Map */}
          {activeTab === 'map' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Verified GPS road route (Home ➔ Stops ➔ Home):</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Total {Number(claim.total_distance_km || 0).toFixed(1)} KM
                </span>
              </div>
              <RouteMap
                home={{ name: claim.home_location, lat: claim.home_lat, lng: claim.home_lng }}
                stops={claim.stops}
                polyline={report?.route?.polyline || []}
                height="400px"
              />
            </div>
          )}

          {/* TAB 3: Receipt Attachment */}
          {activeTab === 'receipt' && (
            <div className="space-y-4">
              {claim.receipt_url ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="font-semibold text-slate-700">{claim.receipt_name || 'Gas Receipt Attachment'}</span>
                    <a
                      href={claim.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Open Full Size <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="max-h-[420px] overflow-auto border border-slate-200 rounded-lg p-2 bg-slate-100 flex items-center justify-center">
                    <img
                      src={claim.receipt_url}
                      alt="Receipt Attachment"
                      className="max-h-[380px] object-contain rounded-md shadow-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No physical receipt file was attached with this claim.</p>
                  <p className="text-xs text-slate-400 mt-1">Verification can proceed via GPS road routing automation.</p>
                </div>
              )}
            </div>
          )}

          {/* Admin Decision Action Box */}
          <div className="bg-white rounded-xl border-2 border-blue-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Admin Decision & Automated Email Revert
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Recipient: <strong>{claim.employee_email}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Final Approved Amount ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">$</span>
                  <input
                    type="number"
                    step="any"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setApprovedAmount(calculated)}
                    className="text-[11px] text-blue-600 hover:underline font-medium"
                  >
                    Set to System Calculated (${calculated.toFixed(2)})
                  </button>
                  <span className="text-slate-300">&bull;</span>
                  <button
                    type="button"
                    onClick={() => setApprovedAmount(claimed)}
                    className="text-[11px] text-slate-500 hover:underline"
                  >
                    Set to User Claimed
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Admin Remarks / Policy Note for Email
                </label>
                <textarea
                  rows="2"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Approved as per 30 km/gallon company fuel policy."
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleRejectClick}
                disabled={actionInProgress}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 text-red-600" />
                Reject Claim & Send Email
              </button>

              <button
                type="button"
                onClick={handleApproveClick}
                disabled={actionInProgress}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {actionInProgress ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>Approve Claim & Dispatch Revert Email (${Number(approvedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
