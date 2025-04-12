# UI/UX Revamp Plan for Solver App

This document outlines the plan to revamp the UI/UX of the Solver App, aiming for a world-class user experience.

## Core Principles

1.  **Intuitive & Effortless:** Interactions must feel completely natural, almost invisible, guiding the user seamlessly through the core tasks.
2.  **Exceptional Visual Craftsmanship & Unique Identity:** Move beyond generic modern aesthetics. Develop a distinct, memorable, and premium visual identity. This includes a bespoke color palette, sophisticated typography, custom iconography, and potentially unique illustrative elements. Leverage `gluestack-ui` as a base, but customize heavily for a unique feel.
3.  **Delightful & Engaging Microinteractions:** Go beyond standard animations. Implement fluid transitions, meaningful microinteractions (using `react-native-reanimated`, potentially `Lottie` or `Skia`), and subtle haptic feedback to make the app feel alive and responsive.
4.  **Personalized & Motivating:** Deepen personalization beyond just recent activity. Make the credit system visually engaging and motivating.
5.  **Peak Performance & Universal Accessibility:** Ensure lightning-fast performance and adhere to the highest standards of accessibility (WCAG AA or AAA where feasible).
6.  **"Wow" Factor:** Intentionally design moments of delight and surprise that make the app stand out.

## Phase 1: Foundational Excellence & Core Flow

**Goal:** Establish the core user journey with exceptional polish from the start.

**1. Authentication ( `app/(auth)/` ) - COMPLETE**
    *   **UI:** Designed visually refined login/signup screens using theme-aware class names. Established basic layout and component structure. Added consistent error handling display.
    *   **UX:** Streamlined forms, added focus handlers to clear errors. Maintained effortless onboarding flow.
    *   **TODO:** Implement smooth transitions, elegant social login integrations, and visually engaging password strength indicators in a later polish phase.

**2. Plans Screen ( `app/plans.tsx` ) - COMPLETE**
    *   **UI:** Refactored plan cards using `className` for styling (background, border, shadow, padding). Improved layout with `VStack`/`HStack` and spacing props. Used `CheckIcon` for features. Styled header and error display area.
    *   **UX:** Updated logic for plan selection and mock payment flow. Made CTA buttons clearer (text and action). Highlight selected plan. Added more specific error messages.
    *   **TODO:** Add compelling iconography/subtle animations, visualize credit balance impact more clearly in a later polish phase.

**3. Home Screen ( `app/(tabs)/index.tsx` ) - Partially Complete**
    *   **UI:**
        *   Implemented file upload inputs for Question Paper (required, dashed border) and Reference Book (optional, solid border) using `Pressable`/`Box` and `Feather` icons. Limited uploads to PDF.
        *   Added header with title and credit display using `HStack` and `className`.
        *   Styled main action button (`w-full`, `variant="solid"`).
        *   Structured display for streaming status/progress, errors, and the final Markdown answer.
        *   Added Android status bar padding.
    *   **UX:**
        *   Integrated `DocumentPicker` for file selection.
        *   Connected `handleSolveQuestionStream` to `solverService` (currently only sends question paper).
        *   Implemented credit deduction and reversion logic during streaming/errors.
        *   Added `clearForm` functionality.
        *   Integrated export functionality (PDF/Markdown) via `AlertDialog`.
    *   **TODO:** 
        *   Integrate Camera Scan/Text Input options.
        *   Implement engaging visualization for the solving process.
        *   Refine Markdown result presentation (potentially custom styling).
        *   Update `solverService` call to send optional `referenceBookFile` when backend supports it.
        *   Add richer feedback/microinteractions.
        *   Design sophisticated dashboard elements (recent activity, tips).

**4. Tab Navigation ( `app/(tabs)/_layout.tsx` ) - Partially Complete**
    *   **UI:** Configured `Tabs` from Expo Router. Set active/inactive tint colors. Used existing `IconSymbol` with SF Symbol names (`house.fill`, `clock.fill`, `gearshape.fill`). Added subtle size increase for focused icon. Uses `HapticTab` and `TabBarBackground`.
    *   **UX:** Corrected tab title for History screen. Maintained standard tab navigation behavior.
    *   **TODO:** Design and integrate custom icons. Implement fluid/delightful transitions between tabs. Further refine active tab visual cues if needed.

## Phase 2: Refining the Experience & Adding Signature Moments

**Goal:** Elevate supporting screens and inject unique, delightful interactions.

**1. Settings Screen ( `app/(tabs)/settings.tsx` ) - COMPLETE**
    *   **UI:** Refactored screen layout using `Box`, `VStack`, `className`. Replaced `Card` components with styled `Box` elements for Profile and Buy Credits sections. Applied consistent styling to buttons (`Buy Now`, `Logout`). Added loading state.
    *   **UX:** Fetched profile using auth context `userId`. Updated `handleBuyCredits` and `handleLogout` logic. Ensured credit context updates correctly.
    *   **TODO:** Implement specific custom controls (toggles/inputs) if needed for future settings (like notifications). Further enhance visual polish and organization.

**2. Explore Screen ( `app/(tabs)/explore.tsx` ) - Refocused & Complete**
    *   **UI:** Renamed screen/header to "History & Tips". Restored history list display using styled `Box`, `VStack`, `Pressable`, `Divider`. Kept placeholder "Tips & Tricks" card. Removed other placeholder cards.
    *   **UX:** Displays mock history data with formatting. Includes empty state for history. Retained placeholder navigation for history items and tips card.
    *   **TODO:** Connect history list to actual data source. Implement navigation to history details and tips content. Refine layout and visual appeal further.

**3. General UI Elements & Design System ( `components/` )**
    *   **UI:** Establish a comprehensive design system based on the unique visual identity. Go beyond basic consistency – ensure every element, from buttons to modals, feels crafted and cohesive. Create reusable, highly polished custom components.
    *   **UX:** Ensure all interactions provide satisfying feedback (visual, haptic).

**4. Signature Animations & Microinteractions:**
    *   Identify key moments for signature animations (e.g., completing a solve, purchasing credits) that reinforce the brand and delight the user. Use `react-native-reanimated`, `Lottie`, or `Skia` for high-fidelity animations.

**5. Empty States & Error Handling:**
    *   Design beautiful, helpful, and potentially branded empty states and error messages. Avoid generic placeholders.

## Phase 3: Advanced Differentiation & Optimization

**Goal:** Introduce features and optimizations that solidify the app's "world-class" status.

**1. History & Saved Results:**
    *   **UI/UX:** Design an elegant history view with clear previews, robust search/filtering, and easy result revisiting.

**2. Offline Support (Optional):**
    *   Consider caching mechanisms for recently accessed data or allowing limited offline functionality if feasible.

**3. Performance Optimization:**
    *   Profile app performance, especially during image processing (if applicable) and LLM interaction. Optimize bundle size and rendering performance.

**4. Accessibility Audit:**
    *   Perform a thorough accessibility review aiming for WCAG AA/AAA compliance, ensuring the beautiful design is usable by everyone.

**5. Benchmarking & Inspiration:**
    *   Continuously benchmark against award-winning apps (across different categories) known for exceptional design and UX (e.g., Airbnb, Duolingo, Headspace, Things 3) for inspiration.

## Technology Considerations

*   **`gluestack-ui`:** As a foundation, heavily customized via its theming capabilities.
*   **`react-native-reanimated` / `Lottie` / `react-native-skia`:** For advanced animations and visual effects.
*   **`expo-image-picker` / `expo-camera`:** Ensure seamless integration with polished UI.
*   **State Management:** Crucial for maintaining a responsive UI, especially with animations and real-time updates.
*   **Custom Fonts & Icons:** Essential for the unique visual identity.

## Mockups & Prototyping

*   **High-Fidelity Mockups:** Absolutely essential. Create detailed mockups in tools like Figma, defining the exact visual style, spacing, typography, and components.
*   **Interactive Prototypes:** Build prototypes for key flows and animations to test the feel and usability before coding.

This refined plan now places a much stronger emphasis on achieving a unique, visually exceptional, and delightful user experience, aiming for that "world's best looking app" status. 