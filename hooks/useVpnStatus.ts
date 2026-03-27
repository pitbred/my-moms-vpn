import { L7Vpn } from '@/native/L7Vpn';
import { emitter } from '@/services/vpnEmitter';
import { Status } from '@/types/types';
import { useEffect, useState } from 'react';

export function useVpnStatus() {
    const [status, setStatus] = useState<Status>('disconnected');
   
    useEffect(() => {
        L7Vpn.getStatus().then(setStatus);

        const subscription = emitter.addListener('VPN_STATUS', (newStatus) => {
            setStatus(newStatus);        
        });

        return () => {
            subscription.remove();
        };
    }, []);
    return status;    
}