import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import chokidar from 'chokidar';

let pty: any = null;
try {
  pty = require('node-pty');
} catch (e) {
  console.error('Failed to load node-pty, terminal will be disabled or limited', e);
}

let mainWindow: BrowserWindow | null = null;
let ptyProcess: any = null;
let currentSessionId: string | null = null;
let sessionPath: string | null = null;
let watcher: chokidar.FSWatcher | null = null;

function getPaths() {
  const userData = app.getPath('userData');
  const appDataPath = path.join(userData, 'gemini-workspace');
  const sessionsFile = path.join(appDataPath, 'sessions.json');
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }
  return { appDataPath, sessionsFile };
}

interface SessionMetadata {
  id: string;
  name: string;
  createdAt: number;
  lastActive: number;
  project?: string;
}

function loadSessions(): SessionMetadata[] {
  const { sessionsFile } = getPaths();
  if (!fs.existsSync(sessionsFile)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
    return Array.isArray(data) ? data : [data]; // Force array
  } catch {
    return [];
  }
}

function saveSessions(sessions: SessionMetadata[]) {
  const { sessionsFile } = getPaths();
  fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
}

function ensureSessionWorkspace(existingId?: string) {
  const { sessionsFile } = getPaths();
  let sessions = loadSessions();
  
  // ONLY seed defaults if the file doesn't exist yet (first run)
  if (!fs.existsSync(sessionsFile)) {
    const defaults = ['Chat', 'test123', 'testagain'];
    defaults.forEach(name => {
      sessions.push({
        id: uuidv4(),
        name: name,
        createdAt: Date.now(),
        lastActive: Date.now(),
      });
    });
    saveSessions(sessions);
  }

  if (!existingId) {
    const mostRecent = [...sessions].sort((a, b) => b.lastActive - a.lastActive)[0];
    currentSessionId = mostRecent ? mostRecent.id : uuidv4();
  } else {
    currentSessionId = existingId;
  }

  sessionPath = path.join(os.tmpdir(), 'gemini-desktop-sessions', currentSessionId!);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const existing = sessions.find(s => s.id === currentSessionId);
  if (existing) {
    existing.lastActive = Date.now();
  } else {
    sessions.push({
      id: currentSessionId!,
      name: `Session ${sessions.length + 1}`,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });
  }
  saveSessions(sessions);

  return sessionPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 250,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e1e1e',
      symbolColor: '#ffffff',
    },
  });

  const workspace = ensureSessionWorkspace();

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (ptyProcess) {
      ptyProcess.kill();
      ptyProcess = null;
    }
    if (watcher) {
      watcher.close();
      watcher = null;
    }
  });

  // Setup PTY in the workspace directory
  if (pty) {
    try {
      const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: workspace,
        env: process.env as { [key: string]: string },
      });

      ptyProcess.onData((data: string) => {
        mainWindow?.webContents.send('terminal.incomingData', data);
      });
    } catch (e) {
      console.error('Failed to spawn pty', e);
    }
  } else {
    console.warn('Terminal running in fallback mode (dumb terminal)');
  }

  ipcMain.on('terminal.keystroke', (event, data) => {
    if (ptyProcess && ptyProcess.write) {
      ptyProcess.write(data);
    }
  });

  ipcMain.on('terminal.resize', (event, { cols, rows }) => {
    if (ptyProcess && ptyProcess.resize) {
      ptyProcess.resize(cols, rows);
    }
  });

  // Watch for changes in the workspace
  watcher = chokidar.watch(workspace, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  const updateAssets = () => {
    if (sessionPath && fs.existsSync(sessionPath)) {
      mainWindow?.webContents.send('files.updated', fs.readdirSync(sessionPath));
    }
  };

  watcher
    .on('add', updateAssets)
    .on('unlink', updateAssets)
    .on('change', updateAssets);

  // Handle file drops from GUI
  ipcMain.on('files.dropped', (event, filePaths: string[]) => {
    if (!sessionPath) return;

    filePaths.forEach((srcPath) => {
      const fileName = path.basename(srcPath);
      const destPath = path.join(sessionPath!, fileName);
      try {
        if (!fs.existsSync(destPath)) {
          fs.linkSync(srcPath, destPath);
        }
      } catch (e) {
        fs.copyFileSync(srcPath, destPath);
      }
    });

    updateAssets();
  });

  // IPC for session metadata
  ipcMain.handle('sessions.list', () => loadSessions());

  ipcMain.handle('session.rename', (event, { id, newName }) => {
    const sessions = loadSessions();
    const session = sessions.find(s => s.id === id);
    if (session) {
      session.name = newName;
      saveSessions(sessions);
      return true;
    }
    return false;
  });

  ipcMain.handle('session.delete', (event, id) => {
    const sessions = loadSessions();
    const filtered = sessions.filter(s => s.id !== id);
    if (filtered.length !== sessions.length) {
      saveSessions(filtered);
      // Optional: Delete physical workspace if it exists
      const tempPath = path.join(os.tmpdir(), 'gemini-desktop-sessions', id);
      if (fs.existsSync(tempPath)) {
        try { fs.rmSync(tempPath, { recursive: true, force: true }); } catch {}
      }
      return true;
    }
    return false;
  });

  // Handle file picker
  ipcMain.handle('files.pick', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      // Direct call to process files instead of emit
      processDroppedFiles(result.filePaths);
      return true;
    }
    return false;
  });

  // Window Controls
  ipcMain.on('window.minimize', () => mainWindow?.minimize());
  ipcMain.on('window.maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window.close', () => mainWindow?.close());
}

function processDroppedFiles(filePaths: string[]) {
  if (!sessionPath) return;

  filePaths.forEach((srcPath) => {
    const fileName = path.basename(srcPath);
    const destPath = path.join(sessionPath!, fileName);
    try {
      if (!fs.existsSync(destPath)) {
        // Use copy for safety across different drives
        fs.copyFileSync(srcPath, destPath);
      }
    } catch (e) {
      console.error('Failed to copy file', e);
    }
  });

  if (sessionPath && fs.existsSync(sessionPath)) {
    mainWindow?.webContents.send('files.updated', fs.readdirSync(sessionPath));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});