import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

declare global {
  interface Window {
    electronAPI: {
      terminal: {
        sendData: (data: string) => void;
        onData: (callback: (data: string) => void) => void;
        resize: (cols: number, rows: number) => void;
      };
    };
  }
}

const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#000000',
        foreground: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xterm.onData((data) => {
      window.electronAPI.terminal.sendData(data);
    });

    window.electronAPI.terminal.onData((data) => {
      xterm.write(data);
    });

    xtermRef.current = xterm;

    const handleResize = () => {
      fitAddon.fit();
      window.electronAPI.terminal.resize(xterm.cols, xterm.rows);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
    };
  }, []);

  return <div ref={terminalRef} id="terminal-container" />;
};

export default Terminal;