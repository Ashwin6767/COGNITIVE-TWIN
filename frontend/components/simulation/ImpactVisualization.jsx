'use client'

/**
 * ImpactVisualization - Displays simulation results including total impact,
 * affected shipments, cascade effects, and recommendations.
 * @param {Object} props
 * @param {Object} props.result - Simulation result object from the API.
 */
export function ImpactVisualization({ result }) {
  const priorityColors = {
    CRITICAL: 'text-danger',
    HIGH: 'text-danger',
    MEDIUM: 'text-warning',
    LOW: 'text-success',
  }

  return (
    <div className="space-y-4">
      <div className="bg-bg-card rounded-lg p-3">
        <div className="text-xs text-text-secondary">Total Impact</div>
        <div className="text-2xl font-bold text-danger">
          {result.total_impact_hours}h
        </div>
        <div className="text-xs text-text-secondary">
          {result.affected_shipments?.length || 0} shipments affected
        </div>
      </div>

      {result.affected_shipments?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-text-secondary uppercase">Affected Shipments</h3>
          {result.affected_shipments.map(s => (
            <div key={s.shipment_id} className="bg-bg-card rounded p-2 flex justify-between items-center">
              <div>
                <span className="font-mono text-sm">{s.shipment_id}</span>
                <span className={`ml-2 text-xs ${priorityColors[s.priority_impact] || ''}`}>
                  {s.priority_impact}
                </span>
              </div>
              <span className="text-danger text-sm font-medium">+{s.delay_hours}h</span>
            </div>
          ))}
        </div>
      )}

      {result.cascades?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-text-secondary uppercase">Cascade Effects</h3>
          {result.cascades.map((c, i) => (
            <div key={i} className="bg-warning/10 rounded p-2 text-xs">
              <span className="font-medium">{c.port_name}</span>: +{c.cascade_delay_hours}h
              <div className="text-text-secondary mt-0.5">{c.reason}</div>
            </div>
          ))}
        </div>
      )}

      {result.recommendations?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-text-secondary uppercase">Recommendations</h3>
          {result.recommendations.map((rec, i) => (
            <div key={i} className="bg-rerouted/10 border border-rerouted/30 rounded p-2">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 bg-rerouted/20 text-rerouted rounded">
                  {rec.action}
                </span>
                <span className="text-xs font-mono">{rec.shipment_id}</span>
              </div>
              <p className="text-xs text-text-secondary mt-1">{rec.description}</p>
              {rec.time_saved_hours > 0 && (
                <p className="text-xs text-success mt-1">
                  Saves {rec.time_saved_hours}h • Confidence: {(rec.confidence * 100).toFixed(0)}%
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
