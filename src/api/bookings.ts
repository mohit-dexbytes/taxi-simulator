import { apiClient } from './apiClient';
import { useBookingStore } from '../stores/useBookingStore';
import { useDeveloperLogsStore } from '../stores/useDeveloperLogsStore';
import { saveMockBooking, getMockBooking, getMockDriver } from './mockDb';
import type { MockBooking } from './mockDb';
import { socketClient } from '../socket/socketClient';
import { getOrCreateUserId } from './auth';
import { getOrCreatePatientId } from './patients';

export interface CreateBookingPayload {
  patientId?: string;
  userId?: string;
  emergencyType?: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropAddress: string;
  dropLat: number;
  dropLng: number;
  numberOfPatients?: number;
  notes?: string;
}

export interface VerifyOtpPayload {
  verificationCode: string;
  userId?: string;
}

export interface CompleteTripPayload {
  actualDistanceKm: number;
  actualDurationMin: number;
}

export const createBooking = async (payload: CreateBookingPayload) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  // Attach the registered (or auto-generated) passenger id so every booking
  // request is tied to a userId, unless the caller already provided one.
  const userId = payload.userId ?? getOrCreateUserId();
  const patientId = payload.patientId ?? (isMock ? userId : await getOrCreatePatientId());
  const requestPayload: CreateBookingPayload = {
    ...payload,
    userId,
    patientId,
  };
  console.log('[bookings] createBooking request payload:', requestPayload);

  if (isMock) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const bookingId = `bkm_${Math.random().toString(36).substring(2, 11)}`;
    const rideBookingId = `abk_${Math.random().toString(36).substring(2, 11)}`;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const mockBooking: MockBooking = {
      bookingId,
      rideBookingId,
      status: 'REQUESTED',
      pickupLat: requestPayload.pickupLat,
      pickupLng: requestPayload.pickupLng,
      pickupAddress: requestPayload.pickupAddress,
      dropLat: requestPayload.dropLat,
      dropLng: requestPayload.dropLng,
      dropAddress: requestPayload.dropAddress,
      otp,
      createdAt: new Date().toISOString()
    };

    saveMockBooking(mockBooking);

    const responseData = {
      success: true,
      message: 'Ride booking request created successfully',
      data: {
        bookingId,
        rideBookingId,
        status: 'REQUESTED',
        verificationCode: otp,
        pickupAddress: requestPayload.pickupAddress,
        dropAddress: requestPayload.dropAddress
      }
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'POST',
      url: '/api/v1/transportation/vehicle/bookings',
      requestData: requestPayload,
      responseData,
      status: 201
    });

    return responseData;
  }

  const response = await apiClient.post('/api/v1/transportation/vehicle/bookings', requestPayload);
  const data = response.data;
  console.log('[bookings] createBooking response:', data);

  // The creation response doesn't include the OTP (see tracking_api_documentation.html
  // section 3) - it's only exposed via the unified bookings list, so fetch it from there.
  // Auth/role guards are disabled on these routes for now (see "Testing - No-Auth Mode"
  // in the doc), so identity is resolved via the ?userId= query param instead of a token.
  try {
    const bookingsRes = await apiClient.get('/api/v1/transportation/bookings', {
      params: requestPayload.userId ? { userId: requestPayload.userId } : undefined,
    });
    console.log('[bookings] GET /bookings (for OTP lookup) response:', bookingsRes.data);
    const match = bookingsRes.data?.data?.find((b: any) => b.id === data?.data?.bookingId);
    if (match?.details?.verificationCode) {
      data.data.verificationCode = match.details.verificationCode;
      console.log('[bookings] Resolved verificationCode:', match.details.verificationCode);
    } else {
      console.log('[bookings] No matching booking/verificationCode found in GET /bookings response.');
    }
  } catch (err) {
    console.log('[bookings] OTP lookup via GET /bookings failed:', err);
  }

  return data;
};

export const acceptBooking = async (bookingId: string, driverId: string) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const booking = getMockBooking(bookingId);
    const driver = getMockDriver(driverId);

    if (!booking) throw new Error('Booking not found');
    if (!driver) throw new Error('Driver not found');

    booking.status = 'ACCEPTED';
    booking.driverId = driverId;
    booking.driverName = driver.name;
    booking.driverPhone = driver.phone;
    booking.driverLat = driver.lat;
    booking.driverLng = driver.lng;

    saveMockBooking(booking);
    socketClient.emit('bookingStateChange', { bookingId, status: 'ACCEPTED' });

    const responseData = {
      success: true,
      message: 'Booking accepted successfully',
      data: {
        bookingId,
        rideBookingId: booking.rideBookingId,
        status: 'ACCEPTED'
      }
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'POST',
      url: `/api/v1/transportation/vehicle/bookings/${bookingId}/accept`,
      requestData: { driverId },
      responseData,
      status: 200
    });

    return responseData;
  }

  // No-Auth Mode resolves the acting driver from body.driverId (see
  // tracking_api_documentation.html "Testing - No-Auth Mode"), since the
  // accept role guard is currently disabled and there's no driver session token.
  console.log('[bookings] acceptBooking request payload:', { bookingId, driverId });
  const response = await apiClient.post(`/api/v1/transportation/vehicle/bookings/${bookingId}/accept`, { driverId });
  console.log('[bookings] acceptBooking response:', response.data);
  return response.data;
};

export const verifyOtp = async (bookingId: string, payload: VerifyOtpPayload) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const booking = getMockBooking(bookingId);
    if (!booking) throw new Error('Booking not found');

    if (booking.otp !== payload.verificationCode) {
      const errorResponse = {
        success: false,
        message: 'Invalid verification code (OTP)'
      };

      useDeveloperLogsStore.getState().addApiLog({
        method: 'POST',
        url: `/api/v1/transportation/vehicle/bookings/${bookingId}/verify`,
        requestData: payload,
        responseData: errorResponse,
        status: 400
      });
      throw new Error('Invalid OTP');
    }

    booking.status = 'IN_PROGRESS';
    booking.startedAt = new Date().toISOString();
    saveMockBooking(booking);
    socketClient.emit('bookingStateChange', { bookingId, status: 'IN_PROGRESS' });

    const responseData = {
      success: true,
      message: 'Booking verified successfully',
      data: {
        bookingId,
        status: 'IN_PROGRESS',
        startedAt: booking.startedAt
      }
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'POST',
      url: `/api/v1/transportation/vehicle/bookings/${bookingId}/verify`,
      requestData: payload,
      responseData,
      status: 200
    });

    return responseData;
  }

  // No-Auth Mode resolves identity from body.userId for this route too.
  const requestPayload: VerifyOtpPayload = {
    ...payload,
    userId: payload.userId ?? getOrCreateUserId(),
  };
  console.log('[bookings] verifyOtp request payload:', requestPayload);

  const response = await apiClient.post(`/api/v1/transportation/vehicle/bookings/${bookingId}/verify`, requestPayload);
  console.log('[bookings] verifyOtp response:', response.data);
  return response.data;
};

export const completeTrip = async (bookingId: string, payload: CompleteTripPayload) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const booking = getMockBooking(bookingId);
    if (!booking) throw new Error('Booking not found');

    booking.status = 'COMPLETED';
    booking.completedAt = new Date().toISOString();
    saveMockBooking(booking);
    socketClient.emit('bookingStateChange', { bookingId, status: 'COMPLETED' });

    const responseData = {
      success: true,
      message: 'Trip completed successfully',
      data: {
        bookingId,
        rideBookingId: booking.rideBookingId,
        status: 'COMPLETED',
        startedAt: booking.startedAt,
        completedAt: booking.completedAt,
        actualDistanceKm: payload.actualDistanceKm,
        actualDurationMin: payload.actualDurationMin,
        fareBreakdown: {
          baseFare: 100,
          perKmRate: 15,
          minimumFare: 120,
          totalFare: 100 + payload.actualDistanceKm * 15,
          commissionAmount: 0.0,
          driverEarning: 100 + payload.actualDistanceKm * 15
        }
      }
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'POST',
      url: `/api/v1/transportation/trips/${bookingId}/complete`,
      requestData: payload,
      responseData,
      status: 200
    });

    return responseData;
  }

  const response = await apiClient.post(`/api/v1/transportation/trips/${bookingId}/complete`, payload);
  return response.data;
};

export const getTripDetails = async (bookingId: string) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    const booking = getMockBooking(bookingId);
    if (!booking) throw new Error('Booking not found');

    const responseData = {
      success: true,
      message: 'Trip details retrieved successfully',
      data: {
        bookingId,
        rideBookingId: booking.rideBookingId,
        status: booking.status,
        vehicle: {
          id: 'mock_vehicle',
          name: 'Ambulance 01',
          vehicleNumber: 'KA-01-AB-1234',
          latitude: booking.driverLat || booking.pickupLat,
          longitude: booking.driverLng || booking.pickupLng
        },
        driver: {
          name: booking.driverName || 'John Doe',
          phone: booking.driverPhone || '+91 99999 88888'
        },
        pickupAddress: booking.pickupAddress,
        dropAddress: booking.dropAddress,
        startedAt: booking.startedAt,
        pricing: {
          baseFare: 100,
          perKmRate: 15,
          minimumFare: 120,
          estimatedFare: 227.5
        }
      }
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'GET',
      url: `/api/v1/transportation/trips/${bookingId}/details`,
      responseData,
      status: 200
    });

    return responseData;
  }

  const response = await apiClient.get(`/api/v1/transportation/trips/${bookingId}/details`);
  return response.data;
};

export const getEta = async (bookingId: string) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    const booking = getMockBooking(bookingId);
    if (!booking) throw new Error('Booking not found');

    const responseData = {
      success: true,
      data: {
        bookingId,
        assignedVehicle: {
          vehicleNumber: 'KA-01-AB-1234',
          latitude: booking.driverLat || booking.pickupLat,
          longitude: booking.driverLng || booking.pickupLng
        },
        remainingDistanceMeters: 1500,
        remainingDurationSeconds: 180,
        etaTimestamp: new Date(Date.now() + 180000).toISOString()
      }
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'GET',
      url: `/api/v1/transportation/requests/${bookingId}/eta`,
      responseData,
      status: 200
    });

    return responseData;
  }

  const response = await apiClient.get(`/api/v1/transportation/requests/${bookingId}/eta`);
  return response.data;
};

export const cancelBooking = async (bookingId: string) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    const booking = getMockBooking(bookingId);
    if (!booking) throw new Error('Booking not found');

    booking.status = 'CANCELLED';
    saveMockBooking(booking);
    socketClient.emit('bookingStateChange', { bookingId, status: 'CANCELLED' });

    const responseData = {
      success: true,
      message: 'Transportation request cancelled successfully',
      data: {
        bookingId,
        rideBookingId: booking.rideBookingId,
        status: 'CANCELLED'
      }
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'POST',
      url: `/api/v1/transportation/requests/${bookingId}/cancel`,
      responseData,
      status: 200
    });

    return responseData;
  }

  // No-Auth Mode resolves identity from body.userId for this route.
  const cancelPayload = { userId: getOrCreateUserId() };
  console.log('[bookings] cancelBooking request payload:', cancelPayload);
  const response = await apiClient.post(`/api/v1/transportation/requests/${bookingId}/cancel`, cancelPayload);
  console.log('[bookings] cancelBooking response:', response.data);
  return response.data;
};
