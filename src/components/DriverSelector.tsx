import React, { useEffect, useState } from 'react';
import { useDriverStore } from '../stores/useDriverStore';
import type { DriverProfile } from '../stores/useDriverStore';
import { getDrivers, getDriverProfile } from '../api/drivers';
import { useBookingStore } from '../stores/useBookingStore';
import { socketClient } from '../socket/socketClient';
import { UserCheck, RefreshCw, AlertCircle } from 'lucide-react';

export const DriverSelector: React.FC = () => {
  const { selectedDriver, setSelectedDriver, setDriverLocation } = useDriverStore();
  const mode = useBookingStore(state => state.mode);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDrivers();
      if (res.success && Array.isArray(res.data)) {
        setDrivers(res.data);

        // If a driver was already selected but is not online or we just loaded, check if they exist in results
        if (selectedDriver) {
          const match = res.data.find((d: any) => d.id === selectedDriver.id);
          if (match) {
            setSelectedDriver(match);
          }
        }
      } else {
        setError('Failed to load drivers list');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error fetching drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [mode]);

  const switchToDriver = async (driverId: string) => {
    setLoading(true);
    try {
      const res = await getDriverProfile(driverId);
      if (res.success && res.data) {
        const profile: DriverProfile = {
          id: res.data.id,
          name: res.data.name,
          phone: res.data.phone,
          licenseNumber: res.data.licenseNumber,
          isOnline: res.data.isOnline,
          vehicleId: res.data.assignedVehicles?.[0]?.id,
          vehicleNumber: res.data.assignedVehicles?.[0]?.vehicleNumber,
        };

        // Tear down the previous driver's socket session before switching.
        socketClient.disconnect();
        setSelectedDriver(profile);

        // Set an initial position if driver doesn't have one (e.g. from local storage or defaults)
        const mockDriversDb = JSON.parse(localStorage.getItem('mock_drivers_db') || '{}');
        const dbDriver = mockDriversDb[driverId];

        if (dbDriver) {
          setDriverLocation({ lat: dbDriver.lat, lng: dbDriver.lng });
        } else {
          // Default start coordinates (Indore Center)
          setDriverLocation({ lat: 22.7196, lng: 75.8577 });
        }
      }
    } catch (err) {
      console.error('Error fetching driver profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (driverId: string) => {
    if (!driverId) {
      socketClient.disconnect();
      setSelectedDriver(null);
      setDriverLocation(null);
      return;
    }

    if (selectedDriver && selectedDriver.id !== driverId) {
      const confirmed = window.confirm(
        `Switch active driver from "${selectedDriver.name}" to a new driver? This will end the current driver's socket session.`
      );
      if (!confirmed) return;
    }

    switchToDriver(driverId);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <UserCheck size={14} className="text-indigo-400" />
          <span>Active Driver Profile</span>
        </label>
        <button
          onClick={loadDrivers}
          disabled={loading}
          className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-all disabled:opacity-40"
          title="Reload drivers"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="relative">
        <select
          value={selectedDriver?.id || ''}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={loading}
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all cursor-pointer disabled:opacity-50"
        >
          <option value="">-- Select Driver --</option>
          {drivers.map((drv) => (
            <option key={drv.id} value={drv.id}>
              {drv.name} ({drv.id.substring(0, 10)}...)
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-400 text-xs mt-1">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {selectedDriver && (
        <div className="grid grid-cols-2 gap-4 mt-1.5 bg-slate-950/40 border border-slate-800/60 p-4 rounded-xl text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 font-medium">License Number</span>
            <div className="font-mono text-slate-300 font-semibold">{selectedDriver.licenseNumber}</div>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Assigned Vehicle</span>
            <div className="font-mono text-slate-300 font-semibold">
              {selectedDriver.vehicleNumber || 'No vehicle assigned'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
