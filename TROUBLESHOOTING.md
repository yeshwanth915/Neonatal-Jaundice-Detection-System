# Network Connection Troubleshooting Guide

## 🚨 Common Issue: Android Emulator Cannot Connect to Backend

The logs show that the Android emulator cannot connect to any of the server endpoints. This is a common issue with Android development.

## 🔧 Quick Solutions

### 1. **Start the Backend Server Correctly**
```bash
cd "d:\Neonatal Jaundice\Neonatal Jaundice\jaundice_ml"
python start_server.py
```

**Important:** The server must bind to `0.0.0.0` (all interfaces), not just `localhost`.

### 2. **Use the Android App's Built-in Tools**

The mobile app now includes two debugging tools:

#### **Connection Test** (WiFi button)
- Tests all possible server endpoints
- Shows which endpoints work
- Provides real-time feedback

#### **Server Settings** (Settings button)
- Manual server URL configuration
- Preset configurations for different scenarios
- Custom URL input

### 3. **Android Emulator Network Configuration**

Android emulators use special IP addresses to reach the host machine:

- **Primary**: `10.0.2.2` (most common)
- **Alternative**: `10.0.3.2` (some emulator versions)

## 📱 Step-by-Step Fix

### Step 1: Verify Server is Running
```bash
# Test from command line
curl http://localhost:8000/health

# Should return:
# {"status":"healthy","service":"Neonatal Jaundice Classification API",...}
```

### Step 2: Test Server Accessibility
```bash
cd "d:\Neonatal Jaundice\Neonatal Jaundice"
python test_connection.py
```

### Step 3: Use Mobile App Debug Tools
1. Open the mobile app
2. Tap "Test Connection" button
3. Wait for the test to complete
4. Note which endpoint works (if any)

### Step 4: Configure Server URL (if needed)
1. Tap "Server Settings" button
2. Try the "Android Emulator" preset
3. Test the connection
4. Save the configuration

## 🛠️ Advanced Troubleshooting

### Windows Firewall Issues
The Windows Firewall might block connections from the Android emulator:

1. **Open Windows Defender Firewall**
2. **Allow an app through firewall**
3. **Add Python** (or your terminal app)
4. **Allow both Private and Public networks**

### Android Emulator Network Reset
If the emulator network is completely broken:

1. **Cold boot the emulator**
2. **Wipe emulator data**
3. **Recreate the AVD**

### Alternative: Use Physical Device
If emulator issues persist:

1. **Enable USB debugging** on your Android phone
2. **Connect via USB**
3. **Use your computer's IP address** (e.g., `192.168.1.x`)

## 🎯 Expected Working Configuration

### For Android Emulator:
```
Server URL: http://10.0.2.2:8000
Platform: Android
Network: Emulator → Host Machine
```

### For iOS Simulator:
```
Server URL: http://localhost:8000
Platform: iOS
Network: Simulator → Host Machine
```

### For Physical Device:
```
Server URL: http://192.168.x.x:8000
Platform: Android/iOS
Network: Device → Same WiFi Network
```

## 📊 Server Status Check

The server should show these logs when running correctly:
```
🚀 Starting Neonatal Jaundice API Server...
📍 Server will be available at: http://localhost:8000
📍 Health check: http://localhost:8000/health
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## 🔍 Debug Logs

The mobile app now provides detailed logging:
- Platform detection
- Endpoint testing results
- Connection success/failure
- Retry attempts with detailed errors

**Example Success Log:**
```
=== PREDICTION REQUEST ===
Platform: android
Retry count: 0
✅ Using working endpoint: http://10.0.2.2:8000
📤 Sending request to: http://10.0.2.2:8000/predict
✅ Prediction successful: {...}
```

**Example Error Log:**
```
❌ Failed to connect to http://10.0.2.2:8000: Network Error
⚠️ Connection test failed, using default URL
🔄 Using fallback endpoint: http://10.0.2.2:8000
```

## ⚡ Quick Fix Commands

```bash
# 1. Kill any existing server processes
taskkill /f /im python.exe

# 2. Start fresh server
cd "d:\Neonatal Jaundice\Neonatal Jaundice\jaundice_ml"
python start_server.py

# 3. Test connection
cd "d:\Neonatal Jaundice\Neonatal Jaundice"
python test_connection.py

# 4. Restart Android emulator (if needed)
```

## 🆘 Still Having Issues?

1. **Check the logs** in the mobile app for detailed error messages
2. **Try different endpoints** using the Server Settings dialog
3. **Verify Windows Firewall** isn't blocking Python
4. **Restart everything** (server + emulator)
5. **Use a physical device** as a last resort

The built-in connection testing tools should help identify the exact issue and provide a working configuration.
