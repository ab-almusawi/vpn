# VPN Backend - NestJS WireGuard Management API

A robust NestJS backend for managing WireGuard VPN server configurations with PostgreSQL database integration.

## Features

- **Health Monitoring**: Real-time health checks for database and WireGuard service
- **Client Management**: Automatic client registration and configuration generation
- **IP Geolocation**: Automatic country/city detection for client IPs
- **WireGuard Integration**: Direct integration with WireGuard server
- **RESTful API**: Comprehensive REST API with Swagger documentation
- **PostgreSQL Database**: Persistent storage for client data and statistics

## API Endpoints

### Core Endpoints

- `GET /api/health` - System health check
- `GET /api/vpn/get-config` - Get/create VPN configuration for client
- `GET /api/clients` - List all VPN clients
- `GET /api/clients/stats/overview` - Client statistics overview
- `DELETE /api/clients/:deviceId` - Deactivate client

### Swagger Documentation

Access interactive API documentation at: `http://your-server:3000/api/docs`

## Quick Start

### 1. Prerequisites

- Ubuntu server with WireGuard installed
- PostgreSQL database
- Node.js 18+ and npm
- WireGuard server configured and running

### 2. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd vpn-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Environment Configuration

Edit `.env` file with your settings:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=vpn_backend

# Server Configuration
SERVER_PORT=3000
SERVER_HOST=0.0.0.0

# WireGuard Configuration
WIREGUARD_CONFIG_PATH=/etc/wireguard
WIREGUARD_INTERFACE=wg0
VPN_SERVER_PUBLIC_IP=81.30.161.139
VPN_SERVER_INTERNAL_IP=192.168.88.230
VPN_SERVER_PORT=51820

# Optional: IP Geolocation API Key
IP_GEOLOCATION_API_KEY=your_api_key

NODE_ENV=development
```

### 4. Database Setup

```bash
# Create PostgreSQL database
sudo -u postgres createdb vpn_backend

# Run the application (database tables will be created automatically)
npm run start:dev
```

### 5. Start the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## Client Flow Example

### 1. Client Requests Configuration

```javascript
// Client app makes request
const response = await fetch('http://81.30.161.139:3000/api/vpn/get-config?deviceId=device_123_android&deviceName=John\'s Phone');
const data = await response.json();

console.log(data);
// Output:
// {
//   "success": true,
//   "config": "[Interface]\nPrivateKey = ...\nAddress = 10.0.0.2/24\n...",
//   "clientInfo": {
//     "deviceId": "device_123_android",
//     "vpnIp": "10.0.0.2",
//     "country": "United States",
//     "city": "New York"
//   }
// }
```

### 2. Client Uses Configuration

The client app receives a complete WireGuard configuration that can be directly imported:

```ini
[Interface]
PrivateKey = CLIENT_PRIVATE_KEY_HERE
Address = 10.0.0.2/16
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = SERVER_PUBLIC_KEY_HERE
Endpoint = 81.30.161.139:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

## API Usage Examples

### Health Check

```bash
curl http://81.30.161.139:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development",
  "database": {
    "status": "connected",
    "responseTime": 12
  },
  "wireguard": {
    "status": "active",
    "interface": "wg0",
    "clients": 5
  }
}
```

### Get Client Configuration

```bash
curl "http://81.30.161.139:3000/api/vpn/get-config?deviceId=device_123_android&deviceName=John's%20Phone"
```

### List All Clients

```bash
curl http://81.30.161.139:3000/api/clients
```

### Get Client Statistics

```bash
curl http://81.30.161.139:3000/api/clients/stats/overview
```

Response:
```json
{
  "totalClients": 25,
  "activeClients": 20,
  "inactiveClients": 5,
  "clientsByCountry": {
    "United States": 10,
    "Canada": 5,
    "United Kingdom": 5,
    "Germany": 3,
    "Unknown": 2
  },
  "recentClients": []
}
```

## WireGuard Server Setup

### Basic WireGuard Configuration

1. Install WireGuard:
```bash
sudo apt update
sudo apt install wireguard
```

2. Generate server keys:
```bash
cd /etc/wireguard
umask 077
wg genkey | tee server_private_key | wg pubkey > server_public_key
```

3. Create server configuration `/etc/wireguard/wg0.conf`:
```ini
[Interface]
PrivateKey = SERVER_PRIVATE_KEY_HERE
Address = 10.0.0.1/16
ListenPort = 51820
SaveConfig = true

# Enable IP forwarding
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
```

4. Enable and start WireGuard:
```bash
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

5. Enable IP forwarding:
```bash
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Development

### Available Scripts

```bash
npm run start:dev    # Development mode with hot reload
npm run build        # Build for production
npm run start:prod   # Run production build
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts           # Root module
├── entities/               # Database entities
│   └── client.entity.ts
├── shared/                 # Shared DTOs and utilities
│   └── dto/
├── health/                 # Health check module
├── vpn/                    # VPN configuration module
│   ├── vpn.controller.ts
│   ├── vpn.service.ts
│   ├── wireguard.service.ts
│   └── geolocation.service.ts
└── clients/               # Client management module
```

## Security Considerations

1. **Server Access**: Ensure the Node.js application has proper permissions to read/write WireGuard configuration files
2. **Database Security**: Use strong passwords and restrict database access
3. **API Security**: Consider adding authentication for production use
4. **Firewall**: Configure firewall rules to allow only necessary traffic
5. **HTTPS**: Use reverse proxy (nginx) with SSL in production

## Production Deployment

### Using PM2

```bash
npm install -g pm2
npm run build
pm2 start dist/main.js --name vpn-backend
pm2 startup
pm2 save
```

### Using Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/main"]
```

## Troubleshooting

### Common Issues

1. **WireGuard Permission Denied**: Ensure the application runs with proper permissions
2. **Database Connection Failed**: Check PostgreSQL service and credentials
3. **IP Geolocation Not Working**: Verify API key or check if free APIs are accessible

### Logs

```bash
# View application logs
tail -f /var/log/vpn-backend.log

# View WireGuard logs
sudo journalctl -u wg-quick@wg0
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following NestJS conventions
4. Add tests for new features
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review server logs for detailed error information
