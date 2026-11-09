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
  ArrowRight
} from 'lucide-react';
import ClaimDetailModal from './ClaimDetailModal';

export default function AdminDashboard({
  claims = [],
  stats = {},
  petrolRate,
  onRefresh,
  onRunAutomation,
  onApprove,
  onReject
}) {
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter claims
  const filteredClaims = claims.filter(c => {
    const matchesSearch = 
      (c.employee_name && c.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.employee_id && c.employee_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.id && c.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.home_location && c.home_location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Claims */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Claims</span>
            <FileCheck2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{stats.totalCount || 0}</div>
          <span className="text-[11px] text-slate-400">Total submitted to date</span>
        </div>

        {/* Pending Review */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Action</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{stats.pendingCount || 0}</div>
          <span className="text-[11px] text-slate-400">Awaiting admin decision</span>
        </div>

        {/* Total Claimed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Claimed</span>
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800">
            ${Number(stats.totalClaimed || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400">Total requested by employees</span>
        </div>

        {/* System Approved / Allowable */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs bg-blue-50/30">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Policy Approved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700">
            ${Number(stats.totalApproved || stats.totalCalculated || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-blue-600 font-medium">At 30 KM / Gallon ceiling</span>
        </div>

        {/* Total Policy Savings */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/40">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Policy Savings</span>
            <TrendingDown className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">
            ${Number(stats.totalSavings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Excess claims prevented</span>
        </div>
      </div>

      {/* Claims Management Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50/50">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Employee Name, ID, Location, or Claim Ref..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider mr-1">Filter:</span>
            {['all', 'pending', 'processed', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Claims Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Claim ID & Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Journey Route (Home ➔ Stops ➔ Home)</th>
                <th className="py-3 px-4 text-right">Distance (KM)</th>
                <th className="py-3 px-4 text-right">User Claimed</th>
                <th className="py-3 px-4 text-right">System Allowable</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClaims.length > 0 ? (
                filteredClaims.map((claim) => {
                  const claimedVal = Number(claim.claimed_amount) || 0;
                  const calculatedVal = Number(claim.calculated_amount) || 0;
                  const isOverClaimed = claimedVal > calculatedVal && calculatedVal > 0;
                  const variance = claimedVal - calculatedVal;

                  const stopsCount = Array.isArray(claim.stops) ? claim.stops.length : 0;
                  const firstStop = Array.isArray(claim.stops) && claim.stops[0] ? (claim.stops[0].name || 'Stop 1') : '';

                  return (
                    <tr key={claim.id} className="hover:bg-blue-50/40 transition-colors group">
                      {/* Claim ID & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{claim.id}</div>
                        <div className="text-[11px] text-slate-400">{claim.travel_date}</div>
                        {claim.email_sent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 mt-0.5">
                            <Mail className="w-2.5 h-2.5" /> Email Sent
                          </span>
                        ) : null}
                      </td>

                      {/* Employee */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{claim.employee_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{claim.employee_id}</div>
                      </td>

                      {/* Journey Route */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 truncate">
                          <span className="font-medium text-emerald-700 truncate">{claim.home_location}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{firstStop}</span>
                          {stopsCount > 1 && (
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full shrink-0">
                              +{stopsCount - 1} more
                            </span>
                          )}
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-emerald-700 font-medium">Home</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Round-trip verified by automation
                        </div>
                      </td>

                      {/* Distance */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-slate-800">
                          {Number(claim.total_distance_km || 0).toFixed(1)} km
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {Number(claim.fuel_liters || (claim.total_distance_km / 30)).toFixed(1)} Gal @ 30km/gal
                        </div>
                      </td>

                      {/* Claimed Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-slate-800">
                          ${claimedVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* System Allowable */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-blue-700">
                          ${calculatedVal > 0 ? calculatedVal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : 'Pending'}
                        </div>
                        {isOverClaimed && (
                          <div className="text-[10px] text-amber-600 font-medium flex items-center justify-end gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Over by ${variance.toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          claim.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : claim.status === 'rejected'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {claim.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedClaim(claim)}
                            title="Audit & Review"
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Audit</span>
                          </button>

                          <button
                            onClick={() => onRunAutomation(claim.id)}
                            title="Run Distance & Fuel Automation"
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No expense claims found matching your criteria.</p>
                    <p className="text-xs text-slate-400 mt-1">Submit a new fuel claim from the User Portal to see it audited here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit & Decision Modal */}
      {selectedClaim && (
        <ClaimDetailModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
          onRunAutomation={async (id) => {
            const updated = await onRunAutomation(id);
            if (updated) setSelectedClaim(updated);
          }}
          onApprove={async (id, amount, notes) => {
            const res = await onApprove(id, amount, notes);
            if (res && res.claim) setSelectedClaim(res.claim);
          }}
          onReject={async (id, notes) => {
            const res = await onReject(id, notes);
            if (res && res.claim) setSelectedClaim(res.claim);
          }}
        />
      )}
    </div>
  );
}
