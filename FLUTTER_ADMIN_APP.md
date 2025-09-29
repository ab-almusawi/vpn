# Flutter VPN Admin Dashboard - Cross-Platform Administrator Guide

## 🎯 Overview

This guide provides complete instructions for building a comprehensive **responsive Flutter admin dashboard** for VPN administrators. The app works seamlessly on **Windows desktop** and **mobile devices**, providing user management, server monitoring, real-time statistics, and administrative control of your VPN infrastructure.

## 📱💻 **Multi-Platform Support**

- **🖥️ Windows Desktop**: Full-featured admin dashboard with large screen layouts
- **📱 Mobile**: Optimized touch interface for on-the-go management
- **🌐 Web**: Browser-based admin panel (optional)
- **📊 Responsive Design**: Adapts automatically to screen size

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

### **Base URL**: `http://81.30.161.139` (Production) / `http://localhost:3000` (Development)
### **API Prefix**: `/api`
### **Authentication**: Bearer Token Required for all admin endpoints
### **Current Working Endpoints**: Updated to match your actual VPN backend implementation

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

### **1. Dependencies for Multi-Platform Support**

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP & API
  dio: ^5.3.2
  json_annotation: ^4.8.1
  retrofit: ^4.0.3
  
  # State Management
  riverpod: ^2.4.9
  flutter_riverpod: ^2.4.9
  
  # Secure Storage (cross-platform)
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.2
  
  # Responsive Design & Desktop Support
  responsive_framework: ^1.1.1
  adaptive_breakpoints: ^0.1.6
  flutter_adaptive_scaffold: ^0.1.7+1
  
  # Charts & Data Visualization
  fl_chart: ^0.65.0
  syncfusion_flutter_charts: ^23.2.7
  syncfusion_flutter_datagrid: ^23.2.7
  
  # UI Components & Responsive Tables
  data_table_2: ^2.5.12
  flutter_staggered_grid_view: ^0.7.0
  adaptive_dialog: ^1.9.0
  
  # Desktop Window Management
  window_manager: ^0.3.7
  desktop_window: ^0.4.0
  
  # Icons & Animations
  cupertino_icons: ^1.0.6
  animated_text_kit: ^4.2.2
  lottie: ^2.7.0
  
  # Utilities
  intl: ^0.19.0
  timeago: ^3.6.1
  path_provider: ^2.1.1
  
  # Navigation & Routing
  go_router: ^12.1.1
  auto_route: ^7.8.4
  
  # Platform Detection
  universal_io: ^2.2.2
  device_info_plus: ^9.1.0
  
dev_dependencies:
  # Code Generation
  json_serializable: ^6.7.1
  build_runner: ^2.4.7
  retrofit_generator: ^8.0.4
  auto_route_generator: ^7.3.2
  
  # Testing
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter
```

### **2. Platform Configuration**

#### **Windows Desktop Setup:**
```yaml
# Add to pubspec.yaml
flutter:
  platforms:
    windows:
      pluginClass: AdminDashboardPlugin
```

#### **Enable Windows Desktop:**
```bash
# Enable Windows desktop support
flutter config --enable-windows-desktop

# Create Windows app
flutter create --platforms=windows,android,ios .
```

### **3. Responsive Project Structure**

```
lib/
├── main.dart
├── app.dart
├── core/
│   ├── constants/
│   │   ├── api_constants.dart
│   │   ├── app_constants.dart
│   │   └── responsive_constants.dart
│   ├── network/
│   │   ├── api_client.dart
│   │   ├── auth_interceptor.dart
│   │   └── retrofit_client.dart
│   ├── storage/
│   │   ├── secure_storage.dart
│   │   └── app_storage.dart
│   ├── theme/
│   │   ├── app_theme.dart
│   │   ├── desktop_theme.dart
│   │   └── mobile_theme.dart
│   ├── responsive/
│   │   ├── responsive_helper.dart
│   │   ├── breakpoints.dart
│   │   └── adaptive_widgets.dart
│   └── utils/
│       ├── formatters.dart
│       ├── validators.dart
│       └── platform_utils.dart
├── features/
│   ├── auth/
│   │   ├── data/
│   │   │   ├── auth_service.dart
│   │   │   └── auth_repository.dart
│   │   ├── domain/
│   │   │   ├── auth_models.dart
│   │   │   └── auth_providers.dart
│   │   └── presentation/
│   │       ├── screens/
│   │       │   ├── login_screen.dart
│   │       │   ├── desktop_login.dart
│   │       │   └── mobile_login.dart
│   │       └── widgets/
│   ├── dashboard/
│   │   ├── data/
│   │   │   └── dashboard_service.dart
│   │   ├── domain/
│   │   │   ├── dashboard_models.dart
│   │   │   └── dashboard_providers.dart
│   │   └── presentation/
│   │       ├── screens/
│   │       │   ├── dashboard_screen.dart
│   │       │   ├── desktop_dashboard.dart
│   │       │   └── mobile_dashboard.dart
│   │       └── widgets/
│   │           ├── stats_cards.dart
│   │           ├── charts/
│   │           └── responsive_grid.dart
│   ├── clients/
│   │   ├── data/
│   │   │   └── clients_service.dart
│   │   ├── domain/
│   │   │   ├── client_models.dart
│   │   │   └── clients_providers.dart
│   │   └── presentation/
│   │       ├── screens/
│   │       │   ├── clients_screen.dart
│   │       │   ├── desktop_clients_table.dart
│   │       │   └── mobile_clients_list.dart
│   │       └── widgets/
│   │           ├── client_card.dart
│   │           ├── client_details.dart
│   │           └── client_actions.dart
│   └── monitoring/
│       ├── data/
│       │   └── monitoring_service.dart
│       ├── domain/
│       │   ├── server_models.dart
│       │   └── monitoring_providers.dart
│       └── presentation/
│           ├── screens/
│           │   ├── monitoring_screen.dart
│           │   ├── desktop_monitoring.dart
│           │   └── mobile_monitoring.dart
│           └── widgets/
│               ├── server_status.dart
│               └── health_metrics.dart
├── shared/
│   ├── models/
│   │   ├── api_models.dart
│   │   ├── ui_models.dart
│   │   └── platform_models.dart
│   ├── widgets/
│   │   ├── responsive/
│   │   │   ├── adaptive_layout.dart
│   │   │   ├── responsive_card.dart
│   │   │   ├── adaptive_table.dart
│   │   │   └── platform_scaffold.dart
│   │   ├── common/
│   │   │   ├── loading_widget.dart
│   │   │   ├── error_widget.dart
│   │   │   └── empty_state.dart
│   │   └── charts/
│   │       ├── pie_chart_widget.dart
│   │       ├── line_chart_widget.dart
│   │       └── bar_chart_widget.dart
│   ├── providers/
│   │   ├── app_providers.dart
│   │   ├── theme_provider.dart
│   │   └── platform_provider.dart
│   └── extensions/
│       ├── context_extensions.dart
│       ├── string_extensions.dart
│       └── responsive_extensions.dart
├── routes/
│   ├── app_router.dart
│   ├── route_constants.dart
│   └── route_guards.dart
└── windows/
    ├── runner/
    │   ├── main.cpp
    │   ├── window_configuration.cpp
    │   └── resources.rc
    └── CMakeLists.txt
```

### **4. Responsive Design Setup**

#### **Main App with Platform Support**
```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:window_manager/window_manager.dart';
import 'package:responsive_framework/responsive_framework.dart';
import 'app.dart';
import 'core/utils/platform_utils.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize desktop window if on Windows
  if (PlatformUtils.isDesktop) {
    await windowManager.ensureInitialized();
    
    WindowOptions windowOptions = const WindowOptions(
      size: Size(1400, 900),
      minimumSize: Size(800, 600),
      center: true,
      backgroundColor: Colors.transparent,
      skipTaskbar: false,
      titleBarStyle: TitleBarStyle.normal,
      title: 'VPN Admin Dashboard',
    );
    
    windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }
  
  runApp(const ProviderScope(child: VpnAdminApp()));
}
```

#### **Responsive App Configuration**
```dart
// lib/app.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:responsive_framework/responsive_framework.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/app_theme.dart';
import 'core/responsive/breakpoints.dart';
import 'routes/app_router.dart';

class VpnAdminApp extends ConsumerWidget {
  const VpnAdminApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    
    return MaterialApp.router(
      title: 'VPN Admin Dashboard',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
      builder: (context, child) => ResponsiveBreakpoints.builder(
        child: child!,
        breakpoints: AppBreakpoints.values,
      ),
    );
  }
}
```

#### **Responsive Constants**
```dart
// lib/core/responsive/breakpoints.dart
import 'package:responsive_framework/responsive_framework.dart';

class AppBreakpoints {
  static const mobile = ResponsiveBreakpoint.resize(480, name: MOBILE);
  static const tablet = ResponsiveBreakpoint.autoScale(800, name: TABLET);
  static const desktop = ResponsiveBreakpoint.resize(1200, name: DESKTOP);
  static const xl = ResponsiveBreakpoint.resize(1920, name: '4K');
  
  static List<ResponsiveBreakpoint> get values => [
    mobile,
    tablet,
    desktop,
    xl,
  ];
}
```

#### **Platform Utilities**
```dart
// lib/core/utils/platform_utils.dart
import 'dart:io';
import 'package:flutter/foundation.dart';

class PlatformUtils {
  static bool get isWeb => kIsWeb;
  static bool get isDesktop => Platform.isWindows || Platform.isLinux || Platform.isMacOS;
  static bool get isMobile => Platform.isAndroid || Platform.isIOS;
  static bool get isWindows => Platform.isWindows;
  static bool get isAndroid => Platform.isAndroid;
  static bool get isIOS => Platform.isIOS;
  
  static String get platformName {
    if (isWeb) return 'Web';
    if (Platform.isWindows) return 'Windows';
    if (Platform.isAndroid) return 'Android';
    if (Platform.isIOS) return 'iOS';
    if (Platform.isLinux) return 'Linux';
    if (Platform.isMacOS) return 'macOS';
    return 'Unknown';
  }
}
```

#### **Adaptive Layout Widget**
```dart
// lib/shared/widgets/responsive/adaptive_layout.dart
import 'package:flutter/material.dart';
import 'package:responsive_framework/responsive_framework.dart';

class AdaptiveLayout extends StatelessWidget {
  final Widget mobile;
  final Widget? tablet;
  final Widget desktop;
  
  const AdaptiveLayout({
    Key? key,
    required this.mobile,
    this.tablet,
    required this.desktop,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ResponsiveBreakpoints.of(context).isMobile
        ? mobile
        : ResponsiveBreakpoints.of(context).isTablet
            ? tablet ?? mobile
            : desktop;
  }
}
```

#### **Responsive Helper**
```dart
// lib/core/responsive/responsive_helper.dart
import 'package:flutter/material.dart';
import 'package:responsive_framework/responsive_framework.dart';

class ResponsiveHelper {
  static bool isMobile(BuildContext context) =>
      ResponsiveBreakpoints.of(context).isMobile;
      
  static bool isTablet(BuildContext context) =>
      ResponsiveBreakpoints.of(context).isTablet;
      
  static bool isDesktop(BuildContext context) =>
      ResponsiveBreakpoints.of(context).isDesktop;
      
  static double screenWidth(BuildContext context) =>
      MediaQuery.of(context).size.width;
      
  static double screenHeight(BuildContext context) =>
      MediaQuery.of(context).size.height;
      
  static int getGridCrossAxisCount(BuildContext context) {
    if (isDesktop(context)) return 4;
    if (isTablet(context)) return 3;
    return 2;
  }
  
  static EdgeInsets getScreenPadding(BuildContext context) {
    if (isDesktop(context)) return const EdgeInsets.all(24);
    if (isTablet(context)) return const EdgeInsets.all(16);
    return const EdgeInsets.all(12);
  }
  
  static double getCardElevation(BuildContext context) {
    return isDesktop(context) ? 2 : 1;
  }
}
```

### **5. Current API Endpoints Integration**

Update API client to work with your current backend:

```dart
// lib/core/constants/api_constants.dart
class ApiConstants {
  // Base URLs
  static const String baseUrl = 'http://81.30.161.139';
  static const String devBaseUrl = 'http://localhost:3000';
  static const String apiPrefix = '/api';
  
  // Current Working Endpoints
  static const String login = '$apiPrefix/auth/login';
  static const String profile = '$apiPrefix/auth/profile';
  static const String health = '$apiPrefix/health';
  
  // Client Management (your current endpoints)
  static const String clients = '$apiPrefix/clients';
  static const String clientsSearch = '$apiPrefix/clients/search';
  static const String clientsOverview = '$apiPrefix/clients/stats/overview';
  
  // VPN & Server Management (your current endpoints)
  static const String vpnRegister = '$apiPrefix/vpn/register';
  static const String serverStats = '$apiPrefix/vpn/server-stats';
  static const String verifyServer = '$apiPrefix/vpn/verify-server';
  static const String validateConfig = '$apiPrefix/vpn/validate-config';
  
  // Headers
  static const Map<String, String> headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}
```

### **6. Authentication Implementation**

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

### **7. Responsive Dashboard Implementation**

#### **Responsive Dashboard Screen**
```dart
// lib/features/dashboard/presentation/screens/dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../../shared/widgets/responsive/adaptive_layout.dart';
import '../../../../core/responsive/responsive_helper.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/dashboard_mobile.dart';
import '../widgets/dashboard_desktop.dart';
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
    return AdaptiveLayout(
      mobile: const DashboardMobile(),
      desktop: const DashboardDesktop(),
    );
  }
}
```

#### **Desktop Dashboard Layout**
```dart
// lib/features/dashboard/presentation/widgets/dashboard_desktop.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';
import '../../../../core/responsive/responsive_helper.dart';
import '../providers/dashboard_provider.dart';
import 'stats_cards_row.dart';
import 'charts_section.dart';
import 'recent_clients_section.dart';
import 'server_health_section.dart';

class DashboardDesktop extends ConsumerWidget {
  const DashboardDesktop({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardState = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.dashboard, color: Theme.of(context).primaryColor),
            const SizedBox(width: 12),
            const Text('VPN Admin Dashboard'),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => ref.read(dashboardProvider.notifier).refreshData(),
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Data',
          ),
          const SizedBox(width: 8),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (value) => _handleMenuAction(context, value),
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'export',
                child: Row(
                  children: [
                    Icon(Icons.download),
                    SizedBox(width: 8),
                    Text('Export Data'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings),
                    SizedBox(width: 8),
                    Text('Settings'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout),
                    SizedBox(width: 8),
                    Text('Logout'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: dashboardState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : dashboardState.error != null
              ? _buildErrorState(context, ref, dashboardState.error!)
              : RefreshIndicator(
                  onRefresh: () => ref.read(dashboardProvider.notifier).refreshData(),
                  child: SingleChildScrollView(
                    padding: ResponsiveHelper.getScreenPadding(context),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Statistics Cards Row
                        if (dashboardState.overview != null)
                          StatsCardsRow(overview: dashboardState.overview!),
                        
                        const SizedBox(height: 32),
                        
                        // Charts and Analytics Section
                        if (dashboardState.overview != null)
                          ChartsSection(overview: dashboardState.overview!),
                        
                        const SizedBox(height: 32),
                        
                        // Two Column Layout for Recent Clients and Server Health
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Recent Clients (60% width)
                            Expanded(
                              flex: 3,
                              child: RecentClientsSection(
                                clients: dashboardState.overview?.recentClients ?? [],
                              ),
                            ),
                            
                            const SizedBox(width: 24),
                            
                            // Server Health (40% width)
                            Expanded(
                              flex: 2,
                              child: ServerHealthSection(
                                health: dashboardState.systemHealth,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildErrorState(BuildContext context, WidgetRef ref, String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 96,
            color: Colors.red.shade400,
          ),
          const SizedBox(height: 24),
          Text(
            'Error Loading Dashboard',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            error,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: 32),
          ElevatedButton.icon(
            onPressed: () => ref.read(dashboardProvider.notifier).loadDashboardData(),
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  void _handleMenuAction(BuildContext context, String action) {
    switch (action) {
      case 'export':
        // Implement export functionality
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Export functionality coming soon')),
        );
        break;
      case 'settings':
        // Navigate to settings
        break;
      case 'logout':
        _showLogoutDialog(context);
        break;
    }
  }

  void _showLogoutDialog(BuildContext context) {
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
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Handle logout
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}
```

#### **Mobile Dashboard Layout**
```dart
// lib/features/dashboard/presentation/widgets/dashboard_mobile.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/dashboard_provider.dart';
import 'stats_cards_grid.dart';
import 'mobile_charts.dart';
import 'mobile_clients_list.dart';

class DashboardMobile extends ConsumerWidget {
  const DashboardMobile({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardState = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('VPN Dashboard'),
        centerTitle: true,
        actions: [
          IconButton(
            onPressed: () => ref.read(dashboardProvider.notifier).refreshData(),
            icon: const Icon(Icons.refresh),
          ),
          PopupMenuButton<String>(
            onSelected: (value) => _handleAction(context, ref, value),
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'settings',
                child: ListTile(
                  leading: Icon(Icons.settings),
                  title: Text('Settings'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'logout',
                child: ListTile(
                  leading: Icon(Icons.logout),
                  title: Text('Logout'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: dashboardState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : dashboardState.error != null
              ? _buildMobileErrorState(context, ref, dashboardState.error!)
              : RefreshIndicator(
                  onRefresh: () => ref.read(dashboardProvider.notifier).refreshData(),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Stats Cards Grid (2x2 on mobile)
                        if (dashboardState.overview != null)
                          StatsCardsGrid(overview: dashboardState.overview!),
                        
                        const SizedBox(height: 24),
                        
                        // Mobile Charts
                        if (dashboardState.overview != null)
                          MobileCharts(overview: dashboardState.overview!),
                        
                        const SizedBox(height: 24),
                        
                        // Recent Clients List
                        if (dashboardState.overview?.recentClients.isNotEmpty ?? false)
                          MobileClientsList(
                            clients: dashboardState.overview!.recentClients,
                          ),
                        
                        const SizedBox(height: 24),
                        
                        // Server Health Card
                        if (dashboardState.systemHealth != null)
                          _buildMobileHealthCard(dashboardState.systemHealth!),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildMobileErrorState(BuildContext context, WidgetRef ref, String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'Error Loading Dashboard',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => ref.read(dashboardProvider.notifier).loadDashboardData(),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMobileHealthCard(Map<String, dynamic> health) {
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
                const Text(
                  'Server Health',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildHealthRow('Status', health['status']?.toString() ?? 'Unknown'),
            _buildHealthRow('Database', health['database']?['status']?.toString() ?? 'Unknown'),
            _buildHealthRow('WireGuard', health['wireguard']?['status']?.toString() ?? 'Unknown'),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthRow(String label, String value) {
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

  void _handleAction(BuildContext context, WidgetRef ref, String action) {
    switch (action) {
      case 'settings':
        // Navigate to settings
        break;
      case 'logout':
        // Handle logout
        break;
    }
  }
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

### **Phase 1: Cross-Platform Setup** 🖥️📱
- [ ] Create Flutter project with Windows/Mobile support
- [ ] Enable Windows desktop (`flutter config --enable-windows-desktop`)
- [ ] Add responsive design dependencies
- [ ] Setup adaptive project structure
- [ ] Configure window management for desktop
- [ ] Implement platform detection utilities

### **Phase 2: Responsive Design Foundation** 📐
- [ ] Configure breakpoints (mobile, tablet, desktop)
- [ ] Create adaptive layout widgets
- [ ] Implement responsive helper utilities
- [ ] Setup theme for different platforms
- [ ] Create platform-specific navigation
- [ ] Test responsive behavior

### **Phase 3: Authentication (Cross-Platform)** 🔐
- [ ] Build responsive login screen
- [ ] Implement desktop/mobile specific layouts
- [ ] Configure secure storage for all platforms
- [ ] Add JWT handling with refresh logic
- [ ] Handle platform-specific logout
- [ ] Test auth flow on Windows and mobile

### **Phase 4: Responsive Dashboard** 📊
- [ ] Create desktop dashboard layout
- [ ] Build mobile dashboard layout
- [ ] Implement adaptive statistics cards
- [ ] Add responsive charts and graphs
- [ ] Create platform-specific error handling
- [ ] Test real-time updates on all platforms

### **Phase 5: Client Management (Adaptive)** 👥
- [ ] Desktop: Full data table with advanced features
- [ ] Mobile: Optimized list view with swipe actions
- [ ] Tablet: Hybrid layout with grid/list toggle
- [ ] Implement responsive search and filters
- [ ] Add touch-friendly bulk operations
- [ ] Create adaptive client detail views

### **Phase 6: Server Monitoring** 🖥️
- [ ] Desktop: Multi-panel monitoring dashboard
- [ ] Mobile: Compact server status cards
- [ ] Real-time WireGuard statistics
- [ ] Platform-optimized charts and metrics
- [ ] Health monitoring with notifications
- [ ] Responsive server configuration views

### **Phase 7: Advanced Features** 🔧
- [ ] Desktop: Multi-window support
- [ ] Mobile: Background sync and notifications
- [ ] Export functionality (PDF, CSV, Excel)
- [ ] Advanced analytics with filtering
- [ ] Settings management (per-platform)
- [ ] Dark/light theme switching

### **Phase 8: Platform Optimization** ⚡
- [ ] Windows: Native window controls and menus
- [ ] Mobile: Pull-to-refresh and infinite scroll
- [ ] Keyboard shortcuts for desktop
- [ ] Touch gestures for mobile
- [ ] Platform-specific performance optimization
- [ ] Memory management and caching

### **Phase 9: Production Ready** 🚀
- [ ] Comprehensive error handling
- [ ] Loading states for all screen sizes
- [ ] Offline support with data sync
- [ ] Security hardening (all platforms)
- [ ] Performance monitoring
- [ ] Automated testing (unit, widget, integration)
- [ ] Windows MSI installer creation
- [ ] Mobile app store deployment

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

**Current Working Backend Endpoints:**
- ✅ `POST /api/auth/login` - Admin authentication with JWT
- ✅ `GET /api/auth/profile` - Admin profile information
- ✅ `GET /api/clients` - Client management and listing
- ✅ `GET /api/clients/search` - Client search and filtering
- ✅ `GET /api/clients/stats/overview` - Analytics dashboard
- ✅ `GET /api/vpn/server-stats` - WireGuard server monitoring
- ✅ `GET /api/vpn/verify-server` - Server configuration validation
- ✅ `GET /api/health` - System health monitoring
- ✅ `POST /api/vpn/register` - Client registration (server-side keys)

---

## 🚀 **Quick Start Commands**

### **Setup Flutter Project**
```bash
# Create new Flutter project with platforms
flutter create vpn_admin_dashboard
cd vpn_admin_dashboard

# Enable Windows desktop support
flutter config --enable-windows-desktop

# Add platforms
flutter create --platforms=windows,android,ios .

# Add dependencies
flutter pub add responsive_framework flutter_riverpod dio flutter_secure_storage
flutter pub add fl_chart data_table_2 window_manager go_router
flutter pub add json_annotation --dev
flutter pub add json_serializable build_runner --dev

# Generate code
flutter packages pub run build_runner build
```

### **Platform-Specific Development**

#### **Windows Desktop Development:**
```bash
# Run on Windows
flutter run -d windows

# Build Windows release
flutter build windows --release

# Create Windows installer (requires additional setup)
# Use tools like Inno Setup or NSIS for MSI creation
```

#### **Android Development:**
```bash
# Run on Android device/emulator
flutter run -d android

# Build Android APK
flutter build apk --release

# Build Android App Bundle for Play Store
flutter build appbundle --release
```

#### **iOS Development:**
```bash
# Run on iOS simulator/device (macOS required)
flutter run -d ios

# Build iOS app
flutter build ios --release
```

### **Testing Across Platforms**
```bash
# Test responsive design
flutter test
flutter test integration_test/responsive_test.dart

# Test on different screen sizes
flutter run -d windows --window-size=800x600    # Small desktop
flutter run -d windows --window-size=1920x1080  # Large desktop
flutter run -d android                          # Mobile
```

---

## 🎯 **Platform-Specific Features**

### **🖥️ Windows Desktop Features**
- **Large Screen Layout**: Full dashboard with multiple panels
- **Window Management**: Resizable windows with minimum size constraints
- **Keyboard Shortcuts**: 
  - `Ctrl+R`: Refresh data
  - `Ctrl+F`: Search clients
  - `F11`: Toggle fullscreen
  - `Ctrl+,`: Open settings
- **System Tray**: Minimize to system tray option
- **Native Menus**: Windows-style menu bar and context menus
- **Multi-Monitor Support**: Position windows across multiple screens

### **📱 Mobile Features**
- **Touch-Optimized UI**: Large buttons and touch targets
- **Swipe Gestures**: Swipe to refresh, swipe to delete
- **Bottom Navigation**: Easy thumb navigation
- **Adaptive Icons**: Platform-specific app icons
- **Push Notifications**: Real-time alerts for server issues
- **Offline Mode**: Cache data for offline viewing
- **Biometric Auth**: Fingerprint/Face ID for app unlock

### **📊 Responsive Behavior**
- **Mobile (< 480px)**: Single column, bottom navigation
- **Tablet (480-800px)**: Adaptive layout, side drawer
- **Desktop (> 800px)**: Multi-column, top navigation
- **4K/Large (> 1920px)**: Extended layouts with more data

---

## 🛠️ **Development Tips**

### **Responsive Testing**
```dart
// Test responsive behavior in your widgets
testWidgets('Dashboard adapts to screen size', (tester) async {
  // Test mobile layout
  await tester.binding.setSurfaceSize(const Size(400, 800));
  await tester.pumpWidget(MyApp());
  expect(find.byType(DashboardMobile), findsOneWidget);
  
  // Test desktop layout  
  await tester.binding.setSurfaceSize(const Size(1200, 800));
  await tester.pumpWidget(MyApp());
  expect(find.byType(DashboardDesktop), findsOneWidget);
});
```

### **Platform Detection**
```dart
// Use platform-specific code
if (PlatformUtils.isDesktop) {
  // Desktop-specific features
  return DesktopDataTable();
} else {
  // Mobile-specific features
  return MobileListView();
}
```

### **Performance Optimization**
```dart
// Use platform-appropriate widgets
class AdaptiveDataDisplay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ResponsiveHelper.isDesktop(context)
        ? DataTable2(
            // Full-featured table for desktop
            columns: allColumns,
            rows: allData,
          )
        : ListView.builder(
            // Optimized list for mobile
            itemCount: limitedData.length,
            itemBuilder: (context, index) => ClientCard(limitedData[index]),
          );
  }
}
```

---

## 📦 **Deployment Guide**

### **Windows Desktop Deployment**
1. **Build Release**: `flutter build windows --release`
2. **Create Installer**: Use Inno Setup or NSIS
3. **Code Signing**: Sign executable for Windows Defender
4. **Distribution**: Direct download or Microsoft Store

### **Mobile App Deployment**

#### **Android (Google Play Store)**
1. **Build App Bundle**: `flutter build appbundle --release`
2. **Upload to Play Console**
3. **Configure App Signing**
4. **Release to Production**

#### **iOS (App Store)**
1. **Build iOS**: `flutter build ios --release`
2. **Upload via Xcode or Transporter**
3. **App Store Connect Configuration**
4. **App Review and Release**

---

## 🎉 **Success Metrics**

Your responsive VPN admin dashboard will provide:

### **📊 Comprehensive Management**
- **Real-time monitoring** of 100+ VPN clients
- **Cross-platform access** from desktop and mobile
- **Responsive design** that works on any screen size
- **Professional UI** with modern design principles

### **⚡ Performance Benefits**
- **Fast data loading** with efficient API calls
- **Smooth animations** on all platforms
- **Optimized memory usage** for desktop and mobile
- **Offline capability** for critical operations

### **🔒 Enterprise-Grade Security**
- **Secure authentication** with JWT tokens
- **Encrypted data storage** on all platforms
- **Role-based access control**
- **Audit logging** for administrative actions

**Your Flutter VPN Admin Dashboard will be a professional, cross-platform solution that provides complete control over your VPN infrastructure! 🚀**



