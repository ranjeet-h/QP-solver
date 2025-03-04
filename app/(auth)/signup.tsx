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
  ButtonSpinner
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Stack.Screen options={{ title: 'Sign Up', headerShown: false }} />
      
      <Center style={styles.content}>
        <VStack space="lg" style={styles.form}>
          <Box style={styles.logoContainer}>
            <Image 
              source={require('@/assets/images/icon.png')} 
              alt="App Logo"
              size="2xl"
              style={styles.logo}
              defaultSource={require('@/assets/images/icon.png')}
            />
            <Heading size="2xl" style={styles.title}>Solver</Heading>
            <Text size="sm" style={styles.subtitle}>Create your account</Text>
          </Box>
          
          <FormControl isRequired isInvalid={!!error}>
            <FormControlLabel>
              <FormControlLabelText>Name</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
              />
            </Input>
          </FormControl>
          
          <FormControl isRequired isInvalid={!!error}>
            <FormControlLabel>
              <FormControlLabelText>Email</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </Input>
          </FormControl>
          
          <FormControl isRequired isInvalid={!!error}>
            <FormControlLabel>
              <FormControlLabelText>Password</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </Input>
          </FormControl>
          
          <FormControl isRequired isInvalid={!!error}>
            <FormControlLabel>
              <FormControlLabelText>Confirm Password</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </Input>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </FormControl>
          
          <Button onPress={handleSignup} style={styles.signupButton} isDisabled={isLoading}>
            {isLoading ? <ButtonSpinner /> : <ButtonText>Sign Up</ButtonText>}
          </Button>
          
          <Button variant="link" onPress={() => router.push('/login')} style={styles.linkButton}>
            <ButtonText>Already have an account? Login</ButtonText>
          </Button>
        </VStack>
      </Center>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
  },
  errorText: {
    color: 'red',
    marginTop: 4,
  },
  signupButton: {
    marginTop: 16,
  },
  linkButton: {
    marginTop: 8,
  }
}); 