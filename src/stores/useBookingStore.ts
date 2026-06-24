import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BookingStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

interface BookingState {
  bookingId: string | null;
  tripId: string | null;
  status: BookingStatus | null;
  pickup: { lat: number; lng: number } | null;
  pickupAddress: string;
  destination: { lat: number; lng: number } | null;
  destinationAddress: string;
  otp: string | null;
  driverLocation: { lat: number; lng: number } | null;
  mode: 'live' | 'mock';
  
  setBooking: (data: Partial<Omit<BookingState, 'setBooking' | 'clearBooking' | 'setDriverLocation' | 'setMode'>>) => void;
  setDriverLocation: (location: { lat: number; lng: number } | null) => void;
  setMode: (mode: 'live' | 'mock') => void;
  clearBooking: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      bookingId: null,
      tripId: null,
      status: null,
      pickup: null,
      pickupAddress: '',
      destination: null,
      destinationAddress: '',
      otp: null,
      driverLocation: null,
      mode: 'mock', // Default to mock mode since no backend is running

      setBooking: (data) => set((state) => ({ ...state, ...data })),
      
      setDriverLocation: (location) => set({ driverLocation: location }),
      
      setMode: (mode) => set({ mode }),
      
      clearBooking: () => set({
        bookingId: null,
        tripId: null,
        status: null,
        pickup: null,
        pickupAddress: '',
        destination: null,
        destinationAddress: '',
        otp: null,
        driverLocation: null,
      }),
    }),
    {
      name: 'booking_simulator_store', // Unique namespace
    }
  )
);
