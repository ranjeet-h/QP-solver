# Question Paper Solver App

A React Native application built with Expo that helps solve question papers using provided reference books through LLM (Large Language Model) technology.

## Project Overview

This app allows users to upload question papers and get answers based on reference books using LLM technology. The app has a credit-based system where users get 100 free credits and can purchase additional credits (500 credits for ₹500).

## Features

- **Authentication**: Login and signup functionality
- **Plans & Credits**: Free plan with 100 credits and premium plan with 500 credits for ₹500
- **Home Page**: Main interface for uploading question papers and getting answers
- **Settings**: User profile management and app settings
- **Explore**: Discover more features and information
- **Payment Integration**: Razorpay integration for purchasing credits (currently mocked)

## Tech Stack

- React Native with Expo
- TypeScript
- Tailwind CSS (via NativeWind)
- Expo Router for navigation
- Gluestack UI components
- React Navigation

## Project Structure

```
solver-test/
├── app/                      # Main application code
│   ├── (auth)/               # Authentication screens (login, signup)
│   ├── (tabs)/               # Main app tabs (home, explore, settings)
│   ├── _layout.tsx           # Root layout component
│   ├── plans.tsx             # Subscription plans page
├── assets/                   # Static assets like images
├── components/               # Reusable UI components
├── constants/                # App constants
├── hooks/                    # Custom React hooks
├── utils/                    # Utility functions
```

## Installation and Setup

1. Clone the repository

2. Install dependencies
   ```bash
   npm install
   ```
   or
   ```bash
   yarn install
   ```

3. Start the development server
   ```bash
   npx expo start
   ```

## Available Commands

```bash
# Start the development server
npx expo start

# Start with specific platform
npm run android
npm run ios
npm run web

# Publish to Expo with specific channel
expo publish --release-channel beta

# Build for Android development
eas build --platform android --profile development

# Build locally
eas build --local

# Run linting
npm run lint

# Run tests
npm run test
```

## Build Configuration

The project uses EAS (Expo Application Services) for building and deploying. The configuration is in the `eas.json` file with the following profiles:

- **development**: For development client builds
- **preview**: For internal distribution
- **production**: For production builds with auto-increment versioning

## API Integration

Currently, the app uses mocked APIs for demonstration purposes. The actual backend integration will be implemented later.

## Development Guidelines

1. Use TypeScript for type safety
2. Follow the directory structure
3. Utilize the Gluestack UI components for UI elements
4. Use Expo Router for navigation
5. Keep components reusable and modular

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

# Build APK

<!-- Set the environment variables -->
```bash
export ANDROID_HOME="$HOME/Library/Android/sdk" && export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home && echo "Environment set: ANDROID_HOME=$ANDROID_HOME, JAVA_HOME=$JAVA_HOME"
```

# Run the app

```bash
npx expo run:android --device  
```


# Build APK Locally

```bash
eas build --platform android --local  
```
# Convert aab to apk
## Install the build-tools and convert the aab to apk

```bash
java -jar bundletool-all-1.18.0.jar build-apks --bundle=build-1741189266818.aab --output=app.apks --mode=universal  
```

## Then unzip the app.apks and copy the apk to the android/app/src/main/assets/ directory

```bash
unzip app.apks -d apks            
```

<!-- Run backend -->

```bash
cd backend-fast-api
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```








