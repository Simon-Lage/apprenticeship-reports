// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  auth: {
    status() {
      return ipcRenderer.invoke('auth:status');
    },
    init(password: string) {
      return ipcRenderer.invoke('auth:init', { password });
    },
    loginWithPassword(password: string) {
      return ipcRenderer.invoke('auth:login:password', { password });
    },
    loginWithGoogle() {
      return ipcRenderer.invoke('auth:login:google');
    },
    linkGoogle() {
      return ipcRenderer.invoke('auth:link:google');
    },
    unlinkGoogle() {
      return ipcRenderer.invoke('auth:unlink:google');
    },
    changePassword(password: string) {
      return ipcRenderer.invoke('auth:change:password', { password });
    },
    changeGoogle() {
      return ipcRenderer.invoke('auth:change:google');
    },
    logout() {
      return ipcRenderer.invoke('auth:logout');
    },
    reset(password: string) {
      return ipcRenderer.invoke('auth:reset', { password });
    },
  },
  backup: {
    exportLocal() {
      return ipcRenderer.invoke('backup:export:local');
    },
    exportDrive() {
      return ipcRenderer.invoke('backup:export:drive');
    },
    importEncrypted() {
      return ipcRenderer.invoke('backup:import');
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
