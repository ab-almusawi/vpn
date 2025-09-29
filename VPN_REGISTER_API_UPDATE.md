# VPN Register API Update - Integration Guide

## 🔄 What Changed

The `POST /api/vpn/register` endpoint has been updated to use **server-side key generation only**. Clients no longer need to send WireGuard public keys in the request.

### ❌ Old Request (Don't Use)
```json
{
  "deviceId": "device_12345_android",
  "deviceName": "John's iPhone",
  "realIp": "203.0.113.1",
  "publicKey": "kUzASNf+RCpmsVvWKG/qHcXKwaX3Nm18oBqccJB+7f8="  // ❌ No longer needed
}
```

### ✅ New Request (Use This)
```json
{
  "deviceId": "unique-device-identifier",
  "deviceName": "Samsung Galaxy S21",        // Optional
  "realIp": "203.123.45.67"                 // Optional - auto-extracted from headers
}
```

---

## 🚀 Integration Guide

### 1. **Client-Side Request**

**Endpoint**: `POST /api/vpn/register`

**Required Headers**:
```http
Content-Type: application/json
```

**Request Body**:
```typescript
interface RegisterVpnRequest {
  deviceId: string;           // Required: Unique device identifier
  deviceName?: string;        // Optional: Human-readable device name
  realIp?: string;           // Optional: Will be auto-extracted from headers
}
```

**Example cURL**:
```bash
curl -X POST "https://81.30.161.139/api/vpn/register" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "android_samsung_s21_user123",
    "deviceName": "Samsung Galaxy S21"
  }'
```

### 2. **Server Response**

**Success Response (201)**:
```json
{
  "success": true,
  "isNewClient": true,
  "clientInfo": {
    "deviceId": "android_samsung_s21_user123",
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
  "configTemplate": "[Interface]\nPrivateKey = iPbR70lgp09QQ9GS/BQE1FVmSLI2H/F9qavzBUpV9X0=\nAddress = 172.16.0.2/16\nDNS = 8.8.8.8, 8.8.4.4\n\n[Peer]\nPublicKey = CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=\nEndpoint = 81.30.161.139:51820\nAllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25",
  "instructions": "Use the provided private key with this configuration to connect to the VPN."
}
```

---

## 📱 Platform-Specific Integration

### **Flutter/Dart Example**
```dart
class VpnRegistrationService {
  static const String baseUrl = 'https://your-vpn-server.com/api';
  
  Future<VpnRegistrationResponse> registerDevice({
    required String deviceId,
    String? deviceName,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/vpn/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'deviceId': deviceId,
        if (deviceName != null) 'deviceName': deviceName,
      }),
    );
    
    if (response.statusCode == 201) {
      return VpnRegistrationResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to register VPN client');
    }
  }
}

class VpnRegistrationResponse {
  final bool success;
  final bool isNewClient;
  final ClientInfo clientInfo;
  final ServerConfig serverConfig;
  final ClientKeys clientKeys;
  final String configTemplate;
  
  // Constructor and fromJson implementation...
}
```

### **JavaScript/React Example**
```javascript
class VpnApi {
  static baseUrl = 'https://your-vpn-server.com/api';
  
  static async registerDevice(deviceId, deviceName = null) {
    const response = await fetch(`${this.baseUrl}/vpn/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        ...(deviceName && { deviceName }),
      }),
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`Registration failed: ${response.statusText}`);
    }
  }
}

// Usage
try {
  const result = await VpnApi.registerDevice(
    'web_chrome_user456', 
    'Chrome Browser'
  );
  
  // Use result.clientKeys.privateKey for WireGuard config
  console.log('VPN Config:', result.configTemplate);
} catch (error) {
  console.error('Registration failed:', error);
}
```

### **Android/Kotlin Example**
```kotlin
data class RegisterVpnRequest(
    val deviceId: String,
    val deviceName: String? = null
)

class VpnApiService {
    private val baseUrl = "https://your-vpn-server.com/api"
    
    suspend fun registerDevice(
        deviceId: String, 
        deviceName: String? = null
    ): VpnRegistrationResponse {
        val request = RegisterVpnRequest(deviceId, deviceName)
        
        val response = httpClient.post("$baseUrl/vpn/register") {
            contentType(ContentType.Application.Json)
            setBody(request)
        }
        
        return response.body<VpnRegistrationResponse>()
    }
}
```

---

## 🔧 Key Benefits

### **Enhanced Security**
- ✅ All cryptographic keys generated server-side
- ✅ No key transmission from client
- ✅ Reduced attack surface

### **Simplified Integration** 
- ✅ Minimal client request payload
- ✅ No client-side crypto libraries needed
- ✅ Automatic IP detection

### **Better UX**
- ✅ Faster registration process
- ✅ No complex key generation on client
- ✅ Ready-to-use WireGuard configuration

---

## 🔍 Testing

### **Test Request**
```bash
# Test the updated endpoint
curl -X POST "http://localhost:3000/api/vpn/register" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test_device_001",
    "deviceName": "Test Device"
  }'
```

### **Expected Response Fields**
- ✅ `success: true`
- ✅ `clientKeys.privateKey` (44 characters)
- ✅ `clientKeys.publicKey` (44 characters)  
- ✅ `configTemplate` (Complete WireGuard config)
- ✅ `clientInfo.vpnIp` (Assigned VPN IP)

---

## 🚨 Migration Notes

### **For Existing Clients**
1. **Remove** `publicKey` field from requests
2. **Remove** client-side key generation code
3. **Update** request payloads to new format
4. **Use** server-provided `clientKeys.privateKey`

### **Backward Compatibility**
- ✅ Legacy `/api/vpn/get-config` endpoint still available
- ✅ Existing VPN configurations remain valid
- ✅ Database schema unchanged

### **No Breaking Changes**
- Existing registered clients continue working
- Only the registration process is simplified
- Server maintains all client data

---

## 📞 Support

For integration issues or questions:
- Check API response for error details
- Verify `deviceId` uniqueness  
- Ensure proper Content-Type headers
- Review server logs for debugging

**Updated**: December 2024  
**API Version**: v1.1  
**Endpoint**: `POST /api/vpn/register`
