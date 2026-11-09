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
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  MapPin,
  Fuel,
  FileSpreadsheet,
  Download,
  ExternalLink
} from 'lucide-react';
import LocationInput from './LocationInput';
import RouteMap from './RouteMap';
import { safeFetch } from '../utils/api';

export default function UserForm({ petrolRate, onClaimSubmitted, onViewExpenseReport }) {
  // Form state defaulted to US locations
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);
  const [claimedAmount, setClaimedAmount] = useState('');
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
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  // Status state
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Add a stop
  const handleAddStop = () => {
    setStops(prev => [
      ...prev,
      {
        id: Date.now(),
        name: '',
        displayName: '',
        lat: null,
        lng: null
      }
    ]);
  };

  // Update a specific stop
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

  // Remove a stop
  const handleRemoveStop = (index) => {
    if (stops.length <= 1) {
      alert('At least one visited destination stop is required.');
      return;
    }
    setStops(prev => prev.filter((_, i) => i !== index));
  };

  // Handle receipt upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  };

  // Quick Demo fill (US Midwest business trip: Chicago -> Milwaukee -> Madison -> Chicago)
  const handleFillDemo = () => {
    setEmployeeName('Sarah Jenkins');
    setEmployeeId('EMP-1049');
    setEmployeeEmail('sarah.jenkins@company.us');
    setTravelDate(new Date().toISOString().split('T')[0]);
    setClaimedAmount('145.00');
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!homeLocation || !homeLocation.name) {
      setErrorMessage('Please specify Employee Home Location (Trip Origin & Return Point).');
      return;
    }

    const validStops = stops.filter(s => s.name && s.name.trim().length > 0);
    if (validStops.length === 0) {
      setErrorMessage('Please add at least one visited destination stop.');
      return;
    }

    if (!claimedAmount || Number(claimedAmount) <= 0) {
      setErrorMessage('Please enter a valid claimed reimbursement amount ($).');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('employee_name', employeeName);
      formData.append('employee_id', employeeId);
      formData.append('employee_email', employeeEmail || `${employeeId.toLowerCase()}@company.us`);
      formData.append('travel_date', travelDate);
      formData.append('claimed_amount', claimedAmount);
      formData.append('home_location', homeLocation.name);
      if (homeLocation.lat) formData.append('home_lat', homeLocation.lat);
      if (homeLocation.lng) formData.append('home_lng', homeLocation.lng);
      formData.append('stops', JSON.stringify(validStops));

      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      const data = await safeFetch('/api/claims', {
        method: 'POST',
        body: formData
      });

      setSubmitResult(data.claim);
      if (onClaimSubmitted) onClaimSubmitted(data.claim);
    } catch (err) {
      setErrorMessage(err.message || 'Error submitting claim');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-emerald-600 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-white/80 w-fit">
              <img src="/logo-mobily.png" alt="Mobily" className="h-9 sm:h-10 w-auto object-contain" />
              <div className="h-6 w-[1.5px] bg-slate-200" />
              <img src="/logo-retailer.png" alt="Retailer" className="h-7 sm:h-8 w-auto object-contain" />
              <span className="text-[11px] font-extrabold text-slate-800 tracking-wider uppercase border-l border-slate-200 pl-3">
                Official Retailer Portal
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Submit Travel Fuel Expense Claim
            </h1>
            <p className="text-sky-100 text-xs md:text-sm max-w-xl leading-relaxed">
              Log your official retail itinerary (Home ➔ Destination Visits ➔ Return). The system automatically evaluates road routing, strictly applies the <strong>30.0 KM / Gallon limit allowed</strong>, and calculates policy reimbursement.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {onViewExpenseReport && (
              <button
                type="button"
                onClick={() => onViewExpenseReport()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#993300] text-white hover:bg-[#802a00] rounded-xl text-xs font-bold shadow-md transition-all border border-white/20"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
                View Official Expense Report
              </button>
            )}

            <button
              type="button"
              onClick={handleFillDemo}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-sky-800 hover:bg-sky-50 rounded-xl text-xs font-bold shadow-md transition-all border border-white/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Fill U.S. Business Trip Demo
            </button>
          </div>
        </div>

        {/* Live Policy Stats Bar */}
        <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-sky-200 block font-medium">Standard Limit Allowed</span>
            <span className="font-black text-white text-sm">30.0 KM / Gallon</span>
          </div>
          <div>
            <span className="text-sky-200 block font-medium">U.S. Gasoline Benchmark</span>
            <span className="font-black text-white text-sm">${Number(petrolRate || 3.50).toFixed(2)} / Gallon</span>
          </div>
          <div>
            <span className="text-sky-200 block font-medium">Trip Policy Coverage</span>
            <span className="font-black text-white text-sm">Home ➔ Stoppages ➔ Home Return</span>
          </div>
        </div>
      </div>

      {/* Success View */}
      {submitResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600 shrink-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                  Claim Submitted Successfully
                </span>
                <h3 className="text-xl font-bold text-slate-800 mt-1">
                  Reference: {submitResult.id}
                </h3>
                <p className="text-sm text-slate-600">
                  Automation calculation has processed your route. Here is the automated evaluation breakdown:
                </p>
              </div>

              {/* Quick Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-emerald-100">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Total Round-trip Distance</span>
                  <span className="text-lg font-bold text-slate-800">{Number(submitResult.total_distance_km || 0).toFixed(1)} KM</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Fuel Needed @ 30 KM/Gal</span>
                  <span className="text-lg font-bold text-slate-800">{Number(submitResult.fuel_liters || (submitResult.total_distance_km / 30)).toFixed(2)} Gallons</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Your Claimed Amount</span>
                  <span className="text-lg font-bold text-slate-800">${Number(submitResult.claimed_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">System Allowable Ceiling</span>
                  <span className="text-lg font-bold text-emerald-600">${Number(submitResult.calculated_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {onViewExpenseReport && (
                  <button
                    type="button"
                    onClick={() => onViewExpenseReport(submitResult.id)}
                    className="px-4 py-2 bg-[#993300] hover:bg-[#802a00] text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>View Official Expense Report</span>
                  </button>
                )}

                <a
                  href={`/api/reports/expense-report/excel?claimId=${submitResult.id}`}
                  download
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Excel (.xlsx)</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setSubmitResult(null);
                    setClaimedAmount('');
                    setReceiptFile(null);
                    setReceiptPreview(null);
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-300"
                >
                  Submit Another Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      {!submitResult && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form Fields */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Employee Information Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-bold text-sm">
                  <User className="w-4 h-4 text-blue-600" />
                  Employee & Travel Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Employee Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Employee ID <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="e.g. EMP-1049"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Official Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="email"
                        value={employeeEmail}
                        onChange={(e) => setEmployeeEmail(e.target.value)}
                        placeholder="e.g. sarah.jenkins@company.us"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">Decision notification email will be dispatched here</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Date of Travel <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Home Location & Multi-Stop Route Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    Trip Route & Location Stops (Home ➔ Stops ➔ Home)
                  </div>
                  <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Round-Trip Included
                  </span>
                </div>

                {/* Home Location */}
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                    <Home className="w-4 h-4 text-emerald-600" />
                    Employee Home Location (Origin & Return Destination)
                  </div>
                  <LocationInput
                    value={homeLocation}
                    onChange={(loc) => setHomeLocation(loc)}
                    placeholder="Search U.S. home address, city or ZIP (e.g. Naperville, IL or Brooklyn, NY)..."
                    required
                  />
                  <p className="text-[11px] text-emerald-700 mt-1">
                    📍 Automation rule: Computes road distance from Home ➔ First Stop, and from Last Stop ➔ Back to Home.
                  </p>
                </div>

                {/* Visited Stops Dynamic List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Visited Destinations / Stops ({stops.length})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddStop}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Next Location
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {stops.map((stop, index) => (
                      <div key={stop.id || index} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-2">
                          {index + 1}
                        </div>

                        <div className="flex-1">
                          <LocationInput
                            value={stop}
                            onChange={(loc) => handleStopChange(index, loc)}
                            placeholder={`Stop ${index + 1}: e.g. Milwaukee, WI or Chicago Branch...`}
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

                  <p className="text-xs text-slate-500 italic">
                    💡 Click "+ Add Next Location" to append every customer office, branch, or site visited in order.
                  </p>
                </div>
              </div>

              {/* 3. Claim Amount & Receipt Upload Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-bold text-sm">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  Claimed Amount & Gas Receipt Attachment
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Fuel Amount Claimed (USD $) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">$</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        value={claimedAmount}
                        onChange={(e) => setClaimedAmount(e.target.value)}
                        placeholder="e.g. 145.00"
                        className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold text-slate-800"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">Requested reimbursement in U.S. Dollars ($)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Attach Gas Receipt / Bill (Image/PDF)
                    </label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition-colors">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]">
                        {receiptFile ? receiptFile.name : 'Upload gas receipt'}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {receiptPreview && (
                  <div className="mt-2 p-2 bg-slate-100 rounded-lg flex items-center gap-3">
                    <img src={receiptPreview} alt="Receipt preview" className="w-16 h-16 object-cover rounded-md border border-slate-300" />
                    <div className="text-xs text-slate-600">
                      <div className="font-semibold text-slate-800">{receiptFile?.name}</div>
                      <div>{(receiptFile?.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Route & Running Automation...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Claim & Run Automation Calculation</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Live Map & Trip Route Summary */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Interactive Trip Route Map
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Live Preview
                  </span>
                </div>

                {/* Map Display */}
                <RouteMap
                  home={homeLocation}
                  stops={stops}
                  height="340px"
                />

                {/* Route sequence list */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs">
                  <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                    Full Route Sequence
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold">1</span>
                      <span>Origin: {homeLocation.name || 'Home'}</span>
                    </div>

                    {stops.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-700 pl-2 border-l-2 border-blue-200">
                        <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">{idx + 2}</span>
                        <span>Visit: {s.name || `Stop #${idx + 1}`}</span>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold">{stops.length + 2}</span>
                      <span>Return: Back to Home ({homeLocation.name || 'Home'})</span>
                    </div>
                  </div>
                </div>

                {/* Policy note */}
                <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100 text-xs text-blue-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-blue-600" />
                    Automation Calculation Rules
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-blue-700 text-[11px]">
                    <li>Round-trip driving distance verified using real-time GPS road routing.</li>
                    <li>Company efficiency limit allowed: <strong>30.0 KM per 1 Gallon</strong>.</li>
                    <li>Fuel needed: <strong>Total Distance (KM) ÷ 30 KM/Gallon</strong>.</li>
                    <li>Allowable reimbursement ceiling = Gallons × Gas Price per Gallon.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
