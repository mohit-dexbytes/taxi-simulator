import { create } from 'zustand';

export interface ApiLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  requestData?: any;
  responseData?: any;
  status: number;
  error?: string;
}

export interface SocketLog {
  id: string;
  timestamp: string;
  direction: 'emit' | 'receive' | 'system';
  event: string;
  payload?: any;
}

interface DeveloperLogsState {
  apiLogs: ApiLog[];
  socketLogs: SocketLog[];
  addApiLog: (log: Omit<ApiLog, 'id' | 'timestamp'>) => void;
  addSocketLog: (log: Omit<SocketLog, 'id' | 'timestamp'>) => void;
  clearApiLogs: () => void;
  clearSocketLogs: () => void;
}

export const useDeveloperLogsStore = create<DeveloperLogsState>((set) => ({
  apiLogs: [],
  socketLogs: [],
  
  addApiLog: (log) => set((state) => ({
    apiLogs: [
      {
        ...log,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
      },
      ...state.apiLogs.slice(0, 49), // Keep last 50 logs
    ]
  })),

  addSocketLog: (log) => set((state) => ({
    socketLogs: [
      {
        ...log,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
      },
      ...state.socketLogs.slice(0, 49), // Keep last 50 logs
    ]
  })),

  clearApiLogs: () => set({ apiLogs: [] }),
  clearSocketLogs: () => set({ socketLogs: [] }),
}));
