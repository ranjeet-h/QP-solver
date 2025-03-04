import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { useFonts } from 'expo-font';
import { Stack, router, useSegments, useRootNavigation } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, createContext, useContext } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a simple auth context
type AuthContextType = {
  isLoggedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  userId: string | null;
  userCredits: number;
  setUserCredits: (credits: number) => void;
};

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  signIn: async () => {},
  signOut: () => {},
  userId: null,
  userCredits: 0,
  setUserCredits: () => {},
});

// Auth provider component
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState(0);
  const rootNavigation = useRootNavigation();
  const segments = useSegments();

  // Check if the user is authenticated and redirect accordingly
  useEffect(() => {
    if (!rootNavigation || !rootNavigation.isReady()) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isLoggedIn && inAuthGroup) {
      // If the user is logged in but in the auth group, redirect to the home screen
      router.replace('/(tabs)');
    } else if (!isLoggedIn && !inAuthGroup) {
      // If the user is not logged in and not in the auth group, redirect to the login screen
      router.replace('/login');
    }
  }, [isLoggedIn, segments, rootNavigation]);

  // Mock sign in function
  const signIn = async (email: string, password: string) => {
    // In a real app, validate credentials with a backend
    setIsLoggedIn(true);
    setUserId('user_demo');
    setUserCredits(100);
  };

  // Sign out function
  const signOut = () => {
    setIsLoggedIn(false);
    setUserId(null);
    setUserCredits(0);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isLoggedIn, 
        signIn, 
        signOut, 
        userId, 
        userCredits, 
        setUserCredits 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export default function RootLayout()
{
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() =>
  {
    if (loaded)
    {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded)
  {
    return null;
  }

  return (
    <AuthProvider>
      <GluestackUIProvider mode="light"><ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="plans" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider></GluestackUIProvider>
    </AuthProvider>
  );
}
