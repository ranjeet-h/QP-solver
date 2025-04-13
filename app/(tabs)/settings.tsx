import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert, SafeAreaView, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import { 
  Box, 
  Button, 
  ButtonText, 
  Heading, 
  Text, 
  VStack,
  HStack,
  Divider,
  Avatar,
  AvatarFallbackText,
  Switch,
  Image,
  Spinner,
  ButtonSpinner,
  Badge,
  BadgeText,
  Center,
  Icon,
  CloseIcon,
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogCloseButton,
  Pressable,
  ButtonGroup
} from '@/components/ui';
import { mockGetUserProfile } from '@/utils/mockApis';
import { useAuth } from '@/app/_layout';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from "nativewind";

const styles = StyleSheet.create({});

const SettingsRow = ({ label, value, onPress, children }: { label: string, value?: string, onPress?: () => void, children?: React.ReactNode }) => (
  <Pressable onPress={onPress} disabled={!onPress}>
    <HStack className="py-3 justify-between items-center">
      <Text className="text-base text-gray-800 dark:text-gray-200">{label}</Text>
      {value && <Text className="text-base text-gray-600 dark:text-gray-400">{value}</Text>}
      {children}
      {onPress && <Feather name="chevron-right" size={20} className="text-gray-400 dark:text-gray-500 ml-2" />} 
    </HStack>
  </Pressable>
);

export default function SettingsScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  
  const clearHistoryDialogRef = React.useRef(null);
  const deleteAccountDialogRef = React.useRef(null);

  const { signOut, userCredits, setUserCredits, userId } = useAuth();
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const response = await mockGetUserProfile(userId);
      if (response.success) {
        setProfile(response.profile);
        setUserCredits(response.profile.credits);
      } else {
        Alert.alert('Error', 'Could not load profile data.');
      }
    } catch (error) {
      console.log('Failed to fetch user profile:', error);
      Alert.alert('Error', 'Could not load profile data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: signOut }
    ]);
  };

  const handleClearHistory = () => {
    console.log("Clearing history...");
    setShowClearHistoryDialog(false);
    Alert.alert('History Cleared', 'Your solve history has been cleared.');
  };

  const handleDeleteAccount = () => {
    console.log("Deleting account...");
    setShowDeleteAccountDialog(false);
    signOut(); 
    Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
  };

  const handleSupportLink = (url: string) => {
    Linking.openURL(url).catch(err => Alert.alert("Error", "Could not open link."));
  };
  
  const handleThemeChange = (theme: 'light' | 'dark') => {
     if (setColorScheme) {
        setColorScheme(theme);
     }
  };

  if (isLoading && !profile) {
    return (
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 }}>
        <Center className="flex-1">
          <Spinner size="large" />
        </Center>
      </SafeAreaView>
    );
  }

  return (
    <Box className="bg-gray-100 dark:bg-black flex-1">
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 }}>
        <Box className="px-4 pt-4 pb-2">
          <Heading size="xl" className="text-gray-900 dark:text-gray-100">Settings</Heading>
        </Box>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {profile ? (
            <VStack space="xl" className="px-4 mt-4">
              <VStack space="sm">
                 <Heading size="lg" className="text-gray-800 dark:text-gray-200 mb-2">Account</Heading>
                 <Box className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                   <HStack space="md" className="items-center p-4">
                      <Avatar size="lg" className="bg-gray-200 dark:bg-gray-700">
                        <AvatarFallbackText className="text-gray-700 dark:text-gray-300">{profile.name ? profile.name.substring(0, 2).toUpperCase() : '--'}</AvatarFallbackText> 
                      </Avatar>
                      <VStack className="flex-1">
                        <Heading size="md" className="text-gray-900 dark:text-gray-100">{profile.name || 'User'}</Heading>
                        <Text size="sm" className="text-gray-600 dark:text-gray-400">{profile.email || 'No email'}</Text>
                      </VStack>
                   </HStack>
                   <Divider className="bg-gray-200 dark:bg-gray-700" />
                   <Box className="px-4">
                     <SettingsRow label="User ID" value={userId || 'N/A'} />
                     <Divider className="bg-gray-200 dark:bg-gray-700" />
                     <SettingsRow label="Change Password" onPress={() => {
                       console.log("Change Password row pressed");
                       router.push('/change-password');
                     }} />
                   </Box>
                 </Box>
              </VStack>

              <VStack space="sm">
                 <Heading size="lg" className="text-gray-800 dark:text-gray-200 mb-2">Subscription & Credits</Heading>
                 <Box className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 px-4">
                   <SettingsRow label="Current Plan">
                      <Badge size="sm" action={profile.plan === 'free' ? 'muted' : 'success'} variant="outline">
                        <BadgeText>{profile.plan === 'free' ? 'Free' : 'Premium'}</BadgeText>
                      </Badge>
                   </SettingsRow>
                    <Divider className="bg-gray-200 dark:bg-gray-700" />
                   <SettingsRow label="Credits Remaining" value={userCredits?.toString() ?? '--'} />
                 </Box>
                 <Button 
                    action="primary" 
                    variant="solid" 
                    onPress={() => router.push('/plans')} 
                    size="lg"
                    className="
                      w-full mt-2 rounded-lg px-6 h-11 flex-row items-center justify-center 
                      bg-blue-600 dark:bg-blue-500 
                      hover:bg-blue-700 dark:hover:bg-blue-400 
                      active:bg-blue-800 dark:active:bg-blue-300 
                      active:scale-95 active:brightness-90 
                      disabled:opacity-50 
                      transition duration-150 ease-in-out
                    "
                  >
                  <ButtonText className="font-bold text-white">Manage Plan / Buy Credits</ButtonText>
                 </Button>
              </VStack>

              <VStack space="sm">
                 <Heading size="lg" className="text-gray-800 dark:text-gray-200 mb-2">App Settings</Heading>
                 <Box className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 px-4">
                     <VStack className="py-3">
                        <Text className="text-base text-gray-800 dark:text-gray-200 mb-2">Appearance</Text>
                        {/* <HStack space="sm">
                           <Button size="sm" variant={colorScheme === 'light' ? 'solid' : 'outline'} action="secondary" onPress={() => handleThemeChange('light')}><ButtonText>Light</ButtonText></Button>
                           <Button size="sm" variant={colorScheme === 'dark' ? 'solid' : 'outline'} action="secondary" onPress={() => handleThemeChange('dark')}><ButtonText>Dark</ButtonText></Button>
                        </HStack> */}
                     </VStack>
                    <Divider className="bg-gray-200 dark:bg-gray-700" />
                    <SettingsRow label="Push Notifications">
                      <Switch 
                         value={notificationsEnabled}
                         onValueChange={setNotificationsEnabled}
                      />
                    </SettingsRow>
                    <Divider className="bg-gray-200 dark:bg-gray-700" />
                    <SettingsRow label="Clear Solve History" onPress={() => setShowClearHistoryDialog(true)} />
                 </Box>
              </VStack>

              <VStack space="sm">
                 <Heading size="lg" className="text-gray-800 dark:text-gray-200 mb-2">Support</Heading>
                  <Box className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 px-4">
                      <SettingsRow label="Help Center" onPress={() => handleSupportLink('#')} />
                      <Divider className="bg-gray-200 dark:bg-gray-700" />
                      <SettingsRow label="Privacy Policy" onPress={() => handleSupportLink('#')} />
                      <Divider className="bg-gray-200 dark:bg-gray-700" />
                      <SettingsRow label="Terms of Service" onPress={() => handleSupportLink('#')} />
                  </Box>
              </VStack>

               <VStack space="sm" className="mt-4">
                  <Button 
                    variant="outline" 
                    action="negative" 
                    onPress={handleLogout}
                    size="lg"
                    className="
                      w-full rounded-lg px-6 h-11 flex-row items-center justify-center 
                      border-red-600 dark:border-red-500 
                      hover:bg-red-100 dark:hover:bg-red-900/30 
                      active:bg-red-200 dark:active:bg-red-800/50 
                      active:scale-95 active:brightness-95 
                      disabled:opacity-50 
                      transition duration-150 ease-in-out
                    "
                  >
                    <ButtonText className="font-bold text-red-600 dark:text-red-500">Logout</ButtonText> 
                  </Button>
                  <Button 
                    variant="link"
                    action="negative" 
                    onPress={() => setShowDeleteAccountDialog(true)}
                    className="mt-2"
                  >
                    <ButtonText className="text-red-600 dark:text-red-400">Delete Account</ButtonText> 
                  </Button>
              </VStack>

            </VStack>
          ) : (
             <Center className="p-10">
               <Text className="text-center text-gray-500 dark:text-gray-400">Could not load profile information.</Text>
               <Button variant="link" onPress={fetchUserProfile} className="mt-2">
                 <ButtonText>Try Again</ButtonText>
               </Button>
             </Center>
          )}
        </ScrollView>

         <AlertDialog isOpen={showClearHistoryDialog} onClose={() => setShowClearHistoryDialog(false)} leastDestructiveRef={clearHistoryDialogRef}>
            <AlertDialogBackdrop className="bg-black/50" />
            <AlertDialogContent className="bg-white dark:bg-gray-800">
              <AlertDialogHeader>
                <Heading size="lg">Clear History</Heading>
                <AlertDialogCloseButton><Icon as={CloseIcon} /></AlertDialogCloseButton>
              </AlertDialogHeader>
              <AlertDialogBody>
                <Text>Are you sure you want to clear your entire solve history? This action cannot be undone.</Text>
              </AlertDialogBody>
              <AlertDialogFooter>
                 <ButtonGroup space="md">
                    <Button variant="outline" action="secondary" onPress={() => setShowClearHistoryDialog(false)} className="mr-2"> 
                       <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button action="negative" onPress={handleClearHistory}>
                       <ButtonText>Clear History</ButtonText>
                    </Button>
                 </ButtonGroup>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog isOpen={showDeleteAccountDialog} onClose={() => setShowDeleteAccountDialog(false)} leastDestructiveRef={deleteAccountDialogRef}>
            <AlertDialogBackdrop className="bg-black/50" />
            <AlertDialogContent className="bg-white dark:bg-gray-800">
              <AlertDialogHeader>
                <Heading size="lg">Delete Account</Heading>
                <AlertDialogCloseButton><Icon as={CloseIcon} /></AlertDialogCloseButton>
              </AlertDialogHeader>
              <AlertDialogBody>
                <Text>Are you sure you want to permanently delete your account? All your data will be lost. This action cannot be undone.</Text>
              </AlertDialogBody>
              <AlertDialogFooter>
                 <ButtonGroup space="md">
                    <Button variant="outline" action="secondary" onPress={() => setShowDeleteAccountDialog(false)} className="mr-2"> 
                       <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button action="negative" onPress={handleDeleteAccount}>
                       <ButtonText>Delete Account</ButtonText>
                    </Button>
                 </ButtonGroup>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

      </SafeAreaView>
    </Box>
  );
} 