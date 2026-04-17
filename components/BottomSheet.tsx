import { commonStyles as cs } from '@/styles/common';
import { BottomSheetProps } from '@/types/types';
import React, { JSX, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Pressable,
    StyleSheet,
    View
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT;
const DISMISS_DISTANCE = 80;

export function BottomSheet({
    visible,
    onDismiss,
    children,
}: BottomSheetProps): JSX.Element | null {
    const theme = useTheme();
    const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

    const [mounted, setMounted] = useState(visible);    
    const insets = useSafeAreaInsets();    
    
    useEffect(() => {
        if (visible) {
            setMounted(true);

            Animated.timing(translateY, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(translateY, {
                toValue: SHEET_HEIGHT,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                setMounted(false);
            });
        }
    }, [visible]);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) {
                    translateY.setValue(g.dy);
                }
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > DISMISS_DISTANCE) {
                    onDismiss();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    if (!mounted) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* backdrop */}
            <Pressable
                style={cs.backdrop}
                onPress={onDismiss}
            />

            {/* sheet */}
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    cs.sheet,
                    {
                        backgroundColor: theme.colors.elevation.level3,
                        transform: [{ translateY }],
                        top: insets.top + 128,                        
                        height: SHEET_HEIGHT,
                    },
                ]}
            >
                {/* handle */}
                <View
                    style={[
                        cs.handle,
                        { backgroundColor: theme.colors.outline },
                    ]}
                />
                {children}
            </Animated.View>
        </View>
    );
}