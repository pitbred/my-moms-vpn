import { LogsContext } from '@/context/LogsContext';
import { useContext } from 'react';

export const useLogs = () => {
    const ctx = useContext(LogsContext);
    if (!ctx) {
        throw new Error('useLogs must be used inside LogsProvider');
    }
    return ctx;
};