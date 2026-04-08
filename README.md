# TogetherBooth

A cute, minimal long-distance photobooth web app where two people can take photos together from different devices.

## Features

- Create or join a session with a simple code
- Real-time camera streaming between devices
- Alternating photo taking with countdown
- Live strip building as photos are taken
- Download the final photo strip

## How to Run

1. Install dependencies: `npm install`
2. Start the signaling server: `npm run server`
3. In another terminal, start the dev server: `npm run dev`
4. Open `http://localhost:5173` in two browser tabs/windows
5. Create a session in one, join with the code in the other

## Tech Stack

- Frontend: Vite, HTML, CSS, JavaScript
- WebRTC: Simple-Peer for peer-to-peer video and data
- Signaling: WebSocket server with ws library
