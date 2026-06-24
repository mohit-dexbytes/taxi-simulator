import { calculateDistance } from './distanceCalculator';

/**
 * Moves a coordinate point towards a target point by a specific distance in meters.
 * Clamps the output to the target point if the distance to move exceeds the remaining distance.
 */
export const interpolateLocation = (
  start: { lat: number; lng: number },
  target: { lat: number; lng: number },
  distanceToMoveMeters: number
): { lat: number; lng: number; arrived: boolean } => {
  const remainingDistance = calculateDistance(start.lat, start.lng, target.lat, target.lng);
  
  // Clamping to target coordinates to prevent overshooting
  if (remainingDistance <= distanceToMoveMeters || remainingDistance < 1) {
    return { ...target, arrived: true };
  }

  const fraction = distanceToMoveMeters / remainingDistance;
  const nextLat = start.lat + (target.lat - start.lat) * fraction;
  const nextLng = start.lng + (target.lng - start.lng) * fraction;

  return {
    lat: nextLat,
    lng: nextLng,
    arrived: false
  };
};
