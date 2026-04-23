# Gemini Desktop Workspace

A unified AI workspace that merges a sleek chat interface with a live, context-aware Gemini CLI terminal.

## Key Features
- **Unified File Context**: Drag and drop files into the GUI to instantly make them available to the CLI session.
- **Bidirectional Sync**: Real-time asset management reflecting file changes from both the GUI and CLI.
- **Embedded Terminal**: High-performance `xterm.js` terminal attached to a live Gemini process.
- **Project Isolation**: Every session runs in its own isolated workspace to prevent context pollution.

## Tech Stack
- **Desktop**: Electron
- **Frontend**: React (TypeScript) + Vite
- **Terminal**: node-pty + @xterm/xterm
- **Sync**: chokidar

## Getting Started
1. Install dependencies: `npm install`
2. Run development mode: `npm run dev`
3. Build for production: `npm run build`

## Architecture
This project follows a **Unified Workspace** strategy where the Electron main process manages hidden session directories and orchestrates standard I/O between the user and the Gemini CLI process.
