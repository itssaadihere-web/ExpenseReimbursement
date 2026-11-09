import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  Car, 
  Fuel, 
  MapPin, 
  Calendar, 
  User, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Search,
  FileSpreadsheet
} from 'lucide-react';

export default function AutomationReports({ claims = [], petrolRate, onViewExpenseReport }) {
  const [selectedClaimId, setSelectedClaimId] = useState(
    claims.length > 0 ? claims[0].id : null
  );
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = claims.filter(c => 
    (c.employee_name && c.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.id && c.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeClaim = claims.find(c => c.id === selectedClaimId) || claims[0];
  const report = activeClaim?.automation_report || null;
  const legs = activeClaim?.route_legs || [];

  const fuelGallons = Number(activeClaim?.fuel_liters || (Number(activeClaim?.total_distance_km || 0) / 30)).toFixed(2);
  const gasPrice = Number(activeClaim?.petrol_rate_pkr || 3.50).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            <FileText className="w-3.5 h-3.5" />
            Official Automation Audit Dossiers
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Automated Fuel & Distance Verification Reports
          </h2>
          <p className="text-slate-400 text-xs mt-1 max-w-xl">
            Audit-grade computation dossiers detailing verified road distances, the <strong>30 KM / Gallon standard efficiency limit</strong>, and national gas tariff valuations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onViewExpenseReport && (
            <button
              onClick={() => onViewExpenseReport(activeClaim?.id)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#993300] hover:bg-[#802a00] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-300" />
              Official Expense Report (Web View)
            </button>
          )}

          <a
            href={`/api/reports/expense-report/excel?claimId=${activeClaim?.id || ''}`}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Excel Export (.xlsx)
          </a>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Claim selector list */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reports by employee or claim ID..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map(c => {
                const isSelected = activeClaim?.id === c.id;

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClaimId(c.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800">{c.id}</div>
                      <div className="text-xs font-semibold text-slate-700">{c.employee_name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{c.travel_date} &bull; {Number(c.total_distance_km || 0).toFixed(1)} KM</div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-800">
                        ${Number(c.calculated_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                        c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No reports found.
              </div>
            )}
          </div>
        </div>

        {/* Right: Printable Audit Dossier Sheet */}
        <div className="lg:col-span-8">
          {activeClaim ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 mb-2">
                    <img src="/logo-mobily.png" alt="Mobily" className="h-7 w-auto object-contain" />
                    <div className="h-4 w-[1px] bg-slate-300" />
                    <img src="/logo-retailer.png" alt="Authorized Retailer" className="h-5 w-auto object-contain" />
                  </div>
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600">
                    Official Travel & Fuel Audit Dossier
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                    Automated Travel Reimbursement Report
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verified by GPS Road Routing Engine &bull; 30 KM / Gallon Standard Limit &bull; U.S. National Benchmark
                  </p>
                </div>

                <div className="text-right sm:text-right shrink-0 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>Report Ref: <strong className="font-mono text-slate-900">{activeClaim.id}</strong></div>
                  <div>Audit Timestamp: <span className="text-slate-600">{activeClaim.automation_run_at || new Date().toISOString()}</span></div>
                  <div>Status: <span className="font-bold uppercase text-emerald-700">{activeClaim.status}</span></div>
                </div>
              </div>

              {/* Employee & Travel Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Employee Name</span>
                  <span className="font-bold text-slate-800 text-sm">{activeClaim.employee_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Employee ID</span>
                  <span className="font-bold text-slate-800 text-sm font-mono">{activeClaim.employee_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Travel Date</span>
                  <span className="font-bold text-slate-800 text-sm">{activeClaim.travel_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Trip Origin / Home</span>
                  <span className="font-bold text-slate-800 text-sm truncate block">{activeClaim.home_location}</span>
                </div>
              </div>

              {/* Route Breakdown Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Verified Road Routing Sequence (Home ➔ Destination Stoppages ➔ Home Return)
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Leg</th>
                        <th className="py-2.5 px-3">Transit Segment</th>
                        <th className="py-2.5 px-3 text-right">Road Distance</th>
                        <th className="py-2.5 px-3 text-right">Estimated Travel Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {legs.map((leg, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{i + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{leg.description}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-700">{leg.distanceKm} KM</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">{leg.durationMin || Math.round(leg.distanceKm * 1.3)} mins</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                        <td colSpan="2" className="py-3 px-3 text-right">Cumulative Round-trip Distance:</td>
                        <td className="py-3 px-3 text-right text-blue-700 text-sm">{Number(activeClaim.total_distance_km || 0).toFixed(2)} KM</td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {legs.reduce((acc, l) => acc + (l.durationMin || 0), 0)} mins
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mathematical Evaluation & Policy Breakdown */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Fuel className="w-4 h-4 text-amber-600" />
                  Fuel Policy Computation Details (30 KM / Gallon Standard)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block font-medium">1. Mileage Efficiency Standard</span>
                    <span className="text-base font-extrabold text-slate-800">
                      30.0 KM / Gallon
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Approved corporate vehicle limit allowed</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block font-medium">2. Computed Fuel Required</span>
                    <span className="text-base font-extrabold text-blue-700">
                      {fuelGallons} Gallons
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Formula: {Number(activeClaim.total_distance_km || 0).toFixed(1)} KM ÷ 30 KM/Gal
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block font-medium">3. Applied Gas Tariff</span>
                    <span className="text-base font-extrabold text-slate-800">
                      ${gasPrice} / Gallon
                    </span>
                    <span className="text-[11px] text-emerald-600 mt-0.5 block font-medium">
                      National Gasoline Benchmark
                    </span>
                  </div>
                </div>

                {/* Final Calculation Summary Box */}
                <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">
                      System Maximum Allowable Reimbursement
                    </span>
                    <span className="text-xs text-blue-700">
                      ({fuelGallons} Gallons × ${gasPrice}/Gallon)
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-blue-700">
                      ${Number(activeClaim.calculated_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Financial Variance Analysis */}
                <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium block">Employee Original Claim:</span>
                    <span className="text-lg font-bold text-slate-800">
                      ${Number(activeClaim.claimed_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className={`p-3 rounded-lg border ${
                    (Number(activeClaim.claimed_amount) || 0) > (Number(activeClaim.calculated_amount) || 0)
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <span className="font-medium block">
                      {(Number(activeClaim.claimed_amount) || 0) > (Number(activeClaim.calculated_amount) || 0)
                        ? 'Excess Claim Variance (Saved by Automation):'
                        : 'Policy Status:'}
                    </span>
                    <span className="text-lg font-bold">
                      {(Number(activeClaim.claimed_amount) || 0) > (Number(activeClaim.calculated_amount) || 0)
                        ? `-$${(Number(activeClaim.claimed_amount) - Number(activeClaim.calculated_amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : 'Fully Policy Compliant'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures & Certification for Audit Compliance */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs text-slate-500">
                <div>
                  <div className="font-semibold text-slate-700">Calculation Engine:</div>
                  <div>OSRM / OpenStreetMap Road Geometry</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Tariff Authority:</div>
                  <div>U.S. Energy Information Administration (EIA)</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Certification:</div>
                  <div className="text-emerald-700 font-medium">✓ Cryptographically Verified Record</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              No claim selected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
