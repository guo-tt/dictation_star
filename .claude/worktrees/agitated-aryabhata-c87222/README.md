# 听写小状元 (DictationStar)

A web-based dictation and spelling practice app for Chinese and English language learners (grades K–6).

## Features

- **Dictation practice** — Chinese characters, words, and sentences organized by grade level
- **English vocabulary** — Spelling practice for English word lists
- **Parent/Student modes** — Parent mode reveals answers; student mode hides them
- **Study mode** — Preview words with pinyin, meanings, and examples before practicing
- **Progress tracking** — Per-word accuracy stats, attempt history, and error-rate filtering
- **Custom lists** — Create your own word lists and add custom words
- **Cloud sync** — Google sign-in syncs progress across devices via Firebase
- **Offline support** — All data stored locally; sync is a graceful enhancement
- **PWA / Mobile** — Installable as a standalone app; iOS support via Capacitor

## Tech Stack

- React 18 + TypeScript, built with Vite
- Tailwind CSS
- Firebase (Auth + Firestore)
- Pinyin Pro (Chinese pronunciation)
- Capacitor (iOS wrapper)

## Getting Started

### Prerequisites

- Node.js 18+

### Install & Run

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

### Build for Production

```bash
npm run build
npm run preview
```

### Docker

```bash
docker-compose up
```

## Project Structure

```
src/
├── App.tsx              # Main router and global state
├── components/          # UI components (views, modals, cards)
├── utils/
│   ├── firebase.ts      # Firebase initialization and auth
│   ├── storage.ts       # LocalStorage + Firestore read/write
│   └── cloudSync.ts     # Cloud sync orchestration
├── data/
│   └── wordLists.ts     # Preset word lists (grades 0–6)
└── types/index.ts       # TypeScript type definitions
```

## Data & Storage

Progress is stored in browser `localStorage` and synced to Firestore on user action. The app works fully offline; cloud sync is a best-effort enhancement.

| localStorage key | Contents |
|---|---|
| `dictation_v1` | Attempt records per word |
| `dictation_custom_v1` | Custom words |
| `dictation_custom_lists_v1` | Custom list metadata |
| `dictation_word_overrides_v1` | User edits to preset words |
| `dictation_hidden_lists_v1` | Hidden preset list IDs |

## Configuration

Firebase config is in [src/utils/firebase.ts](src/utils/firebase.ts). The app is pre-configured for the `dictation-star` Firebase project.

To deploy your own instance, update the `firebaseConfig` object with your own project credentials.
