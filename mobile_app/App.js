import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider } from './contexts/UserContext';
import { ErrorProvider } from './contexts/ErrorContext';
import HomeScreen from './screens/HomeScreen';
import CameraScreen from './screens/CameraScreen';
import ProcessingScreen from './screens/ProcessingScreen';
import ResultScreen from './screens/ResultScreen';
import HistoryScreen from './screens/HistoryScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ErrorProvider>
      <UserProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="Processing" component={ProcessingScreen} />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </UserProvider>
    </ErrorProvider>
  );
}
