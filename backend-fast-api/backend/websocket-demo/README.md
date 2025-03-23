# PDF Processing WebSocket Demo

This is a simple demo application that connects to a FastAPI WebSocket endpoint to process PDF files using Google's Gemini AI.

## Setup

1. Make sure your FastAPI backend is running (typically on `localhost:8000`)
2. Open `index.html` in a web browser
3. Enter your server URL and authentication token (or use the defaults)
4. Click "Connect" to establish the WebSocket connection
5. Select a PDF file using the "Choose PDF File" button
6. Click "Process PDF" to start the processing

## Features

- **Configurable Connection**: Set the WebSocket server URL and authentication token
- **Live Connection Status**: Visual indicator for connection state
- **Real-time Processing**: Stream responses directly from the server
- **URL Parameters**: Pass token and server URL via URL parameters (e.g., `?token=xxxx&url=ws://...`)

## How it works

1. When you click "Connect", the application will:
   - Connect to the specified WebSocket endpoint
   - Send the authentication token
   - Wait for the server to respond

2. After successful authentication, the server will send "Ready to receive PDF file."

3. When you click "Process PDF", the application will:
   - Read the PDF file
   - Send it to the server
   - Display the streaming responses from the server

## Token Generation

You can use the included `generate_token.py` script to create a valid JWT token:

```bash
python3 generate_token.py --email="user@example.com" --secret="your-secret-key" --days=30
```

## Troubleshooting

If you encounter connection issues:
1. Check the browser's console for error messages
2. Refer to the debugging guide in `debugging-guide.md`
3. Verify that the token is valid (not expired)
4. Ensure the WebSocket server URL is correct 