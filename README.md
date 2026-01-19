# iDRAC Fan Controller

A web-based fan controller for Dell PowerEdge servers (R730 and similar) using IPMI. Control fan speeds manually or automatically based on temperature curves.

## Features

- 🌡️ **Temperature Monitoring** - Real-time monitoring of server temperatures
- 🌀 **Fan Control** - Manual or automatic fan speed control
- 📊 **Fan Curves** - Define custom temperature-to-fan-speed curves
- ⚙️ **Multiple Presets** - Create and switch between different fan control profiles
- 📅 **Scheduled Jobs** - Automatic fan control based on cron schedules
- 🐳 **Docker Support** - Easy deployment with Docker
- 📈 **System Monitoring** - View power consumption, chassis status, and sensor data

## Prerequisites

- Node.js 22 or higher
- `ipmitool` installed on your system
- Dell PowerEdge server with iDRAC (tested on R730)
- Network access to iDRAC interface

### Installing ipmitool

**macOS:**

```bash
brew install ipmitool
```

**Ubuntu/Debian:**

```bash
sudo apt-get install ipmitool
```

**Alpine Linux (Docker):**

```bash
apk add --no-cache ipmitool
```

## Installation

### Development

1. Clone the repository:

```bash
git clone <repository-url>
cd idrac-fan-controller
```

2. Install dependencies:

```bash
npm install
```

3. Start the development servers:

```bash
# Start both client and server
npm run start:dev --workspace=server
npm run dev --workspace=client
```

The server will run on `http://localhost:3000` and the client on `http://localhost:5173`.

### Production with Docker

1. Build the Docker image:

```bash
docker build -t idrac-fan-controller .
```

2. Run the container:

```bash
docker run -p 3000:3000 idrac-fan-controller
```

Or use the pre-built image from GitHub Container Registry:

```bash
docker pull ghcr.io/javilobo8/idrac-fan-controller:latest
docker run -p 3000:3000 ghcr.io/javilobo8/idrac-fan-controller:latest
```

## Configuration

### Creating a Machine

Machines are configured with the following parameters:

- **Name**: Friendly name for your server
- **Host**: iDRAC IP address
- **User**: iDRAC username
- **Password**: iDRAC password
- **Cron Schedule**: When to run the fan control job (e.g., `* * * * *` for every minute)
- **Enabled**: Whether the scheduled job is active

### Fan Curves

Define temperature points and corresponding fan speeds:

```json
[
  { "temperature": 30, "fanSpeed": 10 },
  { "temperature": 40, "fanSpeed": 30 },
  { "temperature": 50, "fanSpeed": 50 },
  { "temperature": 60, "fanSpeed": 70 },
  { "temperature": 70, "fanSpeed": 90 }
]
```

The system will automatically adjust fan speeds based on the maximum CPU temperature.

## Usage

### Manual Fan Control

Set a fixed fan speed percentage (0-100%) without using a temperature curve.

### Automatic Fan Control

1. Create a preset with a custom fan curve
2. Set the preset as active
3. Enable the machine
4. The system will automatically adjust fan speeds based on the cron schedule

## API Endpoints

- `POST /api/machines` - Create a new machine
- `GET /api/machines` - List all machines
- `PUT /api/machines/:id` - Update a machine
- `DELETE /api/machines/:id` - Delete a machine

## IPMI Commands

The application uses the following IPMI commands:

- **Get Temperatures**: `ipmitool sdr type temperature`
- **Get Fan Speeds**: `ipmitool sdr type Fan`
- **Get Power Consumption**: `ipmitool dcmi power reading`
- **Set Fan Control Mode**: `ipmitool raw 0x30 0x30 0x01 [0x00|0x01]`
- **Set Fan Speed**: `ipmitool raw 0x30 0x30 0x02 0xff 0x[speed]`

## Architecture

- **Server**: NestJS application with IPMI client and scheduler
- **Client**: React SPA with Vite
- **Workspaces**: Monorepo managed with npm workspaces

## Development

```bash
# Run server in watch mode
npm run start:dev --workspace=server

# Run client in dev mode
npm run dev --workspace=client

# Build both applications
npm run build --workspace=server
npm run build --workspace=client

# Lint code
npm run lint --workspace=server
npm run lint --workspace=client
```

## Safety Notes

⚠️ **Warning**: Reducing fan speeds too much can cause your server to overheat. Always monitor temperatures when using custom fan curves.

- Start with conservative fan curves
- Monitor your server's temperatures regularly
- The iDRAC will override fan control if temperatures become critical

## License

UNLICENSED

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
