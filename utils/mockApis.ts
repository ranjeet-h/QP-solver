// This file contains mock implementations of API calls
// These will be replaced with actual API calls once the backend is ready

// Mock user data
const mockUsers = [
  {
    id: '1',
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    plan: 'free',
    credits: 85,
    purchaseHistory: [
      { id: 'p1', date: '2023-01-15', amount: 0, credits: 100, plan: 'free' }
    ]
  }
];

// Mock plans data
export const mockPlans = [
  {
    id: 'free',
    name: 'Free Plan',
    credits: 100,
    price: 0,
    features: [
      'Access to basic question solving',
      'Limited to 100 credits',
      'No priority support'
    ]
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    credits: 500,
    price: 500,
    features: [
      'Access to all question solving features',
      '500 credits',
      'Priority support',
      'Detailed explanations'
    ]
  }
];

// Simulates a delay to mimic network requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Login API
export const mockLogin = async (email: string, password: string) => {
  await delay(1000); // Simulate network delay
  
  const user = mockUsers.find(u => u.email === email && u.password === password);
  
  if (user) {
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        credits: user.credits
      },
      isNewUser: false
    };
  }
  
  // For demo purposes, allow any login with valid email format when user doesn't exist
  if (email.includes('@') && password.length >= 6) {
    return {
      success: true,
      user: {
        id: Math.random().toString(36).substring(2, 9),
        email,
        name: email.split('@')[0],
        plan: 'none',
        credits: 0
      },
      isNewUser: true
    };
  }
  
  return {
    success: false,
    message: 'Invalid email or password'
  };
};

// Signup API
export const mockSignup = async (name: string, email: string, password: string) => {
  await delay(1000);
  
  // Check if user already exists
  if (mockUsers.some(u => u.email === email)) {
    return {
      success: false,
      message: 'User with this email already exists'
    };
  }
  
  // For demo, we'll just pretend to create a new user
  return {
    success: true,
    user: {
      id: Math.random().toString(36).substring(2, 9),
      email,
      name,
      plan: 'none',
      credits: 0
    }
  };
};

// Select plan API
export const mockSelectPlan = async (userId: string, planId: string) => {
  await delay(800);
  
  const plan = mockPlans.find(p => p.id === planId);
  
  if (!plan) {
    return {
      success: false,
      message: 'Invalid plan selected'
    };
  }
  
  // If it's the free plan, activate immediately
  if (plan.price === 0) {
    return {
      success: true,
      credits: plan.credits,
      plan: plan.id,
      requiresPayment: false
    };
  }
  
  // For paid plans, return that payment is required
  return {
    success: true,
    plan: plan.id,
    requiresPayment: true,
    amount: plan.price,
    credits: plan.credits
  };
};

// Mock payment processing with Razorpay
export const mockProcessPayment = async (planId: string, amount: number) => {
  await delay(1500);
  
  // Simulate successful payment (in a real app, this would integrate with Razorpay)
  // We're just returning success always for the demo
  return {
    success: true,
    transactionId: `tx_${Math.random().toString(36).substring(2, 9)}`,
    message: 'Payment successful',
    plan: planId,
    credits: planId === 'premium' ? 500 : 100
  };
};

// Mock API for solving questions
export const mockSolveQuestion = async (question: string, referenceBook?: string) => {
  await delay(2000); // Longer delay to simulate processing
  
  // Check if the question is valid
  if (!question.trim()) {
    return {
      success: false,
      message: 'Please provide a valid question'
    };
  }
  
  // Generate a mock answer
  return {
    success: true,
    answer: `Here is the solution to "${question}":\n\n` +
      `This question is related to the topic of ${referenceBook || 'general knowledge'}.\n\n` +
      `The answer involves understanding key concepts and applying them methodically.\n\n` +
      `Step 1: Analyze the question carefully\n` +
      `Step 2: Apply the relevant formulas/concepts\n` +
      `Step 3: Solve and verify your answer\n\n` +
      `The solution is based on principles from ${referenceBook || 'the subject matter'}.`,
    creditsUsed: 5,
    remainingCredits: 80
  };
};

// Get user profile
export const mockGetUserProfile = async (userId: string) => {
  await delay(500);
  
  const user = mockUsers.find(u => u.id === userId) || {
    id: userId,
    email: 'new@example.com',
    name: 'New User',
    plan: 'free',
    credits: 100,
    purchaseHistory: []
  };
  
  return {
    success: true,
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      credits: user.credits,
      purchaseHistory: user.purchaseHistory
    }
  };
}; 