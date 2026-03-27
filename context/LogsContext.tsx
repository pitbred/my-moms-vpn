import { LogsContextType } from '@/types/types';
import { createContext } from 'react';

export const LogsContext = createContext<LogsContextType | null>(null);