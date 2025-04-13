import { Platform } from 'react-native';

// Define the port your backend server runs on
const PORT = 8000;

// Determine the host based on platform for development
// 10.0.2.2 is the special IP for Android emulators to connect to the host machine's localhost
// For iOS simulators and web, localhost usually works directly
let DEV_HOST = 'localhost'; 
if (Platform.OS === 'android') {
  DEV_HOST = '10.0.2.2';
}

// Construct the development base URLs, including the /api/v1 prefix
const DEV_HTTP_BASE = `http://${DEV_HOST}:${PORT}/api/v1`;
const DEV_WS_BASE = `ws://${DEV_HOST}:${PORT}/api/v1`; // Assuming WS also uses /api/v1 prefix

// Get the production URL from environment variables, if set
// IMPORTANT: Ensure EXPO_PUBLIC_API_URL *also* includes the /api/v1 prefix if used for production!
const PROD_API_URL = process.env.EXPO_PUBLIC_API_URL;

// Export the appropriate base URL for HTTP requests
export const API_BASE_URL = PROD_API_URL ? PROD_API_URL : DEV_HTTP_BASE;

// Export the appropriate base URL for WebSocket requests
// Use production base if available, else development. Replace http with ws.
export const WS_BASE_URL = (PROD_API_URL ? PROD_API_URL.replace(/^http/, 'ws') : DEV_WS_BASE);

// Example usage (for reference, don't include in final code):
// console.log("Using API Base URL:", API_BASE_URL);
// console.log("Using WebSocket Base URL:", WS_BASE_URL); 