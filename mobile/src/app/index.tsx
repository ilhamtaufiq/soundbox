import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getToken } from '../lib/session';

// Titik masuk: langsung ke soundbox jika sudah login, selain itu ke login
export default function Index() {
  const [target, setTarget] = useState<'/login' | '/soundbox' | null>(null);

  useEffect(() => {
    getToken()
      .then((token) => setTarget(token ? '/soundbox' : '/login'))
      .catch(() => setTarget('/login'));
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b1020', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#00aed9" />
      </View>
    );
  }
  return <Redirect href={target} />;
}
