'use client';
import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import clsx from 'clsx';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogleMapsScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'));
    if (window.google?.maps?.places) return resolve(window.google.maps.places);

    const existing = document.querySelector('script[data-gmaps]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps.places));
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) return reject(new Error('No API key'));

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.gmaps = 'true';
    script.onload = () => resolve(window.google.maps.places);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function AddressAutocomplete({ value, onChange, required, label, placeholder, className = '' }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [inputValue, setInputValue] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    setLoading(true);
    loadGoogleMapsScript()
      .then((places) => {
        if (!inputRef.current) return;
        autocompleteRef.current = new places.Autocomplete(inputRef.current, {
          types: ['address'],
          fields: ['formatted_address', 'geometry'],
        });
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          const address = place.formatted_address || inputRef.current.value;
          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();
          setInputValue(address);
          onChange?.({ address, lat: lat || null, lng: lng || null });
        });
        setLoading(false);
      })
      .catch(() => {
        setFallback(true);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    if (fallback) {
      onChange?.({ address: val, lat: null, lng: null });
    }
  };

  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-[#0F172A]">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          required={required}
          placeholder={placeholder || 'Start typing an address…'}
          className="w-full border border-[#E2E8F0] rounded-lg pl-9 pr-10 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] animate-spin" />
        )}
      </div>
      {fallback && (
        <p className="text-xs text-[#94A3B8]">Google Maps unavailable — enter address manually.</p>
      )}
    </div>
  );
}
