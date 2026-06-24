import { useDriverStore } from '../../stores/useDriverStore';
import { useBookingStore } from '../../stores/useBookingStore';
import { interpolateLocation } from './locationInterpolator';
import { calculateDistance } from './distanceCalculator';
import { emitTelemetryUpdate } from '../../socket/trackingSocket';
import { socketClient } from '../../socket/socketClient';
import { saveMockBooking, getMockBooking, getMockDriver, saveMockDriver } from '../../api/mockDb';

let movementInterval: number | null = null;
const TICK_INTERVAL_MS = 5000; // 5 seconds real-time tick
// distancePerTick = Speed (m/s) * time (s)
// 40 km/h = 11.11 m/s. 5 minutes simulated time = 300 seconds simulated.
// Wait, the prompt says:
// "Every 5 minutes simulated interval. The engine should calculate: distancePerTick = 40 * (5/60) = 3.33 km per update."
// So each 5-second real-time tick represents 5 minutes of simulated time.
// The distance moved per 5-second tick is 3.33 km (3333 meters).
const DISTANCE_PER_TICK_METERS = 3333; 

export const startMovementEngine = (
  bookingId: string,
  targetType: 'pickup' | 'destination'
) => {
  stopMovementEngine();

  const tick = () => {
    const driverLoc = useDriverStore.getState().driverLocation;
    const selectedDriver = useDriverStore.getState().selectedDriver;
    const isMock = useBookingStore.getState().mode === 'mock';

    // Fetch booking details depending on mode
    // Per tracking_api_documentation.html, tripId for telemetry events is always
    // the encrypted Booking Master Public ID (bkm_...), i.e. the bookingId itself -
    // not the rideBookingId (abk_...) and not a separate "tripId" field.
    let targetLat = 0;
    let targetLng = 0;
    const tripId = bookingId;
    let driverId = selectedDriver?.id || 'drv_john_doe_123';

    if (isMock) {
      const booking = getMockBooking(bookingId);
      if (!booking || booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
        stopMovementEngine();
        return;
      }
      targetLat = targetType === 'pickup' ? booking.pickupLat : booking.dropLat;
      targetLng = targetType === 'pickup' ? booking.pickupLng : booking.dropLng;
    } else {
      const activeBooking = useBookingStore.getState();
      if (!activeBooking.bookingId || activeBooking.status === 'COMPLETED' || activeBooking.status === 'CANCELLED') {
        stopMovementEngine();
        return;
      }
      targetLat = targetType === 'pickup' ? activeBooking.pickup?.lat || 0 : activeBooking.destination?.lat || 0;
      targetLng = targetType === 'pickup' ? activeBooking.pickup?.lng || 0 : activeBooking.destination?.lng || 0;
    }

    if (!driverLoc || !targetLat || !targetLng) {
      stopMovementEngine();
      return;
    }

    // 1. Move towards target
    const result = interpolateLocation(
      driverLoc,
      { lat: targetLat, lng: targetLng },
      DISTANCE_PER_TICK_METERS
    );

    // 2. Update local state
    useDriverStore.getState().setDriverLocation({ lat: result.lat, lng: result.lng });

    if (isMock) {
      // Update mock database driver position
      const driver = getMockDriver(driverId);
      if (driver) {
        driver.lat = result.lat;
        driver.lng = result.lng;
        saveMockDriver(driver);
      }

      // Update mock database booking driver position
      const booking = getMockBooking(bookingId);
      if (booking) {
        booking.driverLat = result.lat;
        booking.driverLng = result.lng;
        
        // Check arrival (under 25 meters threshold)
        const distanceToTarget = calculateDistance(result.lat, result.lng, targetLat, targetLng);
        const arrived = result.arrived || distanceToTarget <= 25;

        if (arrived) {
          if (targetType === 'pickup') {
            booking.status = 'ACCEPTED'; // REST status remains ACCEPTED, but client displays Arrived
            saveMockBooking(booking);
            // Notify UI status updates
            useBookingStore.getState().setBooking({ status: 'ACCEPTED', driverLocation: { lat: result.lat, lng: result.lng } });
            socketClient.emit('bookingStateChange', { bookingId, status: 'ARRIVED_AT_PICKUP' });
          } else {
            booking.status = 'IN_PROGRESS'; // REST status remains IN_PROGRESS, but client displays Complete
            saveMockBooking(booking);
            useBookingStore.getState().setBooking({ status: 'IN_PROGRESS', driverLocation: { lat: result.lat, lng: result.lng } });
            socketClient.emit('bookingStateChange', { bookingId, status: 'ARRIVED_AT_DESTINATION' });
          }
          stopMovementEngine();
        } else {
          saveMockBooking(booking);
        }
      }
    } else {
      // In Live Mode, check arrival and let store know
      const distanceToTarget = calculateDistance(result.lat, result.lng, targetLat, targetLng);
      const arrived = result.arrived || distanceToTarget <= 25;
      
      if (arrived) {
        if (targetType === 'pickup') {
          useBookingStore.getState().setBooking({ status: 'ACCEPTED', driverLocation: { lat: result.lat, lng: result.lng } });
          // Inform socket clients driver has arrived
          socketClient.emit('bookingStateChange', { bookingId, status: 'ARRIVED_AT_PICKUP' });
        } else {
          useBookingStore.getState().setBooking({ status: 'IN_PROGRESS', driverLocation: { lat: result.lat, lng: result.lng } });
          socketClient.emit('bookingStateChange', { bookingId, status: 'ARRIVED_AT_DESTINATION' });
        }
        stopMovementEngine();
      }
    }

    // 3. Emit Socket Telemetry Update
    emitTelemetryUpdate({
      driverId,
      tripId,
      lat: result.lat,
      lng: result.lng,
    });
  };

  // Run initial tick immediately
  tick();
  movementInterval = window.setInterval(tick, TICK_INTERVAL_MS);
};

export const stopMovementEngine = () => {
  if (movementInterval) {
    clearInterval(movementInterval);
    movementInterval = null;
  }
};
