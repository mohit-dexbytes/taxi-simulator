import React, { useState } from 'react';
import { useDriverStore } from '../stores/useDriverStore';
import { useBookingStore } from '../stores/useBookingStore';
import { TrackingMap } from '../components/TrackingMap';
import { ActivityPanels } from '../components/ActivityPanels';
import { DriverSelector } from '../components/DriverSelector';
import * as bookingsApi from '../api/bookings';
import { socketClient } from '../socket/socketClient';
import { startMovementEngine, stopMovementEngine } from '../services/tracking/movementEngine';

export const DriverSimulator: React.FC = () => {
  const { selectedDriver, driverLocation, setOnlineStatus } = useDriverStore();
  const { 
    bookingId, 
    status, 
    pickup, 
    destination,
    clearBooking,
    setBooking
  } = useBookingStore();

  const [enteredOtp, setEnteredOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // When a booking comes in, we want to show it in the queue if it's REQUESTED
  // (In a real app we'd fetch this from the backend or listen via socket, 
  // but since both use the same useBookingStore in mock mode, it syncs instantly 
  // or via BroadcastChannel across tabs)

  React.useEffect(() => {
    if (selectedDriver) {
      socketClient.connect(selectedDriver.id);
    } else {
      socketClient.disconnect();
    }

    return () => {
      socketClient.disconnect();
    };
  }, [selectedDriver]);

  const handleAcceptBooking = async () => {
    if (!bookingId || !selectedDriver) return;
    try {
      setIsProcessing(true);
      await bookingsApi.acceptBooking(bookingId, selectedDriver.id);
      setBooking({ status: 'ACCEPTED' });
      startMovementEngine(bookingId, 'pickup');
    } catch (error) {
      console.error('Failed to accept booking', error);
      alert('Failed to accept booking');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartRide = async () => {
    if (!bookingId || !selectedDriver) return;
    if (!enteredOtp) {
      alert('Please enter OTP');
      return;
    }
    try {
      setIsProcessing(true);
      await bookingsApi.verifyOtp(bookingId, { verificationCode: enteredOtp });
      setBooking({ status: 'IN_PROGRESS' });
      startMovementEngine(bookingId, 'destination');
    } catch (error) {
      console.error('Failed to start ride', error);
      alert('Failed to start ride. Incorrect OTP?');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!bookingId || !selectedDriver) return;
    try {
      setIsProcessing(true);
      await bookingsApi.completeTrip(bookingId, { actualDistanceKm: 10, actualDurationMin: 30 });
      setBooking({ status: 'COMPLETED' });
      stopMovementEngine();
      
      // Clear booking after a few seconds so driver can take new rides
      setTimeout(() => {
        clearBooking();
      }, 5000);
    } catch (error) {
      console.error('Failed to complete ride', error);
      alert('Failed to complete ride');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 text-white shadow-md px-6 py-4 flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-bold">Driver Simulator</h1>
          <p className="text-sm text-gray-400">Accept rides and update status</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium px-3 py-1 bg-gray-800 rounded-full border border-gray-700">
            Booking Status: <span className="text-green-400">{status || 'NO RIDE'}</span>
          </div>
          {selectedDriver && (
            <div className="flex items-center space-x-2">
              <span className="text-sm">Online</span>
              <button 
                onClick={() => setOnlineStatus(!selectedDriver.isOnline)}
                className={`w-12 h-6 rounded-full transition-colors relative ${selectedDriver.isOnline ? 'bg-green-500' : 'bg-gray-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${selectedDriver.isOnline ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Controls */}
        <div className="w-1/3 bg-white border-r border-gray-200 p-6 flex flex-col overflow-y-auto z-10 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Driver Profile</h2>
            <DriverSelector />
          </div>

          {selectedDriver && (
            <div className="space-y-6">
              {/* Booking Queue / Current Ride */}
              {!bookingId ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <p>Waiting for booking requests...</p>
                  <p className="text-sm mt-2">Ensure you are Online.</p>
                </div>
              ) : status === 'REQUESTED' ? (
                <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-lg">
                  <h3 className="font-bold text-yellow-800 mb-2">New Booking Request!</h3>
                  <p className="text-sm text-yellow-700 mb-4">A user has requested a ride.</p>
                  <button 
                    onClick={handleAcceptBooking}
                    disabled={isProcessing}
                    className="w-full bg-yellow-500 text-white font-bold py-3 rounded hover:bg-yellow-600 transition"
                  >
                    Accept Ride
                  </button>
                </div>
              ) : status === 'ACCEPTED' ? (
                <div className="bg-blue-50 border border-blue-200 p-5 rounded-lg space-y-4">
                  <h3 className="font-bold text-blue-900">Heading to Pickup</h3>
                  <p className="text-sm text-blue-800">Arrived at pickup? Enter OTP to start ride.</p>
                  <input 
                    type="text" 
                    placeholder="Enter OTP" 
                    className="w-full p-3 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center tracking-widest font-bold"
                    value={enteredOtp}
                    onChange={e => setEnteredOtp(e.target.value)}
                  />
                  <button 
                    onClick={handleStartRide}
                    disabled={isProcessing || !enteredOtp}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Start Ride
                  </button>
                </div>
              ) : status === 'IN_PROGRESS' ? (
                <div className="bg-green-50 border border-green-200 p-5 rounded-lg space-y-4">
                  <h3 className="font-bold text-green-900">Ride In Progress</h3>
                  <p className="text-sm text-green-800">Drive to the destination. Click below when arrived.</p>
                  <button 
                    onClick={handleCompleteRide}
                    disabled={isProcessing}
                    className="w-full bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 transition"
                  >
                    Complete Ride
                  </button>
                </div>
              ) : status === 'COMPLETED' ? (
                <div className="bg-gray-100 p-5 rounded-lg text-center">
                  <h3 className="font-bold text-gray-800">Ride Completed</h3>
                  <p className="text-sm text-gray-600">Waiting to clear...</p>
                </div>
              ) : null}
            </div>
          )}

          <div className="mt-auto pt-6">
            <ActivityPanels />
          </div>
        </div>

        {/* Right Panel: Map */}
        <div className="w-2/3 relative bg-gray-200">
          <TrackingMap 
            pickup={pickup} 
            destination={destination} 
            driverLocation={driverLocation}
            height="100%"
          />
        </div>
      </div>
    </div>
  );
};
