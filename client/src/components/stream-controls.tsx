import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Maximize } from "lucide-react";

interface StreamControlsProps {
  isStreaming: boolean;
  onToggleStream: () => void;
  onReconnect: () => void;
}

export default function StreamControls({
  isStreaming,
  onToggleStream,
  onReconnect,
}: StreamControlsProps) {
  const handleFullscreen = () => {
    const element = document.getElementById('video-container');
    if (element) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        element.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <Button
        onClick={onToggleStream}
        className="flex items-center space-x-2 bg-monitoring-blue hover:bg-blue-600 px-4 py-2"
      >
        {isStreaming ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isStreaming ? 'Pause' : 'Play'}
        </span>
      </Button>
      
      <Button
        onClick={onReconnect}
        variant="secondary"
        className="flex items-center space-x-2 bg-monitoring-gray hover:bg-gray-600 px-4 py-2"
      >
        <RotateCcw className="h-4 w-4" />
        <span className="text-sm font-medium">Reconnect</span>
      </Button>
      
      <Button
        onClick={handleFullscreen}
        variant="secondary"
        className="bg-monitoring-gray hover:bg-gray-600 px-3 py-2"
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}
