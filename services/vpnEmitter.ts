import { L7Vpn } from '@/native/L7Vpn';
import { NativeEventEmitter } from 'react-native';

export const emitter = new NativeEventEmitter(L7Vpn);