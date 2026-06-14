import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { RyBottomNav } from '@/components/RyBottomNav';

export default function ScreenLayout() {
  return (
    <View style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: styles.stackContent,
        }}
      />
      <RyBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stackContent: { flex: 1 },
});
