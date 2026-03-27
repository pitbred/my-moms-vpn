import { VpnContext } from '@/context/VpnContext'
import { useContext } from 'react'

export function useVpn() {
    const ctx = useContext(VpnContext)
    if (!ctx) throw new Error('useVpn must be used inside VpnProvider')
    return ctx
}