import { VpnContext } from '@/context/VpnContext'
import { useVpnError } from '@/hooks/useVpnError'
import { useVpnStats } from '@/hooks/useVpnStats'
import { useVpnStatus } from '@/hooks/useVpnStatus'
import { L7Vpn } from '@/native/L7Vpn'
import { Reason } from '@/types/types'
import React from 'react'

export const VpnProvider = ({ children }: { children: React.ReactNode }) => {
    const status = useVpnStatus()
    const error = useVpnError()
    const { duration, up, down, upSpd, downSpd, } = useVpnStats()

    // 🔹 аккумуляторы
    const [durationAccum, setDurationAccum] = React.useState(0)
    const [upAccum, setUpAccum] = React.useState(0)
    const [downAccum, setDownAccum] = React.useState(0)

    // 🔹 итоговые значения
    const durationTotal = durationAccum + duration
    const upTotal = upAccum + up
    const downTotal = downAccum + down

    const startVpn = React.useCallback(async () => {
        const ok = await L7Vpn.prepare()
        if (ok) {
            await L7Vpn.start()
        }
    }, [])

    const stopVpn = React.useCallback(
        async (r: Reason) => {
            if (r === 'restart') {
                // добавляем текущую сессию в аккумулятор
                setDurationAccum(prev => prev + duration)
                setUpAccum(prev => prev + up)
                setDownAccum(prev => prev + down)
            }

            if (r === 'manual') {
                // полный сброс
                setDurationAccum(0)
                setUpAccum(0)
                setDownAccum(0)
            }

            await L7Vpn.stop()
        },
        [duration, up, down]
    )

    const restartVpn = React.useCallback(async () => {
        await stopVpn('restart')
        await new Promise(res => setTimeout(res, 1000))
        await startVpn()
    }, [stopVpn, startVpn])

    return (
        <VpnContext.Provider
            value={{
                status,
                error,
                
                duration,
                durationTotal,

                up,
                upTotal,

                down,
                downTotal,

                upSpd,
                downSpd,

                startVpn,
                stopVpn,
                restartVpn,
            }}
        >
            {children}
        </VpnContext.Provider>
    )
}