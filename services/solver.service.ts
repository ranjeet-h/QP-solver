import { DocumentPickerAsset } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system'; // Import FileSystem

// Add necessary types for WebSocket handling
type WebSocketContentChunkCallback = (chunk: string) => void;
type WebSocketStatusCallback = (status: string) => void;
type WebSocketErrorCallback = (error: Event) => void;
type WebSocketCloseCallback = (event: CloseEvent) => void;

export interface SolverResponse {
  success: boolean;
  answer: string;
  creditsUsed: number;
  remainingCredits: number;
  format: 'markdown';
}

// Define the WebSocket URL and Token
// Use 10.0.2.2 for Android emulator to connect to host machine's localhost
const DEFAULT_WS_URL = "ws://10.0.2.2:8000/api/v1/pdf/ws/process";
const DEFAULT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTUwOTg4OTYsInN1YiI6InVzZXJAZXhhbXBsZS5jb20ifQ.QX9N0HxZcVQJJbKKnPDVt0K2mNeEQyACsOf04iBCcFo";

export const solverService = {
  solveQuestion: async (questionFile: DocumentPickerAsset, referenceFile: DocumentPickerAsset): Promise<SolverResponse> => {
    // Mock API call with loading delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          answer: `# Solution Overview

## Key Points from Reference Material
- First key concept from the reference book
- Second important point
- Third relevant detail

## Detailed Solution
1. **Step 1**: Initial approach
   - Detailed explanation
   - Supporting evidence from reference

2. **Step 2**: Core solution
   - Mathematical calculations
   - Logical reasoning
   \`\`\`
   Example calculation or code
   \`\`\`

3. **Step 3**: Final steps
   - Verification
   - Alternative approaches

## Conclusion
Final answer with explanation

## References
- Page 24: Core concept
- Page 56: Supporting theory`,
          creditsUsed: 5,
          remainingCredits: 95,
          format: 'markdown'
        });
      }, 3000); // 3 second delay to simulate API call
    });
  },

  // New function for WebSocket streaming
  solveQuestionStream: (
    questionFile: DocumentPickerAsset | null, 
    onContentChunk: WebSocketContentChunkCallback,
    onStatusUpdate: WebSocketStatusCallback,
    onError: WebSocketErrorCallback,
    onClose: WebSocketCloseCallback
  ): WebSocket | null => { // Return null if no file

    // Ensure we have a file URI before attempting to connect
    if (!questionFile?.uri) {
        console.error("Question file URI is missing.");
        // Invoke onError immediately if file is missing, mimicking a connection failure
        onError(new ErrorEvent('FileError', { message: 'Question file URI is missing.' }));
        return null; // Cannot proceed without a file
    }
    
    // Construct the URL with the token
    // Adjust query parameter name if needed by your backend
    const urlWithToken = `${DEFAULT_WS_URL}?token=${DEFAULT_TOKEN}`; 
                                                  
    const ws = new WebSocket(urlWithToken);

    ws.onopen = async () => { // Make onopen async to use await for file reading
      console.log('WebSocket connection opened');
      
      try {
        // 1. Send the authentication token JSON first
        console.log('Sending authentication token JSON...');
        const authMessage = JSON.stringify({ token: DEFAULT_TOKEN });
        ws.send(authMessage);
        console.log('Authentication token sent.');

        // 2. Now, fetch the file URI to get its content as binary (ArrayBuffer)
        console.log(`Fetching file content as binary from: ${questionFile!.uri}`);
        const response = await fetch(questionFile!.uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch file URI: ${response.status} ${response.statusText}`);
        }
        const fileContentArrayBuffer = await response.arrayBuffer();
        
        console.log(`File fetched successfully (${fileContentArrayBuffer.byteLength} bytes), sending ArrayBuffer...`);
        ws.send(fileContentArrayBuffer); // Send the raw ArrayBuffer
        console.log('File content (ArrayBuffer) sent.');
        
      } catch (sendError) { // Catch errors from both sending auth and file reading/sending
        console.error('Error during WebSocket open sequence (auth or file send):', sendError);
        onError(new ErrorEvent('SendError', { message: 'Failed to send authentication or file content.' }));
        ws.close(1011, 'Failed during initial send sequence'); // Internal error
      }
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const message = event.data;
        
        // Check for specific status message prefixes
        if (
            message.startsWith('[INFO]') || 
            message.startsWith('[DEBUG]') || 
            message.startsWith('[WARNING]') || 
            message.startsWith('[ERROR]')
        ) {
            console.log('Received status message:', message);
            onStatusUpdate(message); // Call the status update callback
        } 
        // Otherwise, treat as regular content (including the final "Processing complete" message)
        else {
            console.log('Received as Markdown Chunk (no completion check):', JSON.stringify(message)); 
            onContentChunk(message); // Pass content chunk
        }
      } else {
        console.warn('Received non-string WebSocket message:', event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError(error);
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      onClose(event);
    };

    return ws; // Return the WebSocket instance so it can be closed manually if needed
  }
}; 