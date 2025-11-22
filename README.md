# Overview

This is a 3D multiplayer number guessing game built with React Three Fiber for the frontend 3D rendering and Express with WebSockets for real-time multiplayer functionality. The game supports both singleplayer (player vs robot) and multiplayer modes where players try to guess a secret 4-digit code. The game features a first-person perspective with pointer lock controls, 3D UI elements rendered in the game world, and real-time turn-based gameplay.

## Recent Changes

**2024-11-21 (Latest Update)**: Implemented comprehensive RTL (right-to-left) support and UI improvements
- Added full RTL layout support via `dir="rtl"` on App.tsx and MobileApp.tsx root elements
- Updated mobile components (MobileSingleplayer & MobileMultiplayer) for proper RTL layout:
  - Headers use `flex-row-reverse` with Home button on right, info on left
  - Attempt history displays with numbers on right, feedback on left
- Enhanced 3D AttemptsHistory to match mobile format with separate badges for correct count and position matches
- Added confirm audio feedback system with `playConfirm()` function that plays pleasant double beep on submit
- Improved audio system with Web Audio API for individual digit sounds (0-9), plus dedicated delete and error sounds
- Brightened 3D scene lighting for better visibility (walls: #e8ecf1, increased ambient light)

**2024-11-21**: Successfully imported and configured for Replit environment
- Installed all npm dependencies
- Added .gitignore for Node.js project
- Updated vite.config.ts with strictPort configuration
- Configured workflow "Start application" to run on port 5000 with webview output
- Set up deployment configuration for autoscale deployment target
- Verified application runs successfully with both frontend and backend on port 5000
- Application displays correctly with Arabic UI and 3D canvas

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**3D Rendering Engine**: Built on React Three Fiber (@react-three/fiber) with supporting libraries including @react-three/drei for helpers and @react-three/postprocessing for visual effects. The game renders a dark room environment with 3D interactive panels for number input, feedback display, and attempt history.

**State Management**: Uses Zustand stores (custom hooks pattern) for managing game state. Key stores include:
- `useNumberGame`: Manages game modes (menu, singleplayer, multiplayer), game phases, attempts, secret codes, and multiplayer room state
- `useAudio`: Handles sound effects with Web Audio API including individual digit beeps (0-9), delete sound, error sound, confirm sound, and success sound with fallback support

**UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling. The UI layer includes menu screens, lobbies, game HUD overlays, and win/lose screens that appear above the 3D canvas.

**First-Person Controls**: Custom implementation using PointerLockControls from @react-three/drei with WASD keyboard movement and mouse look. Camera pitch is clamped to prevent over-rotation.

**Interaction System**: Raycasting-based interaction through a central crosshair. Players click on 3D number buttons and controls using their gaze (center screen crosshair).

**Internationalization**: Primary language is Arabic with full RTL (right-to-left) support enabled globally via `dir="rtl"` on root elements. All UI components are designed with RTL layout including mobile headers, attempt displays, and 3D interface elements.

## Backend Architecture

**Server Framework**: Express.js with ESM module syntax. The server handles both HTTP routes and WebSocket connections on the same server instance.

**WebSocket Communication**: Uses the `ws` library for real-time bidirectional communication. The WebSocket server manages:
- Room creation and joining (up to 4 players per room)
- Player-to-player challenges within rooms
- Turn-based game sessions between two players
- Secret code submission and guess validation
- Real-time game state synchronization

**Game Logic**: Server-side validation of guesses using a `checkGuess` function that returns correct digit count and correct position count. The server maintains game sessions, tracks turns, and enforces time limits.

**Session Management**: Uses in-memory storage (MemStorage class) with Maps to track:
- Rooms (by room ID)
- Players (by WebSocket connection)
- Active game sessions within rooms

**Data Validation**: Implements guess checking algorithm that handles repeated digits correctly by marking matched positions to avoid double-counting.

## Data Storage

**Database ORM**: Drizzle ORM configured for PostgreSQL via @neondatabase/serverless driver. Schema defines a basic users table with username and password fields.

**Schema Location**: Database schema defined in `shared/schema.ts` using Drizzle's declarative API with Zod validation schemas.

**Migration Strategy**: Uses Drizzle Kit with migrations output to `./migrations` directory. The `db:push` script directly pushes schema changes without generating migration files.

**Storage Abstraction**: IStorage interface defines CRUD operations for users. Currently implemented with MemStorage (in-memory Map-based storage), designed to be swappable with a real database implementation.

## External Dependencies

**Database**: Neon PostgreSQL serverless database (configured via DATABASE_URL environment variable). The application uses Drizzle ORM with the Neon serverless driver for database connectivity.

**UI Component Library**: Radix UI provides accessible, unstyled component primitives for dialogs, dropdowns, menus, tooltips, and other interactive elements.

**3D Graphics**: Three.js (via React Three Fiber wrapper) for WebGL rendering. GLSL shader support enabled via vite-plugin-glsl for custom shader materials.

**Styling**: Tailwind CSS with PostCSS for utility-first styling. Custom theme extends Tailwind with CSS variables for color system and border radius values.

**Build Tools**: 
- Vite for frontend development server and production builds
- esbuild for server-side bundling in production
- tsx for running TypeScript in development

**Font Loading**: Uses @fontsource/inter for typography with font files served from the public directory.

**Real-time Communication**: WebSocket protocol for multiplayer features including room management, player matching, and turn-based gameplay synchronization.

**Audio System**: 
- Web Audio API-based beep generation with frequency mapping for digits 0-9 (similar to DTMF tones)
- Individual sound effects: digit input (frequency-mapped), delete (300 Hz), error (dissonant double beep), confirm (pleasant double beep at 1200/1400 Hz)
- Success sound (success.mp3) with ascending tone fallback (C-E-G progression)
- All sounds respect mute state via `useAudio` store
- Browser fallback support with try/catch for unsupported AudioContext