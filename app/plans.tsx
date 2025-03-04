import React, { useState } from 'react';
import { Stack, router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { 
  Box, 
  Button, 
  ButtonText, 
  Center, 
  Divider, 
  Heading, 
  Text, 
  VStack,
  HStack,
  Icon,
  CheckIcon,
  ButtonSpinner
} from '@/components/ui';
import { mockPlans, mockSelectPlan, mockProcessPayment } from '@/utils/mockApis';
import { useAuth } from './_layout';

export default function PlansScreen() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { userId, setUserCredits } = useAuth();

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId);
    setIsLoading(true);
    setError('');

    try {
      // Get user ID from auth context
      if (!userId) {
        setError('User not authenticated');
        return;
      }
      
      // Call mock API for plan selection
      const planResponse = await mockSelectPlan(userId, planId);
      
      if (planResponse.success) {
        if (planResponse.requiresPayment) {
          // For paid plans, simulate payment process
          const paymentResponse = await mockProcessPayment(planId, planResponse.amount || 0);
          
          if (paymentResponse.success) {
            // Update credits in auth context
            setUserCredits(paymentResponse.credits || 0);
            // After successful payment, redirect to home
            router.replace('/(tabs)');
          } else {
            setError('Payment failed. Please try again.');
          }
        } else {
          // For free plan, update credits and go to home
          setUserCredits(planResponse.credits || 0);
          router.replace('/(tabs)');
        }
      } else {
        setError(planResponse.message || 'Failed to select plan');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box style={styles.container}>
      <Stack.Screen options={{ title: 'Choose a Plan', headerShown: false }} />
      
      <Center style={styles.header}>
        <Heading size="2xl">Choose Your Plan</Heading>
        <Text style={styles.subtitle}>
          Select a plan that works best for you
        </Text>
      </Center>
      
      <ScrollView style={styles.plansContainer}>
        {mockPlans.map((plan) => (
          <Box
            key={plan.id}
            style={[
              styles.planCard,
              selectedPlan === plan.id && styles.selectedPlan
            ]}
          >
            <VStack style={styles.planContent}>
              <Heading size="lg">{plan.name}</Heading>
              <HStack style={styles.priceContainer}>
                <Text size="xs" style={styles.currency}>₹</Text>
                <Text size="4xl" style={styles.price}>
                  {plan.price}
                </Text>
              </HStack>
              <Text style={styles.creditText}>
                {plan.credits} Credits
              </Text>
              
              <Divider style={styles.divider} />
              
              <VStack style={styles.featuresList}>
                {plan.features.map((feature, index) => (
                  <HStack key={index} style={styles.featureItem}>
                    <Box style={styles.checkIcon}>
                      <Text style={{ color: 'green' }}>✓</Text>
                    </Box>
                    <Text style={styles.featureText}>{feature}</Text>
                  </HStack>
                ))}
              </VStack>
              
              <Button
                style={styles.selectButton}
                onPress={() => handleSelectPlan(plan.id)}
                isDisabled={isLoading}
                variant={selectedPlan === plan.id ? "solid" : "outline"}
              >
                {isLoading && selectedPlan === plan.id ? (
                  <ButtonSpinner />
                ) : (
                  <ButtonText>
                    {plan.price === 0 ? 'Select Free Plan' : 'Buy Now'}
                  </ButtonText>
                )}
              </Button>
            </VStack>
          </Box>
        ))}
      </ScrollView>
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginTop: 60,
    marginBottom: 20,
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
  plansContainer: {
    flex: 1,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedPlan: {
    borderWidth: 2,
    borderColor: '#3182CE',
  },
  planContent: {
    gap: 10,
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  currency: {
    marginBottom: 8,
  },
  price: {
    fontWeight: 'bold',
  },
  creditText: {
    opacity: 0.8,
  },
  divider: {
    marginVertical: 12,
  },
  featuresList: {
    gap: 8,
    marginTop: 4,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  checkIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flexShrink: 1,
  },
  selectButton: {
    marginTop: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  }
}); 