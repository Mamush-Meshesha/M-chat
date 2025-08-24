# 🚀 Frontend Deployment Guide

## **Environment Configuration**

### **Production URLs:**

- **Socket Server:** `https://m-chat-1.onrender.com`
- **Backend API:** `https://m-chat-k2ob.onrender.com`

### **Environment Variables (Optional):**

Create a `.env.production` file in the frontend root:

```bash
VITE_SOCKET_URL=https://m-chat-1.onrender.com
VITE_API_BASE_URL=https://m-chat-k2ob.onrender.com
VITE_NODE_ENV=production
```

## **Build and Deploy**

### **1. Install Dependencies:**

```bash
npm install
```

### **2. Build for Production:**

```bash
npm run build
```

### **3. Deploy:**

- The `dist` folder contains your production build
- Deploy this folder to your hosting service (Vercel, Netlify, etc.)

## **Configuration Files Updated:**

✅ **`src/config/environment.ts`** - Environment detection
✅ **`src/config/config.ts`** - Centralized configuration
✅ **`src/services/socketManager.ts`** - Socket connection
✅ **`src/services/callingService.ts`** - API calls
✅ **`src/saga/sagaAuth.ts`** - Authentication API calls

## **Features:**

- 🔄 **Automatic environment detection**
- 🌐 **Production URLs as fallbacks**
- 📱 **Responsive design**
- 🔊 **Working audio system**
- 📞 **WebRTC calling**
- 🔐 **Secure authentication**

## **Testing:**

After deployment, test:

1. ✅ **User registration/login**
2. ✅ **Socket connection**
3. ✅ **Audio/video calls**
4. ✅ **Real-time messaging**
5. ✅ **Call cancellation**

## **Troubleshooting:**

- **Socket connection issues:** Check if socket server is running
- **API errors:** Verify backend server is accessible
- **Audio issues:** Check browser permissions and HTTPS
- **CORS errors:** Ensure backend allows your frontend domain
