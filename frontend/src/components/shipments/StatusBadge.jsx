import clsx from 'clsx';

const STATUS_COLORS = {
  REQUEST_SUBMITTED: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  DRIVER_ASSIGNED: 'bg-indigo-100 text-indigo-800',
  PICKUP_EN_ROUTE: 'bg-purple-100 text-purple-800',
  GOODS_COLLECTED: 'bg-teal-100 text-teal-800',
  AT_ORIGIN_PORT: 'bg-cyan-100 text-cyan-800',
  CUSTOMS_CLEARANCE_ORIGIN: 'bg-orange-100 text-orange-800',
  IN_YARD_ORIGIN: 'bg-lime-100 text-lime-800',
  LOADED_ON_VESSEL: 'bg-sky-100 text-sky-800',
  IN_TRANSIT_SEA: 'bg-violet-100 text-violet-800',
  AT_DESTINATION_PORT: 'bg-cyan-100 text-cyan-800',
  CUSTOMS_CLEARANCE_DEST: 'bg-orange-100 text-orange-800',
  LAST_MILE: 'bg-amber-100 text-amber-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
};

const STATUS_LABELS = {
  REQUEST_SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  DRIVER_ASSIGNED: 'Driver Assigned',
  PICKUP_EN_ROUTE: 'Pickup En Route',
  GOODS_COLLECTED: 'Collected',
  AT_ORIGIN_PORT: 'At Origin Port',
  CUSTOMS_CLEARANCE_ORIGIN: 'Customs (Origin)',
  IN_YARD_ORIGIN: 'In Yard',
  LOADED_ON_VESSEL: 'On Vessel',
  IN_TRANSIT_SEA: 'In Transit',
  AT_DESTINATION_PORT: 'At Dest Port',
  CUSTOMS_CLEARANCE_DEST: 'Customs (Dest)',
  LAST_MILE: 'Last Mile',
  DELIVERED: 'Delivered',
};

export function StatusBadge({ status }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', STATUS_COLORS[status] || 'bg-gray-100 text-gray-700')}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
