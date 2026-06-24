import React, { useState } from 'react';
import { useBookingStore } from '../stores/useBookingStore';
import { TrackingMap } from '../components/TrackingMap';
import { ActivityPanels } from '../components/ActivityPanels';
import * as bookingsApi from '../api/bookings';
import { socketClient } from '../socket/socketClient';

export const UserSimulator: React.FC = () => {
  const {
    bookingId,
    status,
    pickup,
    destination,
    driverLocation,
    otp,
    setBooking,
    clearBooking
  } = useBookingStore();

  const [isRequesting, setIsRequesting] = useState(false);

  // Pre-defined locations for ease of testing
  const locations = [
    { name: 'Rajwada Palace', lat: 22.7177, lng: 75.8333 },
    { name: 'Vijay Nagar Square', lat: 22.7531, lng: 75.8937 },
    { name: 'Indore Railway Station', lat: 22.7196, lng: 75.8577 },
    { name: 'Khajrana Ganesh Temple', lat: 22.7415, lng: 75.8951 },
  ];

  const [selectedPickup, setSelectedPickup] = useState(locations[0]);
  const [selectedDestination, setSelectedDestination] = useState(locations[1]);

  const handleRequestRide = async () => {
    try {
      setIsRequesting(true);
      const response = await bookingsApi.createBooking({
        pickupLat: selectedPickup.lat,
        pickupLng: selectedPickup.lng,
        pickupAddress: selectedPickup.name,
        dropLat: selectedDestination.lat,
        dropLng: selectedDestination.lng,
        dropAddress: selectedDestination.name,
      });

      setBooking({
        bookingId: response.data.bookingId,
        status: response.data.status,
        // The booking-creation response never includes coordinates (see
        // tracking_api_documentation.html section 3), so use the values the
        // passenger actually selected instead of reading them off the response.
        pickup: { lat: selectedPickup.lat, lng: selectedPickup.lng },
        pickupAddress: selectedPickup.name,
        destination: { lat: selectedDestination.lat, lng: selectedDestination.lng },
        destinationAddress: selectedDestination.name,
        otp: response.data.verificationCode,
      });
    } catch (error) {
      console.error('Failed to request ride', error);
      alert('Failed to request ride');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelRide = () => {
    clearBooking();
  };

  React.useEffect(() => {
    socketClient.connect();

    return () => {
      socketClient.disconnect();
    };
  }, []);

  React.useEffect(() => {
    if (bookingId) {
      socketClient.emit('subscribeTripRoom', { tripId: bookingId });

      const onTelemetry = (data: any) => {
        setBooking({ driverLocation: { lat: data.latitude, lng: data.longitude } });
      };

      const onStateChange = (data: any) => {
        if (data.bookingId === bookingId) {
          setBooking({ status: data.status });
        }
      };

      socketClient.on('telemetryUpdate', onTelemetry);
      socketClient.on('bookingStateChange', onStateChange);

      return () => {
        socketClient.off('telemetryUpdate', onTelemetry);
        socketClient.off('bookingStateChange', onStateChange);
      };
    }
  }, [bookingId, setBooking]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Simulator</h1>
          <p className="text-sm text-gray-500">Request a ride and track your driver</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full">
            Status: <span className="text-blue-600">{status || 'IDLE'}</span>
          </div>
          {bookingId && (
            <button
              onClick={handleCancelRide}
              className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100"
            >
              Reset Booking
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Booking Controls */}
        <div className="w-1/3 bg-white border-r border-gray-200 p-6 flex flex-col overflow-y-auto z-10 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
          {!bookingId ? (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Where to?</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                  <select
                    className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={selectedPickup.name}
                    onChange={(e) => setSelectedPickup(locations.find(l => l.name === e.target.value) || locations[0])}
                  >
                    {locations.map(loc => (
                      <option key={`pickup-${loc.name}`} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                  <select
                    className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={selectedDestination.name}
                    onChange={(e) => setSelectedDestination(locations.find(l => l.name === e.target.value) || locations[1])}
                  >
                    {locations.map(loc => (
                      <option key={`dest-${loc.name}`} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleRequestRide}
                  disabled={isRequesting || selectedPickup.name === selectedDestination.name}
                  className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-md"
                >
                  {isRequesting ? 'Requesting...' : 'Request Ride'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">Ride Active</h2>
                <div className="space-y-2 text-sm text-blue-800">
                  <p><span className="font-medium">Status:</span> {status}</p>
                  <p><span className="font-medium">Booking ID:</span> {bookingId}</p>
                  {otp && (
                    <div className="mt-4 p-3 bg-white rounded border border-blue-200 text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your OTP</p>
                      <p className="text-2xl font-bold tracking-widest text-gray-800">{otp}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto pt-6">
            <ActivityPanels />
          </div>
        </div>

        {/* Right Panel: Map */}
        <div className="w-2/3 relative bg-gray-100">
          <TrackingMap
            pickup={pickup || selectedPickup}
            destination={destination || selectedDestination}
            driverLocation={driverLocation}
            height="100%"
          />
        </div>
      </div>
    </div>
  );
};
