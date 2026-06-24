import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  isOnline: boolean;
  vehicleId?: string;
  vehicleNumber?: string;
}

interface DriverState {
  selectedDriver: DriverProfile | null;
  driverLocation: { lat: number; lng: number } | null;
  setSelectedDriver: (driver: DriverProfile | null) => void;
  setDriverLocation: (location: { lat: number; lng: number } | null) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  resetDriverStore: () => void;
}

export const useDriverStore = create<DriverState>()(
  persist(
    (set) => ({
      selectedDriver: null,
      driverLocation: null,

      setSelectedDriver: (driver) => set({ selectedDriver: driver }),
      
      setDriverLocation: (location) => set({ driverLocation: location }),
      
      setOnlineStatus: (isOnline) => set((state) => ({
        selectedDriver: state.selectedDriver ? { ...state.selectedDriver, isOnline } : null
      })),

      resetDriverStore: () => set({ selectedDriver: null, driverLocation: null }),
    }),
    {
      name: 'driver_simulator_store', // Unique namespace
    }
  )
);
