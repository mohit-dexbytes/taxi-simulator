import { apiClient } from './apiClient';
import { useBookingStore } from '../stores/useBookingStore';
import { useDriverStore } from '../stores/useDriverStore';
import { useDeveloperLogsStore } from '../stores/useDeveloperLogsStore';
import type { MockDriver } from './mockDb';
import { saveMockDriver } from './mockDb';
import { getOrCreatePatientId } from './patients';
import { socketClient } from '../socket/socketClient';

export interface RegisterPayload {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'USER' | 'DRIVER';
}

// Returns the registered passenger's publicId, or mints and persists a stand-in
// id so callers always have something to send as body.userId - even if the
// user never clicked "Register Test Passenger" (see tracking_api_documentation.html
// "Testing - No-Auth Mode", which falls back to TEST_USER_ID anyway).
export const getOrCreateUserId = (): string => {
  let id = sessionStorage.getItem('taxi_simulator_user_id');
  if (!id) {
    id = `usr_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('taxi_simulator_user_id', id);
    console.log('[auth] No stored userId found - generated a stand-in id:', id);
  } else {
    console.log('[auth] Using stored userId:', id);
  }
  return id;
};

// Wipes every bit of state the simulator has created in this browser -
// session auth, mock DB records, and persisted zustand stores - so the app
// comes back up as if freshly loaded.
export const logout = (): void => {
  socketClient.disconnect();

  ['taxi_simulator_token', 'taxi_simulator_user_id', 'taxi_simulator_patient_id'].forEach(
    (key) => sessionStorage.removeItem(key)
  );

  [
    'mock_bookings_db',
    'mock_drivers_db',
    'mock_patients_db',
    'booking_simulator_store',
    'driver_simulator_store',
  ].forEach((key) => localStorage.removeItem(key));

  useBookingStore.getState().clearBooking();
  useDriverStore.getState().resetDriverStore();
  useDeveloperLogsStore.getState().clearApiLogs();
  useDeveloperLogsStore.getState().clearSocketLogs();
};

export const registerUser = async (payload: RegisterPayload) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const publicId = `u_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('taxi_simulator_user_id', publicId);

    const responseData = {
      success: true,
      message: 'User registered successfully',
      data: {
        publicId,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        role: payload.role,
      },
    };

    // Log the API call manually since it's mock
    useDeveloperLogsStore.getState().addApiLog({
      method: 'POST',
      url: '/api/v1/auth/register',
      requestData: payload,
      responseData,
      status: 201,
    });

    if (payload.role === 'DRIVER') {
      const mockDriver: MockDriver = {
        id: `drv_${Math.random().toString(36).substring(2, 9)}`,
        name: `${payload.firstName} ${payload.lastName}`,
        phone: payload.phone,
        licenseNumber: `DL-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        isOnline: true,
        vehicleId: `veh_${Math.random().toString(36).substring(2, 9)}`,
        vehicleNumber: `MP-09-${String.fromCharCode(65 + Math.random() * 26)}${String.fromCharCode(65 + Math.random() * 26)}-${Math.floor(1000 + Math.random() * 9000)}`,
        vehicleType: 'BASIC',
        lat: 22.7196,
        lng: 75.8577,
      };
      saveMockDriver(mockDriver);
    } else {
      await getOrCreatePatientId();
    }

    return responseData;
  }

  // Live Mode
  const response = await apiClient.post('/api/v1/auth/register', payload);
  console.log('[auth] /auth/register raw response:', response.data);

  // The actual backend response nests the payload under `data`:
  // { success, message, data: { user: { publicId, ... }, accessToken, refreshToken } }
  const result = response.data?.data ?? response.data;

  if (result?.accessToken) {
    sessionStorage.setItem('taxi_simulator_token', result.accessToken);
    console.log('[auth] Stored taxi_simulator_token:', result.accessToken.substring(0, 20) + '...');
  } else {
    console.log('[auth] No accessToken found in response - nothing stored.');
  }

  if (result?.user?.publicId) {
    sessionStorage.setItem('taxi_simulator_user_id', result.user.publicId);
    console.log('[auth] Stored taxi_simulator_user_id:', result.user.publicId);
  } else {
    console.log('[auth] No user.publicId found in response - nothing stored.');
  }

  if (payload.role === 'USER') {
    try {
      const patientId = await getOrCreatePatientId();
      console.log('[auth] Resolved patientId for registered user:', patientId);
    } catch (err) {
      console.log('[auth] Failed to get/create patient for registered user:', err);
    }
  }

  return response.data;
};
