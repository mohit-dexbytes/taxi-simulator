/**
 * Estimates remaining duration in seconds based on distance and driver speed.
 * @param distanceMeters Remaining distance in meters
 * @param speedKmH Driver speed in km/h (default: 40)
 */
export const calculateEtaSeconds = (
  distanceMeters: number,
  speedKmH: number = 40
): number => {
  if (distanceMeters <= 0) return 0;
  const speedMetersPerSecond = (speedKmH * 1000) / 3600;
  return Math.round(distanceMeters / speedMetersPerSecond);
};
