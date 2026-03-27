import { useConfirm } from "@/hooks/useConfirm";
import { L7Vpn } from '@/native/L7Vpn';
import { commonStyles as cs } from '@/styles/common';
import { useAppTheme } from '@/theme/mom-theme';
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
	KeyboardAwareScrollView, KeyboardProvider
} from "react-native-keyboard-controller";
import { Button, IconButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConfigEditorScreen() {
	const { t } = useTranslation()
	const theme = useAppTheme();
	const confirm = useConfirm()
	const { config, loadedConf } = useLocalSearchParams()
	const [loadedConfig, setLoadedConfig] = useState(loadedConf)

	const [text, setText] = useState(
		typeof config === "string" ? config : ""
	)

	const onLoadSample = async () => {
		try {
			const sample = await L7Vpn.getSampleConfig()
			setText(sample)
		} catch (e) {
			confirm({
				title: t('error'),
				message: t('configLoadFailed') + ': ' + String(e),
			})
		}
	}

	const loadConfig = async () => {
		try {
			const config = await L7Vpn.getConfig()
			setText(config)
			setLoadedConfig(config)
		} catch (e) {
			confirm({
				title: t('error'),
				message: t('loadError') + ': ' + String(e),
			})
		} finally {

		}
	}

	const onSave = async () => {
		try {
			JSON.parse(text)
			let config = text

			await L7Vpn.saveConfig(config)
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

	return (
		<SafeAreaView style={[cs.flex1, { backgroundColor: theme.colors.surfaceContainerLow }]}>
			<View style={[cs.row, { backgroundColor: theme.colors.surfaceContainerLow }]}>
				<IconButton
					style={[cs.m0, cs.ml8]}
					icon="keyboard-backspace" onPress={() => router.back()} />
				<Text
					variant="titleLarge"
				>
					{t('editing')}
				</Text>
			</View>
			<View style={[cs.row, cs.ph16, cs.pb8, { backgroundColor: theme.colors.surfaceContainerLow }]}>
				<View style={[cs.flex1, cs.row, cs.gap4]}>
					<IconButton
						icon="restore"
						disabled={loadedConfig == text}
						onPress={loadConfig}
					/>
					<Button mode="text" onPress={onLoadSample}>{t('example')}</Button>
				</View>
				<View style={[cs.flex1, cs.alflexend]}>
					<Button
						mode="contained-tonal"
						icon="content-save"
						disabled={loadedConfig == text}
						onPress={onSave}
					>
						{t('save')}
					</Button>
				</View>
			</View>
			{/* ТЕЛО РЕДАКТОРА */}
			<KeyboardProvider>
				<KeyboardAwareScrollView style={[cs.flex1, { backgroundColor: theme.colors.background }]}>
					<View>
						<TextInput
							mode="outlined"
							value={text}
							onChangeText={setText}
							multiline
							activeOutlineColor={theme.colors.onBackground}
							outlineStyle={cs.borderw0}
							autoCorrect={false}
							spellCheck={false}
							autoCapitalize="none"
							scrollEnabled={false}
							contentStyle={cs.mono}							
						/>
						<View style={[cs.fileName, { backgroundColor: theme.colors.secondaryContainer, }]}>
							<Text variant="bodySmall">config.json</Text>
						</View>
					</View>
				</KeyboardAwareScrollView>
			</KeyboardProvider>
		</SafeAreaView>
	);
}