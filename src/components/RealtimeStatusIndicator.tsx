/**
 * RealtimeStatusIndicator — Shows realtime connection status
 * 
 * A small dot indicator that shows whether the platform is 
 * connected to realtime updates. Green = connected, yellow = reconnecting.
 */

import { useRealtimeStatus } from '@/components/RealtimeProvider';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RealtimeStatusIndicator({ className }: { className?: string }) {
  const { isConnected, activeChannels, lastEvent } = useRealtimeStatus();

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        className
      )}
      title={
        isConnected
          ? `Realtime connected — ${activeChannels} tables syncing${lastEvent ? `\nLast update: ${lastEvent.table} (${lastEvent.type})` : ''}`
          : 'Realtime disconnected — updates may be delayed'
      }
    >
      <div
        className={cn(
          "h-2 w-2 rounded-full transition-colors duration-300",
          isConnected
            ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
            : "bg-yellow-500 animate-pulse"
        )}
      />
      {isConnected ? (
        <Wifi className="h-3 w-3 text-green-500/70" />
      ) : (
        <WifiOff className="h-3 w-3 text-yellow-500/70" />
      )}
    </div>
  );
}
