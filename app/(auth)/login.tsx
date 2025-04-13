import React, { useState, useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { 
  Button, 
  ButtonText, 
  FormControl, 
  FormControlLabel, 
  FormControlLabelText, 
  Input, 
  InputField, 
  VStack, 
  Image, 
  Heading, 
  Text, 
  Box,
  Center,
  ButtonSpinner,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  AlertCircleIcon,
  Link,
  LinkText
} from '../../components/ui';
import { authService } from '../../services/auth.service';
import { useAuth } from '../_layout';
import { useAppToast } from '../../hooks/useAppToast';
import AsyncStorage from '@react-native-async-storage/async-storage';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avoidingView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
  },
  errorIcon: {
    marginRight: 4,
  },
  loginButton: {
    marginTop: 24,
  },
  linkContainer: {
    marginTop: 16,
    alignItems: 'center',
  }
});

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const { showSuccessToast, showErrorToast } = useAppToast();
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  // Check for existing valid token on mount
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          console.log('Token found, validating...');
          // Validate token by trying to fetch user data
          // The api utility in utils/api.ts handles attaching the token
          await authService.getCurrentUser();
          console.log('Token is valid, redirecting...');
          // If getCurrentUser succeeds, token is valid, redirect to home/tabs root
          // Use replace to prevent going back to login
          router.replace('/'); // Redirect to the main app root, likely handled by (tabs) layout
          // No need to setIsCheckingToken(false) here as we are navigating away
          return; // Stop further execution in this effect
        } else {
          // No token found, stay on login screen
          console.log('No token found.');
          setIsCheckingToken(false);
        }
      } catch (validationError) {
        // Token exists but is invalid (getCurrentUser failed)
        // The interceptor in utils/api.ts should handle removing the invalid token
        console.log('Token validation failed:', validationError);
        setIsCheckingToken(false); // Proceed to show login form
      }
    };

    checkToken();
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Determine if identifier is email or phone number
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[0-9]{10,}$/;
      
      const isEmail = emailRegex.test(identifier);
      const isPhone = phoneRegex.test(identifier);
      
      if (!isEmail && !isPhone) {
        setError('Please enter a valid email address or phone number.');
        setIsLoading(false);
        return;
      }
      
      // Setup login payload based on identifier type
      const loginPayload: {
        email?: string;
        phone_number?: string;
        password: string;
      } = {
        password: password
      };
      
      if (isEmail) {
        loginPayload.email = identifier.trim().toLowerCase();
      } else {
        loginPayload.phone_number = identifier.trim();
      }
      
      const response: any = await authService.login(loginPayload);
      
      console.log("Login successful", response);
      
      // Store the token securely
      if (response.access_token) {
        await AsyncStorage.setItem('userToken', response.access_token);
        console.log("Token stored successfully");
      } else {
        console.log("No access token received in login response");
        throw new Error("Authentication failed: No token received.");
      }

      // Update auth context/state (assuming signIn handles this without needing the token passed)
      await signIn(identifier, password); 
      
      // Show success toast
      showSuccessToast('Login Successful', 'Welcome back to Solver!');
      
      // Redirect based on user status
      router.replace('/plans');
      
    } catch (error: any) {
      console.log("Login API call error:", error);

      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
          errorMessage = detail[0].msg;
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isInvalid = !!error;

  // Render loading indicator while checking token
  if (isCheckingToken) {
    return (
      <Center className="flex-1 bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" />
        <Text className="mt-2 text-gray-500 dark:text-gray-400">Checking session...</Text>
      </Center>
    );
  }

  return (
    <Box style={styles.container} className="bg-white dark:bg-gray-900">
      <Stack.Screen options={{ title: 'Login', headerShown: false }} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.avoidingView}
      >
        <Center style={styles.centerContent} className="bg-white dark:bg-gray-900">
          <VStack space="lg" style={styles.formContainer}>
            <Box style={styles.logoContainer} className="bg-white dark:bg-gray-900">
              <Image 
                source={require('@/assets/images/undraw_learning-sketchingsh.png')} 
                alt="Solver App Logo"
                size="xl"
                style={styles.logo}
              />
              <Heading size="2xl" style={styles.title} className="text-gray-900 dark:text-gray-100">
                Welcome Back
              </Heading>
              <Text size="md" style={styles.subtitle} className="text-gray-600 dark:text-gray-400">
                Log in to continue solving
              </Text>
            </Box>
            
            <FormControl isRequired isInvalid={isInvalid} size="lg">
              <FormControlLabel className="mb-1">
                <FormControlLabelText className="text-gray-700 dark:text-gray-300">Email or Phone Number</FormControlLabelText>
              </FormControlLabel>
              <Input variant="outline">
                <InputField
                  placeholder="you@example.com or +1234567890"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  onFocus={() => setError('')}
                />
              </Input>
            </FormControl>
            
            <FormControl isRequired isInvalid={isInvalid} size="lg">
              <FormControlLabel className="mb-1">
                <FormControlLabelText className="text-gray-700 dark:text-gray-300">Password</FormControlLabelText>
              </FormControlLabel>
              <Input variant="outline">
                <InputField
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  onFocus={() => setError('')}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </Input>
              <FormControlError className="mt-1">
                <FormControlErrorIcon as={AlertCircleIcon} size="sm" style={styles.errorIcon} className="text-red-500" />
                <FormControlErrorText className="text-red-600 dark:text-red-400">
                  {error}
                </FormControlErrorText>
              </FormControlError>
            </FormControl>
            
            <Button 
              onPress={handleLogin} 
              isDisabled={isLoading} 
              size="lg"
              className="
                w-full mt-6 rounded-lg px-6 h-11 flex-row items-center justify-center 
                bg-blue-600 dark:bg-blue-500 
                hover:bg-blue-700 dark:hover:bg-blue-400 
                active:bg-blue-800 dark:active:bg-blue-300 
                active:scale-95 active:brightness-90 
                disabled:opacity-50 
                transition duration-150 ease-in-out
              "
            >
              {isLoading ? <ButtonSpinner color="white" /> : <ButtonText className="font-bold text-white">Log In</ButtonText>}
            </Button>
            
            <Box style={styles.linkContainer}>
              <Link onPress={() => router.push('/signup')} className="py-2 px-4">
                <LinkText size="sm">Don't have an account? <Text size="sm" className="text-blue-700 dark:text-blue-400 font-bold">Sign Up</Text></LinkText>
              </Link>
            </Box>
          </VStack>
        </Center>
      </KeyboardAvoidingView>
    </Box>
  );
} 