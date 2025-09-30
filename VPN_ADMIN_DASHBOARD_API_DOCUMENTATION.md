# VPN Admin Dashboard - Complete API Documentation

## Table of Contents
- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Authentication & Security](#authentication--security)
- [Data Transfer Objects](#data-transfer-objects)
- [Environment Configuration](#environment-configuration)
- [Dashboard Features Specification](#dashboard-features-specification)
- [Development Setup](#development-setup)

## Project Overview

This is a NestJS backend service for managing a WireGuard VPN server with an admin dashboard. The system provides comprehensive VPN client management, server monitoring, and configuration capabilities.

### Base URL
- **Development**: `http://81.30.161.139/api`
- **Production**: `http://81.30.161.139/api`
- **Swagger Documentation**: `http://81.30.161.139/api/docs`

### Key Features
- WireGuard VPN server management
- Client registration and management
- Real-time server statistics
- Geolocation tracking
- Admin authentication system
- Health monitoring
- Server configuration validation

## Technology Stack

### Backend Framework
- **NestJS 10.4.6** - Node.js framework
- **TypeScript 5.6.3** - Programming language
- **Express.js** - HTTP server

### Database
- **PostgreSQL** - Primary database
- **TypeORM 0.3.20** - ORM for database operations

### Authentication & Security
- **JWT (JSON Web Tokens)** - Authentication
- **bcryptjs** - Password hashing
- **Passport.js** - Authentication middleware

### API Documentation
- **Swagger/OpenAPI** - API documentation

### Validation & Transform
- **class-validator** - DTO validation
- **class-transformer** - Data transformation

## Architecture Overview

```
src/
├── app.module.ts           # Main application module
├── main.ts                 # Application entry point
├── auth/                   # Authentication module
│   ├── auth.controller.ts  # Login, profile endpoints
│   ├── auth.service.ts     # Auth business logic
│   ├── auth.module.ts      # Auth module configuration
│   ├── dto/
│   │   └── login.dto.ts    # Login data transfer object
│   ├── guards/
│   │   └── jwt-auth.guard.ts # JWT protection guard
│   └── strategies/
│       └── jwt.strategy.ts  # JWT validation strategy
├── clients/                # Client management module
│   ├── clients.controller.ts # Client CRUD endpoints
│   ├── clients.service.ts   # Client business logic
│   └── clients.module.ts    # Client module configuration
├── vpn/                    # VPN management module
│   ├── vpn.controller.ts   # VPN endpoints
│   ├── vpn.service.ts      # VPN business logic
│   ├── vpn.module.ts       # VPN module configuration
│   ├── wireguard.service.ts # WireGuard specific operations
│   └── geolocation.service.ts # IP geolocation service
├── health/                 # Health monitoring module
│   ├── health.controller.ts # Health check endpoints
│   ├── health.service.ts   # Health monitoring logic
│   └── health.module.ts    # Health module configuration
├── entities/               # Database entities
│   ├── client.entity.ts    # Client data model
│   └── admin-user.entity.ts # Admin user data model
└── shared/                 # Shared resources
    └── dto/                # Data transfer objects
        ├── create-client.dto.ts
        ├── update-client.dto.ts
        └── register-vpn-client.dto.ts
```

## Database Schema

### Admin Users Table (`admin_users`)
```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Clients Table (`clients`)
```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(255) NULL,
    real_ip VARCHAR(45) NOT NULL,
    country VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    vpn_ip VARCHAR(45) UNIQUE NOT NULL,
    public_key VARCHAR(255) UNIQUE NOT NULL,
    private_key VARCHAR(255) NOT NULL,
    preshared_key VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT true,
    last_handshake TIMESTAMP NULL,
    bytes_sent BIGINT DEFAULT 0,
    bytes_received BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_clients_device_id ON clients(device_id);
CREATE INDEX idx_clients_real_ip ON clients(real_ip);
```

## API Endpoints

### Authentication Endpoints

#### POST `/auth/login`
Authenticate admin user and return JWT token.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "username": "admin",
    "email": "admin@vpn.local",
    "role": "admin",
    "lastLogin": "2024-01-01T12:00:00.000Z"
  }
}
```

#### GET `/auth/profile`
Get current authenticated admin user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid-here",
  "username": "admin",
  "email": "admin@vpn.local",
  "role": "admin",
  "lastLogin": "2024-01-01T12:00:00.000Z"
}
```

### Client Management Endpoints (Admin Protected)

#### GET `/clients`
Get all VPN clients.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid-here",
    "deviceId": "device_12345_android",
    "deviceName": "John's Phone",
    "realIp": "203.0.113.1",
    "country": "United States",
    "city": "New York",
    "vpnIp": "10.0.0.2",
    "isActive": true,
    "lastHandshake": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T10:00:00.000Z"
  }
]
```

#### GET `/clients/search`
Search clients by device name, country, or IP.

**Query Parameters:**
- `q` (required): Search query
- `filter` (optional): Filter by status ('active', 'inactive')

**Headers:** `Authorization: Bearer <token>`

**Example:** `GET /clients/search?q=iPhone&filter=active`

#### GET `/clients/stats/overview`
Get client statistics overview.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
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

#### GET `/clients/:id`
Get client by ID.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** Client object

#### POST `/clients`
Create new client manually.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "deviceId": "device_12345_android",
  "deviceName": "John's Phone",
  "realIp": "203.0.113.1"
}
```

#### PUT `/clients/:id`
Update client details.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "deviceName": "John's Updated Phone",
  "isActive": true
}
```

#### PUT `/clients/:id/activate`
Reactivate a previously deactivated client.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Client activated successfully"
}
```

#### DELETE `/clients/:deviceId`
Deactivate client and remove from WireGuard server.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Client deactivated successfully"
}
```

#### DELETE `/clients/bulk`
Bulk deactivate multiple clients.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "clientIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

### VPN Management Endpoints

#### POST `/vpn/register`
Register VPN client with server-generated keys.

**Request Body:**
```json
{
  "deviceId": "unique-device-identifier",
  "deviceName": "Samsung Galaxy S21",
  "realIp": "203.123.45.67"
}
```

**Response (201):**
```json
{
  "success": true,
  "isNewClient": true,
  "clientInfo": {
    "deviceId": "unique-device-identifier",
    "deviceName": "Samsung Galaxy S21",
    "vpnIp": "172.16.0.2",
    "country": "Iraq",
    "city": "Amarah"
  },
  "serverConfig": {
    "serverPublicKey": "CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=",
    "serverEndpoint": "81.30.161.139:51820",
    "assignedIp": "172.16.0.2",
    "dns": "8.8.8.8, 8.8.4.4"
  },
  "clientKeys": {
    "privateKey": "iPbR70lgp09QQ9GS/BQE1FVmSLI2H/F9qavzBUpV9X0=",
    "publicKey": "CZiCVeZpKH97PNrY/1rodYAPeLDF3AaPrxFo+gOnLx8=",
    "presharedKey": "DummyPresharedKey+development+use+only+key+here="
  },
  "configTemplate": "[Interface]\\nPrivateKey = iPbR70lgp09QQ9GS/BQE1FVmSLI2H/F9qavzBUpV9X0=\\nAddress = 172.16.0.2/16\\nDNS = 8.8.8.8, 8.8.4.4\\n\\n[Peer]\\nPublicKey = CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=\\nEndpoint = 81.30.161.139:51820\\nAllowedIPs = 0.0.0.0/0\\nPersistentKeepalive = 25",
  "instructions": "Use the provided private key with this configuration to connect to the VPN."
}
```

#### GET `/vpn/get-config`
Legacy endpoint - Get VPN configuration with server-generated keys.

**Query Parameters:**
- `deviceId` (required): Unique device identifier
- `deviceName` (optional): Human readable device name

**Response (200):**
```json
{
  "success": true,
  "config": "[Interface]\\nPrivateKey = ABCD...\\nAddress = 172.16.0.2/16\\nDNS = 8.8.8.8\\n\\n[Peer]\\nPublicKey = EFGH...\\nEndpoint = 81.30.161.139:51820\\nAllowedIPs = 0.0.0.0/0\\nPersistentKeepalive = 25",
  "clientInfo": {
    "deviceId": "device_12345_android",
    "vpnIp": "172.16.0.2",
    "country": "United States",
    "city": "New York"
  },
  "warning": "Server-side key generation is less secure. Consider using /register endpoint."
}
```

#### GET `/vpn/server-stats`
Get WireGuard server statistics (Admin Protected).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "interface": "wg0",
  "totalPeers": 25,
  "peers": [
    {
      "publicKey": "ABC123...",
      "lastHandshake": "2 minutes ago",
      "bytesReceived": "1.2 MB",
      "bytesSent": "890 KB"
    }
  ]
}
```

#### GET `/vpn/verify-server`
Verify server WireGuard configuration (Admin Protected).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "isValid": true,
  "currentPublicKey": "CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=",
  "expectedPublicKey": "CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=",
  "errors": null
}
```

#### GET `/vpn/validate-config`
Validate WireGuard configuration file (Admin Protected).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "isValid": true,
  "errors": []
}
```

### Health Monitoring Endpoints

#### GET `/health`
Health check endpoint.

**Response (200):**
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

## Authentication & Security

### JWT Authentication
- **Token Type:** Bearer token
- **Header:** `Authorization: Bearer <token>`
- **Expiry:** Configurable (default: 24 hours)

### Protected Routes
All admin endpoints require JWT authentication:
- `/clients/*` - All client management endpoints
- `/vpn/server-stats` - Server statistics
- `/vpn/verify-server` - Server verification
- `/vpn/validate-config` - Config validation
- `/auth/profile` - Admin profile

### Public Routes
- `POST /auth/login` - Admin login
- `POST /vpn/register` - Client registration
- `GET /vpn/get-config` - Legacy client config
- `GET /health` - Health check

## Data Transfer Objects (DTOs)

### LoginDto
```typescript
{
  username: string;    // Username or email (1-100 chars)
  password: string;    // Password (6-100 chars)
}
```

### CreateClientDto
```typescript
{
  deviceId: string;    // Unique device identifier (1-100 chars)
  deviceName?: string; // Optional human readable name (1-100 chars)
  realIp: string;      // Valid IP address
  publicKey?: string;  // Optional WireGuard public key (44 chars)
}
```

### UpdateClientDto
```typescript
{
  deviceName?: string; // Optional device name (1-100 chars)
  isActive?: boolean;  // Optional status flag
}
```

### RegisterVpnClientDto
```typescript
{
  deviceId: string;    // Unique device identifier (1-100 chars)
  deviceName?: string; // Optional device name (1-100 chars)
  realIp?: string;     // Optional IP (auto-extracted if not provided)
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Server Configuration
SERVER_PORT=3000
SERVER_HOST=0.0.0.0
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=vpn_user
DB_PASSWORD=vpn_password
DB_DATABASE=vpn_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# WireGuard Configuration
WG_CONFIG_PATH=/etc/wireguard/wg0.conf
WG_INTERFACE=wg0
WG_SERVER_IP=172.16.0.1
WG_SERVER_PORT=51820
WG_SERVER_ENDPOINT=your-server-ip:51820

# Network Configuration
VPN_SUBNET=172.16.0.0/16
DNS_SERVERS=8.8.8.8,8.8.4.4

# Admin User (Created automatically on startup)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_EMAIL=admin@vpn.local
```

## Dashboard Features Specification

### 1. Authentication System
- **Login Page**: Username/password authentication
- **Session Management**: JWT token handling
- **Auto-logout**: On token expiration
- **Profile Management**: View admin profile

### 2. Dashboard Overview
- **Statistics Cards**:
  - Total Clients
  - Active Clients  
  - Inactive Clients
  - Server Status
- **Charts**:
  - Clients by Country (Pie/Donut Chart)
  - Registration Timeline (Line Chart)
  - Bandwidth Usage (Bar Chart)
- **Recent Activity**: Latest client registrations

### 3. Client Management
- **Client List**:
  - Sortable table with pagination
  - Search functionality
  - Filter by status (active/inactive)
  - Bulk operations (activate/deactivate)
- **Client Details**:
  - Device information
  - Connection statistics
  - Location data
  - WireGuard configuration
- **Client Actions**:
  - Activate/Deactivate
  - Update device name
  - View connection history
  - Delete client

### 4. Server Management
- **Server Status**:
  - WireGuard interface status
  - Server configuration validation
  - System health monitoring
- **Configuration**:
  - View server public key
  - Validate configuration files
  - Server endpoint settings
- **Monitoring**:
  - Real-time connection statistics
  - Bandwidth monitoring
  - Error logs

### 5. Analytics & Reports
- **Usage Statistics**:
  - Bandwidth usage per client
  - Connection duration
  - Geographic distribution
- **Reports**:
  - Daily/Weekly/Monthly reports
  - Export functionality (CSV/PDF)
  - Client activity reports

### 6. Settings & Configuration
- **Server Settings**:
  - WireGuard configuration
  - Network settings
  - DNS configuration
- **Admin Settings**:
  - Profile management
  - Password change
  - Session timeout

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- WireGuard installed and configured

### Installation Steps

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd vpn-backend
npm install
```

2. **Database Setup**
```bash
# Create database
createdb vpn_db

# Configure environment
cp .env.example .env
# Edit .env with your configuration
```

3. **Start Development Server**
```bash
npm run start:dev
```

4. **Access API Documentation**
Visit: `http://localhost:3000/api/docs`

### Development Commands
```bash
npm run start          # Start production server
npm run start:dev      # Start development server with watch
npm run start:debug    # Start with debugging
npm run build          # Build for production
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run test           # Run unit tests
npm run test:e2e       # Run end-to-end tests
```

### Project Scripts (from vpn-service.txt)
```bash
# Check VPN status
vpn-status

# Edit WireGuard config
sudo nano /etc/wireguard/wg0.conf

# Start WireGuard
sudo wg-quick up wg0

# Service management
sudo systemctl start vpn-api
sudo systemctl stop vpn-api
sudo systemctl restart vpn-api
sudo systemctl status vpn-api

# View logs
sudo journalctl -u vpn-api -f

# Auto-start configuration
sudo systemctl enable vpn-api    # Enable auto-start
sudo systemctl disable vpn-api   # Disable auto-start
```

---

**Note**: This documentation is based on NestJS backend version 1.0.0. For the most up-to-date API specifications, refer to the Swagger documentation at `/api/docs` when the server is running.
