# لعبة تخمين الأرقام العربية

## Overview
An interactive Arabic number guessing game with a modern 2D interface. Players guess a secret number and receive feedback on their accuracy. The game supports single-player and multi-player modes with real-time WebSocket communication and mini-challenges for hints. It is designed to work seamlessly on both mobile and desktop devices, featuring full Arabic localization with a right-to-left layout. The project aims to provide an engaging and accessible gaming experience, fostering community through multi-player interactions and persistent rooms.

## User Preferences
أسلوب التواصل المفضل: لغة بسيطة وسهلة الفهم.

## System Architecture

### Frontend
- **Technology Stack**: React 18 with TypeScript, Vite for bundling, TailwindCSS for styling, Radix UI for components, Zustand for state management.
- **Rendering Strategy**: Responsive design optimized for desktop (full interface with previous attempts panel) and mobile (dedicated number pad, auto-detection at 768px).
- **Core Components**: `MobileSingleplayer`, `DesktopSingleplayer`, `MultiplayerLobby`, `MultiplayerGame2D`, `MobileMultiplayer`, various challenge components (`RainDropsChallenge`, `DirectionChallenge`, `MemoryChallenge`, `GuessChallenge`), and `CardSystem` for multi-player exclusive cards.
- **State Management**: `useNumberGame` (main game state), `useChallenges` (challenges and hints), `useCards` (card system), `useAudio` (sound effects), `useAccount` (accounts and friends with localStorage persistence).
- **Client-Server Communication**: WebSocket for real-time multi-player, localStorage for session persistence (24-hour validity) for reconnection.

### Backend
- **Technology Stack**: Express.js with TypeScript, WebSocket (ws) for real-time communication, Neon PostgreSQL with Drizzle ORM (for future use).
- **Server Structure**: `server/index.ts` (Express setup), `server/routes.ts` (WebSocket server and game logic), `server/db.ts` (DB connection), `server/storage.ts` (in-memory storage).
- **Game Logic**: Room system with unique IDs, independent and real-time play, auto-generated shared secret numbers, pre-game challenges, comprehensive reconnection system (disconnected players remain in rooms indefinitely, game data saved, rooms persist as long as players exist, game state synchronization).
- **Data Storage**: PostgreSQL via Neon with Drizzle ORM. Tables: `accounts`, `friendRequests`, `friendships`, `notifications`, `permanentRooms`, `permanentRoomMembers`. Session management tracks WebSocket connections; room state in server memory (Map); localStorage for client-side session.

### System Design Choices
- **UI/UX**: Responsive design for desktop and mobile, full Arabic localization with RTL layout, replay voting system, enhanced results screen with ranks and celebrations, waiting screen for challenge completion.
- **Technical Implementations**: Live timer with 100ms updates and 5-minute timeout, instant loss detection, robust reconnection, mini-challenges with visual/auditory feedback, unique card system (show number, burn number, reveal even/odd, freeze, shield, disable display).
- **Accounts and Friends**: Simple account creation, friend requests, room invitations, notification system with unread counts.
- **Permanent Rooms**: Persistent rooms stored in DB for 24 hours with API endpoints for creation, joining, and management.

## External Dependencies

- **UI Components**: `@radix-ui/*`, `lucide-react`
- **Database & Server**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`, `ws`
- **Styling**: `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`
- **State Management**: `@tanstack/react-query`, `zustand`
- **Media & Animation**: `@fontsource/inter`, `howler`, `react-confetti`, `framer-motion`
- **Developer Tools**: `@replit/vite-plugin-runtime-error-modal`, `tsx`, `esbuild`, `vite`