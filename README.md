# Supply Chain Realtime Dashboard

A lightweight Node.js dashboard for monitoring supply-chain disruption risk with:

- Market and macro signals (metals + major indices)
- Disruption news feed
- Realtime disruption predictor with aggregated disruption indicator score
- Source transparency (`live` vs `simulated`)

## 1) Prerequisites

- **Node.js 18+** (Node 20+ recommended)
- npm (bundled with Node)
- Internet access for live sources (dashboard falls back to simulated data if blocked)

Check your version:

```bash
node -v
npm -v
```

---

## 2) Clone / copy project

If using git:

```bash
git clone <your-repo-url>
cd SChainRealtime
```

If already downloaded, just open a terminal in the project folder.

---

## 3) Install dependencies

This project has no external runtime dependencies beyond Node itself, but npm still reads `package.json`.

```bash
npm install
```

> If your environment blocks npm registry access, you can still run this app because it uses only built-in Node modules.

---

## 4) Run the app

Start the server:

```bash
node server.js
```

Or with npm script:

```bash
npm start
```

By default, the app runs at:

- `http://localhost:3000`

---

## 5) Platform-specific instructions

## macOS

### Option A: Terminal
1. Open **Terminal**.
2. Navigate to project directory:
   ```bash
   cd /path/to/SChainRealtime
   ```
3. Run:
   ```bash
   node server.js
   ```
4. Open `http://localhost:3000` in Safari/Chrome.

### Option B: zsh + npm script
```bash
cd /path/to/SChainRealtime
npm start
```

---

## Windows

### Option A: PowerShell
1. Open **PowerShell**.
2. Navigate to project directory:
   ```powershell
   cd C:\path\to\SChainRealtime
   ```
3. Run:
   ```powershell
   node server.js
   ```
4. Open `http://localhost:3000` in Edge/Chrome.

### Option B: Command Prompt (cmd)
```cmd
cd C:\path\to\SChainRealtime
npm start
```

---

## 6) Stop the app

- In the terminal running the server, press:
  - `Ctrl + C` (macOS/Windows)

---

## 7) Common troubleshooting

## Port 3000 already in use

Run on a different port:

### macOS / Linux
```bash
PORT=3001 node server.js
```

### Windows PowerShell
```powershell
$env:PORT=3001; node server.js
```

### Windows cmd
```cmd
set PORT=3001 && node server.js
```

Then open `http://localhost:3001`.

## Live data looks simulated

Some upstream APIs can return 403/blocked responses in restricted networks. The app automatically falls back to simulated values and labels sources accordingly.

## Node not recognized

Install Node.js from: https://nodejs.org/

After installation, reopen terminal and rerun:

```bash
node -v
```

---

## 8) What to expect in the UI

- Realtime/simulated coverage status
- Realtime disruption predictor
- Final aggregated disruption indicator with score legend and urgency colors
- News and market panels

The dashboard refreshes automatically every 30 minutes.
