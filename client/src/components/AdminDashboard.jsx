import React, { useState } from 'react';
import { 
  FileCheck2, 
  Clock, 
  TrendingDown, 
  DollarSign, 
  Search, 
  Filter, 
  Eye, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  MapPin, 
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  Download,
  Fuel,
  UtensilsCrossed,
  ShieldCheck,
  Hotel,
  Kanban,
  TableProperties,
  MessageSquare,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import ClaimDetailModal from './ClaimDetailModal';

export default function AdminDashboard({
  claims = [],
  stats = {},
  petrolRate,
  onRefresh,
  onRunAutomation,
  onApprove,
  onReject,
  onVerifySurveillance,
  onVerifyHotel,
  onViewExpenseReport
}) {
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'fuel' | 'food'
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'

  // Filter claims
  const filteredClaims = claims.filter(c => {
    const matchesSearch = 
      (c.employee_name && c.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.employee_id && c.employee_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.id && c.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.home_location && c.home_location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.night_stay_location && c.night_stay_location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || c.expense_type === typeFilter;

    return matchesSearch && matchesType;
  });

  // Kanban Column Definitions
  const kanbanColumns = [
    {
      id: 'submitted',
      title: '1. New Submissions',
      color: 'border-slate-300 bg-slate-50/70',
      badgeColor: 'bg-slate-200 text-slate-800',
      description: 'Newly received claims',
      filterFn: (c) => c.status === 'submitted' || c.status === 'pending'
    },
    {
      id: 'under_verification',
      title: '2. Under Team Verification',
      color: 'border-purple-300 bg-purple-50/30',
      badgeColor: 'bg-purple-100 text-purple-800 border border-purple-200',
      description: 'Surveillance (Fuel) or Hotel Booking (Food)',
      filterFn: (c) => c.status === 'pending_surveillance' || c.status === 'pending_hotel_verification' || c.status === 'processed'
    },
    {
      id: 'verification_passed',
      title: '3. Verification Passed',
      color: 'border-blue-300 bg-blue-50/30',
      badgeColor: 'bg-blue-100 text-blue-800 border border-blue-200',
      description: 'Audit verified, ready for Admin approval',
      filterFn: (c) => c.status === 'verification_passed'
    },
    {
      id: 'approved',
      title: '4. Final Approved',
      color: 'border-emerald-300 bg-emerald-50/30',
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      description: 'Approved & email notification sent',
      filterFn: (c) => c.status === 'approved'
    },
    {
      id: 'rejected',
      title: '5. Flagged / Rejected',
      color: 'border-red-300 bg-red-50/30',
      badgeColor: 'bg-red-100 text-red-800 border border-red-200',
      description: 'Discrepancy or non-compliant',
      filterFn: (c) => c.status === 'rejected'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Claims */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Claims</span>
            <FileCheck2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">{stats.totalCount || claims.length || 0}</div>
          <span className="text-[11px] text-slate-400">Total in pipeline</span>
        </div>

        {/* Verification Pending */}
        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs bg-purple-50/20">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Audit Queue</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-purple-800">
            {claims.filter(c => ['pending_surveillance', 'pending_hotel_verification', 'submitted', 'pending'].includes(c.status)).length}
          </div>
          <span className="text-[11px] text-purple-600 font-medium">Surveillance / Hotel check</span>
        </div>

        {/* Ready for Final Approval */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ready to Approve</span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-800">
            {claims.filter(c => c.status === 'verification_passed').length}
          </div>
          <span className="text-[11px] text-blue-600 font-medium">Verified by teams</span>
        </div>

        {/* Gross Claimed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Claimed</span>
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">
            ${Number(stats.totalClaimed || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400">Total requested</span>
        </div>

        {/* Approved Payout */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs bg-emerald-50/30 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Approved Payout</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800">
            ${Number(stats.totalApproved || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Policy verified</span>
        </div>
      </div>

      {/* Main Toolbar & View Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Employee, ID, Reference, or Location..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter Pills & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${typeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('fuel')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${typeFilter === 'fuel' ? 'bg-sky-600 text-white shadow-2xs' : 'hover:text-slate-900'}`}
            >
              <Fuel className="w-3.5 h-3.5" /> Fuel
            </button>
            <button
              onClick={() => setTypeFilter('food')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${typeFilter === 'food' ? 'bg-emerald-600 text-white shadow-2xs' : 'hover:text-slate-900'}`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" /> Food
            </button>
          </div>

          {/* View Mode Toggle: Kanban vs Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${viewMode === 'kanban' ? 'bg-white text-blue-700 shadow-2xs' : 'hover:text-slate-900'}`}
              title="Kanban Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'hover:text-slate-900'}`}
              title="Table List View"
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= 1. KANBAN-STYLE BOARD VIEW ================= */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const columnClaims = filteredClaims.filter(col.filterFn);

            return (
              <div 
                key={col.id} 
                className={`rounded-2xl border-2 p-3.5 space-y-3 flex flex-col min-h-[550px] ${col.color}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-800 tracking-tight">
                      {col.title}
                    </h3>
                    <p className="text-[10px] text-slate-500">{col.description}</p>
                  </div>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${col.badgeColor}`}>
                    {columnClaims.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[750px] pr-0.5">
                  {columnClaims.length > 0 ? (
                    columnClaims.map((claim) => {
                      const isFood = (claim.expense_type || '').toLowerCase() === 'food';
                      const claimedVal = Number(claim.claimed_amount) || 0;
                      const calculatedVal = Number(claim.calculated_amount) || 0;

                      return (
                        <div
                          key={claim.id}
                          className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs hover:shadow-md transition-all space-y-2.5 text-xs group relative overflow-hidden"
                        >
                          {/* Top Tag & Expense Type */}
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-slate-800 text-[11px]">
                              {claim.id}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                              isFood 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-sky-100 text-sky-800 border border-sky-200'
                            }`}>
                              {isFood ? <UtensilsCrossed className="w-3 h-3" /> : <Fuel className="w-3 h-3" />}
                              {isFood ? 'Food Claim' : 'Fuel Claim'}
                            </span>
                          </div>

                          {/* Employee Name & Dates */}
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">
                              {claim.employee_name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {claim.employee_id} &bull; {claim.date_from} ➔ {claim.date_to}
                            </div>
                          </div>

                          {/* Location Display */}
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px] text-slate-700 flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate leading-tight font-medium">
                              {isFood 
                                ? (claim.night_stay_location || 'Night Stay Lodging')
                                : (claim.location_summary || claim.home_location || 'Trip Route')}
                            </span>
                          </div>

                          {/* Financials & Allowable */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Claimed</span>
                              <span className="font-extrabold text-slate-900">${claimedVal.toFixed(2)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-blue-600 block text-[10px]">Allowable Ceiling</span>
                              <span className="font-extrabold text-blue-700">
                                ${calculatedVal > 0 ? calculatedVal.toFixed(2) : claimedVal.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* PENDING REASON PILL */}
                          {claim.status !== 'approved' && (
                            <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/80 text-[10px] text-amber-900 font-medium flex items-start gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span className="leading-tight">
                                <strong>Pending Reason:</strong> {claim.pending_reason || (isFood ? 'Awaiting Hotel verification' : 'Awaiting Surveillance check')}
                              </span>
                            </div>
                          )}

                          {/* VERIFICATION NOTES (If Verified by Surveillance / Hotel) */}
                          {claim.surveillance_status === 'verified' && (
                            <div className="p-2 bg-sky-50 rounded-lg border border-sky-200 text-[10px] text-sky-900">
                              <div className="font-bold flex items-center gap-1 text-sky-800">
                                <ShieldCheck className="w-3 h-3 text-sky-600" />
                                Surveillance Attendance Verified
                              </div>
                              {claim.surveillance_notes && (
                                <p className="italic text-sky-700 mt-0.5">&ldquo;{claim.surveillance_notes}&rdquo;</p>
                              )}
                            </div>
                          )}

                          {claim.hotel_verification_status === 'verified' && (
                            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[10px] text-emerald-900">
                              <div className="font-bold flex items-center gap-1 text-emerald-800">
                                <Hotel className="w-3 h-3 text-emerald-600" />
                                Hotel Night-Stay Authorized
                              </div>
                              {claim.hotel_notes && (
                                <p className="italic text-emerald-700 mt-0.5">&ldquo;{claim.hotel_notes}&rdquo;</p>
                              )}
                            </div>
                          )}

                          {/* FINAL APPROVED COMMENTS (If Approved, as requested!) */}
                          {claim.status === 'approved' && (
                            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-300 text-[10px] text-emerald-950 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-emerald-800 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Approved: ${Number(claim.approved_amount || calculatedVal).toFixed(2)}
                                </span>
                              </div>
                              {claim.admin_notes && (
                                <div className="text-slate-700 italic bg-white/80 p-1.5 rounded-md border border-emerald-200 flex items-start gap-1">
                                  <MessageSquare className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>&ldquo;{claim.admin_notes}&rdquo;</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Card Actions */}
                          <div className="pt-2 flex items-center justify-between gap-2">
                            <button
                              onClick={() => setSelectedClaim(claim)}
                              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Audit & Review</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs">
                      <FileCheck2 className="w-6 h-6 mb-1 opacity-40" />
                      <span>No claims in this stage</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= 2. TABLE LIST VIEW ================= */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Claim ID & Category</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Location & Date Range</th>
                  <th className="py-3 px-4 text-right">Claimed</th>
                  <th className="py-3 px-4 text-right">Allowable Ceiling</th>
                  <th className="py-3 px-4 text-center">Status & Reason</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClaims.length > 0 ? (
                  filteredClaims.map((claim) => {
                    const isFood = (claim.expense_type || '').toLowerCase() === 'food';
                    const claimedVal = Number(claim.claimed_amount) || 0;
                    const calculatedVal = Number(claim.calculated_amount) || 0;

                    return (
                      <tr key={claim.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{claim.id}</div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full font-extrabold text-[10px] mt-0.5 ${
                            isFood ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            {isFood ? '🍔 Food' : '⛽ Fuel'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{claim.employee_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{claim.employee_id}</div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate">
                          <div className="font-medium text-slate-800 truncate">
                            {isFood ? claim.night_stay_location || 'Night Stay' : claim.location_summary || claim.home_location}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {claim.date_from} ➔ {claim.date_to}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                          ${claimedVal.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-blue-700">
                          ${calculatedVal > 0 ? calculatedVal.toFixed(2) : claimedVal.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center max-w-xs">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            claim.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : claim.status === 'rejected'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {claim.status}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">{claim.pending_reason}</p>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedClaim(claim)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 mx-auto shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Audit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No claims found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Claim Detail & Audit Modal with Multi-team Verifications & Admin Approval Comments */}
      {selectedClaim && (
        <ClaimDetailModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
          onRunAutomation={onRunAutomation}
          onApprove={async (id, amount, comments, commentType) => {
            const res = await onApprove(id, amount, comments, commentType);
            if (res) setSelectedClaim(null);
          }}
          onReject={async (id, comments, commentType) => {
            const res = await onReject(id, comments, commentType);
            if (res) setSelectedClaim(null);
          }}
          onVerifySurveillance={async (id, status, notes) => {
            if (onVerifySurveillance) {
              const res = await onVerifySurveillance(id, status, notes);
              if (res) setSelectedClaim(null);
            }
          }}
          onVerifyHotel={async (id, status, notes) => {
            if (onVerifyHotel) {
              const res = await onVerifyHotel(id, status, notes);
              if (res) setSelectedClaim(null);
            }
          }}
          onViewExpenseReport={onViewExpenseReport}
        />
      )}
    </div>
  );
}
