import { useEffect, useState } from 'react';
import type { VehicleEvent } from '@/lib/types';

export function useFleetStream() {
    const [vehicles, setVehicles] = useState<VehicleEvent[]>([]);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        let es: EventSource | null = null;

        try {
            es = new EventSource(`${apiUrl}/api/stream/fleet`);

            es.onopen = () => setConnected(true);
            es.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    setVehicles(data);
                } catch { /* ignore parse errors */ }
            };
            es.onerror = () => {
                setConnected(false);
                // SSE will auto-reconnect
            };
        } catch {
            setConnected(false);
        }

        return () => {
            if (es) es.close();
        };
    }, []);

    return { vehicles, connected };
}
