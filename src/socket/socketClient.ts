import { io, Socket } from 'socket.io-client';
import { useDeveloperLogsStore } from '../stores/useDeveloperLogsStore';
import { useBookingStore } from '../stores/useBookingStore';

const SOCKET_URL = '';

class SocketManager {
  private socket: Socket | null = null;
  private mockChannel: BroadcastChannel | null = null;
  private currentMode: 'live' | 'mock' | null = null;
  private listeners: Record<string, Function[]> = {};

  public connect(driverId?: string) {
    const mode = useBookingStore.getState().mode;
    this.currentMode = mode;

    if (mode === 'mock') {
      this.connectMock();
      return;
    }

    this.connectLive(driverId);
  }

  private connectMock() {
    this.disconnect();
    this.mockChannel = new BroadcastChannel('taxi_simulator_socket_channel');

    useDeveloperLogsStore.getState().addSocketLog({
      direction: 'system',
      event: 'CONNECT',
      payload: { mode: 'mock', status: 'Connected via BroadcastChannel' }
    });

    this.mockChannel.onmessage = (event) => {
      const { type, payload } = event.data;

      // Log received event
      useDeveloperLogsStore.getState().addSocketLog({
        direction: 'receive',
        event: type,
        payload
      });

      // Dispatch to active listeners
      if (this.listeners[type]) {
        this.listeners[type].forEach(callback => callback(payload));
      }
    };
  }

  private connectLive(driverId?: string) {
    this.disconnect();

    const query: Record<string, string> = {};
    if (driverId) {
      query.driverId = driverId;
    }
    
    const token = sessionStorage.getItem('taxi_simulator_token');
    if (token) {
      query.token = token;
    }

    this.socket = io(SOCKET_URL, {
      query,
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true'
      }
    });

    useDeveloperLogsStore.getState().addSocketLog({
      direction: 'system',
      event: 'CONNECTING',
      payload: { url: SOCKET_URL, query }
    });

    this.socket.on('connect', () => {
      useDeveloperLogsStore.getState().addSocketLog({
        direction: 'system',
        event: 'CONNECT',
        payload: { id: this.socket?.id, status: 'Connected' }
      });
    });

    this.socket.on('disconnect', (reason) => {
      useDeveloperLogsStore.getState().addSocketLog({
        direction: 'system',
        event: 'DISCONNECT',
        payload: { reason }
      });
    });

    this.socket.on('connect_error', (error) => {
      useDeveloperLogsStore.getState().addSocketLog({
        direction: 'system',
        event: 'CONNECT_ERROR',
        payload: { message: error.message }
      });
    });

    // Catch-all to log incoming socket events
    this.socket.onAny((eventName, ...args) => {
      useDeveloperLogsStore.getState().addSocketLog({
        direction: 'receive',
        event: eventName,
        payload: args[0]
      });

      if (this.listeners[eventName]) {
        this.listeners[eventName].forEach(callback => callback(args[0]));
      }
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.mockChannel) {
      this.mockChannel.close();
      this.mockChannel = null;
    }

    useDeveloperLogsStore.getState().addSocketLog({
      direction: 'system',
      event: 'DISCONNECT',
      payload: { status: 'Closed active connections' }
    });
  }

  public emit(event: string, payload: any) {
    // Log outbound emit
    useDeveloperLogsStore.getState().addSocketLog({
      direction: 'emit',
      event,
      payload
    });

    if (this.currentMode === 'mock') {
      if (this.mockChannel) {
        this.mockChannel.postMessage({ type: event, payload });

        // Virtual Mock Server loopback broadcasts
        if (event === 'emitTelemetryUpdate') {
          setTimeout(() => {
            if (this.mockChannel) {
              this.mockChannel.postMessage({
                type: 'telemetryUpdate',
                payload: {
                  driverId: payload.driverId,
                  tripId: payload.tripId,
                  latitude: payload.lat,
                  longitude: payload.lng,
                  timestamp: new Date().toISOString()
                }
              });
            }
          }, 50);
        } else if (event === 'bookingStateChange') {
          setTimeout(() => {
            if (this.mockChannel) {
              this.mockChannel.postMessage({
                type: 'bookingStateChange',
                payload
              });
            }
          }, 50);
        }
      }
      return;
    }

    if (this.socket) {
      this.socket.emit(event, payload);
    }
  }

  public on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }
}

export const socketClient = new SocketManager();
