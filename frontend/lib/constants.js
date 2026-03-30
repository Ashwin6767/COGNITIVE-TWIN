/** Centralized constants for the Cognitive Twin dashboard. */

/** Alert level styles with colors and emoji indicators. */
export const ALERT_LEVEL_STYLES = {
  CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10', icon: '🔴' },
  HIGH: { color: 'text-orange-400', bg: 'bg-orange-500/10', icon: '🟠' },
  MEDIUM: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: '🟡' },
  LOW: { color: 'text-green-400', bg: 'bg-green-500/10', icon: '🟢' },
};

/** Port risk level colors for map markers. */
export const PORT_RISK_COLORS = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

/** Available ports for simulation controls. */
export const SIMULATION_PORTS = [
  { id: 'P001', name: 'Shanghai' },
  { id: 'P002', name: 'Singapore' },
  { id: 'P003', name: 'Rotterdam' },
  { id: 'P004', name: 'Los Angeles' },
  { id: 'P005', name: 'Dubai' },
  { id: 'P006', name: 'Mumbai' },
];

/** Default chat suggestion prompts. */
export const CHAT_SUGGESTIONS = [
  'Show me the supply chain overview',
  'Which ports have the highest risk?',
  'Simulate a 48h delay at Shanghai',
];

/** Map default center coordinates [lat, lng]. */
export const MAP_CENTER = [20, 80];

/** Map default zoom level. */
export const MAP_ZOOM = 3;
