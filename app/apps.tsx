import { useConfirm } from "@/hooks/useConfirm";
import { useVpn } from '@/hooks/useVpn';
import { L7Vpn } from '@/native/L7Vpn';
import { commonStyles as cs } from '@/styles/common';
import { useAppTheme } from '@/theme/mom-theme';
import { InstalledApp } from '@/types/types';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, View } from 'react-native';
import { ActivityIndicator, Button, Checkbox, Snackbar, Text } from 'react-native-paper';

export default function AppsScreen() {
    const {
        status,
        error,
        restartVpn,
    } = useVpn();

    const { t } = useTranslation()
    const confirm = useConfirm();
    const theme = useAppTheme();
    const [apps, setApps] = React.useState<InstalledApp[]>([])
    const [loading, setLoading] = React.useState(true)
    const [snackbarVisible, setSnackbarVisible] = React.useState(false)
    const [selected, setSelected] = React.useState<number>(0);

    React.useEffect(() => {
        if (error) {
            confirm({
                title: t('error'),
                message: error,
            })
            L7Vpn.resetError()
        }
    }, [error])

    React.useEffect(() => {
        let isMounted = true;
        const load = async () => {
            const pkgs = await L7Vpn.getInstalledApps()
            const savedJson = await L7Vpn.getSavedPackages()

            if (!isMounted) return;

            let saved: string[] | null = null

            if (savedJson) {
                saved = JSON.parse(savedJson)
            }

            const prepared = pkgs.map((app: any) => ({
                ...app,
                selected: saved ? saved.includes(app.packageName) : true
            }))

            setApps(prepared)
            setSelected(saved?.length ?? 0)
            setLoading(false)
        }
        load()
        return () => {
            isMounted = false;
        }
    }, [])

    const allSelected = React.useMemo(
        () => apps.length > 0 && apps.every(a => a.selected),
        [apps]
    )

    const toggleAll = () => {
        setApps(prev =>
            prev.map(app => ({
                ...app,
                selected: !allSelected
            }))
        )
    }

    const toggleOne = (pkg: string) => {
        setApps(prev =>
            prev.map(app =>
                app.packageName === pkg
                    ? { ...app, selected: !app.selected }
                    : app
            )
        )
    }

    const selectedCount = React.useMemo(
        () => apps.filter(a => a.selected).length,
        [apps]
    )

    const save = async () => {
        if (!hasSelected) return
        try {
            const selected = apps
                .filter(a => a.selected)
                .map(a => a.packageName)

            await L7Vpn.savePackages(selected)

            if (status === 'connected') {
                restartVpn();
            }

            setSnackbarVisible(true)
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            confirm({
                title: t('error'),
                message: errorMessage,
            })
        }
    }

    const hasSelected = apps.some(a => a.selected)

    if (loading) return (
        <View style={[cs.flex1, cs.center]}>
            <ActivityIndicator size="large" />
        </View>
    )

    return (
        <View style={cs.flex1}>
            <View style={{ backgroundColor: theme.colors.surfaceContainerLow }}>

                {/* Header */}
                <View style={[cs.row, cs.ph16, cs.pt32]}>
                    <Text variant="titleLarge">{t('apps') + ' '} </Text>
                    <Text variant="titleMedium">({selectedCount})</Text>
                </View>

                {/* Select All */}
                <View style={[cs.row, cs.p16, cs.pt8, cs.jsb]}>

                    {/* Группа чекбокса */}
                    <View style={cs.row}>
                        <Checkbox
                            status={allSelected ? 'checked' : 'unchecked'}
                            onPress={toggleAll}
                        />
                        <Text>{t('selectAll')}</Text>
                    </View>
                    <Button
                        mode="contained"
                        onPress={save}
                        disabled={!hasSelected}
                    >
                        {t('save')}
                    </Button>
                </View>
            </View>
            {/* List */}
            <FlatList
                data={apps}
                keyExtractor={item => item.packageName}
                renderItem={({ item }) => (
                    <View style={[cs.row, cs.p8, cs.pl16]}>
                        <Image
                            source={{ uri: `data:image/png;base64,${item.icon}` }}
                            style={cs.appIcon}
                        />
                        <Text variant="bodyLarge" style={cs.flex1}>{item.name}</Text>
                        <Checkbox
                            status={item.selected ? 'checked' : 'unchecked'}
                            onPress={() => toggleOne(item.packageName)}
                        />
                    </View>
                )}
            />
            <Snackbar
                visible={snackbarVisible}
                duration={3000}
                style={cs.snak}
                onDismiss={() => setSnackbarVisible(false)}
            >{t('settingsSaved')}
            </Snackbar>
        </View>
    )
}