import { View, Image, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

type UserAvatarProps = {
  uri?: string | null;
  size?: number;
};

export function UserAvatar({ uri, size = 48 }: UserAvatarProps) {
  const { primary, ui } = useAppTheme();
  const r = Math.round(size * 0.32);
  const border = { borderWidth: 1, borderColor: ui.border };

  if (uri && typeof uri === 'string' && uri.startsWith('data:image/')) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: r, ...border }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: primary.bg,
          borderColor: 'rgba(37,99,235,0.2)',
        },
      ]}
    >
      <Image
        source={require('../assets/images/logo_ryx.png')}
        style={{ width: size * 0.55, height: size * 0.55 }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
});
