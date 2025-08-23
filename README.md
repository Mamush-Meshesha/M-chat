# M-Chat - Real-Time Chat Application

A modern, responsive real-time chat application built with React, TypeScript, Redux-Saga, Socket.IO, and Tailwind CSS.

## ✨ Features

### 🚀 Real-Time Messaging

- **Instant Message Display**: Messages appear immediately without refresh
- **Real-Time Updates**: Live message delivery using Socket.IO
- **Typing Indicators**: See when someone is typing
- **Online Status**: Real-time online/offline status

### 🔔 Smart Notifications

- **Unread Message Counts**: See how many unread messages from each user
- **Toast Notifications**: Beautiful pop-up notifications for new messages
- **Sound Alerts**: Audio notifications for new messages (optional)
- **Smart Notification Logic**: Only shows notifications for messages not in current chat

### 🎨 Modern UI/UX

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Smooth Animations**: Beautiful message animations and transitions
- **Fixed Header & Footer**: Chat area scrolls independently
- **Modern Chat Bubbles**: WhatsApp-style message design
- **Hover Effects**: Interactive buttons and elements

### 📱 Mobile-First Design

- **Collapsible Sidebar**: Mobile-friendly navigation
- **Touch-Optimized**: Optimized for mobile devices
- **Responsive Layout**: Adapts to all screen sizes

### 🔧 Technical Features

- **Redux State Management**: Centralized state with Redux Toolkit
- **Redux-Saga**: Advanced async operations
- **TypeScript**: Full type safety
- **Socket.IO**: Real-time bidirectional communication
- **Tailwind CSS**: Utility-first CSS framework

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd M-chat
   ```

2. **Install dependencies**

   ```bash
   # Install socket server dependencies
   cd socket && npm install

   # Install frontend dependencies
   cd ../frontend && npm install
   ```

3. **Add notification sound (optional)**

   ```bash
   # Replace the placeholder file with an actual MP3
   # Recommended: Short notification sound (0.5-2 seconds)
   # Place your notification.mp3 file in frontend/public/
   ```

4. **Start the application**

   ```bash
   # Option 1: Use the start script (recommended)
   ./start-chat.sh

   # Option 2: Start manually
   # Terminal 1: Start socket server
   cd socket && npm run dev

   # Terminal 2: Start frontend
   cd frontend && npm run dev
   ```

### Access the Application

- **Frontend**: http://localhost:5173
- **Socket Server**: http://localhost:8000
- **Backend API**: http://localhost:5300 (make sure your backend is running)

## 🏗️ Project Structure

```
M-chat/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   └── ui/
│   │   │       ├── notification.tsx    # Toast notifications
│   │   │       ├── dashboardheader.tsx # Chat header
│   │   │       └── dashboardbottom.tsx # Message input
│   │   ├── pages/          # Page components
│   │   ├── slice/          # Redux slices
│   │   ├── saga/           # Redux sagas
│   │   └── store/          # Redux store configuration
│   ├── public/
│   │   └── notification.mp3 # Notification sound file
│   └── package.json
├── socket/                  # Socket.IO server
│   ├── socket.js           # Socket server implementation
│   └── package.json
└── backend/                 # Backend API (not included in this update)
```

## 🔧 Key Improvements Made

### 1. Real-Time Messaging

- Fixed Socket.IO implementation for instant message delivery
- Messages now appear immediately without page refresh
- Proper message broadcasting to all connected users

### 2. Smart Notifications System

- **Unread Message Counts**: Red badge showing number of unread messages
- **Toast Notifications**: Beautiful pop-up notifications for new messages
- **Sound Alerts**: Audio notifications (optional)
- **Smart Logic**: Only shows notifications for messages not in current chat
- **Auto-Clear**: Notifications automatically clear when viewing the chat

### 3. Enhanced User Experience

- **Visual Indicators**: Red badges on chat icons and user lists
- **Online Status**: Real-time online/offline indicators
- **Message Counters**: Clear indication of unread messages per user
- **Smart Notifications**: Context-aware notification system

### 4. Responsive Design

- Mobile-first approach with collapsible sidebar
- Responsive breakpoints for all screen sizes
- Touch-friendly mobile interface

### 5. Fixed Layout

- Header (user info, call buttons) stays fixed at top
- Footer (message input) stays fixed at bottom
- Only chat messages area scrolls

### 6. Enhanced UI/UX

- Smooth animations for messages and interactions
- Better typography and spacing
- Improved button states and hover effects
- Custom scrollbar styling

### 7. Better State Management

- Real-time message updates in Redux store
- Typing indicators state management
- Unread message tracking
- Notification state management
- Proper cleanup and error handling

## 🔔 Notification Features

### Unread Message Counts

- Red badges showing number of unread messages from each user
- Displayed on chat icon, mobile menu button, and individual user items
- Automatically clears when viewing the chat

### Toast Notifications

- Beautiful pop-up notifications for new messages
- Shows sender name and message preview
- Auto-dismisses after 4 seconds
- Can be manually dismissed
- Stacks multiple notifications

### Sound Alerts

- Optional audio notifications for new messages
- Uses notification.mp3 file in public folder
- Gracefully handles audio failures
- Volume set to 50% for pleasant experience

### Smart Notification Logic

- Only shows notifications for messages not in current chat
- Prevents spam when actively chatting
- Maintains unread counts for all conversations

## 📱 Mobile Features

- **Collapsible Navigation**: Tap menu button to show/hide sidebar
- **Touch-Optimized**: Larger touch targets and smooth gestures
- **Responsive Layout**: Automatically adapts to screen size
- **Mobile-First**: Designed primarily for mobile devices
- **Notification Badges**: Clear unread message indicators on mobile

## 🎨 Customization

### Colors

The application uses a consistent color scheme:

- Primary: `#4EAC6D` (Green)
- Background: `#E5DDD5` (Light Gray)
- Dark: `#19271e` (Dark Green)
- Text: `#66615e` (Gray)
- Notification: `#ef4444` (Red)

### Animations

Custom CSS animations are included:

- `animate-fadeIn`: Fade in effect
- `animate-slideInLeft`: Slide in from left
- `animate-slideInRight`: Slide in from right
- `typing-dot`: Typing indicator animation

### Notification Sounds

- Place your preferred notification sound in `frontend/public/notification.mp3`
- Recommended: Short, pleasant sound (0.5-2 seconds)
- File size should be under 100KB for fast loading

## 🐛 Troubleshooting

### Common Issues

1. **Messages not appearing instantly**

   - Ensure socket server is running on port 8000
   - Check browser console for socket connection errors
   - Verify backend API is running on port 5300

2. **Notifications not working**

   - Check if notification.mp3 file exists in public folder
   - Ensure browser allows audio playback
   - Check browser console for errors

3. **Unread counts not updating**

   - Verify Redux store is properly configured
   - Check if socket messages are being received
   - Ensure user IDs match between sender and receiver

4. **Mobile menu not working**

   - Ensure you're using the latest version
   - Check if JavaScript is enabled
   - Try refreshing the page

5. **Socket connection issues**
   - Check if port 8000 is available
   - Ensure no firewall is blocking the connection
   - Verify CORS settings in socket server

### Debug Mode

Enable debug logging by checking the browser console and socket server terminal for detailed information.

## 🚀 Deployment

### Frontend

```bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting service
```

### Socket Server

```bash
cd socket
npm start
# Use PM2 or similar for production process management
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section
2. Review the browser console for errors
3. Check the socket server terminal output
4. Create an issue in the repository

---

**Happy Chatting! 🎉**
