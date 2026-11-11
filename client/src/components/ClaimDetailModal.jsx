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
  UtensilsCrossed,
  Hotel,
  ShieldCheck,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  MessageSquare
} from 'lucide-react';
import RouteMap from './RouteMap';

export default function ClaimDetailModal({ 
  claim, 
  onClose, 
  onRunAutomation, 
  onApprove, 
  onReject,
  onVerifySurveillance,
  onVerifyHotel,
  onViewExpenseReport,
  loading 
}) {
  if (!claim) return null;

  const isFood = (claim.expense_type || '').toLowerCase() === 'food';
  const claimed = Number(claim.claimed_amount) || 0;
  const calculated = Number(claim.calculated_amount) || 0;
  const variance = claimed - calculated;
  const isOverClaimed = variance > 0;

  const [approvedAmount, setApprovedAmount] = useState(
    claim.approved_amount || calculated || claimed || 0
  );

  // Basic Predefined Comments & Others
  const defaultCommentTemplate = isFood 
    ? 'Approved in accordance with verified hotel night-stay authorization. Tips excluded.'
    : 'Approved as per standard 30.0 KM/Gallon fuel policy & surveillance camera verification.';

  const standardCommentOptions = isFood ? [
    { id: 'hotel_verified', label: 'Hotel Night-Stay Authorized', text: 'Approved in accordance with verified hotel night-stay authorization. Tips excluded.' },
    { id: 'tip_adjusted', label: 'Tip Deducted Adjustment', text: 'Approved with non-reimbursable tips deducted as per corporate food reimbursement policy.' },
    { id: 'daily_capped', label: 'Daily Cut-off Capped', text: 'Approved subject to standard $25.00/day policy cut-off limit.' },
    { id: 'others', label: 'Others (Custom Comment)', text: '' }
  ] : [
    { id: 'policy_standard', label: 'Standard 30 KM/Gal Policy', text: 'Approved as per standard 30.0 KM/Gallon corporate fuel efficiency limit.' },
    { id: 'attendance_verified', label: 'Surveillance Attendance Verified', text: 'Verified against surveillance camera footage & attendance records; working presence confirmed.' },
    { id: 'weighted_rate', label: 'Weighted Average Fuel Rate', text: 'Approved with fuel rate dynamically computed from receipt weighted average.' },
    { id: 'others', label: 'Others (Custom Comment)', text: '' }
  ];

  const [selectedCommentOption, setSelectedCommentOption] = useState(
    claim.admin_comment_type || standardCommentOptions[0].id
  );
  const [adminNotes, setAdminNotes] = useState(
    claim.admin_notes || standardCommentOptions[0].text
  );

  // Team Verification Forms
  const [surveillanceNotes, setSurveillanceNotes] = useState(
    claim.surveillance_notes || 'Attendance and branch presence confirmed on camera footage.'
  );
  const [hotelNotes, setHotelNotes] = useState(
    claim.hotel_notes || 'Authorized hotel room booking confirmed for overnight assignment.'
  );

  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'map' | 'receipts'
  const [actionInProgress, setActionInProgress] = useState(false);

  const report = claim.automation_report || null;
  const legs = claim.route_legs || [];
  const receipts = Array.isArray(claim.receipts) ? claim.receipts : [];

  const fuelGallons = Number(claim.fuel_liters || (Number(claim.total_distance_km || 0) / 30)).toFixed(2);
  const gasPrice = Number(claim.weighted_avg_fuel_rate || claim.petrol_rate_pkr || 3.50).toFixed(2);

  // Handle Comment Option Selection
  const handleCommentOptionChange = (optionId) => {
    setSelectedCommentOption(optionId);
    const found = standardCommentOptions.find(o => o.id === optionId);
    if (found && found.text) {
      setAdminNotes(found.text);
    } else if (optionId === 'others') {
      if (adminNotes === standardCommentOptions[0].text) {
        setAdminNotes('');
      }
    }
  };

  const handleApproveClick = async () => {
    setActionInProgress(true);
    try {
      await onApprove(claim.id, approvedAmount, adminNotes, selectedCommentOption);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRejectClick = async () => {
    setActionInProgress(true);
    try {
      await onReject(claim.id, adminNotes, selectedCommentOption);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSurveillanceVerifyClick = async (status) => {
    setActionInProgress(true);
    try {
      if (onVerifySurveillance) {
        await onVerifySurveillance(claim.id, status, surveillanceNotes);
      }
    } finally {
      setActionInProgress(false);
    }
  };

  const handleHotelVerifyClick = async (status) => {
    setActionInProgress(true);
    try {
      if (onVerifyHotel) {
        await onVerifyHotel(claim.id, status, hotelNotes);
      }
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
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-black text-sm shadow-xs ${
              isFood ? 'bg-emerald-600' : 'bg-sky-600'
            }`}>
              {isFood ? 'FOOD' : 'FUEL'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">
                  Claim #{claim.id}
                </h2>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
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
                Submitted by <strong>{claim.employee_name}</strong> ({claim.employee_id}) &bull; Date Range: {claim.date_from} ➔ {claim.date_to}
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

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-4 bg-white text-xs font-bold">
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Audit & Calculations
          </button>
          
          {!isFood && (
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
          )}

          <button
            onClick={() => setActiveTab('receipts')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'receipts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Receipts ({receipts.length || (claim.receipt_url ? 1 : 0)})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Top Comparison Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Claimed */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                User Claimed Gross
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ${claimed.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Submitted by employee
              </span>
            </div>

            {/* 2. System Calculated */}
            <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                System Allowable Ceiling
              </span>
              <div className="text-2xl font-black text-blue-800 mt-1">
                ${calculated.toFixed(2)}
              </div>
              <span className="text-[11px] text-blue-600 mt-0.5 block font-medium">
                {isFood ? 'Capped at daily limit & tip deducted' : 'Calculated @ 30 KM/Gal limit'}
              </span>
            </div>

            {/* 3. Variance / Savings */}
            <div className={`p-4 rounded-2xl border shadow-2xs ${
              isOverClaimed
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
            }`}>
              <span className="text-[11px] font-bold uppercase tracking-wider block flex items-center gap-1">
                {isOverClaimed ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                {isOverClaimed ? 'Over-Claimed Excess' : 'Policy Compliance'}
              </span>
              <div className="text-2xl font-black mt-1">
                {isOverClaimed ? `+$${variance.toFixed(2)}` : '100% Compliant'}
              </div>
              <span className="text-[11px] mt-0.5 block opacity-80">
                {isOverClaimed ? 'Policy ceiling safeguards excess payout' : 'Within allowable rate limits'}
              </span>
            </div>
          </div>

          {/* TAB 1: Automation Audit & Calculations */}
          {activeTab === 'audit' && (
            <div className="space-y-5">
              {/* Policy formula banner */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    {isFood ? <UtensilsCrossed className="w-5 h-5 text-emerald-600" /> : <Fuel className="w-5 h-5 text-sky-600" />}
                    <h3 className="font-extrabold text-slate-800 text-sm">
                      {isFood ? 'Food & Meal Audit Engine' : 'Route Mileage & Fuel Weighted Rate Engine'}
                    </h3>
                  </div>
                  <button
                    onClick={handleRunAutomationClick}
                    disabled={actionInProgress}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 text-blue-600" />
                    Re-run Audit Engine
                  </button>
                </div>

                {/* Audit Grid */}
                {isFood ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px] font-medium">Night Stay Lodging</span>
                      <span className="text-sm font-bold text-slate-800 truncate block">{claim.night_stay_location || 'Authorized Hotel'}</span>
                      <span className="text-[10px] text-slate-500 block">{claim.nights_count || 1} Night(s)</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px] font-medium">Tips Deducted</span>
                      <span className="text-base font-bold text-red-600">-${Number(claim.total_tip_deducted || 0).toFixed(2)}</span>
                      <span className="text-[10px] text-red-500 block">Excluded by policy</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px] font-medium">Net Eligible Base</span>
                      <span className="text-base font-bold text-slate-800">${Number(claim.eligible_food_amount || claimed).toFixed(2)}</span>
                      <span className="text-[10px] text-slate-500 block">Gross minus tips</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px] font-medium">Policy Allowable</span>
                      <span className="text-base font-bold text-emerald-600">${calculated.toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-600 block font-medium">Capped at limit</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px] font-medium">Verified Round-Trip</span>
                      <span className="text-base font-bold text-slate-800">{Number(claim.total_distance_km || 0).toFixed(1)} KM</span>
                      <span className="text-[10px] text-slate-500 block">Origin ➔ Stops ➔ Return</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px] font-medium">Efficiency Policy</span>
                      <span className="text-base font-bold text-slate-800">30.0 KM / Gal</span>
                      <span className="text-[10px] text-slate-500 block">Standard ceiling</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px] font-medium">Fuel Needed</span>
                      <span className="text-base font-bold text-sky-700">{fuelGallons} Gallons</span>
                      <span className="text-[10px] text-slate-500 block">({claim.total_distance_km} ÷ 30)</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px] font-medium">Weighted Avg Rate</span>
                      <span className="text-base font-bold text-slate-800">${gasPrice} / Gal</span>
                      <span className="text-[10px] text-sky-600 block font-medium">From uploaded receipts</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Legs Table (For Fuel) */}
              {!isFood && legs.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
                    Leg-by-Leg Route Distances (Includes Home Origin & Return)
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Segment (From ➔ To)</th>
                          <th className="py-2 px-3 text-right">Distance (KM)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {legs.map((leg, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">{leg.description}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-700">{leg.distanceKm} km</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Trip Route Map (Fuel Only) */}
          {activeTab === 'map' && !isFood && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Verified GPS road route (Home ➔ Stops ➔ Home):</span>
                <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                  Total {Number(claim.total_distance_km || 0).toFixed(1)} KM
                </span>
              </div>
              <RouteMap
                home={{ name: claim.home_location, lat: claim.home_lat, lng: claim.home_lng }}
                stops={claim.stops}
                polyline={report?.route?.polyline || []}
                height="380px"
              />
            </div>
          )}

          {/* TAB 3: Receipts Attachments */}
          {activeTab === 'receipts' && (
            <div className="space-y-4">
              {receipts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {receipts.map((rec, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Receipt #{i + 1}</span>
                        {rec.receipt_url && (
                          <a
                            href={rec.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            Open Full <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Receipt Meta */}
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        {!isFood && rec.gallons && (
                          <div>Gallons: <strong>{rec.gallons} Gal</strong> @ ${rec.rate}/gal</div>
                        )}
                        {isFood && (
                          <div>Meal: <strong>{rec.mealType || 'Meal'}</strong> &bull; Bill: ${rec.food_bill_amount || rec.amount} &bull; Tip: -${rec.tip_amount || 0}</div>
                        )}
                      </div>

                      {/* Thumbnail */}
                      {rec.receipt_url && (
                        <div className="h-44 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                          <img
                            src={rec.receipt_url}
                            alt="Receipt"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : claim.receipt_url ? (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{claim.receipt_name || 'Primary Gas Receipt'}</span>
                    <a href={claim.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                      Open Full <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <img src={claim.receipt_url} alt="Receipt" className="max-h-72 object-contain mx-auto rounded-lg border border-slate-200" />
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 text-xs">
                  No receipt files attached with this claim.
                </div>
              )}
            </div>
          )}

          {/* ================= TEAM VERIFICATION ACTIONS (BEFORE ADMIN APPROVAL) ================= */}
          <div className="bg-white rounded-2xl border-2 border-purple-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
              <div className="text-xs font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-2">
                {isFood ? <Hotel className="w-4 h-4 text-purple-600" /> : <ShieldCheck className="w-4 h-4 text-purple-600" />}
                Step 1: {isFood ? 'Hotel Booking Team Verification' : 'Surveillance Team Attendance Check'}
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                (isFood ? claim.hotel_verification_status : claim.surveillance_status) === 'verified'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {(isFood ? claim.hotel_verification_status : claim.surveillance_status) || 'Pending Review'}
              </span>
            </div>

            {isFood ? (
              /* Hotel Verification Panel */
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 text-xs">
                  Verify whether <strong>{claim.employee_name}</strong> had an authorized company hotel booking for <strong>{claim.night_stay_location || 'Lodging'}</strong> during <strong>{claim.date_from} ➔ {claim.date_to}</strong>.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Hotel Verification Notes / Booking Reference
                  </label>
                  <input
                    type="text"
                    value={hotelNotes}
                    onChange={(e) => setHotelNotes(e.target.value)}
                    placeholder="e.g. Booking ref #HTL-948 confirmed for 1 night in Milwaukee."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleHotelVerifyClick('verified')}
                    disabled={actionInProgress}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-200" />
                    <span>Confirm Hotel Night-Stay Verified</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHotelVerifyClick('rejected')}
                    disabled={actionInProgress}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Flag / Reject (No Booking Record)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Surveillance Verification Panel */
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 text-xs">
                  Review security camera recordings and biometric attendance to confirm that <strong>{claim.employee_name}</strong> was physically present and on-duty on <strong>{claim.date_from} ➔ {claim.date_to}</strong>.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Surveillance Audit Remarks / Camera Footage Findings
                  </label>
                  <input
                    type="text"
                    value={surveillanceNotes}
                    onChange={(e) => setSurveillanceNotes(e.target.value)}
                    placeholder="e.g. Camera footage reviewed: employee on site at branch."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSurveillanceVerifyClick('verified')}
                    disabled={actionInProgress}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-200" />
                    <span>Confirm Attendance Verified (Camera Footage)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSurveillanceVerifyClick('rejected')}
                    disabled={actionInProgress}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Flag Discrepancy (Absent from Camera)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ================= FINAL ADMIN DECISION & COMMENTS SYSTEM ================= */}
          <div className="bg-white rounded-2xl border-2 border-emerald-300 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Step 2: Admin Final Decision & Approval Comments
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Recipient: <strong>{claim.employee_email}</strong>
              </span>
            </div>

            {/* Approved Amount Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Final Approved Reimbursement Amount ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex gap-2 mt-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setApprovedAmount(calculated)}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Match System Allowable (${calculated.toFixed(2)})
                  </button>
                  <span className="text-slate-300">&bull;</span>
                  <button
                    type="button"
                    onClick={() => setApprovedAmount(claimed)}
                    className="text-slate-500 hover:underline"
                  >
                    Match User Claimed (${claimed.toFixed(2)})
                  </button>
                </div>
              </div>

              {/* Standard Basic Comments Radio Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Approval Comment Template
                </label>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {standardCommentOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleCommentOptionChange(opt.id)}
                      className={`p-2 rounded-xl border text-left font-semibold transition-all ${
                        selectedCommentOption === opt.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600/30 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Approval Comment Textarea (Prepopulated or Custom "Others") */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Final Approval Remarks / Policy Note (Included in Email & Card)</span>
                {selectedCommentOption === 'others' && (
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full">Custom Comment Active</span>
                )}
              </label>
              <textarea
                rows="2"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter custom remarks or special operational approval comments..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800 font-medium"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleRejectClick}
                disabled={actionInProgress}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 text-red-600" />
                Reject Claim
              </button>

              <button
                type="button"
                onClick={handleApproveClick}
                disabled={actionInProgress}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {actionInProgress ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Final Approve & Send Notification (${Number(approvedAmount).toFixed(2)})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
