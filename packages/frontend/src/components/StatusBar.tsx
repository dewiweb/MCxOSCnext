import { useStatusStore } from '../stores/statusStore';
import { Wifi, WifiOff, Radio, Server } from 'lucide-react';

export function StatusBar() {
  const status = useStatusStore((s) => s.status);
  const isConnected = useStatusStore((s) => s.isConnected);

  return (
    <div className="flex items-center gap-4 text-sm">
      <StatusItem
        icon={isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        label="WebSocket"
        value={isConnected ? 'Connected' : 'Disconnected'}
        ok={isConnected}
      />
      <StatusItem
        icon={<Server className="w-4 h-4" />}
        label="Ember+"
        value={status?.ember.connected ? `${status.ember.host}:${status.ember.port}` : 'Disconnected'}
        ok={status?.ember.connected}
      />
      <StatusItem
        icon={<Radio className="w-4 h-4" />}
        label="OSC RX"
        value={status?.oscRx.listening ? `Port ${status.oscRx.port}` : 'Stopped'}
        ok={status?.oscRx.listening}
      />
    </div>
  );
}

function StatusItem({
  icon,
  label,
  value,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={ok ? 'text-green-400' : 'text-gray-500'}>{icon}</div>
      <div>
        <div className="text-gray-400 text-xs">{label}</div>
        <div className={ok ? 'text-white' : 'text-gray-500'}>{value}</div>
      </div>
    </div>
  );
}
