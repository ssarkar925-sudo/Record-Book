import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#FAF7F0" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FAF7F0',
          },
          headerTintColor: '#0F172A',
          headerTitleStyle: {
            fontWeight: '900',
          },
          contentStyle: {
            backgroundColor: '#FAF7F0',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="cash"
          options={{
            title: 'Cash Drawers & Accounts',
            headerBackTitle: 'Dashboard',
          }}
        />
        <Stack.Screen
          name="adjust"
          options={{
            title: 'Adjust Account Balance',
            presentation: 'modal',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
