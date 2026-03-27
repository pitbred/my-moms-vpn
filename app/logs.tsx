import { commonStyles as cs } from '@/styles/common';
import { useAppTheme } from '@/theme/mom-theme';
import { FlashList } from '@shopify/flash-list';
import * as FileSystem from 'expo-file-system/legacy';
import * as React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { FAB, Icon } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LogsScreen() {
    const theme = useAppTheme();
    const [logs, setLogs] = React.useState<string[]>([])
    const path = FileSystem.documentDirectory + 'vpn.log';
    const listRef = React.useRef<any>(null);
    const [isAtBottom, setIsAtBottom] = React.useState(true);
    const [isAtTop, setIsAtTop] = React.useState(true);
    const [play, setPlay] = React.useState(true);

    const levelColors = {
        ERROR: '#ff4d4f',
        WARN: '#faad14',
        INFO: '#40a9ff',
        DEBUG: '#b37feb',
        TRACE: '#8c8c8c',
        DEFAULT: '#d9d9d9',
    };

    const lastSizeRef = React.useRef(0);
    const ansiRegex = /\x1B\[[0-9;]*m/g;

    const handleScroll = React.useCallback((e: any) => {
        const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;

        const atBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - 80;

        const atTop = contentSize.height > layoutMeasurement.height && contentOffset.y <= 10;
        setIsAtBottom(atBottom);
        setIsAtTop(atTop);
    }, []);

    const scrollToTop = () => {
        try {
            listRef.current?.scrollToIndex({
                index: 0,
                animated: true,
            });
        } catch {
            listRef.current?.scrollToOffset({
                offset: 0,
                animated: true,
            });
        }
    };

    const keyExtractor = React.useCallback((item: string, i: number) => i.toString(), []);

    const LogItem = React.memo(({ item }: { item: string }) => {
        const level = getLogLevel(item);

        return (
            <Text
                selectable
                style={[cs.mono12, { color: levelColors[level] }]}
            >
                {item}
            </Text>
        )
    });

    const renderItem = React.useCallback(
        ({ item }: { item: string }) => <LogItem item={item} />,
        []
    );

    const getLogLevel = (line: string) => {
        if (line.includes('ERROR')) return 'ERROR';
        if (line.includes('WARN')) return 'WARN';
        if (line.includes('INFO')) return 'INFO';
        if (line.includes('DEBUG')) return 'DEBUG';
        if (line.includes('TRACE')) return 'TRACE';
        return 'DEFAULT';
    };

    React.useEffect(() => {
        let isMounted = true;

        const readLogs = async () => {
            const info = await FileSystem.getInfoAsync(path);

            if (!isMounted || !info.exists) return;

            if (info.size === lastSizeRef.current) return;
            lastSizeRef.current = info.size;

            const content = await FileSystem.readAsStringAsync(path);

            if (!isMounted) return;

            const lines = content
                .split('\n')
                .filter(Boolean)
                .map(line => line.replace(ansiRegex, ''));

            setLogs(lines.slice(-200));
        };

        if (play) {
            readLogs();
            const id = setInterval(readLogs, 1000);

            return () => {
                isMounted = false;
                clearInterval(id);
            };
        }
    }, [play]);

    React.useEffect(() => {
        if (isAtBottom) {
            listRef.current?.scrollToEnd({ animated: true });
        }
    }, [logs]);

    return (
        <SafeAreaView style={[cs.flex1, { backgroundColor: theme.colors.background }]}
            edges={['top']}
        >
            <FlashList<string>
                ref={listRef}
                data={logs}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={[cs.ph12, cs.pt8]}
            />
            {
                !isAtTop && (
                    <TouchableOpacity
                        onPress={scrollToTop}
                        style={[cs.fabs, cs.bottom70, { backgroundColor: theme.colors.surfaceVariant + '80', }]}
                    >
                        <Icon
                            source="arrow-up"
                            size={20}
                        />

                    </TouchableOpacity>
                )
            }
            {
                !isAtBottom && (
                    <TouchableOpacity
                        onPress={() => listRef.current?.scrollToEnd({ animated: true })}
                        style={[cs.fabs, cs.bottom20, { backgroundColor: theme.colors.surfaceVariant + '80', }]}
                    >
                        <Icon
                            source="arrow-down"
                            size={20}
                        />
                    </TouchableOpacity>
                )
            }
            <FAB
                icon={play ? 'pause' : 'play'}
                style={cs.fabLeft}                
                onPress={() => setPlay(!play)}
            />
        </SafeAreaView>
    )
}