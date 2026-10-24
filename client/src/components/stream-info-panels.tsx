import { Camera, TrendingUp, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera as CameraType } from "@shared/schema";

interface StreamInfoPanelsProps {
  camera: CameraType;
  isConnected: boolean;
  streamStats: any;
}

export default function StreamInfoPanels({
  camera,
  isConnected,
  streamStats,
}: StreamInfoPanelsProps) {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Connection Details */}
      <Card className="bg-monitoring-slate border-monitoring-gray">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-300 flex items-center">
            <div className="w-4 h-4 mr-2 text-monitoring-blue">🌐</div>
            Connection Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Status:</span>
            <span className={`font-medium ${isConnected ? 'text-monitoring-green' : 'text-monitoring-red'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Latency:</span>
            <span className="text-white">
              {streamStats?.latency ? `${streamStats.latency}ms` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Uptime:</span>
            <span className="text-white">
              {streamStats?.uptime || '00:00:00'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Protocol:</span>
            <span className="text-white">RTSP/TCP</span>
          </div>
        </CardContent>
      </Card>

      {/* Stream Quality */}
      <Card className="bg-monitoring-slate border-monitoring-gray">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-300 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-monitoring-blue" />
            Stream Quality
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Bitrate:</span>
            <span className="text-white">
              {streamStats?.bandwidth || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">FPS:</span>
            <span className="text-white">
              {streamStats?.fps || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Dropped:</span>
            <span className="text-white">
              {streamStats?.droppedFrames !== undefined ? `${streamStats.droppedFrames} frames` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Buffer:</span>
            <span className="text-white">
              {streamStats?.buffer || 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Camera Settings */}
      <Card className="bg-monitoring-slate border-monitoring-gray">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-300 flex items-center">
            <Settings className="h-4 w-4 mr-2 text-monitoring-blue" />
            Camera Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Codec:</span>
            <span className="text-white">H.264</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Resolution:</span>
            <span className="text-white">640x480</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">IP:</span>
            <span className="text-white">{camera.ip}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Port:</span>
            <span className="text-white">{camera.port}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Channel:</span>
            <span className="text-white">Main Stream</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Auth:</span>
            <span className="text-white">Basic</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
