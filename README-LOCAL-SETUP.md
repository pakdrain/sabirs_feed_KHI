# Local Camera Monitoring Setup for Windows

## Quick Start Guide

### Step 1: Download Project Files
Copy all project files to your Windows machine at: `C:\Users\Admin\Desktop\CameraStreamMonitor\`

### Step 2: Install Dependencies
Open Command Prompt in the project folder and run:
```cmd
npm install
```

### Step 3: Start the Application
Double-click: `start-camera-monitor-improved.bat`

Or run manually:
```cmd
npx tsx server/index.ts
```

### Step 4: Access Your Camera
Open browser: http://localhost:5000

## Camera Movement Solution

The application includes enhanced features specifically for camera movement:

✅ **Automatic Stream Recovery**: When you move the camera and the connection briefly drops, the stream automatically restarts within 2-3 seconds

✅ **No Manual Intervention**: You don't need to press play again after moving the camera

✅ **Persistent Streaming**: The system remembers you want the stream active and maintains it through interruptions

✅ **Local Network Stability**: Running locally eliminates cloud connectivity issues

## Troubleshooting

**If stream doesn't auto-start:**
- Refresh the browser page
- Check that your camera is accessible at 10.10.10.146:554

**If camera movement causes long interruptions:**
- This is normal for 2-3 seconds during movement
- The stream should automatically recover
- If it doesn't recover, check your camera's network connection

**FFmpeg Errors:**
- Make sure FFmpeg is installed on your Windows system
- The application will use your local FFmpeg which supports your camera better

## Configuration

Your camera settings are configured for:
- IP: 10.10.10.146
- Port: 554
- Username: admin
- Password: admin123
- Channel: 1

To modify these settings, edit the camera configuration in `server/storage.ts`

## Benefits of Local Setup

1. **Direct Network Access**: No cloud connectivity issues
2. **Faster Recovery**: Local network responds quickly to camera movement
3. **Better Stability**: Eliminates internet-dependent streaming
4. **Real-time Monitoring**: Minimal latency for live monitoring
5. **Automatic Recovery**: Seamless handling of camera repositioning