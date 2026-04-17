import { useConfirm } from "@/hooks/useConfirm";
import { useVpn } from '@/hooks/useVpn';
import { L7Vpn } from '@/native/L7Vpn';
import { commonStyles as cs } from '@/styles/common';
import { useAppTheme } from '@/theme/mom-theme';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';

export default function HomeScreen() {
    const { t } = useTranslation()
    const theme = useAppTheme();
    const confirm = useConfirm()
    const {
        status,
        error, 
        durationTotal,
        upTotal,
        downTotal,
        upSpd,
        downSpd,
        startVpn,
        stopVpn,        
    } = useVpn();

    const isConnected = status === 'connected';

    const onToggle = async () => {
        
        if (status !== 'connected') {
            const exists = await L7Vpn.hasUserConfig()
            if (exists) {
                startVpn();
            } else {
                confirm({
                    title: t('error'),
                    message: t('configNotFound') + "\n\n" + t('setConnectionParams')                        
                })
            }
        } else {
            stopVpn('manual');
        }
    };

    const formatSecondsToTime = (totalSeconds: number) => {
        if (!totalSeconds || totalSeconds < 0) return "00:00:00";

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        const pad = (num: number) => num.toString().padStart(2, '0');

        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!bytes || bytes === 0) return '0 B';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

        // Находим индекс размерности (0 для B, 1 для KB и т.д.)
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    React.useEffect(() => {
        if (error) {
            //console.log('ERROR from Kotlin: ' + error)
            confirm({
                title: t('error'),
                message: error,
            })
            L7Vpn.resetError()
        }
    }, [error])
  
    React.useEffect(() => {  
        if (status === 'stopping')  
                L7Vpn.getStatus();
    }, [status])

    const statusMap = {
        connected: t('vpnEnabled'),        
        connecting: t('connecting') + '...',
        stopping: t('disconnecting') + '...',
        error: t('connectionError'),
        disconnected: t('vpnDisabled')
    };

    return (
        <View style={[cs.flex1, cs.jc, cs.p16]}>
            {/* Status */}
            <Text variant="headlineMedium" style={cs.statusText}>
                {statusMap[status] || t('vpnDisabled')}         
            </Text>

            {/* Big Button */}
            <Button
                mode="contained"
                disabled={status === 'connecting'}
                onPress={() => {                   
                    onToggle()
                }}
                style={[
                    cs.powerButton,
                    {
                        backgroundColor:
                            isConnected ? theme.colors.success
                                : status === 'error' || status === 'connecting' ? theme.colors.tertiaryContainer
                                    : theme.colors.error,

                    },
                ]}
                contentStyle={cs.powerButtonContent}
                labelStyle={{
                    color:
                        isConnected ? theme.colors.onSuccess
                            : status === 'error' || status === 'connecting' ? theme.colors.onTertiaryContainer
                                : theme.colors.onError,
                }}
            >
                {isConnected ? t('disconnect'):
                    status === 'connecting' ? t('connecting')
                        : t('connect')}
            </Button>

            {/* Summary Cards */}
            <View style={cs.gap16}>
                <Card
                    mode="contained"
                    style={{backgroundColor: theme.colors.surfaceContainer}}
                >
                    <Card.Content>
                        <Text variant="titleMedium">{t('sessionTime')}</Text>
                        <Text variant="bodyLarge">{isConnected ? formatSecondsToTime(durationTotal) : '00:00:00'}</Text>
                    </Card.Content>
                </Card>

                <Card
                    mode="contained"
                    style={{backgroundColor: theme.colors.surfaceContainer}}
                >
                    <Card.Content>
                        <Text variant="titleMedium">{t('traffic')}</Text>
                        <Text variant="bodyLarge">↓ {isConnected ? formatBytes(downTotal) : 0} {'\u2022'} ↑ {isConnected ? formatBytes(upTotal) : 0}</Text>
                    </Card.Content>
                </Card>

                <Card
                    mode="contained"
                    style={{backgroundColor: theme.colors.surfaceContainer}}
                >
                    <Card.Content>
                        <Text variant="titleMedium">{t('speed')}</Text>
                        <Text variant="bodyLarge">↓ {isConnected ? formatBytes(downSpd) : 0}/s {'\u2022'} ↑ {isConnected ? formatBytes(upSpd) : 0}/s</Text>
                    </Card.Content>
                </Card>
            </View>
        </View>
    );
}