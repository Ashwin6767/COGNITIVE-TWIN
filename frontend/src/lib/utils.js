import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date) {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date) {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export function timeAgo(date) {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export const STATUS_COLORS = {
  REQUEST_SUBMITTED: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  AWAITING_CUSTOMER_DETAILS: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  DRIVER_ASSIGNED: 'bg-indigo-100 text-indigo-800',
  PICKUP_EN_ROUTE: 'bg-purple-100 text-purple-800',
  GOODS_COLLECTED: 'bg-teal-100 text-teal-800',
  GOODS_RELEASED: 'bg-teal-100 text-teal-800',
  IN_TRANSIT_TO_PORT: 'bg-sky-100 text-sky-800',
  AT_ORIGIN_PORT: 'bg-cyan-100 text-cyan-800',
  PORT_ENTRY: 'bg-cyan-100 text-cyan-800',
  CUSTOMS_CLEARANCE_ORIGIN: 'bg-orange-100 text-orange-800',
  CUSTOMS_CLEARANCE: 'bg-orange-100 text-orange-800',
  IN_YARD_ORIGIN: 'bg-lime-100 text-lime-800',
  IN_YARD: 'bg-lime-100 text-lime-800',
  LOADED_ON_VESSEL: 'bg-sky-100 text-sky-800',
  IN_TRANSIT_SEA: 'bg-violet-100 text-violet-800',
  AT_DESTINATION_PORT: 'bg-cyan-100 text-cyan-800',
  ARRIVED_DEST_PORT: 'bg-cyan-100 text-cyan-800',
  CUSTOMS_CLEARANCE_DEST: 'bg-orange-100 text-orange-800',
  LAST_MILE: 'bg-amber-100 text-amber-800',
  LAST_MILE_ASSIGNED: 'bg-amber-100 text-amber-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
};

export const STATUS_LABELS = {
  REQUEST_SUBMITTED: 'Request Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  AWAITING_CUSTOMER_DETAILS: 'Awaiting Details',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  DRIVER_ASSIGNED: 'Driver Assigned',
  PICKUP_EN_ROUTE: 'Pickup En Route',
  GOODS_COLLECTED: 'Goods Collected',
  GOODS_RELEASED: 'Goods Released',
  IN_TRANSIT_TO_PORT: 'In Transit to Port',
  AT_ORIGIN_PORT: 'At Origin Port',
  PORT_ENTRY: 'Port Entry',
  CUSTOMS_CLEARANCE_ORIGIN: 'Customs (Origin)',
  CUSTOMS_CLEARANCE: 'Customs Clearance',
  IN_YARD_ORIGIN: 'In Yard (Origin)',
  IN_YARD: 'In Yard',
  LOADED_ON_VESSEL: 'Loaded on Vessel',
  IN_TRANSIT_SEA: 'In Transit (Sea)',
  AT_DESTINATION_PORT: 'At Destination Port',
  ARRIVED_DEST_PORT: 'Arrived at Dest Port',
  CUSTOMS_CLEARANCE_DEST: 'Customs (Dest)',
  LAST_MILE: 'Last Mile Delivery',
  LAST_MILE_ASSIGNED: 'Last Mile Assigned',
  DELIVERED: 'Delivered',
};

export const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};
