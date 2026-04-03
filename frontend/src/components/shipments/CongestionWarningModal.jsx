'use client';

import { AlertTriangle, X, Bot, MapPin, Clock, BarChart3, Navigation, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

function ScoreBadge({ score }) {
  const variant = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger';
  return <Badge variant={variant}>AI Score: {score}</Badge>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="space-y-3 rounded-xl bg-red-50 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-3 rounded-xl bg-blue-50 p-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-16 w-full" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2 rounded-xl border border-[#E2E8F0] p-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

export function CongestionWarningModal({
  isOpen,
  onClose,
  onSelectPort,
  onProceedAnyway,
  congestionInfo,
  alternatives = [],
  aiSummary,
  loading,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[80vh] overflow-y-auto">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-[#0F172A]">
                  ⚠️ Port Congestion Warning
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* Congestion Info Card */}
              {congestionInfo && (
                <div className="rounded-xl bg-red-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[#0F172A]">
                        {congestionInfo.port_name}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="danger">{congestionInfo.congestion_level}</Badge>
                        <span className="flex items-center gap-1 text-sm text-[#64748B]">
                          <BarChart3 className="h-3.5 w-3.5" />
                          Utilization: {Math.round((congestionInfo.utilization || 0) * 100)}%
                        </span>
                        <span className="flex items-center gap-1 text-sm text-[#64748B]">
                          <Clock className="h-3.5 w-3.5" />
                          Avg Delay: {congestionInfo.avg_delay_hours}h
                        </span>
                      </div>
                      {congestionInfo.capacity_teu && (
                        <p className="mt-1 text-xs text-[#64748B]">
                          Capacity: {congestionInfo.capacity_teu.toLocaleString()} TEU
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-red-700">
                    This port is currently experiencing high congestion which may cause delays.
                  </p>
                </div>
              )}

              {/* AI Recommendation */}
              {aiSummary && (
                <div className="rounded-xl bg-blue-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-[#0F172A]">AI Recommendation</h3>
                  </div>
                  <p className="text-sm italic text-blue-800">{aiSummary}</p>
                </div>
              )}

              {/* Alternative Ports List */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Suggested Alternative Ports
                </h3>

                {alternatives.length === 0 ? (
                  <p className="text-sm text-[#64748B]">
                    No alternative ports available within range.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {alternatives.map((port) => (
                      <Card key={port.id} className="hover:border-blue-300 transition-colors">
                        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-[#0F172A]">
                                {port.name}
                              </span>
                              <span className="text-sm text-[#64748B]">{port.country}</span>
                              <ScoreBadge score={port.ai_score} />
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-[#64748B]">
                              <span className="flex items-center gap-1">
                                <Navigation className="h-3 w-3" />
                                {port.distance_km} km away
                              </span>
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                Utilization: {Math.round((port.utilization || 0) * 100)}%
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Avg Delay: {port.avg_delay_hours}h
                              </span>
                              {port.capacity_teu && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {port.capacity_teu.toLocaleString()} TEU
                                </span>
                              )}
                            </div>
                            {port.reason && (
                              <p className="text-xs text-[#94A3B8]">{port.reason}</p>
                            )}
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onSelectPort(port.id)}
                            className="shrink-0"
                          >
                            Select This Port
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#E2E8F0] bg-white px-6 py-4 rounded-b-2xl">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-[#64748B] sm:inline">
                  I understand the risks
                </span>
                <Button variant="danger" onClick={onProceedAnyway}>
                  Proceed Anyway
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
