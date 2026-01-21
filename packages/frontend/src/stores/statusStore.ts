import { create } from 'zustand';
import type { ServiceStatus } from '../types';

interface StatusStore {
  status: ServiceStatus | null;
  isConnected: boolean;
  setStatus: (status: ServiceStatus) => void;
  setConnected: (connected: boolean) => void;
}

export const useStatusStore = create<StatusStore>((set) => ({
  status: null,
  isConnected: false,

  setStatus: (status) => set({ status }),
  setConnected: (connected) => set({ isConnected: connected }),
}));
