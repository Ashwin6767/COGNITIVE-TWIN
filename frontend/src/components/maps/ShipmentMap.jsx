'use client';
import { useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Navigation, ExternalLink } from 'lucide-react';

const MAP_CONTAINER = { width: '100%', height: '300px', borderRadius: '0.5rem' };
const DEFAULT_CENTER = { lat: 31.23, lng: 121.47 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function ShipmentMap({ pickup, destination, driverLocation, originPort, destPort, compact = false }) {
  const { isLoaded } = useJsApiLoader({ id: 'google-map', googleMapsApiKey: API_KEY });
  const [map, setMap] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);

  const markers = [];
  if (pickup?.lat && pickup?.lng) {
    markers.push({ id: 'pickup', position: { lat: Number(pickup.lat), lng: Number(pickup.lng) }, label: 'P', title: `Pickup: ${pickup.address || 'Pickup Location'}`, color: '#2563EB' });
  }
  if (destination?.lat && destination?.lng) {
    markers.push({ id: 'dest', position: { lat: Number(destination.lat), lng: Number(destination.lng) }, label: 'D', title: `Destination: ${destination.name || 'Destination'}`, color: '#DC2626' });
  }
  if (originPort?.lat && originPort?.lng) {
    markers.push({ id: 'origin-port', position: { lat: Number(originPort.lat), lng: Number(originPort.lng) }, label: 'O', title: `Origin Port: ${originPort.name || ''}`, color: '#0891B2' });
  }
  if (destPort?.lat && destPort?.lng) {
    markers.push({ id: 'dest-port', position: { lat: Number(destPort.lat), lng: Number(destPort.lng) }, label: 'X', title: `Dest Port: ${destPort.name || ''}`, color: '#7C3AED' });
  }
  if (driverLocation?.lat && driverLocation?.lng) {
    markers.push({ id: 'driver', position: { lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) }, label: '🚛', title: 'Driver Location', color: '#16A34A', isDriver: true });
  }

  const center = markers.length > 0 ? markers[0].position : DEFAULT_CENTER;

  const openInGoogleMaps = (from, to) => {
    let url = 'https://www.google.com/maps/dir/?api=1';
    if (from?.lat && from?.lng) url += `&origin=${from.lat},${from.lng}`;
    if (to?.lat && to?.lng) url += `&destination=${to.lat},${to.lng}`;
    url += '&travelmode=driving';
    window.open(url, '_blank');
  };

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
    if (markers.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend(m.position));
      mapInstance.fitBounds(bounds, 50);
    }
  }, [markers.length]);

  // Fallback when no API key — still show buttons to open Google Maps
  if (!API_KEY) {
    return (
      <div className="border border-[#E2E8F0] rounded-lg p-4 bg-[#F8FAFC]">
        <p className="text-sm text-[#64748B] mb-2">Map preview requires a Google Maps API key.</p>
        <p className="text-xs text-[#94A3B8] mb-3">
          Set <code className="bg-[#E2E8F0] px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your <code className="bg-[#E2E8F0] px-1 rounded">.env.local</code>
        </p>
        {markers.length > 0 && <MapActionButtons pickup={pickup} destination={destination} driverLocation={driverLocation} openInGoogleMaps={openInGoogleMaps} />}
      </div>
    );
  }

  if (!isLoaded) return <div className="h-[300px] bg-[#F1F5F9] rounded-lg animate-pulse" />;

  return (
    <div className="space-y-3">
      <GoogleMap
        mapContainerStyle={compact ? { ...MAP_CONTAINER, height: '200px' } : MAP_CONTAINER}
        center={center}
        zoom={markers.length === 1 ? 13 : 10}
        onLoad={onLoad}
        options={{ disableDefaultUI: compact, zoomControl: true, mapTypeControl: !compact, streetViewControl: false }}
      >
        {markers.map(m => (
          <Marker
            key={m.id}
            position={m.position}
            label={m.isDriver ? undefined : { text: m.label, color: 'white', fontWeight: 'bold', fontSize: '12px' }}
            icon={m.isDriver ? {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#16A34A" stroke="white" stroke-width="2"/><text x="18" y="24" text-anchor="middle" fill="white" font-size="18">🚛</text></svg>'
              ),
              scaledSize: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(36, 36) : undefined,
            } : {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${m.color}"/><circle cx="12" cy="12" r="6" fill="white"/></svg>`
              ),
              scaledSize: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(28, 42) : undefined,
              anchor: typeof window !== 'undefined' && window.google ? new window.google.maps.Point(14, 42) : undefined,
            }}
            onClick={() => setActiveMarker(m.id)}
          >
            {activeMarker === m.id && (
              <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                <div className="text-sm font-medium">{m.title}</div>
              </InfoWindow>
            )}
          </Marker>
        ))}
      </GoogleMap>

      <MapActionButtons pickup={pickup} destination={destination} driverLocation={driverLocation} openInGoogleMaps={openInGoogleMaps} />
    </div>
  );
}

function MapActionButtons({ pickup, destination, driverLocation, openInGoogleMaps }) {
  return (
    <div className="flex flex-wrap gap-2">
      {pickup?.lat && destination?.lat && (
        <button
          onClick={() => openInGoogleMaps(pickup, destination)}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" /> Navigate to Destination
          <ExternalLink className="w-3 h-3" />
        </button>
      )}
      {pickup?.lat && (
        <a
          href={`https://www.google.com/maps?q=${pickup.lat},${pickup.lng}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> Open Pickup in Maps
        </a>
      )}
      {driverLocation?.lat && (
        <a
          href={`https://www.google.com/maps?q=${driverLocation.lat},${driverLocation.lng}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> Track Driver in Maps
        </a>
      )}
    </div>
  );
}
