'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PORT_RISK_COLORS, MAP_CENTER, MAP_ZOOM } from '@/lib/constants'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

const getPortIcon = (congestionLevel) => {
  const color = PORT_RISK_COLORS[congestionLevel] || '#3B82F6'
  return L.divIcon({
    html: `<div style="width: 20px; height: 20px; border-radius: 50%; background: ${color}; border: 2px solid white; box-shadow: 0 0 8px ${color}40;"></div>`,
    className: '',
    iconSize: [20, 20],
  })
}

const vesselIcon = L.divIcon({
  html: '🚢',
  className: 'text-2xl',
  iconSize: [30, 30],
})

/**
 * SupplyChainMap - Leaflet map showing ports (color-coded by congestion) and
 * vessels on dark-themed tiles.
 */
export default function SupplyChainMap() {
  const { data: ports, isLoading: portsLoading } = useQuery({
    queryKey: ['ports'],
    queryFn: api.getPorts,
  })

  const { data: vessels, isLoading: vesselsLoading } = useQuery({
    queryKey: ['vessels'],
    queryFn: api.getVessels,
  })

  if (portsLoading || vesselsLoading) {
    return <div className="w-full h-full bg-bg-secondary rounded-lg animate-pulse" />
  }

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      className="w-full h-full rounded-lg"
      style={{ background: '#0F172A' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap'
      />

      {ports?.map(({ p: port }) => (
        <Marker
          key={port.id}
          position={[port.lat, port.lng]}
          icon={getPortIcon(port.congestion_level)}
        >
          <Popup>
            <div className="text-sm">
              <strong>{port.name}</strong><br />
              Congestion: {port.congestion_level}<br />
              Avg Delay: {port.avg_delay_hours}h<br />
              Utilization: {(port.current_utilization * 100).toFixed(0)}%
            </div>
          </Popup>
        </Marker>
      ))}

      {vessels?.map(({ v: vessel }) => (
        <Marker
          key={vessel.id}
          position={[vessel.current_lat, vessel.current_lng]}
          icon={vesselIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>{vessel.name}</strong><br />
              Status: {vessel.status}<br />
              Load: {vessel.current_load_teu}/{vessel.capacity_teu} TEU<br />
              Speed: {vessel.speed_knots} knots
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
