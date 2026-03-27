import { LogsContext } from '@/context/LogsContext';
import { emitter } from '@/services/vpnEmitter';
import React, { useRef, useState } from 'react';

const MAX_LINES = 500;

export const LogsProvider = ({ children }: { children: React.ReactNode }) => {
    const bufferRef = useRef<string[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const ansiRegex = /\x1B\[[0-9;]*m/g;

    const appendLogs = (newLogs: string[]) => {
        if (!newLogs.length) return;

        // чистим ANSI сразу
        const cleaned = newLogs.map(l =>
            l.replace(ansiRegex, '')
        );

        // пишем в буфер (без ререндера)
        bufferRef.current.push(...cleaned);

        // ограничиваем размер
        if (bufferRef.current.length > MAX_LINES) {
            bufferRef.current.splice(
                0,
                bufferRef.current.length - MAX_LINES
            );
        }

        /*
        if (bufferRef.current.length > MAX_LINES) {
            bufferRef.current = bufferRef.current.splice(-MAX_LINES);
        }
        */

        // обновляем UI (одним батчем)
        setLogs([...bufferRef.current]);
    };

    const clearLogs = () => {
        bufferRef.current = [];
        setLogs([]);
    };

    React.useEffect(() => {
        const sub = emitter.addListener('VPN_STATS', (data) => {
            if (data.logs?.length) {
                appendLogs(data.logs);
            }
        });

        return () => sub.remove();
    }, []);

    return (
        <LogsContext.Provider value={{ logs, appendLogs, clearLogs }}>
            {children}
        </LogsContext.Provider>
    );
};