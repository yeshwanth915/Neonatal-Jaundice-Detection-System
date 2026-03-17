# 🚀 Quick Start Guide

Get your Neonatal Jaundice Detection System running in **5 minutes**!

---

## ⚡ Super Quick Setup

### **1. Prerequisites Check**
```bash
# Verify Python (3.8+)
python --version

# Verify Node.js (16+)
node --version

# Verify Expo CLI
npx expo --version
```

### **2. Clone & Setup**
```bash
# Clone repository
git clone https://github.com/yeshwanth915/Neonatal-Jaundice-Detection-System.git
cd Neonatal-Jaundice-Detection-System
```

### **3. Backend Start** (2 minutes)
```bash
cd jaundice_ml
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python start_server.py
```
**✅ Backend running on http://localhost:8000**

### **4. Mobile Start** (2 minutes)
```bash
cd mobile_app
npm install
npx expo install
npx expo start
```
**✅ Mobile running - Scan QR code with Expo Go**

### **5. Test Connection** (1 minute)
Open mobile app → Take photo → Get prediction!

---

## 🔧 Network Configuration

### **Find Your Computer IP**
```bash
# Windows
ipconfig
# Look for "IPv4 Address" (usually 192.168.1.XXX)

# Mac/Linux
ifconfig
# Look for "inet" address
```

### **Update Mobile App**
Edit `mobile_app/services/api.js`:
```javascript
// Replace YOUR_COMPUTER_IP with your IP
const expoGoEndpoints = [
    'http://YOUR_COMPUTER_IP:8000',  // Change this line
    // ... other endpoints
];
```

### **Common Network IPs**
| Network Type | IP Range | Example |
|--------------|------------|---------|
| Home WiFi | 192.168.1.XXX | 192.168.1.100 |
| Office | 10.X.X.X | 10.0.0.50 |
| Mobile Hotspot | 192.168.43.XXX | 192.168.43.1 |

---

## 🧪 Quick Test

### **Test Backend**
```bash
curl http://localhost:8000/health
```
Should return: `{"status": "healthy"}`

### **Test Mobile**
1. Open Expo Go app
2. Scan QR code from terminal
3. Allow camera permissions
4. Take a photo of skin/eye area
5. Wait for prediction result

### **Expected Result**
```json
{
  "prediction_label": "normal",
  "risk": "Normal",
  "confidence": "85.0%",
  "jaundice_probability": 0.15
}
```

---

## 🐛 Quick Fixes

### **❌ "Network Error"**
1. Check backend is running (curl command above)
2. Update IP address in `api.js`
3. Ensure same WiFi network
4. Restart mobile app

### **❌ "Camera Permission Denied"**
1. Go to phone Settings → Apps → Expo Go
2. Enable Camera permissions
3. Restart app

### **❌ "Backend Not Running"**
```bash
# Kill existing process
taskkill /f /im python.exe

# Restart backend
cd jaundice_ml
python start_server.py
```

---

## 📱 Device Setup

### **Android**
```bash
# Physical device
npx expo run android

# Emulator
npx expo start
# Press 'a' in terminal
```

### **iOS**
```bash
# Physical device
npx expo run ios

# Simulator
npx expo start
# Press 'i' in terminal
```

### **Web**
```bash
npx expo start --web
# Open http://localhost:19006
```

---

## 🔍 Verification

### **✅ Success Indicators**
- Backend terminal shows: `Uvicorn running on http://0.0.0.0:8000`
- Expo terminal shows: `Metro waiting on exp://...`
- Mobile app shows: Camera preview
- Prediction returns: JSON result with confidence

### **📊 Test Images**
Use any clear photo of:
- Skin area (arm/leg)
- Eye area (white of eye)
- Good lighting
- No flash glare

---

## 🎯 Next Steps

### **✅ You're Ready!**
1. **Explore Features**: Dashboard, History, Settings
2. **Test Different Images**: Various lighting conditions
3. **Check Accuracy**: Compare with medical readings
4. **Review Documentation**: [README.md](README.md)

### **📚 Learn More**
- 📖 **Full Documentation**: [README.md](README.md)
- 🔬 **Model Details**: [MODEL_GUIDE.md](MODEL_GUIDE.md)
- 📱 **Mobile Guide**: [mobile_app/README.md](mobile_app/README.md)

---

## 🆘 Need Help?

### **Common Issues**
| Problem | Solution |
|---------|----------|
| Backend won't start | Check Python version, install requirements |
| Mobile can't connect | Update IP address in api.js |
| Camera not working | Enable permissions, restart app |
| Predictions fail | Check backend health, verify image |

### **Get Support**
- 🐛 **GitHub Issues**: [Report Bug](https://github.com/yeshwanth915/Neonatal-Jaundice-Detection-System/issues)
- 💬 **Discussions**: [Ask Question](https://github.com/yeshwanth915/Neonatal-Jaundice-Detection-System/discussions)
- 📧 **Email**: support@jaundice-monitor.app

---

**🎉 Congratulations! Your Neonatal Jaundice Detection System is ready to use!**

*This quick start guide should get you up and running in 5 minutes. For detailed information, please refer to the main [README.md](README.md) file.*

---

*Last Updated: March 17, 2026*
