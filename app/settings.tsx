import { BottomSheet } from '@/components/BottomSheet';
import { GetVpnForm } from '@/components/GetVpnForm';
import { useConfirm } from "@/hooks/useConfirm";
import { useVpn } from '@/hooks/useVpn';
import { L7Vpn } from '@/native/L7Vpn';
import { commonStyles as cs } from '@/styles/common';
import { useAppTheme } from '@/theme/mom-theme';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    TextInput as RNTextInput,
    ScrollView,
    Share,
    View
} from 'react-native';
import {
    KeyboardAwareScrollView, KeyboardProvider
} from "react-native-keyboard-controller";
import {
    ActivityIndicator,
    Button,
    Card,
    FAB,
    IconButton,
    SegmentedButtons,
    Snackbar,
    Text,
    TextInput
} from 'react-native-paper';

export default function SettingsScreen() {
    const { t } = useTranslation()
    const theme = useAppTheme();
    const confirm = useConfirm()
    const {
        status,
        error,
        startVpn,
        stopVpn,
        restartVpn
    } = useVpn();

    const [mode, setMode] = useState('simple')
    const [jsonText, setJsonText] = useState('')
    const [loadedConfig, setLoadedConfig] = useState('')
    const [loading, setLoading] = useState(true)
    const [hasUserConfig, setHasUserConfig] = useState(false)

    const [server, setServer] = useState('')
    const [port, setPort] = useState('443')
    const [uuid, setUuid] = useState('')
    const [serverName, setServerName] = useState('')
    const [publicKey, setPublicKey] = useState('')
    const [shortId, setShortId] = useState('')

    const [snackbar, setSnackbar] = useState({
        visible: false,
        message: '',
    });

    const [restart, setRestart] = useState(false)
    const { newConfig } = useLocalSearchParams()
    const [flag, setFlag] = useState<string>('🌐')
    const [initialHash, setInitialHash] = useState<string>('')
    const [visible, setVisible] = useState(false);

    const simpleJson = JSON.stringify({
        server,
        port,
        uuid,
        serverName,
        publicKey,
        shortId
    })

    const currentHash = hashString(simpleJson)
    const modified = initialHash !== null && currentHash !== initialHash
    const inputRef = useRef<RNTextInput>(null);

    const showMessage = (text: string) => {
        setSnackbar({ visible: true, message: text });
    };

    function hashString(str: string) {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const chr = str.charCodeAt(i)
            hash = (hash << 5) - hash + chr
            hash |= 0
        }
        return hash.toString()
    }

    useFocusEffect(
        useCallback(() => {
            loadConfig()

            if (server)
                loadCountry(server)
        }, [])
    );

    React.useEffect(() => {
        if (error) {
            confirm({
                title: t('error'),
                message: error,
            })
            L7Vpn.resetError()
        }
    }, [error])

    useEffect(() => {
        if (typeof newConfig === "string") {
            setJsonText(newConfig)
        }
    }, [newConfig])


    useEffect(() => {
        loadCountry(server)
    }, [server, mode])

    const loadCountry = async (ip: string) => {
        try {
            // Альтернативный API
            const res = await fetch('https://ipwho.is/' + ip)
            const data = await res.json()

            if (data.success && data.flag?.emoji) {
                setFlag(data.flag.emoji)
            } else {
                // Если IP не найден или ошибка API — ставим fallback               
                setFlag('🌐')
            }
        } catch (err) {
            setFlag('🌐')
        }
    }

    const openEditor = () => {
        router.push({
            pathname: "/config-editor",
            params: {
                config: jsonText,
                loadedConf: loadedConfig
            }
        })
    }

    const loadConfig = async () => {
        try {
            const config = await L7Vpn.getConfig()
            const exists = await L7Vpn.hasUserConfig()

            setJsonText(config)
            setLoadedConfig(config)
            setHasUserConfig(exists)
            parseJsonToSimple(config)
        } catch (e) {
            confirm({
                title: t('error'),
                message: t('loadError') + ': ' + String(e),
            })
        } finally {
            setLoading(false)
        }
    }

    const onSave = async () => {
        try {
            JSON.parse(jsonText)
            let config = jsonText

            if (mode === 'simple') {
                config = buildJsonFromSimple()
            }

            await L7Vpn.saveConfig(config)
            setHasUserConfig(true)

            confirm({
                title: t('saved'),
                message: t('configSaved'),
            })
            loadConfig()

        } catch (e) {
            confirm({
                title: t('jsonError'),
                message: t('checkJsonStructure'),
            })
        }
    }

    const deleteUserConfig = async () => {
        await L7Vpn.deleteUserConfig()
        await loadConfig()
    }

    const onDeleteUserConfig = async () => {
        confirm({
            title: t('deleteConfigQuestion'),
            message: t('fallbackToSample'),
            confirmText: t('delete'),
            onConfirm: deleteUserConfig
        })
    }

    useEffect(() => {
        if (status === 'connected')
            showMessage(t('vpnActive'))
        if (status === 'connecting')
            showMessage(t('vpnRestarting'))
        if (status === 'stopping')
            showMessage(t('vpnStopping'))
    }, [status])

    const restartUserVpn = async () => {
        setRestart(true)
        try {
            if (status === 'disconnected') {
                await startVpn()
            } else {
                await stopVpn('manual');
                let isDisconnected = false;
                let attempts = 0;

                while (!isDisconnected && attempts < 20) { // макс 10 сек (20 * 500мс)
                    const currentStatus = await L7Vpn.getStatus();
                    if (currentStatus === 'disconnected') {
                        isDisconnected = true;
                    } else {
                        await new Promise(res => setTimeout(res, 500));
                        attempts++;
                    }
                }

                if (isDisconnected) {
                    await new Promise(res => setTimeout(res, 1000));
                    await startVpn();
                } else {
                    confirm({
                        title: t('error'),
                        message: t('vpnStopTimeout'),
                    })
                }
            }
        } catch (e) {
            confirm({
                title: t('error'),
                message: t('restartError') + ': ' + String(e),
            })
        } finally {
            setRestart(false)
        }
    }

    const onRestart = async () => {
        if (hasUserConfig) {
            confirm({
                title: t('restartQuestion'),
                message: t('useSavedConfig'),
                confirmText: t('restart'),
                onConfirm: restartUserVpn
            })
        } else {
            confirm({
                title: t('error'),
                message: t('configNotFound') + "\n\n" + t('setConnectionParamsShort'),
            })
        }
    }

    const parseJsonToSimple = (json: string) => {
        try {
            const cfg = JSON.parse(json)

            const outbound = cfg.outbounds?.find((o: any) => o.type === 'vless')
            if (!outbound) return

            const server = outbound.server || ''
            const port = String(outbound.server_port ?? '443')
            const uuid = outbound.uuid || ''
            const serverName = outbound.tls?.server_name || ''
            const publicKey = outbound.tls?.reality?.public_key || ''
            const shortId = outbound.tls?.reality?.short_id || ''

            setServer(server)
            setPort(port)
            setUuid(uuid)
            setServerName(serverName)
            setPublicKey(publicKey)
            setShortId(shortId)

            setInitialHash(hashString(JSON.stringify({
                server,
                port,
                uuid,
                serverName,
                publicKey,
                shortId
            })))
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            confirm({
                title: t('error'),
                message: errorMessage,
            })
        }
    }

    const buildJsonFromSimple = () => {
        try {
            const cfg = JSON.parse(jsonText)

            const outbound = cfg.outbounds?.find((o: any) => o.type === 'vless')
            if (!outbound) return jsonText

            outbound.server = server
            outbound.server_port = Number(port)
            outbound.uuid = uuid

            outbound.tls.server_name = serverName
            outbound.tls.reality.public_key = publicKey
            outbound.tls.reality.short_id = shortId

            return JSON.stringify(cfg, null, 2)
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            confirm({
                title: t('error'),
                message: errorMessage,
            })
            return jsonText
        }
    }

    const copyToClipboard = async (s: string) => {
        await Clipboard.setStringAsync(s);
        showMessage(t('vlessCopied'));
    };

    const shareVless = async (shareType: 'share' | 'copy') => {

        try {
            const link =
                `vless://${uuid}@${server}:${port}` +
                `?security=reality` +
                `&sni=${serverName}` +
                `&fp=chrome` +
                `&pbk=${publicKey}` +
                `&sid=${shortId}` +
                `&type=tcp` +
                `#MyMomsVPN`
            if (shareType === 'share') {
                await Share.share({
                    //message: `My Mom's VPN config:\n\n${link}`,
                    message: link,
                })
            } else {
                copyToClipboard(link)
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            confirm({
                title: t('error'),
                message: errorMessage,
            })
        }
    }

    if (loading) {
        return (
            <View style={[cs.flex1, cs.center]}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    return (
        <View style={cs.flex1}>
            <View style={{
                backgroundColor: theme.colors.surfaceContainerLow
            }}>
                <View style={[cs.rowBetween, cs.pt32, cs.p16, cs.pb8]}>
                    <Text variant="titleLarge">
                        {t('vpnConfig')}
                    </Text>
                    <View style={[cs.borderR8, { backgroundColor: theme.colors.secondary, }]}>
                        <Text variant="bodySmall"
                            style={[cs.p8, cs.pv4, { color: theme.colors.onSecondary }]}
                        >
                            {hasUserConfig ? 'config.json' : 'config.json.sample'}
                        </Text>
                    </View>
                </View>
                <SegmentedButtons
                    value={mode}
                    density="regular"
                    onValueChange={setMode}
                    theme={{
                        colors: {
                            secondaryContainer: theme.colors.outlineVariant,
                            onSecondaryContainer: theme.colors.tertiary,
                        }
                    }}
                    buttons={[
                        { value: 'simple', label: t('values'), icon: 'text-box-edit-outline' },
                        { value: 'full', label: 'config.json', icon: 'code-json' },
                    ]}
                    style={[cs.ph16, cs.pb16]}
                />
            </View>
            {
                mode === 'full' ? (
                    <>
                        <ScrollView
                            style={{ backgroundColor: theme.colors.background }}
                        >
                            <Text selectable
                                style={[cs.mono, cs.ph16]}
                            >{jsonText}</Text>
                        </ScrollView>
                        <View
                            style={[cs.rowBetween, cs.gap16, cs.ph16, cs.pv8,
                            { backgroundColor: theme.colors.surfaceContainerLow }]}
                        >
                            {hasUserConfig && (
                                <View style={cs.flex1}>
                                    <Button
                                        mode="outlined"
                                        textColor={theme.colors.error}
                                        labelStyle={[cs.pv8, cs.ph0, cs.mh0, cs.mv0]}
                                        onPress={onDeleteUserConfig}
                                    >
                                        {t('delete')}
                                    </Button>
                                </View>
                            )}
                            <View style={cs.flex2}>
                                <Button
                                    mode="contained"
                                    icon="code-json"
                                    onPress={() => openEditor()}
                                >
                                    {t('edit')}
                                </Button>
                            </View>
                        </View>
                    </>
                ) : (
                    <KeyboardProvider>
                        <KeyboardAwareScrollView>
                            <Card
                                mode="contained"
                                style={[cs.m16, { backgroundColor: theme.colors.surfaceContainer }]}
                            >
                                <View
                                    style={[cs.rowBetween, cs.ph16]}
                                >
                                    <View style={cs.pt16}>
                                        <Text variant="titleMedium">
                                            {t('vpnServer') + ' ' + flag}
                                        </Text>
                                        <Text style={cs.mono14}>
                                            {server + ':' + port}
                                        </Text>
                                        <Text
                                            variant="bodySmall"
                                            style={cs.opacity6}>
                                            VLESS + Reality
                                        </Text>
                                    </View>
                                    <View style={[cs.row, cs.pt8]}>
                                        <IconButton
                                            mode="contained"
                                            disabled={restart}
                                            containerColor={theme.colors.tertiary}
                                            iconColor={theme.colors.onTertiary}
                                            icon="restart"
                                            size={18}
                                            onPress={onRestart}
                                        />
                                        <IconButton
                                            size={18}
                                            icon="content-copy"
                                            onPress={() => {
                                                shareVless('copy')
                                            }
                                            }
                                        />
                                        <IconButton
                                            size={18}
                                            icon="share-variant"
                                            onPress={() => {
                                                shareVless('share')
                                            }
                                            }
                                        />
                                    </View>
                                </View>
                                <Card.Content>
                                    <TextInput
                                        label="Server"
                                        value={server}
                                        onChangeText={setServer}
                                        mode="flat"
                                        style={{ backgroundColor: theme.colors.surfaceContainer }}
                                    />
                                    <TextInput
                                        label="Port"
                                        value={port}
                                        onChangeText={setPort}
                                        mode="flat"
                                        keyboardType="numeric"
                                        style={{ backgroundColor: theme.colors.surfaceContainer }}
                                    />
                                    <TextInput
                                        label="UUID"
                                        value={uuid}
                                        onChangeText={setUuid}
                                        mode="flat"
                                        style={{ backgroundColor: theme.colors.surfaceContainer }}
                                    />
                                    <TextInput
                                        label="SNI (server_name)"
                                        value={serverName}
                                        onChangeText={setServerName}
                                        mode="flat"
                                        style={{ backgroundColor: theme.colors.surfaceContainer }}
                                    />
                                    <TextInput
                                        ref={inputRef}
                                        label="Reality Public Key"
                                        value={publicKey}
                                        onChangeText={setPublicKey}
                                        mode="flat"
                                        style={{ backgroundColor: theme.colors.surfaceContainer }}
                                    />
                                    <TextInput
                                        label="Short ID"
                                        value={shortId}
                                        onChangeText={setShortId}
                                        mode="flat"
                                        style={{ backgroundColor: theme.colors.surfaceContainer }}
                                    />
                                </Card.Content>
                                <Card.Actions
                                    style={[cs.mt16, cs.gap12, cs.mh12, cs.mb8]}
                                >
                                    {hasUserConfig && (
                                        <View style={cs.flex1}>
                                            <Button
                                                mode="outlined"
                                                textColor={theme.colors.error}
                                                labelStyle={[cs.ph0, cs.pv8, cs.mh0, cs.mv0]}
                                                onPress={onDeleteUserConfig}
                                            >
                                                {t('delete')}
                                            </Button>
                                        </View>
                                    )}
                                    <View style={cs.flex2}>
                                        <Button
                                            mode="contained"
                                            disabled={!modified}
                                            onPress={onSave}
                                            icon="content-save-outline"
                                        >
                                            {t('save')}
                                        </Button>
                                    </View>
                                </Card.Actions>
                            </Card>
                        </KeyboardAwareScrollView>
                    </KeyboardProvider>
                )
            }
            {
                mode === 'simple' ? (
                    <FAB
                        icon="plus"
                        label={t('getVPN')}
                        customSize={40}
                        style={cs.fabNewVPN}
                        onPress={() => setVisible(true)}
                    />
                ) : null
            }
            <Snackbar
                visible={snackbar.visible}
                duration={3000}
                style={cs.snak}
                onDismiss={() => {
                    setSnackbar({ ...snackbar, visible: false })
                }
                }
            >
                {snackbar.message}
            </Snackbar>
            <BottomSheet
                visible={visible}
                onDismiss={() => setVisible(false)}
            >
                <GetVpnForm
                    loading={loading}
                    onSubmit={async (login, password) => {
                        let gotConfig = false;
                        try {
                            setLoading(true);

                            const res = await fetch("https://sbox.pitbred.com:9090/auth", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ login, password }),
                            });

                            if (!res.ok) {
                                throw new Error(`HTTP ${res.status}`);
                            }

                            const data = await res.json();

                            if (data.error) {
                                confirm({
                                    title: t('error'),
                                    message: data.error,
                                })
                                return;
                            } else if (!data.server || !data.uuid || !data.port || !data.sni || !data.key || !data.id) {
                                confirm({
                                    title: t('error'),
                                    message: 'Invalid server response',
                                });
                                return;
                            } else {
                                gotConfig = true;

                                const server = data?.server || '';
                                const port = String(data.port ?? '443')
                                const uuid = data?.uuid || '';
                                const serverName = data?.sni || '';
                                const publicKey = data?.key || '';
                                const shortId = data?.id || '';

                                setServer(server)
                                setPort(port)
                                setUuid(uuid)
                                setServerName(serverName)
                                setPublicKey(publicKey)
                                setShortId(shortId)
                            }

                            //console.log("VPN CONFIG:", data);

                        } catch (e) {
                            confirm({
                                title: t('error'),
                                message: t('netError'),
                            })
                        } finally {
                            setLoading(false);
                            if (gotConfig) {
                                setVisible(false);
                                confirm({
                                    title: t('success'),
                                    message: t('saveConfig'),
                                })
                            }
                        }
                    }}
                />
            </BottomSheet>
        </View >
    )
}
