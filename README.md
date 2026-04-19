# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Versioning

We use semantic versioning `MAJOR.MINOR.PATCH`. For this project:

- **Patch** (bump third number, e.g. 0.4.44 → 0.4.45): Bug fixes, dependency updates, small UI polish (spacing, colors, icon size, truncation), refactors that don’t change behavior, copy/label changes, performance or config tweaks. No new user-facing capability.
- **Minor / feature** (bump second number, e.g. 0.4.44 → 0.5.0): New capability or flow—e.g. new page/section, new integration (Resend, Netlify preset), new form/flow (booking form, draft saving, AI search options), new UI feature (read more/less, carousel, similar shops). Anything a user would describe as “you added X.”
- **Major** (bump first number): Breaking changes (removed APIs, changed contracts, incompatible config or data).

When in doubt: if it only fixes or polishes existing behavior → patch; if it adds something new a user would notice → minor.

**Version history is built from commits in order:** one commit → one version. Next commit is a feature? Bump minor, set patch to 0 (e.g. 0.10.0 → 0.11.0). Next commit is a patch? Bump patch (e.g. 0.10.0 → 0.10.1). No skipping minor versions.

## Version history

*(One version per commit, chronological. Feature = minor bump; patch = patch bump. Newest first. Run `node scripts/build-version-history.js` to regenerate.)*

- **0.68.3** — Refactor LandingHome and LandingFooter components for improved layout and responsiveness (2026-04-19).
- **0.68.2** — Refactor LandingHome and landing layouts for improved structure and functionality (2026-04-19).
- **0.68.1** — Refactor Logo component and update landing pages for improved structure and styling (2026-04-19).
- **0.68.0** — Enhance LandingHome.vue with new contact section and footer (2026-04-19).
- **0.67.4** — Refactor LandingHeader and LandingHome components for improved styling and functionality (2026-04-19).
- **0.67.3** — Refactor LandingHeader and LandingHome components for improved structure and content (2026-04-15).
- **0.67.2** — Update LandingHeader and LandingHome components for improved styling and structure (2026-04-14).
- **0.67.1** — Enhance LandingHome.vue with improved layout and interactivity (2026-04-14).
- **0.67.0** — Enhance DiveShopDetail and ShopDetailPanel components with booking CTA scroll functionality (2026-04-14).
- **0.66.0** — Enhance ChatHome component with staggered reveal for search results (2026-04-14).
- **0.65.0** — Implement AI search stream functionality in ChatHome component (2026-04-14).
- **0.64.16** — Refactor ChatHome and LandingHome components to utilize ChatComposer (2026-04-14).
- **0.64.15** — Enhance ChatHome and default layout functionality (2026-04-14).
- **0.64.14** — Enhance chat and landing page functionality (2026-04-14).
- **0.64.13** — Refactor landing page components for improved layout and responsiveness (2026-04-14).
- **0.64.12** — Remove unnecessary whitespace in the hero section of LandingHome.vue for cleaner code (2026-04-14).
- **0.64.11** — Enhance landing page layout in LandingHome.vue and landing.vue (2026-04-14).
- **0.64.10** — Refactor LandingHome.vue to utilize LandingHeader component (2026-04-14).
- **0.64.9** — Adjust layout in LandingHome.vue for improved responsiveness (2026-04-14).
- **0.64.8** — Refactor landing page main structure in LandingHome.vue (2026-04-14).
- **0.64.7** — Update dependencies and enhance landing page layout (2026-04-14).
- **0.64.6** — Refactor booking email test mode implementation and enhance layout responsiveness (2026-04-14).
- **0.64.5** — Refactor landing page layout in LandingHome.vue for improved structure and navigation (2026-04-14).
- **0.64.4** — Update layout structure in app.vue to support page meta definitions (2026-04-14).
- **0.64.3** — Refactor chat loading logic and remove obsolete session entry plugin (2026-04-14).
- **0.64.2** — Enhance loading experience and layout logic in index.vue (2026-04-14).
- **0.64.1** — Refactor layout structure and enhance page meta definitions (2026-04-14).
- **0.64.0** — Enhance booking flow with pre-send review and signup prompt (2026-04-13).
- **0.63.0** — Add immediate booking reply capability based on user intent (2026-04-12).
- **0.62.2** — Refactor entity phrase handling and add referent noise stripping (2026-04-12).
- **0.62.1** — Update logo orientation in default layout for improved aesthetics (2026-04-12).
- **0.62.0** — Implement booking email test mode functionality and enhance layout responsiveness (2026-04-12).
- **0.61.3** — Update configuration and API handling for improved security and flexibility (2026-04-02).
- **0.61.2** — Remove obsolete server files and clean up the build structure (2026-04-02).
- **0.61.1** — Update feedback terminology and improve placeholder text (2026-04-02).
- **0.61.0** — Enhance feedback handling and extend feedback types (2026-04-02).
- **0.60.3** — Update FeedbackFlyout component to enhance user feedback experience (2026-04-02).
- **0.60.2** — Update FeedbackFlyout positioning for improved responsiveness (2026-04-02).
- **0.60.1** — Update nitro.json date, refactor main.mjs exports, and clean up build files (2026-04-02).
- **0.60.0** — Add Linear API integration and update dependencies (2026-04-02).
- **0.59.1** — Refactor test configuration and remove obsolete test files (2026-04-02).
- **0.59.0** — Add chrono-node for date parsing and enhance booking logic (2026-04-02).
- **0.58.0** — Implement retry logic for AI search and booking email notifications (2026-04-02).
- **0.57.1** — Enhance booking email notification content (2026-04-02).
- **0.57.0** — Enhance chat session management and improve user experience (2026-04-02).
- **0.56.0** — Enhance booking submission process and draft management (2026-04-02).
- **0.55.1** — Refactor drafts management and enhance booking submission logging (2026-04-02).
- **0.55.0** — Update package.json and package-lock.json for Vitest integration and enhance booking flow logic (2026-03-30).
- **0.54.5** — Update nitro.json date and refactor diver name entry logic (2026-03-28).
- **0.54.4** — Update nitro.json date, refactor AI search response, and enhance chat bubble animations (2026-03-28).
- **0.54.3** — Update nitro.json date, refactor client manifest, and enhance AI search response structure (2026-03-28).
- **0.54.2** — Update nitro.json date, remove obsolete build files, and refactor client manifest (2026-03-28).
- **0.54.1** — Refactor DiveShopDetail component to streamline tab structure and enhance user experience (2026-03-28).
- **0.54.0** — Enhance booking draft management and improve user experience (2026-03-22).
- **0.53.2** — Update nitro.json date, refactor booking logic, and enhance diver field management (2026-03-22).
- **0.53.1** — Update nitro.json date, refactor build files, and enhance booking flow logic (2026-03-22).
- **0.53.0** — Enhance booking flow with course selection management (2026-03-22).
- **0.52.0** — Enhance booking flow integrity and update AI search functionality (2026-03-22).
- **0.51.6** — Update nitro.json date and remove obsolete build files (2026-03-22).
- **0.51.5** — Update profile layout for improved scrolling behavior (2026-03-22).
- **0.51.4** — Update nitro.json date and remove obsolete build files (2026-03-22).
- **0.51.3** — Update AI agent structure and remove obsolete build files (2026-03-22).
- **0.51.2** — Update AI agent structure and remove obsolete build files (2026-03-22).
- **0.51.1** — Update nitro.json date and remove obsolete build files (2026-03-21).
- **0.51.0** — Enhance sign-up process with email redirection and refactor client usage (2026-03-21).
- **0.50.0** — Enhance authentication feedback and handle duplicate sign-up scenarios (2026-03-21).
- **0.49.3** — Update nitro.json date and remove obsolete build files (2026-03-21).
- **0.49.2** — Refactor booking confirmation messages for clarity (2026-03-21).
- **0.49.1** — Update nitro.json date and remove obsolete build files (2026-03-21).
- **0.49.0** — Enhance AI agent structure and update profile diver defaults (2026-03-21).
- **0.48.7** — Update nitro.json date and remove obsolete build files (2026-03-21).
- **0.48.6** — Enhance AI agent structure and update nitro configuration (2026-03-21).
- **0.48.5** — Update nitro.json date and remove obsolete build files (2026-03-21).
- **0.48.4** — Update nitro.json date and remove obsolete build files (2026-03-21).
- **0.48.3** — Update nitro.json date and remove obsolete build files (2026-03-21).
- **0.48.2** — Update version to 0.48.0 and modify nitro.json date (2026-03-20).
- **0.48.1** — Update version to 0.48.0 and add versioning guidelines to README.md (2026-03-17).
- **0.48.0** — Enhance selectable options and rental gear interaction in index.vue (2026-03-17).
- **0.47.1** — Refactor button styles in index.vue for improved UI consistency (2026-03-17).
- **0.47.0** — Enhance booking form functionality and diver management (2026-03-17).
- **0.46.0** — Enhance booking flow with profile diver options in ai-search and bookingFastPath (2026-03-17).
- **0.45.0** — Enhance booking flow management in DiveShopDetail and ShopDetailPanel components (2026-03-17).
- **0.44.1** — Update layout and input area styles for improved responsiveness (2026-03-17).
- **0.44.0** — Enhance search cache functionality to support booking form state restoration (2026-03-17).
- **0.43.0** — Enhance DiveShopDetail and ShopDetailPanel components for improved booking flow (2026-03-17).
- **0.42.0** — Integrate draft saving functionality upon user sign-in (2026-03-17).
- **0.41.0** — Enhance booking flow and user interaction for rental gear selection (2026-03-16).
- **0.40.0** — Enhance booking flow and user interaction for dive shop selection (2026-03-16).
- **0.39.0** — Update profile page structure and enhance routing for improved navigation (2026-03-14).
- **0.38.4** — Update dive shop configuration and component structure for improved data handling and performance (2026-03-14).
- **0.38.3** — Refactor DiveShopDetail component to utilize CardInfo for displaying equipment and gas mixture information (2026-03-14).
- **0.38.2** — Refactor CardInfo and DiveShopDetail components for improved layout and styling (2026-03-14).
- **0.38.1** — Update dive shop detail component and configuration for improved data handling (2026-03-13).
- **0.38.0** — Enhance AI search functionality to extract dive shop names from user messages (2026-03-13).
- **0.37.0** — Add Resend API integration for booking emails and enhance booking flow (2026-03-13).
- **0.36.1** — Enhance CardSearchResult and AI search functionality (2026-03-08).
- **0.36.0** — Update booking flow and UI elements for improved user experience (2026-03-08).
- **0.35.0** — Implement dynamic dive site loading in BookingForm component (2026-03-08).
- **0.34.0** — Enhance booking flow with new "Done" button and improved dive site prompts (2026-03-08).
- **0.33.0** — Add rental equipment and dive site options to booking flow (2026-03-08).
- **0.32.1** — Enhance user input handling and AI response formatting (2026-03-07).
- **0.32.0** — Enhance BookingForm component to support pre-filling from chat-collected data (2026-03-07).
- **0.31.1** — Refactor CardSearchResult and index components for improved user interaction (2026-03-07).
- **0.31.0** — Enhance booking flow and pagination options in AI search (2026-03-06).
- **0.30.1** — Update AI search prompts and improve query handling (2026-03-06).
- **0.30.0** — Implement selectable options and enhance booking flow in AI search (2026-03-06).
- **0.29.6** — Enhance environment setup documentation and improve data fetching logic (2026-03-06).
- **0.29.5** — Remove outdated scuba shop CSV files for Aruba, Australia, Bahamas, Belize, Bonaire, California, Cayman Islands, Colombia, and Curacao to streamline data management and ensure up-to-date information. (2026-02-28).
- **0.29.4** — Enhance AI search logic to handle user preferences more effectively (2026-02-06).
- **0.29.3** — Refactor contact information display for improved conditional rendering (2026-02-06).
- **0.29.2** — Refactor contact information layout for improved responsiveness and consistency (2026-02-06).
- **0.29.1** — Enhance error handling and improve time formatting in components (2026-02-06).
- **0.29.0** — Implement container queries in CSS for responsive design enhancements (2026-02-06).
- **0.28.0** — Add disabled state to NavLink component and update layout for mobile menu handling (2026-01-17).
- **0.27.6** — Update button styling in shop detail page for improved visual consistency (2025-12-19).
- **0.27.5** — Refactor Card components and layout for improved consistency and responsiveness (2025-12-19).
- **0.27.4** — Refactor ShopDetailPanel layout for improved responsiveness (2025-12-19).
- **0.27.3** — Refactor CardListItem and ShopDetailPanel for improved layout and responsiveness (2025-12-19).
- **0.27.2** — Refactor contact information layout for improved responsiveness (2025-12-19).
- **0.27.1** — Update booking section visibility for improved responsiveness (2025-12-19).
- **0.27.0** — Add viewport meta tag for responsive design and adjust header height (2025-12-04).
- **0.26.4** — Update default layout for improved height handling (2025-12-04).
- **0.26.3** — Refactor layout components for improved responsiveness and styling (2025-12-04).
- **0.26.2** — Refine index page layout for improved user experience (2025-12-04).
- **0.26.1** — Enhance layout and responsiveness of index and default pages (2025-12-04).
- **0.26.0** — Add loading screen with GSAP animations to index page (2025-12-04).
- **0.25.0** — Refactor index page layout and enhance chat functionality (2025-12-04).
- **0.24.5** — Refactor theme handling and improve layout responsiveness (2025-11-22).
- **0.24.4** — Improve theme initialization logic in useTheme composable (2025-11-22).
- **0.24.3** — Remove redirect configuration from Netlify settings and delete associated redirects file (2025-11-22).
- **0.24.2** — Remove unnecessary force directive from Netlify redirect configuration (2025-11-22).
- **0.24.1** — Update Netlify configuration to change publish directory from ".output/public" to "dist" (2025-11-22).
- **0.24.0** — Add Netlify preset to Nitro configuration in nuxt.config.ts (2025-11-22).
- **0.23.3** — Sync theme state with DOM on mount to handle hydration mismatches in useTheme composable (2025-11-22).
- **0.23.2** — Update ShopDetailPanel layout for improved responsiveness (2025-11-22).
- **0.23.1** — Enhance CardSearchResult component and search page interaction (2025-11-22).
- **0.23.0** — Enhance CardSearchResult and search page functionality (2025-11-22).
- **0.22.0** — Enhance dark mode support and improve component styles (2025-11-21).
- **0.21.0** — Enhance auto-scroll functionality in search page (2025-11-21).
- **0.20.1** — Enhance search page styles and functionality (2025-11-21).
- **0.20.0** — Implement immediate theme application and enhance layout styles (2025-11-21).
- **0.19.0** — Refactor theme toggle button for improved aesthetics and functionality (2025-11-21).
- **0.18.7** — Refactor layout and styles for improved user experience (2025-11-21).
- **0.18.6** — Update Logo component and SVG assets for improved design consistency (2025-11-21).
- **0.18.5** — Refactor styles and layout for improved consistency and responsiveness (2025-11-14).
- **0.18.4** — Revamp index page layout and enhance search functionality (2025-11-07).
- **0.18.3** — Enhance application configuration and layout responsiveness (2025-11-07).
- **0.18.2** — Improve BookingForm header layout by adding overflow handling and text truncation for shop name (2025-10-24).
- **0.18.1** — Update BookingForm label for clarity on dive completion (2025-10-24).
- **0.18.0** — Enhance BookingForm with trip and diver information sections (2025-10-24).
- **0.17.0** — Enhance shop page with demo mode functionality and dynamic data display (2025-10-15).
- **0.16.0** — Enhance BookingForm with date validation and auto-sync feature (2025-10-15).
- **0.15.0** — Add height and weight fields to BookingForm for divers (2025-10-11).
- **0.14.0** — Update BookingForm to change height unit option from inches to feet and inches for improved clarity (2025-10-11).
- **0.13.1** — Update BookingForm layout for improved header height and responsiveness (2025-10-10).
- **0.13.0** — Implement mobile menu animation control and enhance layout responsiveness (2025-10-10).
- **0.12.0** — Enhance mobile menu functionality and improve layout responsiveness (2025-10-10).
- **0.11.1** — Refactor layout and improve responsiveness for shop and default pages (2025-10-10).
- **0.11.0** — Add GSAP for animations and implement booking drawer functionality (2025-10-10).
- **0.10.0** — Started on booking form (2025-10-09).
- **0.9.3** — Improved content overflow handling for better visibility on larger screens. Enhanced responsiveness of the shop page layout. Maintained overall design consistency across the site. (2025-09-26).
- **0.9.2** — Adjusted back button size for improved visibility. Enhanced responsiveness of the shop page header. Maintained overall design consistency across the site. (2025-09-26).
- **0.9.1** — Adjusted layout for main content to improve responsiveness. Updated shop page header for better text visibility. Refined tab button styles for enhanced user interaction. (2025-09-26).
- **0.9.0** — Updated sidebar navigation for improved accessibility and user interaction. Enhanced index page layout with a new search feature. Refined overall content organization for a better user experience. (2025-09-26).
- **0.8.10** — Improved error handling for scroll position management Removed unused business template page to streamline navigation Updated shop navigation to preserve scroll position (2025-09-26).
- **0.8.9** — Updated background colors for improved site aesthetics. Enhanced component borders for better visual clarity. Refined layout consistency across various sections. (2025-09-26).
- **0.8.8** — Updated layout for dive shops directory to enhance user experience. Improved content organization for better accessibility. Adjusted header design for clearer information presentation. (2025-09-26).
- **0.8.7** — Removed the database page to streamline navigation. Updated the index page layout for improved user experience. Enhanced content organization for better accessibility. (2025-09-26).
- **0.8.6** — Increased padding in the sidebar for improved content spacing. Enhanced layout consistency for a better user experience. Maintained overall design integrity across the site. (2025-09-26).
- **0.8.5** — Updated navigation styles for better text visibility and interaction. Enhanced link appearance for improved user experience. Maintained overall design consistency across the site. (2025-09-26).
- **0.8.4** — Updated sidebar layout for improved navigation and content visibility. Enhanced header design for better visual impact. Refined details section for clearer information presentation. (2025-09-26).
- **0.8.3** — Reduced gap between dive shop cards for a more compact layout. Improved visual organization in the nearby dive shops section. Enhanced user experience with better content alignment. (2025-09-25).
- **0.8.2** — Updated background color for improved site aesthetics. Refined layout for better content organization and user experience. Enhanced component structure for maintainability and clarity. (2025-09-25).
- **0.8.1** — Updated text color for improved visibility across the site. Enhanced button interaction with a clearer cursor style. Maintained existing design elements for consistency. (2025-09-19).
- **0.8.0** — Added base styles to improve text visibility across the site. Enhanced user experience with consistent text color. Maintained existing design elements for seamless integration. (2025-09-19).
- **0.7.1** — Adjusted image container height for better layout consistency. Improved visual appeal with updated design elements. Enhanced user experience with clearer shop access. (2025-09-19).
- **0.7.0** — Updated carousel to showcase dive courses instead of user reviews. Enhanced user engagement with clear course details. Improved layout for better visual appeal and organization. (2025-09-19).
- **0.6.0** — Updated carousel to display user reviews for enhanced engagement. Improved layout for better readability and responsiveness. Refactored code for maintainability and organization. (2025-09-19).
- **0.5.0** — Added a section for similar dive shops to enhance user engagement. Improved layout consistency and readability across the page. Refactored code for better maintainability and organization. (2025-09-16).
- **0.4.0** — Added read more/read less functionality for dive center details. Improved content organization for better user engagement. Enhanced readability with dynamic text display. (2025-09-15).
- **0.3.2** — Updated icon sizes for better alignment and consistency. Added truncation to the website link for improved readability. Enhanced layout for a cleaner user experience. (2025-09-14).
- **0.3.1** — Updated sidebar background color for improved visual consistency. Enhanced layout for better user experience on larger screens. Maintained responsiveness across different device sizes. (2025-09-14).
- **0.3.0** — Refactored dive destination and course displays for improved clarity. Replaced static elements with reusable components for better maintainability. Enhanced layout responsiveness across different screen sizes. (2025-09-14).
- **0.2.1** — Removed unnecessary height settings for image containers to enhance layout consistency. Improved responsiveness of image display across various screen sizes. Streamlined code for better maintainability and readability. (2025-09-14).
- **0.2.0** — Updated layout for improved responsiveness and readability on various screen sizes. Enhanced carousel functionality for better user experience during resizing. Adjusted image and container settings for optimal display. (2025-09-14).
- **0.1.6** — Removed outdated dive shop import files and SQL scripts for Aruba. Updated dive shop data in CSV format to reflect accurate country information. Added new dependency for improved icon usage in the application. (2025-09-14).
- **0.1.5** — Adjusted layout for dive shop display to enhance responsiveness. Changed width settings for better adaptability on various screens. Improved overall readability and user experience. (2025-08-23).
- **0.1.4** — Enhanced loading state for better user experience Updated data fetching settings for immediate response Ensured no server caching for dive shop data (2025-08-23).
- **0.1.3** — Updated dive shop display to improve responsiveness and readability. Changed address details to include locale and country for clarity. Ensured consistent layout with full-width elements. (2025-08-23).
- **0.1.2** — Refined the dive shops directory layout for better responsiveness. Updated table structure to enhance readability and usability. Improved styling for consistent display across devices. (2025-08-07).
- **0.1.1** — Convert table to responsive grid layout with horizontal scrolling (2025-08-07).
- **0.1.0** — Initial Nuxt minimal starter.
