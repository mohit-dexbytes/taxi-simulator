import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../stores/useBookingStore';
import { RegistrationPanel } from '../components/RegistrationPanel';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { mode, setMode } = useBookingStore();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Taxi Booking Simulator</h1>
          <p className="text-lg text-gray-600 mb-6">Test and demonstrate API flows and real-time tracking.</p>
          
          <div className="inline-flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setMode('mock')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                mode === 'mock' 
                  ? 'bg-blue-100 text-blue-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mock Mode (Offline)
            </button>
            <button
              onClick={() => setMode('live')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                mode === 'live' 
                  ? 'bg-blue-100 text-blue-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Live Mode (Backend)
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div 
            onClick={() => navigate('/user')}
            className="bg-white p-8 rounded-xl shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">User Simulator</h2>
            <p className="text-gray-600">
              Create bookings, track driver location, and view ride status updates.
            </p>
          </div>

          <div 
            onClick={() => navigate('/driver')}
            className="bg-white p-8 rounded-xl shadow-md border border-gray-100 hover:shadow-lg hover:border-green-200 transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Driver Simulator</h2>
            <p className="text-gray-600">
              Accept bookings, simulate driving, and update ride status.
            </p>
          </div>
        </div>

        {mode === 'live' && <RegistrationPanel />}
      </div>
    </div>
  );
};
