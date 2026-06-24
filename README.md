# Taxi Simulator

A React + TypeScript + Vite app for simulating taxi drivers and riders, with live location tracking on a map.

## Features

- **Driver Simulator** — register a simulated driver and stream live GPS-style location updates.
- **User Simulator** — simulate a rider creating bookings and tracking an assigned driver.
- **Live Tracking Map** — real-time positions rendered with Leaflet / React-Leaflet.
- **Real-time updates** — driver/rider state synced over Socket.IO.
- **State management** — Zustand stores for bookings, drivers, and developer logs.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand
- Socket.IO client
- Axios
- Leaflet / React-Leaflet

## Getting Started

### Prerequisites

- Node.js
- A running backend that exposes the tracking API and Socket.IO server

### Setup

```bash
npm install
cp .env.example .env
```

Update `.env` with your backend URLs:

```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### Scripts

```bash
npm run dev       # start the dev server
npm run build     # type-check and build for production
npm run lint      # run ESLint
npm run preview   # preview the production build
```

## Project Structure

```
src/
  api/          # API client setup
  components/   # UI components (map, driver selector, registration, activity panels)
  pages/        # Landing page, driver simulator, user simulator
  services/     # Tracking service logic
  socket/       # Socket.IO client setup
  stores/       # Zustand stores (bookings, drivers, developer logs)
```
