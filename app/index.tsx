import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { BottomNavigation } from 'react-native-paper';
import AppsScreen from './apps';
import HomeScreen from './home';
import LogsScreen from './logs';
import SettingsScreen from './settings';

export default function App() {

    const { t } = useTranslation()
    const [index, setIndex] = React.useState(0);
    //const insets = useSafeAreaInsets();
    const routes = [
        { key: 'home', title: t('home'), focusedIcon: 'vpn' },
        { key: 'apps', title: t('apps'), focusedIcon: 'apps' },
        { key: 'logs', title: t('logs'), focusedIcon: 'view-list-outline'},
        { key: 'settings', title: t('settings'), focusedIcon: 'cog' },        
    ];

    const renderScene = BottomNavigation.SceneMap({
        home: HomeScreen,
        apps: AppsScreen,
        logs: LogsScreen,
        settings: SettingsScreen
    })

    return (        
            <BottomNavigation
                navigationState={{ index, routes }}
                onIndexChange={setIndex}
                renderScene={renderScene}
                shifting={false}
                getLazy={({ route }) => route.key !== "home"}
                sceneAnimationEnabled={false}
                //safeAreaInsets={{ bottom: insets.bottom }}
                //barStyle={{ height: 80 + insets.bottom }}
            />        
    );
}