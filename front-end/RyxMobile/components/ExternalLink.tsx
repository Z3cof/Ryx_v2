import { Link } from 'expo-router';
import React from 'react';
import { Linking, Platform } from 'react-native';

export function ExternalLink(
  props: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }
) {
  return (
    <Link
      target="_blank"
      {...props}
      href={props.href}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          e.preventDefault();
          Linking.openURL(props.href);
        }
      }}
    />
  );
}
