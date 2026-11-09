import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles,
  Calendar,
  User,
  DollarSign,
  ChevronDown,
  Layers,
  ArrowRight
} from 'lucide-react';
import { safeFetch } from '../utils/api';

export default function ExpenseReportWebView({
  claims = [],
  petrolRate = 3.50,
  initialClaimId = null,
  onOpenClaimModal = null
}) {
  const [selectedClaimId, setSelectedClaimId] = useState(initialClaimId || (claims.length > 0 ? claims[0].id : ''));
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Default state matching the Excel template
  const [timeFrame, setTimeFrame] = useState({
    from: '10.07.2026',
    to: '10.07.2026'
  });

  const [employee, setEmployee] = useState({
    name: 'Sarah Jenkins',
    id: 'EMP-1049',
    designation: 'Senior Territory Sales Representative',
    bankAccount: '•••• •••• 4829',
    bankRouting: '071000288',
    homeLocation: 'Naperville, Chicago, IL',
    homeStore: 'STR-CHI-102',
    homeMarket: 'Illinois / Chicago North',
    coveredLocation: 'Milwaukee Downtown Branch, WI',
    coveredStore: 'STR-MKE-405',
    coveredMarket: 'Wisconsin Metro'
  });

  const [items, setItems] = useState([
    { id: '1', date: '10/11/2026', vendor: 'Shell Oil', description: 'Store Visit - Chicago to Milwaukee', market: 'Milwaukee Central', fuel: 18.45, meals: 15.00, supplies: 0, parking: 12.00, misc: 0, tip: 0, adjustedAmount: 45.45, receiptVerification: 'Verified', miles: 116.0 },
    { id: '2', date: '10/11/2026', vendor: 'Mobil Gas', description: 'Client Meeting - Madison Route', market: 'Madison West', fuel: 22.10, meals: 0, supplies: 0, parking: 0, misc: 0, tip: 0, adjustedAmount: 22.10, receiptVerification: 'Verified', miles: 139.0 },
    { id: '3', date: '10/11/2026', vendor: 'Office Depot', description: 'Field POS Forms & Printer Paper', market: 'Milwaukee North', fuel: 0, meals: 0, supplies: 24.50, parking: 0, misc: 0, tip: 0, adjustedAmount: 24.50, receiptVerification: 'Verified', miles: 0 },
    { id: '4', date: '10/09/2026', vendor: 'BP Fuel', description: 'Weekly Regional Route Leg 1', market: 'Racine South', fuel: 16.50, meals: 0, supplies: 0, parking: 5.00, misc: 0, tip: 0, adjustedAmount: 21.50, receiptVerification: 'Verified', miles: 103.5 },
    { id: '5', date: '10/07/2026', vendor: 'Chevron', description: 'Territory Audit Inspection', market: 'Kenosha Branch', fuel: 14.80, meals: 12.50, supplies: 0, parking: 0, misc: 0, tip: 0, adjustedAmount: 27.30, receiptVerification: 'Verified', miles: 93.0 },
    { id: '6', date: '10/06/2026', vendor: 'Speedway', description: 'Inventory Delivery Support', market: 'Rockford Center', fuel: 19.20, meals: 0, supplies: 0, parking: 0, misc: 0, tip: 0, adjustedAmount: 19.20, receiptVerification: 'Verified', miles: 120.5 }
  ]);

  const [approval, setApproval] = useState({
    approvedBy: 'Johnathan Davis (Director of Operations)',
    date: '11/10/2026'
  });

  const [config, setConfig] = useState({
    mpg: 22,
    gasRate: petrolRate || 3.50
  });

  // Load report data when selectedClaimId changes
  const fetchReportData = async (claimId) => {
    setLoading(true);
    try {
      const url = claimId ? `/api/reports/expense-report/data?claimId=${claimId}` : '/api/reports/expense-report/data';
      const res = await safeFetch(url);
      if (res.success && res.report) {
        const rep = res.report;
        if (rep.timeFrame) setTimeFrame(rep.timeFrame);
        if (rep.employee) setEmployee(rep.employee);
        if (rep.items) setItems(rep.items);
        if (rep.approval) setApproval(rep.approval);
        if (rep.config) setConfig(rep.config);
      }
    } catch (err) {
      console.warn('Could not fetch report data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClaimId) {
      fetchReportData(selectedClaimId);
    } else if (claims.length > 0) {
      setSelectedClaimId(claims[0].id);
      fetchReportData(claims[0].id);
    }
  }, [selectedClaimId]);

  // Real-time calculations for a row
  const calculateRowValues = (row) => {
    const miles = Number(row.miles || 0);
    const mpg = Number(config.mpg || 22);
    const gasRate = Number(config.gasRate || 3.50);

    const gallons = miles > 0 ? Number((miles / mpg).toFixed(2)) : 0;
    const computedFuel = miles > 0 ? Number((gallons * gasRate).toFixed(2)) : Number(row.fuel || 0);
    const fuel = row.fuel !== undefined && row.fuel !== null && Number(row.fuel) > 0 ? Number(row.fuel) : computedFuel;

    const meals = Number(row.meals || 0);
    const supplies = Number(row.supplies || 0);
    const parking = Number(row.parking || 0);
    const misc = Number(row.misc || 0);
    const tip = Number(row.tip || 0);

    const total = fuel + meals + supplies + parking + misc + tip;
    const adjustedAmount = row.adjustedAmount !== undefined && row.adjustedAmount !== null && row.adjustedAmount !== ''
      ? Number(row.adjustedAmount)
      : total;

    return {
      ...row,
      fuel,
      gallonsPer22Miles: gallons,
      ratePerGallon: gasRate,
      total,
      adjustedAmount
    };
  };

  // Live item updater
  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      const updated = { ...copy[index], [field]: value };
      copy[index] = calculateRowValues(updated);
      return copy;
    });
  };

  const handleAddRow = () => {
    const newRow = calculateRowValues({
      id: `row-${Date.now()}`,
      date: timeFrame.from || '10/11/2026',
      vendor: '',
      description: '',
      market: '',
      fuel: 0,
      meals: 0,
      supplies: 0,
      parking: 0,
      misc: 0,
      tip: 0,
      adjustedAmount: 0,
      receiptVerification: '-',
      miles: 0
    });
    setItems(prev => [...prev, newRow]);
  };

  const handleRemoveRow = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Grand Totals Computation
  const totals = items.reduce(
    (acc, row) => {
      const fuel = Number(row.fuel || 0);
      const meals = Number(row.meals || 0);
      const supplies = Number(row.supplies || 0);
      const parking = Number(row.parking || 0);
      const misc = Number(row.misc || 0);
      const tip = Number(row.tip || 0);
      const total = Number(row.total || (fuel + meals + supplies + parking + misc + tip));
      const adjusted = Number(row.adjustedAmount !== undefined ? row.adjustedAmount : total);
      const miles = Number(row.miles || 0);
      const gallons = Number(row.gallonsPer22Miles || (miles / config.mpg));
      const gasCost = Number(gallons * config.gasRate);

      return {
        fuel: acc.fuel + fuel,
        meals: acc.meals + meals,
        supplies: acc.supplies + supplies,
        parking: acc.parking + parking,
        misc: acc.misc + misc,
        tip: acc.tip + tip,
        total: acc.total + total,
        adjusted: acc.adjusted + adjusted,
        miles: acc.miles + miles,
        gallons: acc.gallons + gallons,
        gasCost: acc.gasCost + gasCost
      };
    },
    {
      fuel: 0,
      meals: 0,
      supplies: 0,
      parking: 0,
      misc: 0,
      tip: 0,
      total: 0,
      adjusted: 0,
      miles: 0,
      gallons: 0,
      gasCost: 0
    }
  );

  // Currency Formatter matching "$ - " or "$18.45"
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    if (num === 0) return '$ - ';
    return `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (val) => {
    const num = Number(val || 0);
    if (num === 0) return '$ - ';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Excel Export Handler
  const handleExportExcel = async () => {
    setDownloading(true);
    try {
      const payload = {
        timeFrame,
        employee,
        items,
        approval,
        config
      };

      const response = await fetch('/api/reports/expense-report/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Export failed with HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (employee.name || 'Expense_Report').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Expense_Report_${safeName}_${timeFrame.from || '2026'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setToastMsg('Excel report (.xlsx) downloaded successfully!');
      setTimeout(() => setToastMsg(''), 4000);
    } catch (err) {
      alert('Failed to export Excel report: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action / Control Header Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#993300] text-white flex items-center justify-center font-bold shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Official Expense Report
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-[#993300] border border-amber-300">
                  Excel & Web View
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                1:1 Template Rendering with Real Formula Sums, Dynamic Cell Edits, and Instant .xlsx Download
              </p>
            </div>
          </div>
        </div>

        {/* Claim Selector & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Select Claim Dropdown */}
          {claims.length > 0 && (
            <div className="relative">
              <select
                value={selectedClaimId}
                onChange={(e) => setSelectedClaimId(e.target.value)}
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-xl px-3 py-2.5 pr-8 appearance-none focus:outline-hidden focus:ring-2 focus:ring-[#993300] transition-colors"
              >
                {claims.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.employee_name} ({c.travel_date})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
            </div>
          )}

          {/* Edit Mode Toggle */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
              isEditing 
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
            title="Toggle inline cell editing"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Editing Active' : 'Edit Cells'}</span>
          </button>

          {/* Add Row Button (in edit mode) */}
          {isEditing && (
            <button
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors border border-slate-300"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              <span>Add Row</span>
            </button>
          )}

          {/* Reset button */}
          <button
            onClick={() => fetchReportData(selectedClaimId)}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-300 transition-colors"
            title="Reset to verified data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          {/* Export to Excel (.xlsx) */}
          <button
            onClick={handleExportExcel}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#993300] hover:bg-[#802a00] active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
            <span>{downloading ? 'Generating .xlsx...' : 'Export to Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-md text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* SPREADSHEET PAPER CONTAINER (Pixel-faithful to the uploaded image) */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-4 sm:p-8 overflow-x-auto print:border-none print:shadow-none print:p-0">
        <div className="min-w-[1240px] font-sans text-slate-800 select-text">
          
          {/* TOP SECTION: For Office Use Only, Time Frame, and Large Title */}
          <div className="grid grid-cols-12 items-start mb-4">
            {/* Top Left: Time Frame */}
            <div className="col-span-4 space-y-1">
              {/* For Office Use Only */}
              <div className="inline-block bg-[#FCE4D6] px-2 py-0.5 text-[10px] italic text-[#7F6000] border border-[#FADBD8] rounded-xs font-serif">
                For Office Use Only
              </div>

              <div className="pt-1">
                <span className="text-xs font-bold text-slate-900 tracking-tight block mb-1">
                  Time Frame:
                </span>

                <div className="space-y-1">
                  {/* From */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 w-10 text-right">From</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={timeFrame.from}
                        onChange={(e) => setTimeFrame({ ...timeFrame, from: e.target.value })}
                        className="bg-[#FFFF99] text-xs font-bold text-slate-900 border border-black px-3 py-0.5 text-center w-28 rounded-none shadow-2xs focus:outline-hidden"
                      />
                    ) : (
                      <div className="bg-[#FFFF99] text-xs font-bold text-slate-900 border border-black px-4 py-0.5 text-center min-w-[110px] shadow-2xs">
                        {timeFrame.from}
                      </div>
                    )}
                  </div>

                  {/* To */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 w-10 text-right">To</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={timeFrame.to}
                        onChange={(e) => setTimeFrame({ ...timeFrame, to: e.target.value })}
                        className="bg-[#FFFF99] text-xs font-bold text-slate-900 border border-black px-3 py-0.5 text-center w-28 rounded-none shadow-2xs focus:outline-hidden"
                      />
                    ) : (
                      <div className="bg-[#FFFF99] text-xs font-bold text-slate-900 border border-black px-4 py-0.5 text-center min-w-[110px] shadow-2xs">
                        {timeFrame.to}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Center: Large Title */}
            <div className="col-span-5 text-center pt-2">
              <h1 className="text-3xl font-bold tracking-tight text-[#A03B0D] font-sans">
                Expense report
              </h1>
            </div>

            {/* Top Right: Status Badge & Excel Indicator */}
            <div className="col-span-3 text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 font-mono">
                <span>MPG: <strong>{config.mpg}</strong></span>
                <span>&bull;</span>
                <span>Rate: <strong>${Number(config.gasRate).toFixed(2)}/Gal</strong></span>
              </div>
            </div>
          </div>

          {/* EMPLOYEE INFORMATION SECTION */}
          <div className="mt-4 mb-4">
            <h3 className="text-xs font-bold text-[#1E5631] uppercase tracking-wide mb-2">
              EMPLOYEE INFORMATION:
            </h3>

            {/* 3-Column Grid with Underlined Values */}
            <div className="grid grid-cols-12 gap-x-6 gap-y-1.5 text-xs text-slate-800">
              {/* Row 1 */}
              <div className="col-span-4 flex items-baseline gap-2">
                <span className="font-bold text-slate-800 shrink-0 min-w-[125px]">Name / Employee ID</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={`${employee.name} / ${employee.id}`} 
                    onChange={(e) => {
                      const [name, id] = e.target.value.split('/');
                      setEmployee({ ...employee, name: (name || '').trim(), id: (id || '').trim() });
                    }}
                    className="border-b border-black w-full px-1 py-0.5 font-bold focus:outline-hidden" 
                  />
                ) : (
                  <span className="border-b border-black w-full pb-0.5 font-bold truncate">
                    {employee.name} / {employee.id}
                  </span>
                )}
              </div>

              <div className="col-span-4 flex items-baseline gap-2">
                <span className="text-slate-800 shrink-0 min-w-[100px]">Home Location</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={employee.homeLocation} 
                    onChange={(e) => setEmployee({ ...employee, homeLocation: e.target.value })}
                    className="border-b border-black w-full px-1 py-0.5 focus:outline-hidden" 
                  />
                ) : (
                  <span className="border-b border-black w-full pb-0.5 truncate">
                    {employee.homeLocation}
                  </span>
                )}
              </div>

              <div className="col-span-4 flex items-baseline gap-2">
                <span className="text-slate-800 shrink-0 min-w-[110px]">Covered Location</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={employee.coveredLocation} 
                    onChange={(e) => setEmployee({ ...employee, coveredLocation: e.target.value })}
                    className="border-b border-black w-full px-1 py-0.5 focus:outline-hidden" 
                  />
                ) : (
                  <span className="border-b border-black w-full pb-0.5 truncate">
                    {employee.coveredLocation}
                  </span>
                )}
              </div>

              {/* Row 2 */}
              <div className="col-span-4 flex items-baseline gap-2">
                <span className="text-slate-800 shrink-0 min-w-[125px]">Designation</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={employee.designation} 
                    onChange={(e) => setEmployee({ ...employee, designation: e.target.value })}
                    className="border-b border-black w-full px-1 py-0.5 focus:outline-hidden" 
                  />
                ) : (
                  <span className="border-b border-black w-full pb-0.5 truncate">
                    {employee.designation}
                  </span>
                )}
              </div>

              <div className="col-span-4 flex items-baseline gap-2">
                <span className="text-slate-800 shrink-0 min-w-[100px]">Home Store/UID</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={employee.homeStore} 
                    onChange={(e) => setEmployee({ ...employee, homeStore: e.target.value })}
                    className="border-b border-black w-full px-1 py-0.5 focus:outline-hidden" 
                  />
                ) : (
                  <span className="border-b border-black w-full pb-0.5 truncate">
                    {employee.homeStore}
                  </span>
                )}
              </div>

              <div className="col-span-4 flex items-baseline gap-2">
                <span className="text-slate-800 shrink-0 min-w-[110px]">Covered Store/UID</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={employee.coveredStore} 
                    onChange={(e) => setEmployee({ ...employee, coveredStore: e.target.value })}
                    className="border-b border-black w-full px-1 py-0.5 focus:outline-hidden" 
                  />
                ) : (
                  <span className="border-b border-black w-full pb-0.5 truncate">
                    {employee.coveredStore}
                  </span>
                )}
              </div>

              {/* Row 3 */}
              <div className="col-span-4 flex items-baseline gap-2">
                <span className="text-slate-800 shrink-0 min-w-[125px]">Bank Account #</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={employee.bankAccount} 
                    onChange={(e) => setEmployee({ ...employee, bankAccount: e.target.value })}
                    className="border-b border-black w-full px-1 py-0.5 focus:outline-hidden font-mono" 
                  />
                ) : (
                  <span className="border-b border-black w-full pb-0.5 font-mono truncate">
                    {employee.bankAccount}
                  </span>
                )}
              </div>

              <div className="col-span-4 flex items-baseline gap-2">
                <span className="text-slate-800 shrink-0 min-w-[100px]">Home Market</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={employee.homeMarket} 
                    onChange={(e) => setEmployee({ ...employee, homeMarket: e.target.value })}
                    className="border-b border-black w-full px-1 py-0.5 focus:outline-hidden" 
                  />
                ) : (
                  <span className="border-b border-black w-full pb-0.5 truncate">
                    {employee.homeMarket}
                  </span>
                )}
              </div>

              <div className="col-span-4 flex items-baseline gap-2">
                <span className="text-slate-800 shrink-0 min-w-[110px]">Covered Market</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={employee.coveredMarket} 
                    onChange={(e) => setEmployee({ ...employee, coveredMarket: e.target.value })}
                    className="border-b border-black w-full px-1 py-0.5 focus:outline-hidden" 
                  />
                ) : (
                  <span className="border-b border-black w-full pb-0.5 truncate">
                    {employee.coveredMarket}
                  </span>
                )}
              </div>

              {/* Row 4 */}
              <div className="col-span-4 flex items-baseline gap-2">
                <span className="text-slate-800 shrink-0 min-w-[125px]">Bank Routing #</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={employee.bankRouting} 
                    onChange={(e) => setEmployee({ ...employee, bankRouting: e.target.value })}
                    className="border-b border-black w-full px-1 py-0.5 focus:outline-hidden font-mono" 
                  />
                ) : (
                  <span className="border-b border-black w-full pb-0.5 font-mono truncate">
                    {employee.bankRouting}
                  </span>
                )}
              </div>

              <div className="col-span-4 flex items-baseline gap-2">
                <span className="shrink-0 min-w-[100px]" />
                <span className="border-b border-black w-full pb-0.5" />
              </div>

              <div className="col-span-4 flex items-baseline gap-2">
                <span className="shrink-0 min-w-[110px]" />
                <span className="border-b border-black w-full pb-0.5" />
              </div>
            </div>
          </div>

          {/* MAIN DATA TABLE: 16 COLUMNS WITH BURNT ORANGE HEADER */}
          <div className="mt-5 border border-slate-400 overflow-hidden shadow-2xs">
            <table className="w-full text-xs border-collapse">
              {/* Burnt-Orange Header */}
              <thead>
                <tr className="bg-[#993300] text-white font-bold text-center border-b border-black">
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[95px]">Date</th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[120px]">Vendor</th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[190px]">Description</th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[120px]">Market</th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[75px]">Fuel</th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[75px]">Meals</th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[75px]">Supplies</th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[75px]">Parking</th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[75px]">Misc.</th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[65px]">TIP</th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[85px]">Total</th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[110px]">
                    Adjusted Amount to Pay
                  </th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[90px]">
                    Receipt Verification
                  </th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[75px]">Miles</th>
                  <th className="py-2.5 px-2 border-r border-amber-900 w-[95px]">
                    Gallons Per {config.mpg} Miles
                  </th>
                  <th className="py-2.5 px-2 w-[95px]">
                    ${Number(config.gasRate).toFixed(1)} Per Gallon
                  </th>
                  {isEditing && <th className="py-2.5 px-1 bg-amber-800 w-[35px] print:hidden">Del</th>}
                </tr>
              </thead>

              {/* Data Rows */}
              <tbody className="divide-y divide-slate-200">
                {items.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    {/* Date */}
                    <td className="py-1 px-2 border-r border-slate-300 text-center font-mono">
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.date || ''}
                          onChange={(e) => handleItemChange(idx, 'date', e.target.value)}
                          className="w-full text-center border border-slate-300 px-1 py-0.5 rounded-xs"
                        />
                      ) : (
                        row.date || ''
                      )}
                    </td>

                    {/* Vendor */}
                    <td className="py-1 px-2 border-r border-slate-300 text-left">
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.vendor || ''}
                          onChange={(e) => handleItemChange(idx, 'vendor', e.target.value)}
                          className="w-full border border-slate-300 px-1 py-0.5 rounded-xs"
                        />
                      ) : (
                        <span className="truncate block font-medium">{row.vendor || ''}</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-1 px-2 border-r border-slate-300 text-left">
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.description || ''}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full border border-slate-300 px-1 py-0.5 rounded-xs"
                        />
                      ) : (
                        <span className="truncate block">{row.description || ''}</span>
                      )}
                    </td>

                    {/* Market */}
                    <td className="py-1 px-2 border-r border-slate-300 text-left">
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.market || ''}
                          onChange={(e) => handleItemChange(idx, 'market', e.target.value)}
                          className="w-full border border-slate-300 px-1 py-0.5 rounded-xs"
                        />
                      ) : (
                        <span className="truncate block">{row.market || ''}</span>
                      )}
                    </td>

                    {/* Fuel */}
                    <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.fuel ?? ''}
                          onChange={(e) => handleItemChange(idx, 'fuel', parseFloat(e.target.value) || 0)}
                          className="w-full text-right border border-slate-300 px-1 py-0.5 rounded-xs"
                        />
                      ) : (
                        formatCurrency(row.fuel)
                      )}
                    </td>

                    {/* Meals */}
                    <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.meals ?? ''}
                          onChange={(e) => handleItemChange(idx, 'meals', parseFloat(e.target.value) || 0)}
                          className="w-full text-right border border-slate-300 px-1 py-0.5 rounded-xs"
                        />
                      ) : (
                        formatCurrency(row.meals)
                      )}
                    </td>

                    {/* Supplies */}
                    <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.supplies ?? ''}
                          onChange={(e) => handleItemChange(idx, 'supplies', parseFloat(e.target.value) || 0)}
                          className="w-full text-right border border-slate-300 px-1 py-0.5 rounded-xs"
                        />
                      ) : (
                        formatCurrency(row.supplies)
                      )}
                    </td>

                    {/* Parking */}
                    <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.parking ?? ''}
                          onChange={(e) => handleItemChange(idx, 'parking', parseFloat(e.target.value) || 0)}
                          className="w-full text-right border border-slate-300 px-1 py-0.5 rounded-xs"
                        />
                      ) : (
                        formatCurrency(row.parking)
                      )}
                    </td>

                    {/* Misc. */}
                    <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.misc ?? ''}
                          onChange={(e) => handleItemChange(idx, 'misc', parseFloat(e.target.value) || 0)}
                          className="w-full text-right border border-slate-300 px-1 py-0.5 rounded-xs"
                        />
                      ) : (
                        formatCurrency(row.misc)
                      )}
                    </td>

                    {/* TIP */}
                    <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.tip ?? ''}
                          onChange={(e) => handleItemChange(idx, 'tip', parseFloat(e.target.value) || 0)}
                          className="w-full text-right border border-slate-300 px-1 py-0.5 rounded-xs"
                        />
                      ) : (
                        formatCurrency(row.tip)
                      )}
                    </td>

                    {/* Total = Sum of E..J */}
                    <td className="py-1 px-2 border-r border-slate-300 text-right font-bold font-mono text-slate-900 bg-slate-50/40">
                      {formatCurrency(row.total)}
                    </td>

                    {/* Adjusted Amount to Pay (Light cream highlight) */}
                    <td className="py-1 px-2 border-r border-slate-300 text-right font-mono bg-[#F2F2EB]">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.adjustedAmount ?? ''}
                          onChange={(e) => handleItemChange(idx, 'adjustedAmount', parseFloat(e.target.value) || 0)}
                          className="w-full text-right border border-amber-300 bg-white px-1 py-0.5 rounded-xs font-bold"
                        />
                      ) : (
                        formatCurrency(row.adjustedAmount)
                      )}
                    </td>

                    {/* Receipt Verification */}
                    <td className="py-1 px-2 border-r border-slate-300 text-center font-medium">
                      {isEditing ? (
                        <select
                          value={row.receiptVerification || 'Verified'}
                          onChange={(e) => handleItemChange(idx, 'receiptVerification', e.target.value)}
                          className="text-[11px] border border-slate-300 rounded-xs px-1 py-0.5"
                        >
                          <option value="Verified">Verified</option>
                          <option value="Pending">Pending</option>
                          <option value="Rejected">Rejected</option>
                          <option value="-">-</option>
                        </select>
                      ) : (
                        <span className={`${
                          row.receiptVerification === 'Verified' ? 'text-emerald-700 font-bold' : 'text-slate-500'
                        }`}>
                          {row.receiptVerification || '-'}
                        </span>
                      )}
                    </td>

                    {/* Miles */}
                    <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.1"
                          value={row.miles ?? ''}
                          onChange={(e) => handleItemChange(idx, 'miles', parseFloat(e.target.value) || 0)}
                          className="w-full text-right border border-slate-300 px-1 py-0.5 rounded-xs"
                        />
                      ) : (
                        formatNumber(row.miles)
                      )}
                    </td>

                    {/* Gallons Per 22 Miles = Miles / 22 */}
                    <td className="py-1 px-2 border-r border-slate-300 text-right font-mono text-slate-700">
                      {formatNumber(row.gallonsPer22Miles || (row.miles > 0 ? (row.miles / config.mpg) : 0))}
                    </td>

                    {/* $3.5 Per Gallon = Gallons * 3.5 */}
                    <td className="py-1 px-2 text-right font-mono text-slate-700">
                      {formatCurrency(
                        row.ratePerGallon && row.gallonsPer22Miles 
                          ? (row.gallonsPer22Miles * row.ratePerGallon) 
                          : (row.miles > 0 ? ((row.miles / config.mpg) * config.gasRate) : 0)
                      )}
                    </td>

                    {/* Delete button (in edit mode) */}
                    {isEditing && (
                      <td className="py-1 px-1 text-center print:hidden">
                        <button
                          onClick={() => handleRemoveRow(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}

                {/* TOTAL ROW (Double border bottom accounting style) */}
                <tr className="border-t-2 border-black border-b-4 border-double border-b-black font-bold bg-white text-slate-900">
                  <td colSpan="4" className="py-2 px-3 text-right border-r border-slate-400 uppercase tracking-wider text-xs">
                    TOTAL
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-400 font-mono">
                    {formatCurrency(totals.fuel)}
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-400 font-mono">
                    {formatCurrency(totals.meals)}
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-400 font-mono">
                    {formatCurrency(totals.supplies)}
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-400 font-mono">
                    {formatCurrency(totals.parking)}
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-400 font-mono">
                    {formatCurrency(totals.misc)}
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-400 font-mono">
                    {formatCurrency(totals.tip)}
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-400 font-mono bg-slate-100/60">
                    {formatCurrency(totals.total)}
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-400 font-mono bg-[#F2F2EB]">
                    {formatCurrency(totals.adjusted)}
                  </td>
                  <td className="py-2 px-2 text-center border-r border-slate-400 font-mono">
                    $ -
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-400 font-mono">
                    {formatNumber(totals.miles)}
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-400 font-mono">
                    {formatNumber(totals.gallons)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono">
                    {formatCurrency(totals.gasCost)}
                  </td>
                  {isEditing && <td className="print:hidden" />}
                </tr>
              </tbody>
            </table>
          </div>

          {/* BOTTOM SECTION: APPROVED BY & DATE + LAVENDER SUMMARY TOTAL BOXES */}
          <div className="mt-8 grid grid-cols-12 items-end">
            {/* Left: Signatures */}
            <div className="col-span-7 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-slate-800 shrink-0 min-w-[100px]">
                  APPROVED BY:
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={approval.approvedBy}
                    onChange={(e) => setApproval({ ...approval, approvedBy: e.target.value })}
                    className="border-b border-black w-full px-2 py-0.5 text-xs font-bold focus:outline-hidden"
                  />
                ) : (
                  <span className="border-b border-black w-full pb-0.5 text-xs font-bold">
                    {approval.approvedBy || ''}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-slate-800 shrink-0 min-w-[100px]">
                  DATE
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={approval.date}
                    onChange={(e) => setApproval({ ...approval, date: e.target.value })}
                    className="border-b border-black w-full px-2 py-0.5 text-xs focus:outline-hidden font-mono"
                  />
                ) : (
                  <span className="border-b border-black w-full pb-0.5 text-xs font-mono">
                    {approval.date || new Date().toLocaleDateString('en-US')}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Lavender Highlight Total Boxes */}
            <div className="col-span-5 flex items-center justify-end gap-3">
              <span className="text-sm font-bold text-slate-900 tracking-tight">
                Total
              </span>

              {/* Lavender Box 1: Gross Total Sum */}
              <div 
                className="bg-[#D9D2E9] border border-slate-700 px-4 py-2 min-w-[105px] text-right font-mono font-bold text-xs text-slate-900 shadow-2xs rounded-xs"
                title="Gross Total Claimed"
              >
                {formatCurrency(totals.total)}
              </div>

              {/* Lavender Box 2: Adjusted Total to Pay */}
              <div 
                className="bg-[#D9D2E9] border border-slate-700 px-4 py-2 min-w-[105px] text-right font-mono font-bold text-xs text-slate-900 shadow-2xs rounded-xs"
                title="Total Adjusted Amount to Pay"
              >
                {formatCurrency(totals.adjusted)}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
