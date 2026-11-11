import React, { useState } from 'react';
import { 
  User, 
  IdCard, 
  Mail, 
  Calendar, 
  DollarSign, 
  Upload, 
  Plus, 
  Trash2, 
  Home, 
  Navigation, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  MapPin,
  Fuel,
  UtensilsCrossed,
  Hotel,
  ShieldCheck,
  Clock,
  Info,
  Layers,
  FileCheck2
} from 'lucide-react';
import LocationInput from './LocationInput';
import RouteMap from './RouteMap';
import { safeFetch } from '../utils/api';

export default function UserForm({ onClaimSubmitted }) {
  // Expense Category: 'fuel' or 'food'
  const [expenseType, setExpenseType] = useState('fuel');

  // Common Employee Details
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');

  // Date Range (From -> To)
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);

  // ================= FUEL EXPENSE STATE ================= //
  const [homeLocation, setHomeLocation] = useState({
    name: 'Naperville, Chicago, IL',
    displayName: 'Naperville, DuPage County, Illinois, United States',
    lat: 41.7508,
    lng: -88.1535
  });
  const [stops, setStops] = useState([
    {
      id: 1,
      name: 'Downtown Milwaukee, WI',
      displayName: 'Milwaukee, Milwaukee County, Wisconsin, United States',
      lat: 43.0389,
      lng: -87.9065
    }
  ]);
  const [fuelReceipts, setFuelReceipts] = useState([
    { id: 1, file: null, preview: null, gallons: '12.50', rate: '3.65', amount: '45.63' }
  ]);

  // ================= FOOD EXPENSE STATE ================= //
  const [nightStayAssigned, setNightStayAssigned] = useState(true);
  const [nightStayLocation, setNightStayLocation] = useState('Milwaukee Downtown Branch, WI');
  const [nightsCount, setNightsCount] = useState(1);
  const [foodReceipts, setFoodReceipts] = useState([
    { id: 1, file: null, preview: null, date: todayStr, mealType: 'Lunch', billAmount: '28.00', tipAmount: '4.00', netAmount: '24.00' }
  ]);

  // Status state
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // ----------------- Fuel Stop Handlers ----------------- //
  const handleAddStop = () => {
    setStops(prev => [
      ...prev,
      { id: Date.now(), name: '', displayName: '', lat: null, lng: null }
    ]);
  };

  const handleStopChange = (index, locData) => {
    setStops(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        name: locData.name,
        displayName: locData.displayName,
        lat: locData.lat,
        lng: locData.lng
      };
      return copy;
    });
  };

  const handleRemoveStop = (index) => {
    if (stops.length <= 1) {
      alert('At least one visited destination stop is required.');
      return;
    }
    setStops(prev => prev.filter((_, i) => i !== index));
  };

  // ----------------- Multi-Receipt: Fuel Handlers ----------------- //
  const handleAddFuelReceipt = () => {
    setFuelReceipts(prev => [
      ...prev,
      { id: Date.now(), file: null, preview: null, gallons: '', rate: '', amount: '0.00' }
    ]);
  };

  const handleFuelReceiptChange = (index, field, value) => {
    setFuelReceipts(prev => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };
      
      const gallons = parseFloat(field === 'gallons' ? value : item.gallons) || 0;
      const rate = parseFloat(field === 'rate' ? value : item.rate) || 0;
      if (gallons > 0 && rate > 0) {
        item.amount = (gallons * rate).toFixed(2);
      }
      copy[index] = item;
      return copy;
    });
  };

  const handleFuelFileChange = (index, file) => {
    if (!file) return;
    setFuelReceipts(prev => {
      const copy = [...prev];
      copy[index].file = file;
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFuelReceipts(curr => {
            const inner = [...curr];
            if (inner[index]) inner[index].preview = reader.result;
            return inner;
          });
        };
        reader.readAsDataURL(file);
      }
      return copy;
    });
  };

  const handleRemoveFuelReceipt = (index) => {
    if (fuelReceipts.length <= 1) {
      alert('At least one receipt row is required.');
      return;
    }
    setFuelReceipts(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate Fuel Receipts Summary & Live Weighted Average Rate
  const totalFuelGallons = fuelReceipts.reduce((sum, r) => sum + (parseFloat(r.gallons) || 0), 0);
  const totalFuelSpend = fuelReceipts.reduce((sum, r) => {
    const g = parseFloat(r.gallons) || 0;
    const rate = parseFloat(r.rate) || 0;
    return sum + (g * rate || parseFloat(r.amount) || 0);
  }, 0);
  const weightedAvgFuelRate = totalFuelGallons > 0 ? (totalFuelSpend / totalFuelGallons) : 0;

  // ----------------- Multi-Receipt: Food Handlers ----------------- //
  const handleAddFoodReceipt = () => {
    setFoodReceipts(prev => [
      ...prev,
      { id: Date.now(), file: null, preview: null, date: dateFrom, mealType: 'Lunch', billAmount: '', tipAmount: '0.00', netAmount: '0.00' }
    ]);
  };

  const handleFoodReceiptChange = (index, field, value) => {
    setFoodReceipts(prev => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };
      
      const bill = parseFloat(field === 'billAmount' ? value : item.billAmount) || 0;
      const tip = parseFloat(field === 'tipAmount' ? value : item.tipAmount) || 0;
      const net = Math.max(0, bill - tip);
      item.netAmount = net.toFixed(2);
      
      copy[index] = item;
      return copy;
    });
  };

  const handleFoodFileChange = (index, file) => {
    if (!file) return;
    setFoodReceipts(prev => {
      const copy = [...prev];
      copy[index].file = file;
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFoodReceipts(curr => {
            const inner = [...curr];
            if (inner[index]) inner[index].preview = reader.result;
            return inner;
          });
        };
        reader.readAsDataURL(file);
      }
      return copy;
    });
  };

  const handleRemoveFoodReceipt = (index) => {
    if (foodReceipts.length <= 1) {
      alert('At least one meal receipt row is required.');
      return;
    }
    setFoodReceipts(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate Food Receipts Summary (Tips Excluded)
  const totalFoodBilled = foodReceipts.reduce((sum, r) => sum + (parseFloat(r.billAmount) || 0), 0);
  const totalFoodTipsDeducted = foodReceipts.reduce((sum, r) => sum + (parseFloat(r.tipAmount) || 0), 0);
  const totalFoodNetEligible = foodReceipts.reduce((sum, r) => sum + (parseFloat(r.netAmount) || 0), 0);

  // Quick Demo Fills
  const handleFillDemo = (type) => {
    setEmployeeName('Sarah Jenkins');
    setEmployeeId('EMP-1049');
    setEmployeeEmail('sarah.jenkins@company.us');
    setDateFrom('2026-11-09');
    setDateTo('2026-11-10');

    if (type === 'fuel') {
      setExpenseType('fuel');
      setHomeLocation({
        name: 'Naperville, Chicago, IL',
        displayName: 'Naperville, DuPage County, Illinois, United States',
        lat: 41.7508,
        lng: -88.1535
      });
      setStops([
        {
          id: 1,
          name: 'Milwaukee Downtown Branch, WI',
          displayName: 'Milwaukee, Milwaukee County, Wisconsin, United States',
          lat: 43.0389,
          lng: -87.9065
        },
        {
          id: 2,
          name: 'Madison State Capitol & Branch, WI',
          displayName: 'Madison, Dane County, Wisconsin, United States',
          lat: 43.0748,
          lng: -89.3842
        }
      ]);
      setFuelReceipts([
        { id: 1, file: null, preview: null, gallons: '14.20', rate: '3.69', amount: '52.40' },
        { id: 2, file: null, preview: null, gallons: '12.80', rate: '3.49', amount: '44.67' }
      ]);
    } else {
      setExpenseType('food');
      setNightStayAssigned(true);
      setNightStayLocation('Milwaukee Downtown Hotel, WI');
      setNightsCount(1);
      setFoodReceipts([
        { id: 1, file: null, preview: null, date: '2026-11-09', mealType: 'Dinner', billAmount: '28.50', tipAmount: '5.00', netAmount: '23.50' },
        { id: 2, file: null, preview: null, date: '2026-11-10', mealType: 'Lunch', billAmount: '22.00', tipAmount: '3.50', netAmount: '18.50' }
      ]);
    }
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (expenseType === 'fuel') {
      if (!homeLocation || !homeLocation.name) {
        setErrorMessage('Please specify Employee Home Location (Trip Origin & Return Point).');
        return;
      }
      const validStops = stops.filter(s => s.name && s.name.trim().length > 0);
      if (validStops.length === 0) {
        setErrorMessage('Please add at least one visited destination stop.');
        return;
      }
      if (totalFuelSpend <= 0) {
        setErrorMessage('Please enter valid fuel receipt details (Gallons and Rate).');
        return;
      }
    } else {
      if (!nightStayAssigned) {
        setErrorMessage('Company Policy Notice: Food reimbursement is only eligible when an authorized overnight night-stay is assigned.');
        return;
      }
      if (totalFoodNetEligible <= 0) {
        setErrorMessage('Please add at least one meal receipt with bill amount.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('expense_type', expenseType);
      formData.append('employee_name', employeeName);
      formData.append('employee_id', employeeId);
      formData.append('employee_email', employeeEmail || `${employeeId.toLowerCase()}@company.us`);
      formData.append('date_from', dateFrom);
      formData.append('date_to', dateTo);

      if (expenseType === 'fuel') {
        const validStops = stops.filter(s => s.name && s.name.trim().length > 0);
        formData.append('claimed_amount', totalFuelSpend.toFixed(2));
        formData.append('home_location', homeLocation.name);
        if (homeLocation.lat) formData.append('home_lat', homeLocation.lat);
        if (homeLocation.lng) formData.append('home_lng', homeLocation.lng);
        formData.append('stops', JSON.stringify(validStops));

        const receiptsMeta = fuelReceipts.map((r, i) => ({
          index: i,
          gallons: parseFloat(r.gallons) || 0,
          rate: parseFloat(r.rate) || 0,
          amount: parseFloat(r.amount) || 0
        }));
        formData.append('receipts', JSON.stringify(receiptsMeta));

        fuelReceipts.forEach((r) => {
          if (r.file) formData.append('receipt_files', r.file);
        });
      } else {
        formData.append('claimed_amount', totalFoodBilled.toFixed(2));
        formData.append('night_stay_location', nightStayLocation);
        formData.append('nights_count', nightsCount);
        formData.append('night_stay_verified', nightStayAssigned ? 'true' : 'false');

        const receiptsMeta = foodReceipts.map((r, i) => ({
          index: i,
          date: r.date,
          mealType: r.mealType,
          food_bill_amount: parseFloat(r.billAmount) || 0,
          tip_amount: parseFloat(r.tipAmount) || 0,
          net_eligible_amount: parseFloat(r.netAmount) || 0
        }));
        formData.append('receipts', JSON.stringify(receiptsMeta));

        foodReceipts.forEach((r) => {
          if (r.file) formData.append('receipt_files', r.file);
        });
      }

      const data = await safeFetch('/api/claims', {
        method: 'POST',
        body: formData
      });

      if (data.success) {
        setSubmitResult(data.claim);
        if (onClaimSubmitted) onClaimSubmitted(data.claim);
      } else {
        setErrorMessage(data.error || 'Failed to submit claim.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error submitting claim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-blue-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white/95 px-4 py-2 rounded-2xl shadow-sm border border-white/80 w-fit">
              <img src="/logo-mobily.png" alt="Mobily" className="h-8 sm:h-9 w-auto object-contain" />
              <div className="h-5 w-[1.5px] bg-slate-200" />
              <img src="/logo-retailer.png" alt="Retailer" className="h-6 sm:h-7 w-auto object-contain" />
              <span className="text-[11px] font-black text-slate-800 tracking-wider uppercase border-l border-slate-200 pl-3">
                Corporate Portal
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Expense Reimbursement Request
            </h1>
            <p className="text-sky-200 text-xs md:text-sm max-w-xl leading-relaxed">
              Submit travel fuel mileage or authorized night-stay meal expenses. Claims are automatically routed through dedicated verification teams prior to management approval.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleFillDemo('fuel')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Fill Fuel Demo
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('food')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              Fill Food Demo
            </button>
          </div>
        </div>

        {/* Live Category Policy Indicators */}
        <div className="mt-6 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <span className="text-sky-300 block font-medium">Fuel Policy</span>
              <span className="font-bold text-white">30 KM/Gal &bull; Weighted Avg Rate</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-emerald-300 block font-medium">Food Policy</span>
              <span className="font-bold text-white">Authorized Nights Only &bull; Zero Tip</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-amber-300 block font-medium">Verification Guard</span>
              <span className="font-bold text-white">Surveillance & Hotel Audit Teams</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIDENTIAL SUBMISSION SUCCESS ACKNOWLEDGEMENT (NO FINANCIAL CALCULATIONS SHOWN) */}
      {submitResult && (
        <div className="bg-white rounded-3xl border-2 border-emerald-300 p-8 shadow-xl text-center space-y-6 animate-scale-up max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Claim Successfully Submitted
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">
              Reference #{submitResult.id}
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Your reimbursement submission has been securely registered in the company ledger.
            </p>
          </div>

          {/* Submission Receipt Card */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left text-xs space-y-3">
            <div className="flex justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Employee</span>
              <span className="font-bold text-slate-800">{submitResult.employee_name} ({submitResult.employee_id})</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Expense Category</span>
              <span className="font-bold uppercase tracking-wider text-sky-700">
                {submitResult.expense_type === 'food' ? '🍔 Food & Meals Reimbursement' : '⛽ Travel Fuel Reimbursement'}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Applicable Date Range</span>
              <span className="font-bold text-slate-800">{submitResult.date_from} ➔ {submitResult.date_to}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Claimed Total Submitted</span>
              <span className="font-extrabold text-slate-900 text-sm">${Number(submitResult.claimed_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-start justify-between pt-1">
              <span className="text-slate-500 font-medium">Next Stage</span>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Clock className="w-3 h-3" />
                  {submitResult.expense_type === 'food' ? 'Hotel Booking Team Audit' : 'Surveillance Team Camera Audit'}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  {submitResult.pending_reason}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 text-sky-800 text-xs flex items-center gap-3 text-left">
            <Info className="w-5 h-5 text-sky-600 shrink-0" />
            <span>
              <strong>Confidentiality Note:</strong> System calculations and audit reports are strictly reviewed by verification officers and management. You will receive an official decision email upon final approval.
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSubmitResult(null);
              setErrorMessage('');
            }}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md"
          >
            Submit Another Expense Claim
          </button>
        </div>
      )}

      {/* Main Submission Form */}
      {!submitResult && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. EXPENSE CATEGORY SELECTOR */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Layers className="w-4 h-4 text-blue-600" />
                Select Reimbursement Category
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Step 1 of 3</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Option: Fuel */}
              <button
                type="button"
                onClick={() => setExpenseType('fuel')}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3.5 ${
                  expenseType === 'fuel'
                    ? 'border-sky-600 bg-sky-50/70 shadow-sm ring-2 ring-sky-600/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${expenseType === 'fuel' ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'}`}>
                  <Fuel className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    Fuel Reimbursement
                    {expenseType === 'fuel' && <span className="text-[10px] bg-sky-600 text-white px-2 py-0.2 rounded-full">Active</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Gasoline receipts, round-trip itinerary, and automated road distance matrix (30 KM/Gal limit).
                  </p>
                </div>
              </button>

              {/* Option: Food */}
              <button
                type="button"
                onClick={() => setExpenseType('food')}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3.5 ${
                  expenseType === 'food'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-600/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${expenseType === 'food' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'}`}>
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    Food & Meal Reimbursement
                    {expenseType === 'food' && <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.2 rounded-full">Active</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Eligible for authorized overnight night-stays. Tips are excluded. Capped at daily policy cut-off.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. EMPLOYEE & DATE RANGE DETAILS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-bold text-sm">
              <User className="w-4 h-4 text-blue-600" />
              Employee Details & Applicable Date Range
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Employee Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-1049"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Date Range: From <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      if (e.target.value > dateTo) setDateTo(e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Date Range: To <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    required
                    min={dateFrom}
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Official Email (For Automated Revert Decision)
              </label>
              <div className="relative max-w-md">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="email"
                  value={employeeEmail}
                  onChange={(e) => setEmployeeEmail(e.target.value)}
                  placeholder="e.g. sarah.jenkins@company.us"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* ================= CONDITIONAL FIELDS: FUEL EXPENSE ================= */}
          {expenseType === 'fuel' && (
            <div className="space-y-6">
              {/* Trip Route Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <Navigation className="w-4 h-4 text-sky-600" />
                    Trip Itinerary Route (Home ➔ Destination Visits ➔ Home Return)
                  </div>
                  <span className="text-xs text-sky-700 font-semibold bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                    Round-Trip Included
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 space-y-4">
                    {/* Origin Home Location */}
                    <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-200/80 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-sky-900 uppercase tracking-wider mb-1">
                        <Home className="w-4 h-4 text-sky-600" />
                        Origin & Return Point (Employee Home Location)
                      </div>
                      <LocationInput
                        value={homeLocation}
                        onChange={(loc) => setHomeLocation(loc)}
                        placeholder="Search home address or city (e.g. Naperville, IL)..."
                        required
                      />
                    </div>

                    {/* Visited Stops Dynamic List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Visited Destination Branches / Sites ({stops.length})
                        </label>
                        <button
                          type="button"
                          onClick={handleAddStop}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Next Location
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {stops.map((stop, index) => (
                          <div key={stop.id || index} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <div className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-2">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <LocationInput
                                value={stop}
                                onChange={(loc) => handleStopChange(index, loc)}
                                placeholder={`Stop ${index + 1}: e.g. Milwaukee Downtown Branch, WI...`}
                                required
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveStop(index)}
                              title="Remove stop"
                              className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors shrink-0 mt-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Route Map */}
                  <div className="lg:col-span-5">
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <RouteMap home={homeLocation} stops={stops} height="260px" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Receipts for Fuel with Gallons & Rate */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <Fuel className="w-4 h-4 text-sky-600" />
                    Gasoline Receipts, Gallons Purchased & Rates
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFuelReceipt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Another Fuel Receipt
                  </button>
                </div>

                <div className="space-y-3">
                  {fuelReceipts.map((rec, index) => (
                    <div key={rec.id || index} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Attach Receipt #{index + 1}
                        </label>
                        <label className="flex items-center gap-2 p-2 bg-white border border-dashed border-slate-300 hover:border-sky-500 rounded-lg cursor-pointer transition-colors text-xs text-slate-600 truncate">
                          <Upload className="w-4 h-4 text-sky-600 shrink-0" />
                          <span className="truncate">{rec.file ? rec.file.name : 'Upload bill (IMG/PDF)'}</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFuelFileChange(index, e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Gallons Purchased
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="e.g. 12.50"
                            value={rec.gallons}
                            onChange={(e) => handleFuelReceiptChange(index, 'gallons', e.target.value)}
                            className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                          />
                          <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400">GAL</span>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Rate ($/Gal)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="3.65"
                            value={rec.rate}
                            onChange={(e) => handleFuelReceiptChange(index, 'rate', e.target.value)}
                            className="w-full pl-6 pr-2 py-2 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Receipt Total
                        </label>
                        <div className="py-2 px-3 bg-white border border-slate-200 rounded-lg font-black text-xs text-slate-900">
                          ${rec.amount || '0.00'}
                        </div>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveFuelReceipt(index)}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove receipt row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weighted Average Live Computation Card */}
                <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Total Gallons Added</span>
                    <span className="text-base font-extrabold text-slate-900">{totalFuelGallons.toFixed(2)} Gal</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Total Receipts Spend</span>
                    <span className="text-base font-extrabold text-slate-900">${totalFuelSpend.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-sky-700 font-bold block">Live Weighted Average Fuel Rate</span>
                    <span className="text-base font-black text-sky-800">
                      ${weightedAvgFuelRate > 0 ? weightedAvgFuelRate.toFixed(3) : '3.500'} / Gallon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= CONDITIONAL FIELDS: FOOD EXPENSE ================= */}
          {expenseType === 'food' && (
            <div className="space-y-6">
              {/* Night Stay Verification Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <Hotel className="w-4 h-4 text-emerald-600" />
                    Authorized Overnight Stay & Lodging Information
                  </div>
                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    Next-Day Meal Eligibility
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="nightStayCheck"
                      checked={nightStayAssigned}
                      onChange={(e) => setNightStayAssigned(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
                    />
                    <label htmlFor="nightStayCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                      I was assigned an authorized official overnight stay ("night stay") for these dates.
                    </label>
                  </div>
                  <p className="text-[11px] text-emerald-800 pl-7">
                    📜 <strong>Company Food Rule:</strong> Food reimbursement is strictly allowed only when an employee is assigned an overnight stay (covers next-day meals). The Hotel Booking Team will audit your room authorization.
                  </p>
                </div>

                {nightStayAssigned && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Hotel / Overnight Location City <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={nightStayLocation}
                          onChange={(e) => setNightStayLocation(e.target.value)}
                          placeholder="e.g. Milwaukee Downtown Hotel, WI"
                          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Total Number of Nights Assigned <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={nightsCount}
                        onChange={(e) => setNightsCount(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Receipts for Food with Tip Deduction */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                    Meal Receipts & Automatic Tip Deduction
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFoodReceipt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Meal Receipt
                  </button>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Corporate Policy:</strong> Tips on food receipts are <strong>non-reimbursable</strong> and are automatically deducted from the claim amount.
                  </span>
                </div>

                <div className="space-y-3">
                  {foodReceipts.map((rec, index) => (
                    <div key={rec.id || index} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Attach Receipt #{index + 1}
                        </label>
                        <label className="flex items-center gap-2 p-2 bg-white border border-dashed border-slate-300 hover:border-emerald-500 rounded-lg cursor-pointer transition-colors text-xs text-slate-600 truncate">
                          <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">{rec.file ? rec.file.name : 'Upload bill (IMG/PDF)'}</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFoodFileChange(index, e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Meal Type
                        </label>
                        <select
                          value={rec.mealType}
                          onChange={(e) => handleFoodReceiptChange(index, 'mealType', e.target.value)}
                          className="w-full px-2 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        >
                          <option value="Breakfast">Breakfast</option>
                          <option value="Lunch">Lunch</option>
                          <option value="Dinner">Dinner</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Gross Bill ($)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="28.00"
                            value={rec.billAmount}
                            onChange={(e) => handleFoodReceiptChange(index, 'billAmount', e.target.value)}
                            className="w-full pl-6 pr-2 py-2 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-red-600 uppercase mb-1">
                          Tip Amount ($)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-bold text-red-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={rec.tipAmount}
                            onChange={(e) => handleFoodReceiptChange(index, 'tipAmount', e.target.value)}
                            className="w-full pl-6 pr-2 py-2 text-xs bg-white border border-red-200 rounded-lg font-bold text-red-700 focus:ring-2 focus:ring-red-400 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-emerald-700 uppercase mb-1">
                          Net Claimable
                        </label>
                        <div className="py-2 px-3 bg-white border border-emerald-300 rounded-lg font-black text-xs text-emerald-700">
                          ${rec.netAmount || '0.00'}
                        </div>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveFoodReceipt(index)}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Food Calculation Summary */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Total Gross Billed</span>
                    <span className="text-base font-extrabold text-slate-900">${totalFoodBilled.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-red-600 font-medium block">Non-Reimbursable Tips Deducted</span>
                    <span className="text-base font-extrabold text-red-700">-${totalFoodTipsDeducted.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700 font-bold block">Net Allowable Claim Base</span>
                    <span className="text-base font-black text-emerald-800">${totalFoodNetEligible.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. SUBMIT ACTION BUTTON */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 hover:from-blue-800 hover:to-sky-800 text-white font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Registering Claim & Routing for Verification...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit {expenseType === 'food' ? 'Food & Meal' : 'Travel Fuel'} Claim for Verification</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
