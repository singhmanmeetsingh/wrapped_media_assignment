import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../src/store';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#3b82f6' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Admin Login' }} />
        <Stack.Screen name="register" options={{ title: 'Admin Register' }} />
        <Stack.Screen name="signup" options={{ title: 'Driver Sign Up' }} />
        <Stack.Screen name="vehicle/[driverId]" options={{ title: 'Add Vehicle' }} />
        <Stack.Screen name="success" options={{ title: 'Success', headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'Campaign Dashboard' }} />
      </Stack>
    </Provider>
  );
}
