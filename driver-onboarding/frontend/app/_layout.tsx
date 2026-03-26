import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../src/store';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0A0A0A' },
          headerTintColor: '#CCFF00',
          headerTitleStyle: {
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 1,
          },
          contentStyle: { backgroundColor: '#0A0A0A' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Admin Login' }} />
        <Stack.Screen name="register" options={{ title: 'Admin Register' }} />
        <Stack.Screen name="signup" options={{ title: 'Driver Sign Up' }} />
        <Stack.Screen name="vehicle/[driverId]" options={{ title: 'Add Vehicle' }} />
        <Stack.Screen name="success" options={{ title: 'Success', headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      </Stack>
    </Provider>
  );
}
