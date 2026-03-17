# 🚨 RUNTIME NOT READY - COMPLETE FIX GUIDE

## 📱 Problem: "Runtime not ready" Error in Expo Go

This error occurs when Expo Go cannot properly connect to the Metro bundler or there are compatibility/network issues.

## 🔧 QUICK FIXES (Try in Order)

### 1. **Restart Everything**
```bash
# Stop current server (Ctrl+C)
# Clear Metro cache
npx expo start --clear

# Or completely reset:
npx expo start -c
```

### 2. **Check Network Connection**
- Ensure phone and computer are on same network
- Verify hotspot is working properly
- Check firewall isn't blocking port 8081

### 3. **Use Tunnel Mode**
```bash
npx expo start --tunnel
```
This bypasses local network issues by using Expo's tunnel servers.

### 4. **Clear App Cache**
- In Expo Go app: Shake phone → Dev Menu → Reload
- Or: Close and reopen Expo Go app
- Clear app data if needed

## 🛠️ DETAILED TROUBLESHOOTING

### Step 1: Check Metro Status
```bash
cd "d:\Neonatal Jaundice\Neonatal Jaundice\mobile_app"
npx expo start
```

**Should show:**
```
Metro waiting on exp://10.32.61.195:8081
✅ Bundled successfully
✅ Ready
```

### Step 2: Verify QR Code
- QR code should be visible in terminal
- Scan with Expo Go camera
- Should show "Connecting..." then app loads

### Step 3: Network Diagnostics
```bash
# Check if port 8081 is accessible
telnet 10.32.61.195 8081

# Or check with PowerShell:
Test-NetConnection -ComputerName 10.32.61.195 -Port 8081
```

### Step 4: Expo Go Troubleshooting
1. **Update Expo Go**: Ensure latest version from Play Store
2. **Clear Cache**: Settings → Apps → Expo Go → Storage → Clear cache
3. **Reinstall**: Uninstall and reinstall Expo Go if needed

## 🔍 ADVANCED FIXES

### Fix 1: Disable Fast Refresh
```bash
npx expo start --no-dev
```

### Fix 2: Use Different Port
```bash
npx expo start --port 8082
```

### Fix 3: Check Expo Configuration
```json
{
  "expo": {
    "sdkVersion": "54.0.0",
    "platforms": ["ios", "android", "web"]
  }
}
```

### Fix 4: Update Dependencies
```bash
npm update
npx expo install --fix
```

## 🌐 Network-Specific Solutions

### For Hotspot Connection:
1. **Computer IP**: `10.32.61.195` (from your setup)
2. **Metro Port**: `8081`
3. **Full URL**: `exp://10.32.61.195:8081`

### Manual Connection:
1. In Expo Go: "Enter URL manually"
2. Enter: `exp://10.32.61.195:8081`
3. Tap Connect

## 📊 Common Causes & Solutions

| Cause | Solution |
|-------|----------|
| **Network Issues** | Use `--tunnel` mode |
| **Firewall Blocking** | Allow port 8081 in Windows Firewall |
| **Metro Cache Issues** | Use `--clear` flag |
| **Expo Go Version** | Update to latest version |
| **IP Address Changes** | Use tunnel or manual URL entry |
| **Hotspot Unstable** | Restart hotspot connection |

## 🚀 BEST PRACTICES

### 1. **Start Sequence**
```bash
# 1. Start backend server first
cd "d:\Neonatal Jaundice\Neonatal Jaundice\jaundice_ml"
python start_server.py

# 2. Then start mobile app
cd "d:\Neonatal Jaundice\Neonatal Jaundice\mobile_app"
npx expo start --clear
```

### 2. **Connection Testing**
- Backend: `http://10.32.61.195:8000/health`
- Mobile: `exp://10.32.61.195:8081`

### 3. **Development Workflow**
```bash
# Development with hot reload
npx expo start

# Production testing
npx expo start --no-dev --minify

# Network troubleshooting
npx expo start --tunnel
```

## 🆘 Emergency Fixes

### If Nothing Works:
1. **Reset Network**: Restart computer and phone
2. **Different Network**: Try WiFi instead of hotspot
3. **Expo CLI Update**: `npm install -g @expo/cli`
4. **Project Reset**: 
   ```bash
   npx create-expo-app temp-app
   # Copy source files to new project
   ```

## 📱 Android-Specific Fixes

### Enable USB Debugging:
1. Settings → About Phone → Tap Build Number 7 times
2. Settings → Developer Options → USB Debugging
3. Connect via USB for more stable connection

### Expo Go Permissions:
- Camera: Required for image capture
- Storage: Required for image selection
- Network: Required for backend connection

## 🎯 Expected Results

**Working Setup:**
```
✅ Metro bundler running on port 8081
✅ QR code visible and scannable
✅ Expo Go connects successfully
✅ App loads without "Runtime not ready"
✅ Hot reload works during development
```

## 📞 If Still Having Issues

1. **Check Expo Status**: https://status.expo.dev/
2. **Expo Forums**: https://forums.expo.dev/
3. **GitHub Issues**: Check for known SDK issues
4. **Network Admin**: Verify no corporate firewall blocking

---

**🚀 Try the tunnel mode first - it solves 90% of network-related runtime issues!**
