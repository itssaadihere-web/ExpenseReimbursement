import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, Check, X } from 'lucide-react';

export default function LocationInput({
  value,
  onChange,
  placeholder = "Search U.S. city, address or landmark (e.g. Chicago, IL or New York)...",
  label = null,
  required = false
}) {
  const [query, setQuery] = useState(value?.name || (typeof value === 'string' ? value : '') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    if (value && typeof value === 'object' && value.name) {
      setQuery(value.name);
    } else if (typeof value === 'string') {
      setQuery(value);
    }
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/locations/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setSuggestions(data.results);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.warn('Location suggestion lookup error:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 350);

    // Call onChange with draft value
    onChange({
      name: val,
      displayName: val,
      lat: value?.lat || null,
      lng: value?.lng || null
    });
  };

  const handleSelectSuggestion = (item) => {
    setQuery(item.name || item.displayName.split(',')[0]);
    setShowDropdown(false);
    setSuggestions([]);

    onChange({
      name: item.name || item.displayName.split(',')[0],
      displayName: item.displayName,
      lat: item.lat,
      lng: item.lng
    });
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    onChange({ name: '', displayName: '', lat: null, lng: null });
  };

  const hasCoords = value && value.lat && value.lng;

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : (
            <MapPin className={`w-4 h-4 ${hasCoords ? 'text-emerald-600' : 'text-slate-400'}`} />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0 || query.length >= 2) {
              setShowDropdown(true);
              if (suggestions.length === 0) fetchSuggestions(query);
            }
          }}
          placeholder={placeholder}
          required={required}
          className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-2xs text-slate-800 placeholder-slate-400"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {hasCoords && (
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 font-medium">
          <Check className="w-3 h-3" />
          <span>Location Geocoded: {Number(value.lat).toFixed(4)}, {Number(value.lng).toFixed(4)}</span>
        </div>
      )}

      {/* Autocomplete Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50">
            Suggested Places (OpenStreetMap / Google Suggestions)
          </div>
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 transition-colors flex items-start gap-2.5 group"
            >
              <MapPin className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-0.5" />
              <div className="truncate">
                <div className="text-sm font-medium text-slate-800 group-hover:text-blue-700">
                  {item.name || item.displayName.split(',')[0]}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {item.displayName}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
