import { commonStyles as cs } from '@/styles/common';
import { useAppTheme } from '@/theme/mom-theme';
import { FormProps } from '@/types/types';
import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import {
    View
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";

export function GetVpnForm({ onSubmit, loading }: FormProps) {
    const theme = useAppTheme();
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");

    const [loginError, setLoginError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const { t } = useTranslation();

    const validate = () => {
        let ok = true;

        const cleanLogin = login.trim();
        // 🔹 login: a-z A-Z 0-9
        if (!/^[a-zA-Z0-9]+$/.test(cleanLogin)) {
            setLoginError(t('loginWarn'));
            ok = false;
        } else {
            setLoginError("");
        }

        // 🔹 password: не пустой
        if (!password.trim()) {
            setPasswordError(t('enterPassword'));
            ok = false;
        } else {
            setPasswordError("");
        }

        return ok;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        onSubmit(login.trim(), password);
    };

    return (
        <View style={[cs.p16, cs.gap8]}>
            <Text variant="titleLarge">{t('getVPN')}</Text>

            {/* LOGIN */}
            <TextInput
                mode="flat"
                label="Login"
                value={login}
                onChangeText={setLogin}
                autoCapitalize="none"
                error={loginError ? true : false}
                style={{ backgroundColor: theme.colors.surfaceContainer }}
            />
            {loginError ?
                <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.error }}
                >{loginError}</Text> : null}

            {/* PASSWORD */}
            <TextInput
                mode="flat"
                label="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                error={passwordError ? true : false}
                style={{ backgroundColor: theme.colors.surfaceContainer }}
            />
            {passwordError ?
                <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.error }}
                >{passwordError}</Text> : null}

            {/* BUTTON */}
            <Button
                mode="contained"
                disabled={loading}
                onPress={handleSubmit}
            >
                {t('obtain')}
            </Button>
        </View>
    );
}