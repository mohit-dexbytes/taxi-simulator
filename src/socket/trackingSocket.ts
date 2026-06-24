import { socketClient } from './socketClient';

export interface TelemetryPayload {
  driverId: string;
  tripId: string;
  lat: number;
  lng: number;
}

export interface TelemetryBroadcast {
  driverId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export const subscribeTripRoom = (tripId: string) => {
  socketClient.emit('subscribeTripRoom', { tripId });
};

export const emitTelemetryUpdate = (payload: TelemetryPayload) => {
  socketClient.emit('emitTelemetryUpdate', payload);
  
  // In mock mode, we want to broadcast 'telemetryUpdate' as well so that the user tab receives it.
  // The socketClient itself will dispatch event.data.type = telemetryUpdate to listeners when received from BroadcastChannel.
  // So we send { type: 'telemetryUpdate', payload: { driverId, tripId, latitude, longitude, timestamp } } on BroadcastChannel!
  // Wait, let's look at socketClient's emit implementation: it posts type=event, payload=payload.
  // If the driver emits 'emitTelemetryUpdate', the BroadcastMessage sends type='emitTelemetryUpdate'.
  // We should intercept 'emitTelemetryUpdate' in our mock SocketClient or mock backend to map it to a 'telemetryUpdate' broadcast!
  // Yes! Let's add a virtual server interceptor in socketClient for Mock Mode. Let's see:
  // When socketClient gets 'emitTelemetryUpdate' in Mock Mode, it can automatically post back a 'telemetryUpdate' message on the BroadcastChannel!
  // Let's modify socketClient.ts to handle this virtual mock server behavior. That is incredibly elegant and keeps driver/user coordination completely transparent.
  // Wait, let's look at socketClient's emit:
  // if (this.currentMode === 'mock') {
  //   if (this.mockChannel) {
  //     this.mockChannel.postMessage({ type: event, payload });
  //     // Virtual mock server loop-back:
  //     if (event === 'emitTelemetryUpdate') {
  //       this.mockChannel.postMessage({
  //         type: 'telemetryUpdate',
  //         payload: {
  //           driverId: payload.driverId,
  //           tripId: payload.tripId,
  //           latitude: payload.lat,
  //           longitude: payload.lng,
  //           timestamp: new Date().toISOString()
  //         }
  //       });
  //     }
  //     // Also virtual mock server loop-back for booking accept or state changes?
  //     // Wait! When a driver accepts a booking or verify OTP, it does a POST call, which updates mockDb.
  //     // But we should also broadcast a socket event or we can notify other tabs.
  //     // In mock mode, we can broadcast state change notifications over BroadcastChannel so other tabs know to re-fetch booking status!
  //   }
  // }
};

export const registerTelemetryListener = (callback: (data: TelemetryBroadcast) => void) => {
  socketClient.on('telemetryUpdate', callback);
};

export const unregisterTelemetryListener = (callback: (data: TelemetryBroadcast) => void) => {
  socketClient.off('telemetryUpdate', callback);
};
