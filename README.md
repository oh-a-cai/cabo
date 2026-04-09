# Cabo

A real-time multiplayer card game built with React, Node.js, and Socket.IO. Cabo is a memory and strategy card game where players try to minimize the value of their hand while keeping track of hidden cards — and knowing when to call "Cabo" to end the round.

---

## Gameplay Overview

Each player starts with **4 face-down cards**. At the beginning of the game, players are briefly shown their bottom 2 cards — so memorization starts immediately.

On each turn, a player can:
- **Draw** from the deck or the discard pile
- **Swap** the drawn card with one in their hand (discarding the replaced card)
- **Discard** the drawn card directly (triggering a card power if applicable)
- **Call Cabo** to signal they believe they have the lowest hand — ending the round after all other players take one final turn

### Card Powers

Certain discarded cards trigger special abilities:

| Card Value | Power |
|---|---|
| 7 or 8 | **Peek Self** — look at one of your own hidden cards |
| 9 or 10 | **Peek Other** — look at one of another player's hidden cards |
| Jack or Queen | **Swap** — blindly swap one of your cards with another player's card |

### Matching

At any time during the drawing or power phase, any player can attempt to **match** a card in any player's hand to the top card of the discard pile. If the ranks match:
- The matched card is removed from that player's hand
- If it was someone else's card, the matcher must give one of their own cards to that player as a penalty

A failed match attempt costs the guesser a card drawn from the deck (burn penalty, once per turn).

### Scoring & Winning

When the round ends, all cards are revealed. Each player's score is the sum of their hand's values. The player with the **lowest score wins** — but if the player who called Cabo doesn't have the lowest score, they receive a **+10 penalty**.

---

## Tech Stack

- **Frontend:** React, Tailwind CSS
- **Backend:** Node.js, Express
- **Shared:** Socket.IO, TypeScript types across client and server

---

## Project Structure

```
cabo/
├── client/          # React frontend
│   └── src/
│       ├── pages/   # MainMenu, Lobby, Game
│       └── clientSocket/
├── server/          # Node.js backend
│   └── src/
│       ├── gameEngine.ts   # Core game logic
│       └── sockets.ts      # Socket.IO event handlers
└── shared/
    └── types.ts     # Shared TypeScript types
```

---

## How to Run

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- npm

### Setup

**1. Clone the repository**
```bash
git clone https://github.com/oh-a-cai/cabo.git
```
> Clones the repo into your current directory.

**2. Navigate to the project root**
```bash
cd cabo
```

**3. Install all dependencies**
```bash
npm install
```
> Run this from the `cabo` root directory. Installs dependencies for both client and server.

**4. Start the development server**
```bash
npm run dev
```
> Run this from the `cabo` root directory. Starts both the frontend and backend simultaneously, with debug logs for both client and server.

---

### Optional: Run Client and Server Separately

If you want hot-reloading on the server without restarting the client, you can split your terminal and run each independently.

**Terminal 1 — Server (with hot reload)**
```bash
cd server
npm run dev:hot
```
> Runs only the backend. Any changes to server files will automatically restart the server.

**Terminal 2 — Client**
```bash
cd client
npm start
```
> Runs only the React frontend.

---

## License

MIT
