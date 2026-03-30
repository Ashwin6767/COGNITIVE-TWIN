const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error)
    throw error
  }
}

export const api = {
  // Graph
  getPorts: () => fetchAPI('/api/graph/ports'),
  getVessels: () => fetchAPI('/api/graph/vessels'),
  getShipments: () => fetchAPI('/api/graph/shipments'),
  getPortImpact: (portId) => fetchAPI(`/api/graph/port/${portId}/impact`),
  getOverview: () => fetchAPI('/api/graph/overview'),

  // Simulation
  simulateDelay: (portId, delayHours) => fetchAPI('/api/simulate/delay', {
    method: 'POST',
    body: JSON.stringify({ port_id: portId, delay_hours: delayHours }),
  }),
  simulateReroute: (shipmentId) => fetchAPI('/api/simulate/reroute', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: shipmentId }),
  }),
  getRiskScore: (entityType, entityId) => fetchAPI(`/api/simulate/risk/${entityType}/${entityId}`),
  compareScenarios: (a, b) => fetchAPI('/api/simulate/compare', {
    method: 'POST',
    body: JSON.stringify({ scenario_a: a, scenario_b: b }),
  }),

  // Agent
  chat: (message) => fetchAPI('/api/agent/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),

  // System
  seed: () => fetchAPI('/api/seed', { method: 'POST' }),
  reset: () => fetchAPI('/api/reset', { method: 'POST' }),
  health: () => fetchAPI('/api/health'),
}
