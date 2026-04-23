import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  terminal: {
    sendData: (data: string) => ipcRenderer.send('terminal.keystroke', data),
    onData: (callback: (data: string) => void) => {
      ipcRenderer.on('terminal.incomingData', (_event, data) => callback(data));
    },
    resize: (cols: number, rows: number) => ipcRenderer.send('terminal.resize', { cols, rows }),
  },
  files: {
    drop: (filePaths: string[]) => ipcRenderer.send('files.dropped', filePaths),
    pickFiles: () => ipcRenderer.invoke('files.pick'),
    onUpdate: (callback: (files: string[]) => void) => {
      ipcRenderer.on('files.updated', (_event, files) => callback(files));
    }
  },
  sessions: {
    list: () => ipcRenderer.invoke('sessions.list'),
    rename: (id: string, newName: string) => ipcRenderer.invoke('session.rename', { id, newName }),
    delete: (id: string) => ipcRenderer.invoke('session.delete', id),
  },
  window: {
    minimize: () => ipcRenderer.send('window.minimize'),
    maximize: () => ipcRenderer.send('window.maximize'),
    close: () => ipcRenderer.send('window.close'),
  }
});