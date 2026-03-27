import { emitter } from '@/services/vpnEmitter';
import { useEffect, useState } from 'react';

export function useVpnStats() {
    const [stats, setStats] = useState({
        duration: 0,
        up: 0,
        down: 0,
        upSpd: 0,
        downSpd: 0,
        apps: 0     
    });

    useEffect(() => {
        const subscription = emitter.addListener('VPN_STATS', (data) => {
            setStats(data);
        });

        return () => subscription.remove();
    }, []);

    return stats;
}