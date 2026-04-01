'use client';
import { useState, useRef } from 'react';
import { Search, MapPin, Loader2, CheckCircle } from 'lucide-react';

/**
 * Location search component using Nominatim (OpenStreetMap) geocoding.
 * No API key required. Shows search results with a map preview.
 */
export default function LocationPicker({ value, onChange, required }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef(null);

  const searchLocation = async (q) => {
    if (!q || q.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setResults(data.map(r => ({
        display_name: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        type: r.type,
      })));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    // Debounce search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocation(val), 400);
  };

  const selectResult = (result) => {
    setSelected(result);
    setQuery(result.display_name);
    setResults([]);
    // Notify parent with address + coords
    onChange({
      address: result.display_name,
      lat: result.lat,
      lng: result.lng,
    });
  };

  const embedUrl = selected
    ? `https://maps.google.com/maps?q=${selected.lat},${selected.lng}&z=15&output=embed`
    : null;

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search for an address or location..."
          required={required && !selected}
          className="w-full pl-10 pr-10 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] animate-spin" />}
        {selected && !searching && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
      </div>

      {/* Search results dropdown */}
      {results.length > 0 && !selected && (
        <div className="border border-[#E2E8F0] rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectResult(r)}
              className="w-full text-left px-4 py-3 hover:bg-[#F1F5F9] transition-colors border-b border-[#F1F5F9] last:border-b-0"
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-[#0F172A] leading-snug">{r.display_name}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Map preview when location selected */}
      {embedUrl && (
        <div className="rounded-lg overflow-hidden border border-[#E2E8F0]" style={{ height: '180px' }}>
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      {/* Hidden inputs for form validation */}
      {selected && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Location set: {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
        </p>
      )}
    </div>
  );
}
