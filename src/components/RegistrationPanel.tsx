import React, { useState } from 'react';
import { registerUser, logout } from '../api/auth';

export const RegistrationPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async () => {
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const randomSuffix = Math.random().toString(36).substring(2, 6);

    try {
      await registerUser({
        email: `user_${randomSuffix}@test.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Passenger',
        phone: `+919999${Math.floor(100000 + Math.random() * 900000)}`,
        role: 'USER'
      });

      setSuccessMsg('Successfully registered a test passenger. Note: You are now logged in as this user via cookies.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setSuccessMsg('Logged out. All locally stored session, mock data, and app state have been cleared.');
    setErrorMsg(null);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mt-8">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Live Mode Authentication</h3>
      <p className="text-sm text-gray-600 mb-4">
        To use Live Mode as a passenger, you must register a test account. The backend will set an
        authentication cookie. Drivers don't register here - pick an existing driver from the dropdown
        on the Driver Simulator page instead.
      </p>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {errorMsg}
        </div>
      )}

      <div className="flex gap-3">
        <button
          disabled={loading}
          onClick={handleRegister}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register Test Passenger'}
        </button>

        <button
          disabled={loading}
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
        >
          Logout / Clear All Data
        </button>
      </div>
    </div>
  );
};
