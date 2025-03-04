import React, { useEffect } from 'react';
import { config } from './config';
import { View, ViewProps } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/overlay';
import { ToastProvider } from '@gluestack-ui/toast';
import { useColorScheme } from 'nativewind';
import { ModeType } from './types';

export function GluestackUIProvider({
  mode = 'light',
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    if (mode === 'system') {
      // Let the system decide
      setColorScheme('system');
    } else {
      setColorScheme(mode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Apply dark class only when explicitly in dark mode
  const darkClass = mode === 'dark' ? 'dark' : '';
  
  // For styling, use 'light' config if mode is 'system' and we're in light mode
  const styleMode = mode === 'system' ? 'light' : mode;

  return (
    <View
      className={`${darkClass}`}
      style={[
        config[styleMode as 'light' | 'dark'],
        // eslint-disable-next-line react-native/no-inline-styles
        { flex: 1, height: '100%', width: '100%' },
        props.style,
      ]}
    >
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
