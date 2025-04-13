import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { toast, Toasts } from '@backpackapp-io/react-native-toast';
import { ToastPosition } from '@backpackapp-io/react-native-toast';

// Get the screen width for proper toast sizing
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Custom toast component with beautiful styling
export function CustomToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toasts 
        defaultStyle={{
          view: styles.toastView,
          text: styles.toastText,
          pressable: styles.toastPressable,
        }}
        onToastShow={(toast) => {
          console.log('Toast shown:', toast.message);
        }}
        extraInsets={{ bottom: 60 }}
      />
    </>
  );
}

// Export the toast functions for easy usage throughout the app
export { toast };

// Additional helper functions to make toast usage more intuitive
export const showToast = (message: string, description?: string) => {
  // Combine message and description for the toast message
  const formattedMessage = description 
    ? `${message}\n${description}`
    : message;
  
  return toast(formattedMessage, {
    duration: 3000,
    // Setting an explicit width helps ensure the toast has enough space
    width: SCREEN_WIDTH - 32 > 360 ? 360 : SCREEN_WIDTH - 32,
  });
};

export const showSuccessToast = (message: string, description?: string) => {
  // Combine message and description for the toast message
  const formattedMessage = description 
    ? `${message}\n${description}`
    : message;
  
  return toast.success(formattedMessage, {
    duration: 3000,
    // Setting an explicit width helps ensure the toast has enough space
    width: SCREEN_WIDTH - 32 > 360 ? 360 : SCREEN_WIDTH - 32,
  });
};

export const showErrorToast = (message: string, description?: string) => {
  // Combine message and description for the toast message
  const formattedMessage = description 
    ? `${message}\n${description}`
    : message;
  
  return toast.error(formattedMessage, {
    duration: 3000,
    // Setting an explicit width helps ensure the toast has enough space
    width: SCREEN_WIDTH - 32 > 360 ? 360 : SCREEN_WIDTH - 32,
  });
};

export const showWarningToast = (message: string, description?: string) => {
  // We'll use a regular toast with custom styling for warning
  // since the library doesn't have a direct warning type
  const formattedMessage = description 
    ? `⚠️ ${message}\n${description}`
    : `⚠️ ${message}`;
  
  return toast(formattedMessage, {
    duration: 3000,
    // Setting an explicit width helps ensure the toast has enough space
    width: SCREEN_WIDTH - 32 > 360 ? 360 : SCREEN_WIDTH - 32,
  });
};

export const showInfoToast = (message: string, description?: string) => {
  // Combine message and description for the toast message
  const formattedMessage = description 
    ? `ℹ️ ${message}\n${description}`
    : `ℹ️ ${message}`;
  
  return toast(formattedMessage, {
    duration: 3000,
    // Setting an explicit width helps ensure the toast has enough space
    width: SCREEN_WIDTH - 32 > 360 ? 360 : SCREEN_WIDTH - 32,
  });
};

const styles = StyleSheet.create({
  toastPressable: {
    width: SCREEN_WIDTH - 32 > 360 ? 360 : SCREEN_WIDTH - 32,
    minWidth: 300,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  toastView: {
    width: '100%',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#333',
    borderRadius: 12,
    minHeight: 60,
  },
  toastText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'left',
    flexShrink: 1,
    flexGrow: 1,
  },
}); 