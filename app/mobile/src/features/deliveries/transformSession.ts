import type { DriverRoute, DeliveryStop, OptimizeRequestLike } from './types';

export function transformSessionToDriverRoute(input: OptimizeRequestLike): DriverRoute {
  const deliveries = Array.isArray(input.deliveries) ? input.deliveries : [];
  const vehicle = Array.isArray(input.vehicles) ? input.vehicles[0] : undefined;

  const stops: DeliveryStop[] = deliveries.map((delivery, index) => ({
    id: String(delivery.id),
    stopNumber: index + 1,
    address: delivery.address ?? 'No address provided',
    customerName: delivery.recipientName ?? `Recipient ${index + 1}`,
    phoneNumber: delivery.phoneNumber,
    packageCount: delivery.demand?.value ?? 1,
    notes: delivery.notes ?? '',
    status: 'pending',
    lat: delivery.location?.lat ?? 0,
    lng: delivery.location?.lng ?? 0,
    completedAt: undefined,
    failureReason: undefined,
  }));

  return {
    driverName: vehicle?.driverName ?? 'Driver Assist',
    routeLabel: `Route X · ${stops.length} stops`,
    stops,
  };
}