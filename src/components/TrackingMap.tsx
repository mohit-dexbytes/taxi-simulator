import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const createCustomIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const userIcon = createCustomIcon('#3b82f6'); // Blue
const driverIcon = createCustomIcon('#10b981'); // Green
const destinationIcon = createCustomIcon('#ef4444'); // Red

interface TrackingMapProps {
  pickup?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number } | null;
  height?: string;
  routeCoordinates?: [number, number][]; // Array of [lat, lng]
}

// Component to recenter map when props change
const MapUpdater: React.FC<TrackingMapProps> = ({ pickup, destination, driverLocation }) => {
  const map = useMap();

  useEffect(() => {
    const bounds = new L.LatLngBounds([]);
    if (pickup) bounds.extend([pickup.lat, pickup.lng]);
    if (destination) bounds.extend([destination.lat, destination.lng]);
    if (driverLocation) bounds.extend([driverLocation.lat, driverLocation.lng]);

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, pickup, destination, driverLocation]);

  return null;
};

export const TrackingMap: React.FC<TrackingMapProps> = ({
  pickup,
  destination,
  driverLocation,
  height = '400px',
  routeCoordinates = [],
}) => {
  // Default center (e.g., somewhere in central city, fallback if no coords)
  const defaultCenter: [number, number] = [22.7196, 75.8577]; // Indore coords as default
  
  const center = pickup ? [pickup.lat, pickup.lng] as [number, number] : defaultCenter;

  return (
    <div style={{ height, width: '100%', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={userIcon}>
            <Popup>Pickup Location</Popup>
          </Marker>
        )}

        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
            <Popup>Driver</Popup>
          </Marker>
        )}

        {routeCoordinates.length > 0 && (
          <Polyline positions={routeCoordinates} color="#3b82f6" weight={4} opacity={0.6} />
        )}

        <MapUpdater pickup={pickup} destination={destination} driverLocation={driverLocation} />
      </MapContainer>
    </div>
  );
};
