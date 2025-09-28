# 🔐 Server-Side Key Generation Integration Guide

## Overview

This guide covers the updated VPN registration process where the server generates WireGuard keys for clients instead of clients generating their own keys. This approach simplifies client implementation and ensures consistent key management.

## 🔄 **What Changed?**

### **Before (Client-Side Key Generation):**
- Client generates WireGuard private/public key pair
- Client sends public key to server during registration
- Client keeps private key locally
- Server only receives public key

### **After (Server-Side Key Generation):**
- Server generates complete WireGuard key pair
- Server sends all keys (private, public, preshared) to client
- Client stores keys locally
- Simplified client implementation

---

## 📋 API Endpoint

### **Register VPN Client**

**Endpoint:** `POST /api/vpn/register`

**Description:** Register a new VPN client or update an existing one. Server generates complete WireGuard configuration including keys.

#### Request Body
```json
{
  "deviceId": "string",      // Required: Unique device identifier
  "deviceName": "string",    // Optional: Human readable device name
  "realIp": "string"         // Auto-detected from request headers
}
```

#### Request Example
```json
{
  "deviceId": "android_honorrmo-n21_goovi.almusawi.vpn",
  "deviceName": "HONOR RMO-NX1"
}
```

#### Success Response (201)
```json
{
  "success": true,
  "isNewClient": true,
  "clientInfo": {
    "deviceId": "android_honorrmo-n21_goovi.almusawi.vpn",
    "deviceName": "HONOR RMO-NX1",
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
  "configTemplate": "[Interface]\nPrivateKey = iPbR70lgp09QQ9GS/BQE1FVmSLI2H/F9qavzBUpV9X0=\nAddress = 172.16.0.2/16\nDNS = 8.8.8.8, 8.8.4.4\n\n[Peer]\nPublicKey = CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=\nEndpoint = 81.30.161.139:51820\nAllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25",
  "instructions": "Use the provided private key with this configuration to connect to the VPN."
}
```

#### Error Response (400)
```json
{
  "statusCode": 400,
  "message": "Device ID is required",
  "error": "Bad Request"
}
```

---

## 🚀 **Flutter Integration**

### **Updated VPN Service Implementation**

```dart
class VpnService {
  final Dio dio;
  final String apiBaseUrl;
  final SharedPreferences prefs;

  Future<VpnRegistrationResult> registerDevice({
    required String deviceId,
    String? deviceName,
  }) async {
    try {
      final response = await dio.post(
        '$apiBaseUrl/vpn/register',
        data: {
          'deviceId': deviceId,
          if (deviceName != null) 'deviceName': deviceName,
        },
        options: Options(
          headers: {'Content-Type': 'application/json'},
        ),
      );

      if (response.data['success'] == true) {
        final result = VpnRegistrationResult.fromJson(response.data);
        
        // Store keys securely
        await _storeVpnKeys(result.clientKeys);
        
        // Store configuration
        await _storeVpnConfig(result.configTemplate);
        
        print('✅ Device registered successfully');
        print('📍 Assigned VPN IP: ${result.clientInfo.vpnIp}');
        print('🆔 Is new client: ${result.isNewClient}');
        
        return result;
      } else {
        throw Exception('Registration failed: ${response.data['message']}');
      }
    } catch (e) {
      print('❌ Registration failed: $e');
      rethrow;
    }
  }

  Future<void> _storeVpnKeys(ClientKeys keys) async {
    // Store keys securely (consider using flutter_secure_storage for production)
    await prefs.setString('vpn_private_key', keys.privateKey);
    await prefs.setString('vpn_public_key', keys.publicKey);
    await prefs.setString('vpn_preshared_key', keys.presharedKey);
  }

  Future<void> _storeVpnConfig(String configTemplate) async {
    await prefs.setString('vpn_config', configTemplate);
  }

  Future<ClientKeys?> getStoredKeys() async {
    final privateKey = prefs.getString('vpn_private_key');
    final publicKey = prefs.getString('vpn_public_key');
    final presharedKey = prefs.getString('vpn_preshared_key');

    if (privateKey != null && publicKey != null && presharedKey != null) {
      return ClientKeys(
        privateKey: privateKey,
        publicKey: publicKey,
        presharedKey: presharedKey,
      );
    }
    return null;
  }

  Future<String?> getStoredConfig() async {
    return prefs.getString('vpn_config');
  }
}
```

### **Data Models**

```dart
class VpnRegistrationResult {
  final bool success;
  final bool isNewClient;
  final ClientInfo clientInfo;
  final ServerConfig serverConfig;
  final ClientKeys clientKeys;
  final String configTemplate;
  final String instructions;

  VpnRegistrationResult({
    required this.success,
    required this.isNewClient,
    required this.clientInfo,
    required this.serverConfig,
    required this.clientKeys,
    required this.configTemplate,
    required this.instructions,
  });

  factory VpnRegistrationResult.fromJson(Map<String, dynamic> json) {
    return VpnRegistrationResult(
      success: json['success'] ?? false,
      isNewClient: json['isNewClient'] ?? false,
      clientInfo: ClientInfo.fromJson(json['clientInfo']),
      serverConfig: ServerConfig.fromJson(json['serverConfig']),
      clientKeys: ClientKeys.fromJson(json['clientKeys']),
      configTemplate: json['configTemplate'] ?? '',
      instructions: json['instructions'] ?? '',
    );
  }
}

class ClientInfo {
  final String deviceId;
  final String? deviceName;
  final String vpnIp;
  final String? country;
  final String? city;

  ClientInfo({
    required this.deviceId,
    this.deviceName,
    required this.vpnIp,
    this.country,
    this.city,
  });

  factory ClientInfo.fromJson(Map<String, dynamic> json) {
    return ClientInfo(
      deviceId: json['deviceId'] ?? '',
      deviceName: json['deviceName'],
      vpnIp: json['vpnIp'] ?? '',
      country: json['country'],
      city: json['city'],
    );
  }
}

class ServerConfig {
  final String serverPublicKey;
  final String serverEndpoint;
  final String assignedIp;
  final String dns;

  ServerConfig({
    required this.serverPublicKey,
    required this.serverEndpoint,
    required this.assignedIp,
    required this.dns,
  });

  factory ServerConfig.fromJson(Map<String, dynamic> json) {
    return ServerConfig(
      serverPublicKey: json['serverPublicKey'] ?? '',
      serverEndpoint: json['serverEndpoint'] ?? '',
      assignedIp: json['assignedIp'] ?? '',
      dns: json['dns'] ?? '',
    );
  }
}

class ClientKeys {
  final String privateKey;
  final String publicKey;
  final String presharedKey;

  ClientKeys({
    required this.privateKey,
    required this.publicKey,
    required this.presharedKey,
  });

  factory ClientKeys.fromJson(Map<String, dynamic> json) {
    return ClientKeys(
      privateKey: json['privateKey'] ?? '',
      publicKey: json['publicKey'] ?? '',
      presharedKey: json['presharedKey'] ?? '',
    );
  }
}
```

### **Updated UI Implementation**

```dart
class VpnRegistrationScreen extends StatefulWidget {
  @override
  _VpnRegistrationScreenState createState() => _VpnRegistrationScreenState();
}

class _VpnRegistrationScreenState extends State<VpnRegistrationScreen> {
  final VpnService _vpnService = VpnService();
  final TextEditingController _deviceNameController = TextEditingController();
  
  bool _isRegistering = false;
  VpnRegistrationResult? _registrationResult;

  @override
  void initState() {
    super.initState();
    _deviceNameController.text = _getDeviceName(); // Get device name
  }

  String _generateDeviceId() {
    final deviceInfo = DeviceInfoPlugin();
    // Generate unique device ID based on device info
    return 'android_${Platform.operatingSystem}_${DateTime.now().millisecondsSinceEpoch}';
  }

  String _getDeviceName() {
    // Get device name using device_info_plus plugin
    return 'My Device'; // Implement actual device name detection
  }

  Future<void> _registerDevice() async {
    setState(() => _isRegistering = true);

    try {
      final deviceId = _generateDeviceId();
      final deviceName = _deviceNameController.text.trim();

      final result = await _vpnService.registerDevice(
        deviceId: deviceId,
        deviceName: deviceName.isNotEmpty ? deviceName : null,
      );

      setState(() => _registrationResult = result);

      _showSuccessDialog(result);

    } catch (e) {
      _showErrorDialog('Registration failed: ${e.toString()}');
    } finally {
      setState(() => _isRegistering = false);
    }
  }

  void _showSuccessDialog(VpnRegistrationResult result) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green),
            SizedBox(width: 8),
            Text('Registration Successful!'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (result.isNewClient)
              Container(
                padding: EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.new_label, color: Colors.blue, size: 16),
                    SizedBox(width: 8),
                    Text('New client created', style: TextStyle(color: Colors.blue)),
                  ],
                ),
              )
            else
              Container(
                padding: EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.refresh, color: Colors.orange, size: 16),
                    SizedBox(width: 8),
                    Text('Keys regenerated', style: TextStyle(color: Colors.orange)),
                  ],
                ),
              ),
            SizedBox(height: 16),
            _buildInfoRow('Device ID', result.clientInfo.deviceId),
            _buildInfoRow('VPN IP', result.clientInfo.vpnIp),
            if (result.clientInfo.country != null)
              _buildInfoRow('Location', '${result.clientInfo.city}, ${result.clientInfo.country}'),
            SizedBox(height: 8),
            Text(
              '🔐 Keys have been generated and stored securely',
              style: TextStyle(color: Colors.green, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('OK'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              // Navigate to VPN connection screen
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => VpnConnectionScreen()),
              );
            },
            child: Text('Connect Now'),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$label: ', style: TextStyle(fontWeight: FontWeight.bold)),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.error, color: Colors.red),
            SizedBox(width: 8),
            Text('Registration Failed'),
          ],
        ),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('VPN Registration'),
        backgroundColor: Colors.blue,
      ),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  children: [
                    Icon(Icons.vpn_key, size: 64, color: Colors.blue),
                    SizedBox(height: 16),
                    Text(
                      'Register Your Device',
                      style: Theme.of(context).textTheme.headlineSmall,
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: 8),
                    Text(
                      'The server will generate secure WireGuard keys for your device',
                      style: Theme.of(context).textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(height: 24),
            TextField(
              controller: _deviceNameController,
              decoration: InputDecoration(
                labelText: 'Device Name (Optional)',
                hintText: 'e.g., John\'s iPhone',
                prefixIcon: Icon(Icons.phone_android),
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isRegistering ? null : _registerDevice,
              style: ElevatedButton.styleFrom(
                padding: EdgeInsets.all(16),
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
              ),
              child: _isRegistering
                ? Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      ),
                      SizedBox(width: 12),
                      Text('Registering...'),
                    ],
                  )
                : Text(
                    '🔐 Register Device & Generate Keys',
                    style: TextStyle(fontSize: 16),
                  ),
            ),
            if (_registrationResult != null) ...[
              SizedBox(height: 24),
              Card(
                color: Colors.green.withOpacity(0.1),
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green),
                          SizedBox(width: 8),
                          Text(
                            'Registration Complete',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.green,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 8),
                      Text('VPN IP: ${_registrationResult!.clientInfo.vpnIp}'),
                      Text('Keys: Generated and stored securely'),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
```

---

## 🔧 **Key Benefits**

### **1. Simplified Client Implementation**
- No need for WireGuard key generation libraries on client
- Reduced app size and complexity
- Works consistently across all platforms

### **2. Better Key Management**
- Server maintains complete key pairs
- Easier to regenerate keys when needed
- Centralized key lifecycle management

### **3. Enhanced Security**
- Keys generated using server's secure random sources
- No client-side key generation vulnerabilities
- Consistent key quality across devices

### **4. Improved Troubleshooting**
- Server can regenerate keys for troubleshooting
- No key mismatch issues between client and server
- Easier to debug connection problems

---

## 📋 **Migration from Client-Side Keys**

If you have existing clients using client-side key generation:

### **Option 1: Gradual Migration**
```dart
Future<void> migrateToServerKeys() async {
  try {
    // Check if we have server-generated keys
    final storedKeys = await _vpnService.getStoredKeys();
    
    if (storedKeys == null) {
      // No server keys, need to register
      await _registerWithServer();
    }
  } catch (e) {
    print('Migration failed: $e');
  }
}
```

### **Option 2: Force Re-registration**
```dart
Future<void> forceReregistration() async {
  // Clear old keys
  await _clearOldKeys();
  
  // Register with server-generated keys
  await _registerWithServer();
}
```

---

## 🧪 **Testing the Integration**

### **Test Registration**
```bash
curl -X POST http://81.30.161.139/api/vpn/register \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test_device_123",
    "deviceName": "Test Device"
  }'
```

### **Expected Response**
```json
{
  "success": true,
  "isNewClient": true,
  "clientInfo": {
    "deviceId": "test_device_123",
    "deviceName": "Test Device",
    "vpnIp": "172.16.0.X"
  },
  "clientKeys": {
    "privateKey": "...",
    "publicKey": "...",
    "presharedKey": "..."
  }
}
```

---

## 🛡️ **Security Considerations**

### **1. Key Storage**
```dart
// Use flutter_secure_storage for production
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const secureStorage = FlutterSecureStorage();

Future<void> storeKeysSecurely(ClientKeys keys) async {
  await secureStorage.write(key: 'vpn_private_key', value: keys.privateKey);
  await secureStorage.write(key: 'vpn_public_key', value: keys.publicKey);
  await secureStorage.write(key: 'vpn_preshared_key', value: keys.presharedKey);
}
```

### **2. Network Security**
- Always use HTTPS for API calls
- Validate server certificates
- Implement request timeout and retry logic

### **3. Key Lifecycle**
- Implement key rotation if needed
- Clear keys on app uninstall
- Handle key regeneration scenarios

---

## 🚀 **Deployment Checklist**

### **Backend**
- [ ] Update VPN service with server-side key generation
- [ ] Test registration endpoint thoroughly
- [ ] Verify WireGuard integration works
- [ ] Update API documentation
- [ ] Deploy to production server

### **Flutter App**
- [ ] Update VPN service implementation
- [ ] Add secure key storage
- [ ] Update UI for new registration flow
- [ ] Test on multiple devices
- [ ] Handle existing user migration
- [ ] Update app store listings

### **Testing**
- [ ] Test new client registration
- [ ] Test existing client updates
- [ ] Verify VPN connection works
- [ ] Test key storage and retrieval
- [ ] Test error handling scenarios

---

**🎉 Your VPN system now uses secure server-side key generation!**

This approach simplifies client implementation while maintaining security and provides better control over the key lifecycle.
