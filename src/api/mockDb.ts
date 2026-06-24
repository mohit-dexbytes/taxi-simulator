export interface MockBooking {
  bookingId: string;
  rideBookingId: string;
  status: 'REQUESTED' | 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropLat: number;
  dropLng: number;
  dropAddress: string;
  otp: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverLat?: number;
  driverLng?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface MockPatient {
  id: string;
  firstName: string;
  lastName: string;
  relation: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  bloodGroup: string;
  mobileNumber: string;
}

export interface MockDriver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  isOnline: boolean;
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  lat: number;
  lng: number;
}

const DEFAULT_DRIVERS: MockDriver[] = [
  {
    id: 'drv_john_doe_123',
    name: 'John Doe',
    phone: '+91 99999 88888',
    licenseNumber: 'DL-1234567890',
    isOnline: true,
    vehicleId: 'veh_traveller_001',
    vehicleNumber: 'MP-09-AB-1234',
    vehicleType: 'BASIC',
    lat: 22.7177,
    lng: 75.8333,
  },
  {
    id: 'drv_jane_smith_456',
    name: 'Jane Smith',
    phone: '+91 88888 77777',
    licenseNumber: 'DL-0987654321',
    isOnline: true,
    vehicleId: 'veh_traveller_002',
    vehicleNumber: 'MP-09-MJ-9999',
    vehicleType: 'ADVANCED',
    lat: 22.7245,
    lng: 75.8472,
  },
  {
    id: 'drv_alex_jones_789',
    name: 'Alex Jones',
    phone: '+91 77777 66666',
    licenseNumber: 'DL-5678901234',
    isOnline: false,
    vehicleId: 'veh_traveller_003',
    vehicleNumber: 'MP-09-CD-5678',
    vehicleType: 'ICU',
    lat: 22.7531,
    lng: 75.8937,
  }
];

export const getMockBookings = (): Record<string, MockBooking> => {
  const data = localStorage.getItem('mock_bookings_db');
  return data ? JSON.parse(data) : {};
};

export const saveMockBooking = (booking: MockBooking): void => {
  const db = getMockBookings();
  db[booking.bookingId] = booking;
  localStorage.setItem('mock_bookings_db', JSON.stringify(db));
};

export const getMockDrivers = (): Record<string, MockDriver> => {
  const data = localStorage.getItem('mock_drivers_db');
  if (!data) {
    const initialDb: Record<string, MockDriver> = {};
    DEFAULT_DRIVERS.forEach(d => {
      initialDb[d.id] = d;
    });
    localStorage.setItem('mock_drivers_db', JSON.stringify(initialDb));
    return initialDb;
  }
  return JSON.parse(data);
};

export const saveMockDriver = (driver: MockDriver): void => {
  const db = getMockDrivers();
  db[driver.id] = driver;
  localStorage.setItem('mock_drivers_db', JSON.stringify(db));
};

export const getMockBooking = (bookingId: string): MockBooking | null => {
  return getMockBookings()[bookingId] || null;
};

export const getMockDriver = (driverId: string): MockDriver | null => {
  return getMockDrivers()[driverId] || null;
};

export const getMockPatients = (): Record<string, MockPatient> => {
  const data = localStorage.getItem('mock_patients_db');
  return data ? JSON.parse(data) : {};
};

export const saveMockPatient = (patient: MockPatient): void => {
  const db = getMockPatients();
  db[patient.id] = patient;
  localStorage.setItem('mock_patients_db', JSON.stringify(db));
};

export const getMockPatient = (patientId: string): MockPatient | null => {
  return getMockPatients()[patientId] || null;
};
