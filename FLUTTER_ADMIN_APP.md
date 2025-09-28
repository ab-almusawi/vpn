# Flutter VPN Admin App - Administrator Guide

## 🎯 Overview

This guide provides complete instructions for building a comprehensive Flutter admin app for **VPN administrators**. The app focuses on user management, server monitoring, statistics, and administrative control of your VPN infrastructure.

---

## 🏗️ Architecture

```
┌─────────────────┐    HTTPS/REST API    ┌─────────────────┐
│  Flutter Admin  │ ◄─────────────────► │  NestJS Backend │
│      App        │    (Protected)       │                 │
│ ┌─────────────┐ │                      │ ┌─────────────┐ │
│ │ Dashboard   │ │                      │ │ Admin Auth  │ │
│ │ Management  │ │                      │ │ Client Mgmt │ │
│ │ Monitoring  │ │                      │ │ Statistics  │ │
│ └─────────────┘ │                      │ └─────────────┘ │
└─────────────────┘                      └─────────────────┘

🔧 Admin Features                        🖥️  VPN Server
- Admin Authentication (JWT)            - Protected Admin API
- Client Management Dashboard           - WireGuard Server (Port 51820)  
- Real-time Statistics                  - PostgreSQL Database
- Server Health Monitoring              - User Analytics
- Bulk Operations                       - Connection Tracking
```

---

## 📚 Backend API Reference

### **Base URL**: `http://81.30.161.139`
### **API Prefix**: `/api`
### **Authentication**: Bearer Token Required for all admin endpoints

### 🔐 **Authentication Endpoints**

#### **1. Admin Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "hameed",
  "password": "19951995Bh"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "hameed", 
    "email": "hameed@vpn.local",
    "role": "admin",
    "lastLogin": "2025-09-28T14:00:00.000Z"
  }
}
```

#### **2. Get Admin Profile**
```http
GET /api/auth/profile
Authorization: Bearer {access_token}
```

---

### 👥 **Client Management Endpoints**

#### **3. Get All Clients**
```http
GET /api/clients
Authorization: Bearer {access_token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "deviceId": "flutter_phone_12345",
    "deviceName": "John's iPhone",
    "realIp": "203.0.113.1",
    "country": "Iraq",
    "city": "Amarah",
    "vpnIp": "172.16.0.100",
    "isActive": true,
    "lastHandshake": "2025-09-28T14:00:00.000Z",
    "bytesSent": 1048576,
    "bytesReceived": 2097152,
    "createdAt": "2025-09-28T10:00:00.000Z"
  }
]
```

#### **4. Get Client by ID**
```http
GET /api/clients/{id}
Authorization: Bearer {access_token}
```

#### **5. Search Clients**
```http
GET /api/clients/search?q=iPhone&filter=active
Authorization: Bearer {access_token}
```

#### **6. Get Client Statistics Overview**
```http
GET /api/clients/stats/overview
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "totalClients": 150,
  "activeClients": 120,
  "inactiveClients": 30,
  "clientsByCountry": {
    "Iraq": 45,
    "United States": 30,
    "Germany": 25,
    "Canada": 20,
    "Unknown": 30
  },
  "recentClients": [...]
}
```

#### **7. Deactivate Client**
```http
DELETE /api/clients/{deviceId}
Authorization: Bearer {access_token}
```

#### **8. Update Client**
```http
PUT /api/clients/{id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "deviceName": "Updated Device Name",
  "isActive": false
}
```

#### **9. Reactivate Client**
```http
PUT /api/clients/{id}/activate
Authorization: Bearer {access_token}
```

#### **10. Bulk Deactivate Clients**
```http
DELETE /api/clients/bulk
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "clientIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

### 📊 **Server Monitoring Endpoints**

#### **11. WireGuard Server Stats**
```http
GET /api/vpn/server-stats
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "interface": "wg0",
  "totalPeers": 120,
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

#### **12. System Health Check**
```http
GET /api/health
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-09-28T14:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "environment": "production",
  "database": {
    "status": "connected",
    "responseTime": 8
  },
  "wireguard": {
    "status": "active",
    "interface": "wg0",
    "clients": 120
  }
}
```

---

## 📱 Flutter Admin Implementation Guide

### **1. Dependencies**

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP & API
  dio: ^5.3.2
  json_annotation: ^4.8.1
  
  # State Management
  riverpod: ^2.4.9
  flutter_riverpod: ^2.4.9
  
  # Secure Storage (for auth tokens)
  flutter_secure_storage: ^9.0.0
  
  # Charts & Data Visualization
  fl_chart: ^0.65.0
  syncfusion_flutter_charts: ^23.2.7
  
  # UI Components
  data_table_2: ^2.5.12
  flutter_staggered_grid_view: ^0.7.0
  
  # Utilities
  intl: ^0.19.0
  timeago: ^3.6.1
  
  # Navigation
  go_router: ^12.1.1
  
dev_dependencies:
  # Code Generation
  json_serializable: ^6.7.1
  build_runner: ^2.4.7
```

### **2. Project Structure**

```
lib/
├── main.dart
├── core/
│   ├── constants/
│   │   └── api_constants.dart
│   ├── network/
│   │   ├── api_client.dart
│   │   └── auth_interceptor.dart
│   ├── storage/
│   │   └── secure_storage.dart
│   └── utils/
│       ├── formatters.dart
│       └── validators.dart
├── features/
│   ├── auth/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   ├── dashboard/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   ├── clients/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   └── monitoring/
│       ├── data/
│       ├── domain/
│       └── presentation/
├── shared/
│   ├── models/
│   ├── widgets/
│   └── providers/
└── routes/
    └── app_router.dart
```

### **3. Authentication Implementation**

#### **Auth Models**
```dart
// lib/shared/models/auth_models.dart
import 'package:json_annotation/json_annotation.dart';

part 'auth_models.g.dart';

@JsonSerializable()
class LoginRequest {
  final String username;
  final String password;

  LoginRequest({required this.username, required this.password});

  factory LoginRequest.fromJson(Map<String, dynamic> json) =>
      _$LoginRequestFromJson(json);
  Map<String, dynamic> toJson() => _$LoginRequestToJson(this);
}

@JsonSerializable()
class LoginResponse {
  @JsonKey(name: 'access_token')
  final String accessToken;
  final AdminUser user;

  LoginResponse({required this.accessToken, required this.user});

  factory LoginResponse.fromJson(Map<String, dynamic> json) =>
      _$LoginResponseFromJson(json);
  Map<String, dynamic> toJson() => _$LoginResponseToJson(this);
}

@JsonSerializable()
class AdminUser {
  final String id;
  final String username;
  final String email;
  final String role;
  @JsonKey(name: 'lastLogin')
  final String? lastLogin;

  AdminUser({
    required this.id,
    required this.username,
    required this.email,
    required this.role,
    this.lastLogin,
  });

  factory AdminUser.fromJson(Map<String, dynamic> json) =>
      _$AdminUserFromJson(json);
  Map<String, dynamic> toJson() => _$AdminUserToJson(this);
}
```

#### **Auth Service**
```dart
// lib/features/auth/data/auth_service.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../shared/models/auth_models.dart';

class AuthService {
  final ApiClient _apiClient;

  AuthService(this._apiClient);

  Future<LoginResponse> login(LoginRequest request) async {
    final response = await _apiClient.login(request);
    
    // Store token securely
    await SecureStorageService.storeAuthToken(response.accessToken);
    
    return response;
  }

  Future<AdminUser?> getCurrentUser() async {
    try {
      return await _apiClient.getProfile();
    } catch (e) {
      return null;
    }
  }

  Future<void> logout() async {
    await SecureStorageService.clearAll();
  }

  Future<bool> isLoggedIn() async {
    final token = await SecureStorageService.getAuthToken();
    return token != null;
  }
}

// Provider
final authServiceProvider = Provider<AuthService>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return AuthService(apiClient);
});
```

### **4. Client Management Models**

```dart
// lib/shared/models/client_models.dart
import 'package:json_annotation/json_annotation.dart';

part 'client_models.g.dart';

@JsonSerializable()
class VpnClient {
  final String id;
  final String deviceId;
  final String? deviceName;
  final String realIp;
  final String? country;
  final String? city;
  final String vpnIp;
  final bool isActive;
  final String? lastHandshake;
  final int bytesSent;
  final int bytesReceived;
  final String createdAt;
  final String updatedAt;

  VpnClient({
    required this.id,
    required this.deviceId,
    this.deviceName,
    required this.realIp,
    this.country,
    this.city,
    required this.vpnIp,
    required this.isActive,
    this.lastHandshake,
    required this.bytesSent,
    required this.bytesReceived,
    required this.createdAt,
    required this.updatedAt,
  });

  factory VpnClient.fromJson(Map<String, dynamic> json) =>
      _$VpnClientFromJson(json);
  Map<String, dynamic> toJson() => _$VpnClientToJson(this);
}

@JsonSerializable()
class ClientsOverview {
  final int totalClients;
  final int activeClients;
  final int inactiveClients;
  final Map<String, int> clientsByCountry;
  final List<VpnClient> recentClients;

  ClientsOverview({
    required this.totalClients,
    required this.activeClients,
    required this.inactiveClients,
    required this.clientsByCountry,
    required this.recentClients,
  });

  factory ClientsOverview.fromJson(Map<String, dynamic> json) =>
      _$ClientsOverviewFromJson(json);
  Map<String, dynamic> toJson() => _$ClientsOverviewToJson(this);
}

@JsonSerializable()
class ServerStats {
  final String interface;
  final int totalPeers;
  final List<PeerInfo> peers;

  ServerStats({
    required this.interface,
    required this.totalPeers,
    required this.peers,
  });

  factory ServerStats.fromJson(Map<String, dynamic> json) =>
      _$ServerStatsFromJson(json);
  Map<String, dynamic> toJson() => _$ServerStatsToJson(this);
}

@JsonSerializable()
class PeerInfo {
  final String publicKey;
  final String lastHandshake;
  final String bytesReceived;
  final String bytesSent;

  PeerInfo({
    required this.publicKey,
    required this.lastHandshake,
    required this.bytesReceived,
    required this.bytesSent,
  });

  factory PeerInfo.fromJson(Map<String, dynamic> json) =>
      _$PeerInfoFromJson(json);
  Map<String, dynamic> toJson() => _$PeerInfoToJson(this);
}
```

### **5. API Client with Authentication**

```dart
// lib/core/network/api_client.dart
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';
import '../../shared/models/auth_models.dart';
import '../../shared/models/client_models.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    ));

    _dio.interceptors.add(AuthInterceptor());
    _dio.interceptors.add(LogInterceptor(requestBody: true, responseBody: true));
  }

  // Authentication
  Future<LoginResponse> login(LoginRequest request) async {
    final response = await _dio.post(
      ApiConstants.login,
      data: request.toJson(),
    );
    return LoginResponse.fromJson(response.data);
  }

  Future<AdminUser> getProfile() async {
    final response = await _dio.get(ApiConstants.profile);
    return AdminUser.fromJson(response.data);
  }

  // Client Management
  Future<List<VpnClient>> getAllClients() async {
    final response = await _dio.get(ApiConstants.clients);
    return (response.data as List)
        .map((json) => VpnClient.fromJson(json))
        .toList();
  }

  Future<VpnClient> getClientById(String id) async {
    final response = await _dio.get('${ApiConstants.clients}/$id');
    return VpnClient.fromJson(response.data);
  }

  Future<List<VpnClient>> searchClients(String query, {String? filter}) async {
    final response = await _dio.get(
      '${ApiConstants.clients}/search',
      queryParameters: {
        'q': query,
        if (filter != null) 'filter': filter,
      },
    );
    return (response.data as List)
        .map((json) => VpnClient.fromJson(json))
        .toList();
  }

  Future<ClientsOverview> getClientsOverview() async {
    final response = await _dio.get('${ApiConstants.clients}/stats/overview');
    return ClientsOverview.fromJson(response.data);
  }

  Future<void> deactivateClient(String deviceId) async {
    await _dio.delete('${ApiConstants.clients}/$deviceId');
  }

  Future<VpnClient> updateClient(String id, Map<String, dynamic> updates) async {
    final response = await _dio.put('${ApiConstants.clients}/$id', data: updates);
    return VpnClient.fromJson(response.data);
  }

  Future<void> activateClient(String id) async {
    await _dio.put('${ApiConstants.clients}/$id/activate');
  }

  Future<void> bulkDeactivateClients(List<String> clientIds) async {
    await _dio.delete('${ApiConstants.clients}/bulk', data: {'clientIds': clientIds});
  }

  // Server Monitoring
  Future<ServerStats> getServerStats() async {
    final response = await _dio.get(ApiConstants.serverStats);
    return ServerStats.fromJson(response.data);
  }

  Future<Map<String, dynamic>> getSystemHealth() async {
    final response = await _dio.get(ApiConstants.health);
    return response.data;
  }
}

class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await SecureStorageService.getAuthToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Token expired, clear storage
      SecureStorageService.clearAll();
      // Navigate to login screen
    }
    handler.next(err);
  }
}

// Provider
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
```

### **6. Dashboard Screen**

```dart
// lib/features/dashboard/presentation/screens/dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/stats_card.dart';
import '../widgets/clients_chart.dart';
import '../widgets/recent_clients_list.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(dashboardProvider.notifier).loadDashboardData();
    });
  }

  @override
  Widget build(BuildContext context) {
    final dashboardState = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('VPN Admin Dashboard'),
        actions: [
          IconButton(
            onPressed: () => ref.read(dashboardProvider.notifier).refreshData(),
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            onPressed: () => _showLogoutDialog(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: dashboardState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : dashboardState.error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error, size: 64, color: Colors.red.shade400),
                      const SizedBox(height: 16),
                      Text('Error: ${dashboardState.error}'),
                      ElevatedButton(
                        onPressed: () => ref.read(dashboardProvider.notifier).loadDashboardData(),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => ref.read(dashboardProvider.notifier).refreshData(),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Statistics Cards
                        if (dashboardState.overview != null) ...[
                          _buildStatsCards(dashboardState.overview!),
                          const SizedBox(height: 24),
                        ],

                        // Charts Section
                        if (dashboardState.overview != null) ...[
                          Text(
                            'Client Distribution',
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          ClientsChart(overview: dashboardState.overview!),
                          const SizedBox(height: 24),
                        ],

                        // Recent Clients
                        if (dashboardState.overview?.recentClients.isNotEmpty ?? false) ...[
                          Text(
                            'Recent Clients',
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          RecentClientsList(clients: dashboardState.overview!.recentClients),
                          const SizedBox(height: 24),
                        ],

                        // Server Health
                        if (dashboardState.systemHealth != null) ...[
                          _buildServerHealthCard(dashboardState.systemHealth!),
                        ],
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildStatsCards(ClientsOverview overview) {
    return Row(
      children: [
        Expanded(
          child: StatsCard(
            title: 'Total Clients',
            value: overview.totalClients.toString(),
            icon: Icons.people,
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: StatsCard(
            title: 'Active',
            value: overview.activeClients.toString(),
            icon: Icons.wifi,
            color: Colors.green,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: StatsCard(
            title: 'Inactive',
            value: overview.inactiveClients.toString(),
            icon: Icons.wifi_off,
            color: Colors.orange,
          ),
        ),
      ],
    );
  }

  Widget _buildServerHealthCard(Map<String, dynamic> health) {
    final isHealthy = health['status'] == 'ok';
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isHealthy ? Icons.health_and_safety : Icons.warning,
                  color: isHealthy ? Colors.green : Colors.red,
                ),
                const SizedBox(width: 8),
                Text(
                  'Server Health',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildHealthItem('Status', health['status']?.toString() ?? 'Unknown'),
            _buildHealthItem('Uptime', _formatUptime(health['uptime'])),
            if (health['database'] != null)
              _buildHealthItem(
                'Database',
                health['database']['status']?.toString() ?? 'Unknown',
              ),
            if (health['wireguard'] != null)
              _buildHealthItem(
                'WireGuard',
                '${health['wireguard']['status']} (${health['wireguard']['clients']} clients)',
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(value),
        ],
      ),
    );
  }

  String _formatUptime(dynamic uptime) {
    if (uptime is! int) return 'Unknown';
    
    final duration = Duration(seconds: uptime);
    if (duration.inDays > 0) {
      return '${duration.inDays}d ${duration.inHours % 24}h';
    } else if (duration.inHours > 0) {
      return '${duration.inHours}h ${duration.inMinutes % 60}m';
    } else {
      return '${duration.inMinutes}m';
    }
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(authServiceProvider).logout();
              // Navigate to login screen
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}
```

### **7. Clients Management Screen**

```dart
// lib/features/clients/presentation/screens/clients_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:data_table_2/data_table_2.dart';
import '../providers/clients_provider.dart';
import '../widgets/client_actions_menu.dart';
import '../widgets/client_search_bar.dart';

class ClientsScreen extends ConsumerStatefulWidget {
  const ClientsScreen({super.key});

  @override
  ConsumerState<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends ConsumerState<ClientsScreen> {
  final Set<String> _selectedClients = {};
  String _searchQuery = '';
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(clientsProvider.notifier).loadClients();
    });
  }

  @override
  Widget build(BuildContext context) {
    final clientsState = ref.watch(clientsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Client Management'),
        actions: [
          if (_selectedClients.isNotEmpty) ...[
            IconButton(
              onPressed: () => _showBulkActionsDialog(),
              icon: Badge(
                label: Text(_selectedClients.length.toString()),
                child: const Icon(Icons.more_vert),
              ),
            ),
          ],
          IconButton(
            onPressed: () => ref.read(clientsProvider.notifier).loadClients(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search and Filter Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: ClientSearchBar(
                    onSearchChanged: (query) {
                      setState(() => _searchQuery = query);
                      _performSearch();
                    },
                  ),
                ),
                const SizedBox(width: 16),
                DropdownButton<String?>(
                  value: _statusFilter,
                  hint: const Text('Filter'),
                  items: const [
                    DropdownMenuItem(value: null, child: Text('All')),
                    DropdownMenuItem(value: 'active', child: Text('Active')),
                    DropdownMenuItem(value: 'inactive', child: Text('Inactive')),
                  ],
                  onChanged: (value) {
                    setState(() => _statusFilter = value);
                    _performSearch();
                  },
                ),
              ],
            ),
          ),

          // Clients Table
          Expanded(
            child: clientsState.isLoading
                ? const Center(child: CircularProgressIndicator())
                : clientsState.error != null
                    ? Center(child: Text('Error: ${clientsState.error}'))
                    : _buildClientsTable(clientsState.clients),
          ),
        ],
      ),
    );
  }

  Widget _buildClientsTable(List<VpnClient> clients) {
    if (clients.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('No clients found'),
          ],
        ),
      );
    }

    return DataTable2(
      columnSpacing: 12,
      horizontalMargin: 12,
      minWidth: 800,
      columns: const [
        DataColumn2(label: Text('Select'), size: ColumnSize.S),
        DataColumn2(label: Text('Device'), size: ColumnSize.M),
        DataColumn2(label: Text('Location'), size: ColumnSize.M),
        DataColumn2(label: Text('VPN IP'), size: ColumnSize.S),
        DataColumn2(label: Text('Status'), size: ColumnSize.S),
        DataColumn2(label: Text('Last Seen'), size: ColumnSize.M),
        DataColumn2(label: Text('Traffic'), size: ColumnSize.M),
        DataColumn2(label: Text('Actions'), size: ColumnSize.S),
      ],
      rows: clients.map((client) {
        final isSelected = _selectedClients.contains(client.id);
        
        return DataRow2(
          selected: isSelected,
          onSelectChanged: (selected) {
            setState(() {
              if (selected == true) {
                _selectedClients.add(client.id);
              } else {
                _selectedClients.remove(client.id);
              }
            });
          },
          cells: [
            DataCell(
              Checkbox(
                value: isSelected,
                onChanged: (value) {
                  setState(() {
                    if (value == true) {
                      _selectedClients.add(client.id);
                    } else {
                      _selectedClients.remove(client.id);
                    }
                  });
                },
              ),
            ),
            DataCell(
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    client.deviceName ?? 'Unknown Device',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  Text(
                    client.deviceId,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            DataCell(
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(client.country ?? 'Unknown'),
                  Text(
                    client.city ?? '',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            DataCell(Text(client.vpnIp)),
            DataCell(
              Chip(
                label: Text(client.isActive ? 'Active' : 'Inactive'),
                backgroundColor: client.isActive ? Colors.green.shade100 : Colors.grey.shade200,
                labelStyle: TextStyle(
                  color: client.isActive ? Colors.green.shade800 : Colors.grey.shade600,
                ),
              ),
            ),
            DataCell(Text(_formatLastSeen(client.lastHandshake))),
            DataCell(Text(_formatTraffic(client.bytesSent, client.bytesReceived))),
            DataCell(
              ClientActionsMenu(
                client: client,
                onAction: (action) => _handleClientAction(action, client),
              ),
            ),
          ],
        );
      }).toList(),
    );
  }

  void _performSearch() {
    if (_searchQuery.isEmpty && _statusFilter == null) {
      ref.read(clientsProvider.notifier).loadClients();
    } else {
      ref.read(clientsProvider.notifier).searchClients(_searchQuery, filter: _statusFilter);
    }
  }

  void _handleClientAction(String action, VpnClient client) {
    switch (action) {
      case 'view':
        _showClientDetails(client);
        break;
      case 'edit':
        _showEditClientDialog(client);
        break;
      case 'activate':
        _activateClient(client);
        break;
      case 'deactivate':
        _deactivateClient(client);
        break;
    }
  }

  void _showClientDetails(VpnClient client) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(client.deviceName ?? 'Client Details'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDetailRow('Device ID', client.deviceId),
            _buildDetailRow('VPN IP', client.vpnIp),
            _buildDetailRow('Real IP', client.realIp),
            _buildDetailRow('Location', '${client.country ?? 'Unknown'}, ${client.city ?? ''}'),
            _buildDetailRow('Status', client.isActive ? 'Active' : 'Inactive'),
            _buildDetailRow('Created', _formatDateTime(client.createdAt)),
            _buildDetailRow('Last Updated', _formatDateTime(client.updatedAt)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text('$label:', style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  void _showEditClientDialog(VpnClient client) {
    final nameController = TextEditingController(text: client.deviceName);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Client'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: 'Device Name',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _updateClient(client.id, {'deviceName': nameController.text});
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _activateClient(VpnClient client) {
    ref.read(clientsProvider.notifier).activateClient(client.id);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Client activated')),
    );
  }

  void _deactivateClient(VpnClient client) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Deactivate Client'),
        content: Text('Are you sure you want to deactivate ${client.deviceName ?? client.deviceId}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(clientsProvider.notifier).deactivateClient(client.deviceId);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Client deactivated')),
              );
            },
            child: const Text('Deactivate'),
          ),
        ],
      ),
    );
  }

  void _updateClient(String id, Map<String, dynamic> updates) {
    ref.read(clientsProvider.notifier).updateClient(id, updates);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Client updated')),
    );
  }

  void _showBulkActionsDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Bulk Actions (${_selectedClients.length} selected)'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.block),
              title: const Text('Deactivate Selected'),
              onTap: () {
                Navigator.pop(context);
                _bulkDeactivateClients();
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  void _bulkDeactivateClients() {
    ref.read(clientsProvider.notifier).bulkDeactivateClients(_selectedClients.toList());
    setState(() => _selectedClients.clear());
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Selected clients deactivated')),
    );
  }

  String _formatLastSeen(String? lastHandshake) {
    if (lastHandshake == null) return 'Never';
    try {
      final date = DateTime.parse(lastHandshake);
      final now = DateTime.now();
      final difference = now.difference(date);
      
      if (difference.inDays > 0) {
        return '${difference.inDays}d ago';
      } else if (difference.inHours > 0) {
        return '${difference.inHours}h ago';
      } else if (difference.inMinutes > 0) {
        return '${difference.inMinutes}m ago';
      } else {
        return 'Just now';
      }
    } catch (e) {
      return 'Unknown';
    }
  }

  String _formatTraffic(int sent, int received) {
    return '↑${_formatBytes(sent)} ↓${_formatBytes(received)}';
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024) return '${bytes}B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)}KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)}GB';
  }

  String _formatDateTime(String dateTime) {
    try {
      final date = DateTime.parse(dateTime);
      return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateTime;
    }
  }
}
```

---

## 📋 Implementation Checklist

### **Phase 1: Core Setup** ✅
- [ ] Create Flutter project
- [ ] Add dependencies
- [ ] Setup project structure
- [ ] Configure secure storage
- [ ] Implement API client with auth
- [ ] Create data models

### **Phase 2: Authentication** 🔄
- [ ] Build login screen
- [ ] Implement JWT handling
- [ ] Create auth state management
- [ ] Add token refresh logic
- [ ] Handle logout functionality

### **Phase 3: Dashboard** 📊
- [ ] Build statistics overview
- [ ] Create charts and graphs
- [ ] Implement real-time updates
- [ ] Add system health monitoring
- [ ] Design responsive layout

### **Phase 4: Client Management** 👥
- [ ] Create clients list view
- [ ] Implement search and filters
- [ ] Build bulk operations
- [ ] Add client detail views
- [ ] Handle client actions

### **Phase 5: Advanced Features** 🔧
- [ ] Real-time notifications
- [ ] Export functionality
- [ ] Advanced analytics
- [ ] Settings management
- [ ] User permissions

### **Phase 6: Production** 🚀
- [ ] Error handling
- [ ] Loading states
- [ ] Offline support
- [ ] Security hardening
- [ ] Performance optimization

---

## 🔐 Security Features

1. **✅ JWT Authentication**: Secure token-based authentication
2. **✅ Token Storage**: Secure token storage using keychain
3. **✅ Auto-logout**: Automatic logout on token expiration
4. **✅ API Security**: All admin endpoints protected
5. **✅ Role-based Access**: Admin-only functionality
6. **✅ Secure Communication**: HTTPS for all API calls

---

## 🎯 Key Features

### **Dashboard**
- Real-time client statistics
- Server health monitoring
- Traffic analytics
- Geographic distribution charts

### **Client Management**
- View all VPN clients
- Search and filter clients
- Bulk operations (activate/deactivate)
- Client detail management
- Traffic monitoring

### **Server Monitoring**
- WireGuard server status
- Peer connection details
- System health checks
- Performance metrics

### **Administration**
- Secure admin authentication
- User session management
- Audit logging
- Configuration management

---

## 📞 Integration Support

**Backend Endpoints Ready:**
- ✅ `POST /api/auth/login` - Admin authentication
- ✅ `GET /api/clients` - Client management
- ✅ `GET /api/clients/stats/overview` - Analytics
- ✅ `GET /api/vpn/server-stats` - Server monitoring
- ✅ `GET /api/health` - System health

**Your Flutter Admin app will provide comprehensive VPN server management! 🛡️**

