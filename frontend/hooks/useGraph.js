import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function usePorts() {
  return useQuery({ queryKey: ['ports'], queryFn: api.getPorts })
}

export function useVessels() {
  return useQuery({ queryKey: ['vessels'], queryFn: api.getVessels })
}

export function useShipments() {
  return useQuery({ queryKey: ['shipments'], queryFn: api.getShipments })
}

export function useOverview() {
  return useQuery({ queryKey: ['overview'], queryFn: api.getOverview })
}
