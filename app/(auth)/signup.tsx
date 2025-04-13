import React, { useState, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, ScrollView, TextInput } from 'react-native';
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
  Link, 
  LinkText 
} from '../../components/ui';
import { authService } from '../../services/auth.service';
import { UserCreate } from '../../types/user';
import { useAppToast } from '../../hooks/useAppToast';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccessToast, showErrorToast } = useAppToast();

  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword || !phoneNumber) {
      showErrorToast('Missing Fields', 'Please fill all required fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showErrorToast('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (phoneNumber && !/^\+?[0-9]{10,}$/.test(phoneNumber)) {
        showErrorToast('Invalid Phone', 'Please enter a valid phone number (e.g., +1234567890 or 1234567890)');
        return;
    }

    if (password !== confirmPassword) {
      showErrorToast('Password Mismatch', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      showErrorToast('Password Too Short', 'Password should be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const trimmedName = name.trim();
      let firstName = trimmedName;
      let lastName: string | undefined = undefined;
      const spaceIndex = trimmedName.indexOf(' ');
      if (spaceIndex > 0) {
        firstName = trimmedName.substring(0, spaceIndex);
        lastName = trimmedName.substring(spaceIndex + 1).trim() || undefined;
      }

      const payload: UserCreate = {
        email: email.trim().toLowerCase(),
        password: password,
        first_name: firstName,
      };
      if (lastName) {
        payload.last_name = lastName;
      }
      if (phoneNumber.trim()) {
          payload.phone_number = phoneNumber.trim();
      }

      console.log("Signup Payload:", payload);

      const response = await authService.register(payload);
      console.log("Signup successful", response);
      showSuccessToast('Signup Successful', 'Account created. Please log in.');
      router.push('/(auth)/login');

    } catch (error: any) {
      console.log("Signup API call error:", error);

      let errorMessage = 'Signup failed. Please try again later.';
      let errorTitle = 'Signup Failed';

      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
          errorTitle = 'Validation Error';
          errorMessage = detail[0].msg + (detail[0].loc ? ` (${detail[0].loc.join(' -> ')})` : '');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      } else if (error?.message) {
        errorTitle = 'Network Error';
        errorMessage = error.message;
      }

      showErrorToast(errorTitle, errorMessage);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box style={styles.container} className="bg-white dark:bg-gray-900">
      <Stack.Screen options={{ title: 'Sign Up', headerShown: false }} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.avoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContentContainer} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Center style={styles.centerContent}>
            <VStack space="md" style={styles.formContainer}> 
              <Box style={styles.logoContainer} className="bg-white dark:bg-gray-900">
                <Image 
                  source={require('../../assets/images/undraw_learning-sketchingsh.png')}
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
              
              <FormControl size="lg">
                <Box className="mb-1 flex-row items-center">
                  <FormControlLabel>
                    <FormControlLabelText className="text-gray-700 dark:text-gray-300">Full Name</FormControlLabelText>
                  </FormControlLabel>
                  <Text className="text-red-600 dark:text-red-400 ml-1">*</Text>
                </Box>
                <Input variant="outline">
                  <InputField
                    placeholder="Your Name"
                    value={name}
                    onChangeText={setName}
                    returnKeyType="next"
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                  />
                </Input>
              </FormControl>
            
              <FormControl size="lg" >
                <Box className="mb-1 flex-row items-center">
                  <FormControlLabel>
                    <FormControlLabelText className="text-gray-700 dark:text-gray-300">Email Address</FormControlLabelText>
                  </FormControlLabel>
                  <Text className="text-red-600 dark:text-red-400 ml-1">*</Text>
                </Box>
                <Input variant="outline">
                  <InputField
                    ref={emailInputRef as any}
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneInputRef.current?.focus()}
                  />
                </Input>
              </FormControl>

              <FormControl size="lg"> 
                <Box className="mb-1 flex-row items-center">
                  <FormControlLabel>
                    <FormControlLabelText className="text-gray-700 dark:text-gray-300">Phone Number</FormControlLabelText>
                  </FormControlLabel>
                  <Text className="text-red-600 dark:text-red-400 ml-1">*</Text>
                </Box>
                <Input variant="outline">
                  <InputField
                    ref={phoneInputRef as any}
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                  />
                </Input>
              </FormControl>

              <FormControl size="lg">
                <Box className="mb-1 flex-row items-center">
                  <FormControlLabel>
                    <FormControlLabelText className="text-gray-700 dark:text-gray-300">Password</FormControlLabelText>
                  </FormControlLabel>
                  <Text className="text-red-600 dark:text-red-400 ml-1">*</Text>
                </Box>
                <Input variant="outline">
                  <InputField
                    ref={passwordInputRef as any}
                    placeholder="********"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                  />
                </Input>
              </FormControl>

              <FormControl size="lg">
                <Box className="mb-1 flex-row items-center">
                  <FormControlLabel>
                    <FormControlLabelText className="text-gray-700 dark:text-gray-300">Confirm Password</FormControlLabelText>
                  </FormControlLabel>
                  <Text className="text-red-600 dark:text-red-400 ml-1">*</Text>
                </Box>
                <Input variant="outline">
                  <InputField
                    ref={confirmPasswordInputRef as any}
                    placeholder="********"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleSignup}
                  />
                </Input>
              </FormControl>

              <Button 
                size="lg" 
                variant="solid" 
                action="primary" 
                onPress={handleSignup}
                disabled={isLoading}
                className="mt-4"
              >
                {isLoading ? <ButtonSpinner /> : <ButtonText>Sign Up</ButtonText>}
              </Button>

              <Box style={styles.footer} className="flex-row justify-center items-center mt-6">
                <Text size="sm" className="text-gray-600 dark:text-gray-400">
                  Already have an account?{' '} 
                </Text>
                <Link onPress={() => router.push('/(auth)/login')}>
                  <LinkText size="sm" className="text-blue-600 dark:text-blue-400 font-semibold">
                    Log In
                  </LinkText>
                </Link>
              </Box>
            </VStack>
          </Center>
        </ScrollView>
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
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  centerContent: {
    width: '100%',
  },
  formContainer: {
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center', 
    marginBottom: 30,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 24,
    textAlign: 'center',
    color: '#6B7280',
  },
  footer: {
    marginTop: 20,
  },
}); 