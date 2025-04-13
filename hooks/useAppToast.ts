import { 
  showToast, 
  showSuccessToast, 
  showErrorToast, 
  showWarningToast, 
  showInfoToast 
} from '@/components/ui/custom-toast';
import { ToastPosition } from '@backpackapp-io/react-native-toast';

export function useAppToast() {
  /**
   * Shows a toast notification with customizable options
   * @param title Message to display in the toast
   * @param description Optional secondary message
   * @param action Type of toast (success/error/warning/info)
   * @param duration How long the toast should be displayed (in ms)
   * @param position Position of the toast (top/bottom)
   */
  const displayToast = (
    title: string, 
    description?: string,
    action: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration: number = 3000,
    position: "top" | "bottom" = "bottom"
  ) => {
    // We don't use duration or position here as they're configured in the Toast provider
    // but we could add them as options if needed
    
    switch(action) {
      case 'success':
        showSuccessToast(title, description);
        break;
      case 'error':
        showErrorToast(title, description);
        break;
      case 'warning':
        showWarningToast(title, description);
        break;
      case 'info':
      default:
        showInfoToast(title, description);
        break;
    }
  };

  return { 
    showToast: displayToast, 
    showSuccessToast,
    showErrorToast,
    showInfoToast,
    showWarningToast,
  };
}