import { apiClient } from './apiClient';
import { useBookingStore } from '../stores/useBookingStore';
import { useDeveloperLogsStore } from '../stores/useDeveloperLogsStore';
import { getMockDrivers, getMockDriver } from './mockDb';

export const getDrivers = async () => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    const driversObj = getMockDrivers();
    const data = Object.values(driversObj);

    const responseData = {
      success: true,
      message: 'Drivers retrieved successfully',
      data: data.map(d => ({
        id: d.id,
        name: d.name,
        email: `${d.name.toLowerCase().replace(' ', '')}@hospital.com`,
        phone: d.phone,
        licenseNumber: d.licenseNumber,
        isAvailable: !d.isOnline,
        createdAt: new Date().toISOString()
      }))
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'GET',
      url: '/api/v1/transportation/drivers',
      responseData,
      status: 200
    });

    return responseData;
  }

  const response = await apiClient.get('/api/v1/transportation/drivers');
  const body = response.data;

  // The live API nests the driver array one level deeper (data.data.data,
  // alongside a `pagination` object) than the mock response, so flatten it
  // here to keep the shape consistent for consumers like DriverSelector.
  if (body?.data && !Array.isArray(body.data) && Array.isArray(body.data.data)) {
    return { ...body, data: body.data.data };
  }

  return body;
};

export const getDriverProfile = async (id: string) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    const driver = getMockDriver(id);
    if (!driver) throw new Error('Driver not found');

    const responseData = {
      success: true,
      message: 'Driver details retrieved successfully',
      data: {
        id: driver.id,
        name: driver.name,
        firstName: driver.name.split(' ')[0],
        lastName: driver.name.split(' ')[1] || '',
        email: `${driver.name.toLowerCase().replace(' ', '')}@hospital.com`,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        verificationStatus: 'APPROVED',
        isOnline: driver.isOnline,
        isActive: true,
        currentStatus: 'IDLE',
        assignedVehicles: [
          {
            id: driver.vehicleId,
            vehicleNumber: driver.vehicleNumber,
            vehicleType: driver.vehicleType,
            isActive: true,
            verificationStatus: 'APPROVED',
            assignedAt: new Date().toISOString(),
            unassignedAt: null
          }
        ],
        createdAt: new Date().toISOString()
      }
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'GET',
      url: `/api/v1/transportation/drivers/${id}`,
      responseData,
      status: 200
    });

    return responseData;
  }

  const response = await apiClient.get(`/api/v1/transportation/drivers/${id}`);
  return response.data;
};

export const updateDriverOnlineStatus = async (driverId: string, isOnline: boolean) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    const responseData = {
      success: true,
      message: 'Driver online status updated successfully',
      data: {
        isOnline,
        currentStatus: 'IDLE'
      }
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'PATCH',
      url: '/api/v1/transportation/drivers/online',
      requestData: { driverId, isOnline },
      responseData,
      status: 200
    });

    return responseData;
  }

  // No-Auth Mode resolves identity from body.driverId for this route.
  const response = await apiClient.patch('/api/v1/transportation/drivers/online', { driverId, isOnline });
  return response.data;
};
