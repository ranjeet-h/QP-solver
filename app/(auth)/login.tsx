import React, { useState } from 'react';
import { Stack, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
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
import { mockLogin } from '../../utils/mockApis';
import { useAuth } from '../_layout';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await mockLogin(email, password);
      
      if (response.success) {
        await signIn(email, password);
        
        router.replace(response.isNewUser ? '/plans' : '/(tabs)');
      } else {
        setError(response.message || 'Invalid email or password.');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isInvalid = !!error;

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
                <FormControlLabelText className="text-gray-700 dark:text-gray-300">Email Address</FormControlLabelText>
              </FormControlLabel>
              <Input variant="outline">
                <InputField
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
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