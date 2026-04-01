'use client';
import { useCallback, useState } from 'react';
import { Navigation, ExternalLink, MapPin } from 'lucide-react';

const MAP_HEIGHT = '300px';
const COMPACT_HEIGHT = '220px';

export default function ShipmentMap({ pickup, destination, driverLocation, originPort, destPort, compact = false }) {
  const height = compact ? COMPACT_HEIGHT : MAP_HEIGHT;

  // Build the Google Maps embed URL (no API key needed for this format)
  const buildEmbedUrl = () => {
    // If we have pickup and destination, show directions
    if (pickup?.lat && pickup?.lng && destination?.lat && destination?.lng) {
      return `https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d50000!2d${pickup.lng}!3d${pickup.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s!2s${pickup.lat},${pickup.lng}!3m2!1d${pickup.lat}!2d${pickup.lng}!4m5!1s!2s${destination.lat},${destination.lng}!3m2!1d${destination.lat}!2d${destination.lng}!5e0!3m2!1sen!2sus`;
    }
    // If we have driver location, show that
    if (driverLocation?.lat && driverLocation?.lng) {
      return `https://maps.google.com/maps?q=${driverLocation.lat},${driverLocation.lng}&z=14&output=embed`;
    }
    // If we have just pickup, show that
    if (pickup?.lat && pickup?.lng) {
      return `https://maps.google.com/maps?q=${pickup.lat},${pickup.lng}&z=14&output=embed`;
    }
    return null;
  };

  const openDirections = (from, to) => {
    let url = 'https://www.google.com/maps/dir/?api=1';
    if (from?.lat && from?.lng) url += `&origin=${from.lat},${from.lng}`;
    if (to?.lat && to?.lng) url += `&destination=${to.lat},${to.lng}`;
    url += '&travelmode=driving';
    window.open(url, '_blank');
  };

  const openLocation = (loc) => {
    window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, '_blank');
  };

  const embedUrl = buildEmbedUrl();

  return (
    <div className="space-y-3">
      {/* Embedded Google Map */}
      {embedUrl ? (
        <div className="rounded-lg overflow-hidden border border-[#E2E8F0]" style={{ height }}>
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
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]" style={{ height }}>
          <div className="text-center text-[#94A3B8]">
            <MapPin className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No location data available</p>
          </div>
        </div>
      )}

      {/* Location info */}
      {pickup?.address && (
        <p className="text-sm text-[#64748B]">📍 <span className="font-medium text-[#0F172A]">Pickup:</span> {pickup.address}</p>
      )}
      {destination?.name && (
        <p className="text-sm text-[#64748B]">🏁 <span className="font-medium text-[#0F172A]">Destination:</span> {destination.name}</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {pickup?.lat && destination?.lat && (
          <button
            onClick={() => openDirections(pickup, destination)}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" /> Get Directions in Google Maps
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
        {pickup?.lat && !destination?.lat && (
          <button
            onClick={() => openLocation(pickup)}
            className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Open Pickup in Google Maps
          </button>
        )}
        {driverLocation?.lat && (
          <button
            onClick={() => openLocation(driverLocation)}
            className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Track Driver in Google Maps
          </button>
        )}
        {driverLocation?.lat && pickup?.lat && (
          <button
            onClick={() => openDirections(driverLocation, pickup)}
            className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" /> Driver → Pickup Route
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
