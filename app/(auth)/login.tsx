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
} from '../../components/ui';
import { mockLogin } from '../../utils/mockApis';
import { useAuth } from '../_layout';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Call mock API for login
      const response = await mockLogin(email, password);
      
      if (response.success) {
        // Sign in using auth context
        await signIn(email, password);
        
        // Navigate to plans page for new users or home for existing users
        if (response.isNewUser) {
          router.replace('/plans');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        setError(response.message || 'Login failed');
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
      <Stack.Screen options={{ title: 'Login', headerShown: false }} />
      
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
            <Text size="sm" style={styles.subtitle}>Solve question papers with AI</Text>
          </Box>
          
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
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </FormControl>
          
          <Button onPress={handleLogin} isDisabled={isLoading} style={styles.loginButton}>
            {isLoading ? <ButtonSpinner /> : <ButtonText>Login</ButtonText>}
          </Button>
          
          <Button variant="link" onPress={() => router.push('/signup')} style={styles.linkButton}>
            <ButtonText>Don't have an account? Sign up</ButtonText>
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
  loginButton: {
    marginTop: 16,
  },
  linkButton: {
    marginTop: 8,
  }
}); 