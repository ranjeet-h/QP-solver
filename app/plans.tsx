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
  ButtonSpinner,
  Badge,
  BadgeText
} from '@/components/ui';
import { mockPlans, mockSelectPlan, mockProcessPayment } from '@/utils/mockApis';
import { useAuth } from './_layout';

// Define base styles, rely on className for specifics
const styles = StyleSheet.create({
  // Keep minimal styles, rely on className
  container: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 24, // Add padding to scroll view content
  },
  header: {
    // Use className for margins
  },
  subtitle: {
    opacity: 0.7, // Keep subtle subtitle
  },
  planCard: {
    // Base card styles, specific overrides via className
  },
  planContent: {
    // Use Vstack props like space
  },
  priceContainer: {
    alignItems: 'flex-end', // Align price/currency
  },
  price: {
    fontWeight: 'bold', // Keep price bold
  },
  creditText: {
    opacity: 0.8,
  },
  divider: {
    // Use className for margins
  },
  featuresList: {
    // Use VStack props like space
  },
  featureItem: {
    alignItems: 'center', // Keep items aligned
  },
  featureText: {
    flexShrink: 1,
  },
  selectButton: {
    // Use className for margins
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    // Use className for margin
  }
});

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
        setError('User not authenticated. Please log in again.'); // More specific error
        // Potentially redirect to login
        // router.replace('/(auth)/login');
        setIsLoading(false); // Stop loading indicator
        return;
      }
      
      const plan = mockPlans.find(p => p.id === planId);
      if (!plan) {
        setError('Selected plan not found.');
        setIsLoading(false);
        return;
      }
      
      // Simulate API call to select plan
      const planResponse = await mockSelectPlan(userId, planId);
      
      if (planResponse.success) {
        if (plan.price > 0) { // Check price directly from mock data
          // Simulate payment 
          const paymentResponse = await mockProcessPayment(planId, plan.price);
          
          if (paymentResponse.success) {
            setUserCredits(paymentResponse.credits || 0); // Assume payment API returns new credit total
            router.replace('/(tabs)');
          } else {
            setError(paymentResponse.message || 'Payment failed. Please try again.');
          }
        } else {
          // Free plan
          setUserCredits(planResponse.credits || 0); // Assume select API returns credits for free plan
          router.replace('/(tabs)');
        }
      } else {
        setError(planResponse.message || 'Failed to select plan. Please try again.');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Define button styles conditionally
  const getButtonStyle = (planPrice: number) => {
    const baseStyle = "mt-auto w-full rounded-lg px-6 h-11 flex-row items-center justify-center active:scale-95 disabled:opacity-50 transition duration-150 ease-in-out";
    if (planPrice > 0) {
      // Paid Plan Button Style (Solid Blue)
      return `${baseStyle} bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400 active:bg-blue-800 dark:active:bg-blue-300 active:brightness-90`;
    } else {
      // Free Plan Button Style (Outline)
      return `${baseStyle} border border-blue-600 dark:border-blue-500 bg-transparent hover:bg-blue-100 dark:hover:bg-gray-700 active:bg-blue-200 dark:active:bg-gray-600`;
    }
  };

  const getButtonTextStyle = (planPrice: number) => {
    if (planPrice > 0) {
      // Paid Plan Button Text (White)
      return "text-white dark:text-white font-semibold";
    } else {
      // Free Plan Button Text (Blue)
      return "text-blue-600 dark:text-blue-400 font-semibold";
    }
  };

  return (
    <Box style={styles.container} className="bg-gray-100 dark:bg-black flex-1">
      <Stack.Screen options={{ title: 'Choose a Plan', headerBackVisible: !isLoading, headerStyle: { backgroundColor: '#F9FAFB' }, headerTintColor: '#1F2937' /* TODO: Dark mode header styles */ }} />

      <Center className="pt-10 pb-4 px-6 bg-gray-100 dark:bg-black mb-[-20px]">
        <Heading size="xl" className="text-center text-gray-900 dark:text-gray-100">Choose Your Plan</Heading>
        <Text className="text-center mt-1 text-gray-600 dark:text-gray-400">
          Unlock powerful solving capabilities.
        </Text>
      </Center>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingVertical: 16, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <VStack space="md" className="flex-1">
          {mockPlans.map((plan) => {
            const isPaidPlan = plan.price > 0;
            const isSelected = selectedPlan === plan.id;

            return (
              <Box
                key={plan.id}
                className={[
                  "bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md flex-1 relative overflow-hidden",
                  "border",
                  isSelected && isPaidPlan ? "border-2 border-blue-500 dark:border-blue-400" :
                  isSelected && !isPaidPlan ? "border-2 border-gray-400 dark:border-gray-500" :
                  isPaidPlan ? "border-gray-300 dark:border-gray-600" :
                  "border-gray-200 dark:border-gray-700"
                ].filter(Boolean).join(' ')}
              >
                {isPaidPlan && (
                  <Badge
                    size="md"
                    variant="solid"
                    action="warning"
                    className="absolute top-2 right-2 rounded-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                  >
                    <BadgeText className="font-bold text-xs uppercase tracking-wide">Best Value</BadgeText>
                  </Badge>
                )}

                <VStack space="sm" className="flex-1 pt-2">
                  <Heading size="lg" className="text-center text-gray-900 dark:text-gray-100 pt-4">{plan.name}</Heading>

                  <HStack className="items-baseline flex justify-center my-1">
                    <Text size="md" className="font-semibold mr-1 text-gray-700 dark:text-gray-300">₹</Text>
                    <Text size="4xl" className="font-bold text-gray-900 dark:text-gray-100">
                      {plan.price}
                    </Text>
                  </HStack>

                  <Text className="text-center text-gray-600 dark:text-gray-400 mb-2 text-sm">
                    {plan.credits} Credits Included
                  </Text>

                  <Divider className="my-2 bg-gray-200 dark:bg-gray-700" />

                  <VStack space="xs" className="flex-shrink mb-3">
                    {plan.features.map((feature, index) => (
                      <HStack key={index} style={styles.featureItem} space="sm">
                        <Icon as={CheckIcon} size="xs" className={isPaidPlan ? "text-blue-500 dark:text-blue-400" : "text-green-500 dark:text-green-400"} />
                        <Text className="flex-1 text-gray-700 dark:text-gray-300 text-lg">{feature}</Text>
                      </HStack>
                    ))}
                  </VStack>

                  <Button
                    className={getButtonStyle(plan.price) + ' mt-auto'}
                    onPress={() => handleSelectPlan(plan.id)}
                    isDisabled={isLoading}
                    size="lg"
                  >
                    {isLoading && isSelected ? (
                      <ButtonSpinner color={isPaidPlan ? '$white' : '$blue600'} />
                    ) : (
                      <ButtonText className={getButtonTextStyle(plan.price)}>
                        {plan.price === 0 ? 'Get Started Free' : 'Buy Credits'}
                      </ButtonText>
                    )}
                  </Button>
                </VStack>
              </Box>
            );
          })}
        </VStack>
      </ScrollView>

      {error ? (
        <Center className="p-3 bg-red-100 dark:bg-red-900 border-t border-red-200 dark:border-red-700">
          <Text className="text-center text-red-700 dark:text-red-300 font-medium text-sm">{error}</Text>
        </Center>
      ) : null}
    </Box>
  );
} 