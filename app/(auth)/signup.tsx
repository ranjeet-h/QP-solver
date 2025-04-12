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
} from '@/components/ui';
import { mockSignup } from '@/utils/mockApis';
import { useAuth } from '../_layout';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleSignup = async () => {
    // Basic validation
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Call mock API for signup
      const response = await mockSignup(name, email, password);
      
      if (response.success) {
        // Sign in the user after successful signup
        await signIn(email, password);
        // Navigate to plans page
        router.replace('/plans');
      } else {
        setError(response.message || 'Signup failed');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isInvalid = !!error;

  return (
    <Box style={styles.container} className="bg-white dark:bg-gray-900">
      <Stack.Screen options={{ title: 'Sign Up', headerShown: false }} />
      
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
                Create Account
              </Heading>
              <Text size="md" style={styles.subtitle} className="text-gray-600 dark:text-gray-400">
                Get started with Solver
              </Text>
            </Box>
            
            <FormControl isRequired isInvalid={isInvalid} size="lg">
              <FormControlLabel className="mb-1">
                <FormControlLabelText className="text-gray-700 dark:text-gray-300">Full Name</FormControlLabelText>
              </FormControlLabel>
              <Input variant="outline">
                <InputField
                  placeholder="Your Name"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setError('')}
                />
              </Input>
            </FormControl>
          
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
                  placeholder="Create a password (min. 6 characters)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  onFocus={() => setError('')}
                />
              </Input>
            </FormControl>
          
            <FormControl isRequired isInvalid={isInvalid} size="lg">
              <FormControlLabel className="mb-1">
                <FormControlLabelText className="text-gray-700 dark:text-gray-300">Confirm Password</FormControlLabelText>
              </FormControlLabel>
              <Input variant="outline">
                <InputField
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
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
              onPress={handleSignup} 
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
              {isLoading ? <ButtonSpinner color="white"/> : <ButtonText className="font-bold text-white">Create Account</ButtonText>}
            </Button>
          
            <Box style={styles.linkContainer}>
              <Link onPress={() => router.push('/login')} className="py-2 px-4">
                <LinkText size="sm">Already have an account? <Text size="sm" className="text-blue-700 dark:text-blue-400 font-bold">Log In</Text></LinkText>
              </Link>
            </Box>
          </VStack>
        </Center>
      </KeyboardAvoidingView>
    </Box>
  );
}

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
  signupButton: {
    marginTop: 24,
  },
  linkContainer: {
    marginTop: 16,
    alignItems: 'center',
  }
}); 