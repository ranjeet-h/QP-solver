import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Define custom press feedback properties
const PRESS_COLOR = 'rgba(0, 0, 0, 0.1)'; // Example background/ripple color
const PRESS_OPACITY = 0.7; // Example press opacity

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      // Customize Android ripple effect
      android_ripple={{
        color: PRESS_COLOR,
        borderless: true, // Match typical tab behavior
      }}
      // Customize iOS press feedback directly
      pressColor={Platform.OS === 'ios' ? PRESS_COLOR : undefined} // Background color on press for iOS
      pressOpacity={Platform.OS === 'ios' ? PRESS_OPACITY : undefined} // Opacity on press for iOS
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
