import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0b1020' },
          headerTintColor: '#e8ecf8',
          contentStyle: { backgroundColor: '#0b1020' },
        }}
      />
    </>
  );
}
