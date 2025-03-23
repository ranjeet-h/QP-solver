import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
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
  Card,
  Image,
} from '@/components/ui';
import { mockGetUserProfile, mockProcessPayment } from '@/utils/mockApis';
import { useAuth } from '@/app/_layout';

export default function SettingsScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { signOut, userCredits, setUserCredits } = useAuth();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      // In a real app, we would get the user ID from auth context
      const userId = 'user_demo';
      const response = await mockGetUserProfile(userId);
      
      if (response.success) {
        setProfile(response.profile);
        // Update credits in auth context
        setUserCredits(response.profile.credits);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyCredits = async () => {
    try {
      setIsLoading(true);
      
      // Mock payment process for 500 credits
      const paymentResponse = await mockProcessPayment('premium', 500);
      
      if (paymentResponse.success) {
        // Update credits in auth context
        setUserCredits(userCredits + paymentResponse.credits);
        
        Alert.alert(
          'Payment Successful',
          `You have purchased ${paymentResponse.credits} credits!`,
          [{ text: 'OK', onPress: fetchUserProfile }]
        );
      } else {
        Alert.alert('Payment Failed', 'Please try again later.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during payment processing.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            // Use the signOut from auth context
            signOut();
            // Router redirect happens automatically via the auth context
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Box style={styles.header}>
        <Heading style={styles.title}>Settings</Heading>
      </Box>
      
      {profile ? (
        <>
          <Card style={styles.profileCard}>
            <Box style={styles.cardHeader}>
              <HStack style={styles.profileHeader}>
                <Avatar size="lg" style={styles.avatar}>
                  <AvatarFallbackText>{profile.name}</AvatarFallbackText>
                </Avatar>
                <VStack style={styles.profileInfo}>
                  <Heading size="md">{profile.name}</Heading>
                  <Text style={styles.email}>{profile.email}</Text>
                </VStack>
              </HStack>
            </Box>
            <Box style={styles.cardContent}>
              <Divider style={styles.divider} />
              <VStack style={styles.profileDetails}>
                <HStack style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Current Plan</Text>
                  <Text style={styles.detailValue}>{profile.plan === 'free' ? 'Free Plan' : 'Premium Plan'}</Text>
                </HStack>
                <HStack style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Credits</Text>
                  <Text style={styles.detailValue}>{profile.credits}</Text>
                </HStack>
              </VStack>
            </Box>
            <Box style={styles.cardFooter}>
              <Button 
                variant="outline" 
                size="sm"
                onPress={fetchUserProfile}
                isDisabled={isLoading}
              >
                <ButtonText>Refresh</ButtonText>
              </Button>
            </Box>
          </Card>
          
          <Card style={styles.creditsCard}>
            <Box style={styles.cardHeader}>
              <Heading size="sm">Buy Credits</Heading>
            </Box>
            <Box style={styles.cardContent}>
              <VStack style={styles.creditsContent}>
                <Text style={styles.creditsDescription}>
                  Purchase additional credits to solve more questions.
                </Text>
                
                <Box style={styles.creditPackage}>
                  <HStack style={styles.packageHeader}>
                    <Heading size="xs">Premium Package</Heading>
                    <Text style={styles.packagePrice}>₹500</Text>
                  </HStack>
                  <Text style={styles.packageCredits}>500 Credits</Text>
                  <Button 
                    onPress={handleBuyCredits}
                    isDisabled={isLoading}
                    style={styles.buyButton}
                  >
                    <ButtonText>Buy Now</ButtonText>
                  </Button>
                </Box>
              </VStack>
            </Box>
          </Card>
          
          <Button 
            variant="outline" 
            onPress={handleLogout}
            style={[styles.logoutButton, { borderColor: '#E53E3E' }]}
          >
            <ButtonText style={{ color: '#E53E3E' }}>Logout</ButtonText>
          </Button>
        </>
      ) : (
        <Text style={styles.loadingText}>Loading profile...</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingTop: 10,
  },
  profileCard: {
    marginBottom: 0,
  },
  creditsCard: {
    marginBottom: 14,
  },
  cardHeader: {
    padding: 16,
  },
  cardContent: {
    padding: 16,
    paddingTop: 0,
  },
  cardFooter: {
    padding: 16,
    paddingTop: 0,
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  email: {
    opacity: 0.7,
  },
  divider: {
    marginVertical: 12,
  },
  profileDetails: {
    gap: 12,
  },
  detailRow: {
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontWeight: '500',
  },
  detailValue: {
    opacity: 0.8,
  },
  settingRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditsContent: {
    gap: 16,
  },
  creditsDescription: {
    opacity: 0.8,
  },
  creditPackage: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  packageHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packagePrice: {
    fontWeight: 'bold',
  },
  packageCredits: {
    marginTop: 4,
    opacity: 0.7,
  },
  buyButton: {
    marginTop: 12,
  },
  logoutButton: {
    marginTop: 8,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.7,
  }
}); 