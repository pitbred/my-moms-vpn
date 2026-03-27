import { commonStyles as cs } from '@/styles/common';
import { useAppTheme } from '@/theme/mom-theme';
import { ConfirmModalProps } from '@/types/types';
import React from "react";
import { useTranslation } from 'react-i18next';
import { View } from "react-native";
import { Button, Modal, Portal, Text } from "react-native-paper";

export default function ConfirmModal({
    visible,
    title,
    message,
    confirmText,
    onConfirm,
    onDismiss,
}: ConfirmModalProps) {

    const theme = useAppTheme()
    const { t } = useTranslation()

    const handleConfirm = () => {
        onDismiss()
        onConfirm?.()
    }

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[cs.modal, { backgroundColor: theme.colors.background }]}
            >
                <Text variant="titleLarge" style={cs.mb16}>
                    {title}
                </Text>

                <Text
                    selectable
                    style={cs.mb24}
                >
                    {message}
                </Text>

                <View style={cs.comfirmButton}>
                    {confirmText ? (
                        <>
                            <Button onPress={onDismiss}>
                                {t('cancel')}
                            </Button>

                            <Button mode="contained" onPress={handleConfirm}>
                                {confirmText}
                            </Button>
                        </>
                    ) : (
                        <Button mode="contained" onPress={onDismiss}>
                            OK
                        </Button>
                    )}
                </View>
            </Modal>
        </Portal>
    )
}