import React, { useState } from 'react';
import { Alert, SafeAreaView, Platform } from 'react-native';
import { router } from 'expo-router';
import { 
  Box, 
  Button, 
  ButtonText, 
  Heading, 
  VStack,
  HStack,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  Input,
  InputField,
  ButtonSpinner,
  Icon,
  Pressable,
} from '@/components/ui'; 
import Constants from 'expo-constants';
import { ArrowLeft } from 'lucide-react-native'; // Using lucide icon

// Mock API function (replace with actual API call)
const mockChangePassword = async (currentPassword: string, newPassword: string) => {
  console.log("Attempting to change password...", { currentPassword, newPassword });
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000)); 
  // Simulate success/failure
  if (currentPassword === "password123") { // Example check
    return { success: true, message: "Password changed successfully." };
  } else {
    return { success: false, message: "Incorrect current password." };
  }
};

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (!currentPassword || !newPassword) {
        Alert.alert('Error', 'Please fill in all password fields.');
        return;
    }

    setIsLoading(true);
    try {
      // Replace with actual API call
      const response = await mockChangePassword(currentPassword, newPassword); 
      if (response.success) {
        Alert.alert('Success', response.message);
        router.back(); // Go back to settings after success
      } else {
        Alert.alert('Error', response.message || 'Failed to change password.');
      }
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box className="bg-gray-100 dark:bg-black flex-1">
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 }}>
         <HStack className="items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
             <Pressable onPress={() => router.back()} className="p-2 -ml-2">
                 <Icon as={ArrowLeft} size="xl" className="text-gray-700 dark:text-gray-300" />
             </Pressable>
             <Heading size="lg" className="ml-2 text-gray-900 dark:text-gray-100">Change Password</Heading>
          </HStack>

        <VStack space="xl" className="p-4">
          <FormControl isRequired>
            <FormControlLabel>
              <FormControlLabelText>Current Password</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField 
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
              />
              {/* Optional: Add show/hide password icon */}
            </Input>
          </FormControl>

          <FormControl isRequired>
            <FormControlLabel>
              <FormControlLabelText>New Password</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField 
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter your new password"
              />
               {/* Optional: Add show/hide password icon */}
            </Input>
          </FormControl>

          <FormControl isRequired>
            <FormControlLabel>
              <FormControlLabelText>Confirm New Password</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField 
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your new password"
              />
               {/* Optional: Add show/hide password icon */}
            </Input>
             {/* Optional: Add password strength indicator */}
          </FormControl>

          <Button 
            action="primary" 
            variant="solid" 
            onPress={handleChangePassword} 
            disabled={isLoading}
            size="lg" // Ensure size is set if needed
            className="
              w-full mt-4 rounded-lg px-6 h-11 flex-row items-center justify-center 
              bg-blue-600 dark:bg-blue-500 
              hover:bg-blue-700 dark:hover:bg-blue-400 
              active:bg-blue-800 dark:active:bg-blue-300 
              active:scale-95 active:brightness-90 
              disabled:opacity-50 
              transition duration-150 ease-in-out
            "
          >
            {isLoading ? <ButtonSpinner color="white" /> : <ButtonText className="font-bold text-white">Change Password</ButtonText>}
          </Button>
        </VStack>
      </SafeAreaView>
    </Box>
  );
} 