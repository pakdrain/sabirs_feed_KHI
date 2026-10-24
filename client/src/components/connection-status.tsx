interface ConnectionStatusProps {
  isConnected: boolean;
}

export default function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className="flex items-center space-x-2">
      <div
        className={`w-3 h-3 rounded-full animate-pulse ${
          isConnected ? 'bg-monitoring-green' : 'bg-monitoring-red'
        }`}
      />
      <span
        className={`text-sm font-medium ${
          isConnected ? 'text-monitoring-green' : 'text-monitoring-red'
        }`}
      >
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}
