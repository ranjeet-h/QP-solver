// This file provides placeholder image URLs for development

export const PLACEHOLDERS = {
  LOGO: 'https://placeholder.pics/svg/150/3498DB/FFFFFF/App%20Logo',
  CREDIT_ICON: 'https://placeholder.pics/svg/24/22C55E/FFFFFF/₹',
  AVATAR: 'https://placeholder.pics/svg/128/6C63FF/FFFFFF/User',
  PLACEHOLDER: 'https://placeholder.pics/svg/150/CCCCCC/999999/Image',
};

// Helper function to create a local image object for testing
export const createLocalImage = (name: string) => {
  return { uri: PLACEHOLDERS[name as keyof typeof PLACEHOLDERS] || PLACEHOLDERS.PLACEHOLDER };
}; 