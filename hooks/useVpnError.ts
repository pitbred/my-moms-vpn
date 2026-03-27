import { emitter } from '@/services/vpnEmitter';
import { useEffect, useState } from 'react';

export function useVpnError() {
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const sub = emitter.addListener('VPN_ERROR', (event) => {
            setErrorMessage(event ?? null);
        });

        return () => sub.remove();
    }, []);

    return errorMessage;
}