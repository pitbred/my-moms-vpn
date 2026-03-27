import '@/i18n';
import { ConfirmProvider } from "@/providers/ConfirmProvider";
import { VpnProvider } from "@/providers/VpnProvider";
import { momThemeDark, momThemeLight } from '@/theme/mom-theme';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from "react";
import { useColorScheme } from 'react-native';
import { PaperProvider, } from 'react-native-paper';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const theme = colorScheme === 'dark' ? momThemeDark : momThemeLight;

    useEffect(() => {
        const prepareNavigation = async () => {
            if (process.env.EXPO_OS === 'android') {
                const isDark = colorScheme === 'dark';
                await NavigationBar.setBackgroundColorAsync(theme.colors.background);
                await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
            }
        };
        prepareNavigation();
    }, [colorScheme]);

    return (
        <PaperProvider theme={theme}>
            <VpnProvider>
                <ConfirmProvider>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                        }}
                    >
                    </Stack>
                    <StatusBar style="auto" />
                </ConfirmProvider>
            </VpnProvider>
        </PaperProvider>
    );
}
