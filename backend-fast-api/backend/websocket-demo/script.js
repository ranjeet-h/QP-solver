document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - WebSocket Tab
    const serverUrlInput = document.getElementById('server-url');
    const tokenInput = document.getElementById('token-input');
    const connectBtn = document.getElementById('connect-btn');
    const wsPdfInput = document.getElementById('ws-pdf-input');
    const wsFileName = document.getElementById('ws-file-name');
    const wsProcessBtn = document.getElementById('ws-process-btn');
    const connectionStatus = document.getElementById('connection-status');
    const wsResponseContainer = document.getElementById('ws-response-container');
    
    // DOM Elements - REST API Tab
    const apiUrlInput = document.getElementById('api-url');
    const apiTokenInput = document.getElementById('api-token');
    const restPdfInput = document.getElementById('rest-pdf-input');
    const restFileName = document.getElementById('rest-file-name');
    const refBookInput = document.getElementById('rest-ref-book-input');
    const refBookName = document.getElementById('rest-ref-book-name');
    const restProcessBtn = document.getElementById('rest-process-btn');
    const restResponseContainer = document.getElementById('rest-response-container');
    const restMetrics = document.getElementById('rest-metrics');
    
    // Variables
    let selectedWsFile = null;
    let selectedRestFile = null;
    let selectedRefBook = null;
    let socket = null;
    let isConnected = false;
    
    // Default values
    const DEFAULT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTQ5MTE2OTEsInN1YiI6InVzZXJAZXhhbXBsZS5jb20ifQ.GRgWUcMrVReKEMn2q_2bxONM14VBaNj5K4zime6gQqE";
    const DEFAULT_WS_URL = "ws://localhost:8000/api/v1/pdf/ws/process";
    const DEFAULT_API_URL = "http://localhost:8000/api/v1/pdf/process";
    
    // Check for token in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    // Initialize form fields with values from URL or defaults
    tokenInput.value = urlToken || DEFAULT_TOKEN;
    serverUrlInput.value = urlParams.get('url') || DEFAULT_WS_URL;
    apiTokenInput.value = urlToken || DEFAULT_TOKEN;
    apiUrlInput.value = urlParams.get('api_url') || DEFAULT_API_URL;
    
    // WebSocket handling - Connect button click
    connectBtn.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        if (!token) {
            alert('Please enter a valid JWT token');
            return;
        }
        
        const serverUrl = serverUrlInput.value.trim();
        if (!serverUrl) {
            alert('Please enter a valid server URL');
            return;
        }
        
        connectWebSocket(serverUrl, token);
    });
    
    // Auto-connect on load if both URL and token are provided
    window.onload = () => {
        const token = tokenInput.value.trim();
        const serverUrl = serverUrlInput.value.trim();
        
        if (token && serverUrl) {
            connectWebSocket(serverUrl, token);
        }
    }
    
    // WebSocket - Handle file selection
    wsPdfInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedWsFile = e.target.files[0];
            wsFileName.textContent = selectedWsFile.name;
            wsProcessBtn.disabled = !isConnected;
        } else {
            selectedWsFile = null;
            wsFileName.textContent = "No file selected";
            wsProcessBtn.disabled = true;
        }
    });
    
    // REST API - Handle file selections
    restPdfInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedRestFile = e.target.files[0];
            restFileName.textContent = selectedRestFile.name;
        } else {
            selectedRestFile = null;
            restFileName.textContent = "No file selected";
        }
    });
    
    refBookInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedRefBook = e.target.files[0];
            refBookName.textContent = selectedRefBook.name;
        } else {
            selectedRefBook = null;
            refBookName.textContent = "No file selected";
        }
    });
    
    // WebSocket - Handle process button click
    wsProcessBtn.addEventListener('click', () => {
        if (!isConnected) {
            appendToWsResponse("Not connected. Please connect first.");
            return;
        }
        
        if (selectedWsFile && selectedWsFile.type === 'application/pdf') {
            // Clear response container before new processing
            wsResponseContainer.innerHTML = '';
            
            // Send file
            sendPdfFile();
        } else {
            alert('Please select a valid PDF file');
        }
    });
    
    // REST API - Handle process button click
    restProcessBtn.addEventListener('click', async () => {
        if (!selectedRestFile) {
            alert('Please select a PDF file');
            return;
        }
        
        if (selectedRestFile.type !== 'application/pdf') {
            alert('Please select a valid PDF file');
            return;
        }
        
        const apiUrl = apiUrlInput.value.trim();
        const token = apiTokenInput.value.trim();
        
        if (!apiUrl) {
            alert('Please enter a valid API URL');
            return;
        }
        
        if (!token) {
            alert('Please enter a valid JWT token');
            return;
        }
        
        // Clear response container
        restResponseContainer.innerHTML = '';
        restMetrics.innerHTML = '';
        
        // Show loading state
        restResponseContainer.innerHTML = '<div class="loading">Processing your PDF. Please wait...</div>';
        
        // Process PDF using REST API
        await processWithRestApi(apiUrl, token);
    });
    
    // REST API - Process PDF function
    async function processWithRestApi(url, token) {
        try {
            const formData = new FormData();
            formData.append('file', selectedRestFile);
            
            if (selectedRefBook) {
                formData.append('ref_book', selectedRefBook);
            }
            
            const startTime = performance.now();
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const endTime = performance.now();
            const requestTime = ((endTime - startTime) / 1000).toFixed(2);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Display results
            restResponseContainer.innerHTML = '';
            
            // Create a div to display the solutions
            const solutionsDiv = document.createElement('div');
            solutionsDiv.innerHTML = result.solutions;
            restResponseContainer.appendChild(solutionsDiv);
            
            // Display metrics
            restMetrics.innerHTML = `
                <h3>Metrics:</h3>
                <ul>
                    <li>Request Time: ${requestTime} seconds</li>
                    <li>Upload Time: ${result.metrics.upload_time.toFixed(2)} seconds</li>
                    <li>Generation Time: ${result.metrics.generation_time.toFixed(2)} seconds</li>
                    <li>Tokens Used: ${result.metrics.token_count}</li>
                </ul>
            `;
            
        } catch (error) {
            restResponseContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            console.error('API error:', error);
        }
    }
    
    // Connect to WebSocket
    function connectWebSocket(url, token) {
        // Close existing connection if any
        if (socket) {
            socket.close();
        }
        
        // Clear previous response
        wsResponseContainer.innerHTML = '';
        appendToWsResponse(`Connecting to ${url}...`);
        
        // Update status
        updateConnectionStatus('connecting');
        
        // Create new WebSocket connection
        try {
            socket = new WebSocket(url);
            
            // WebSocket event handlers
            socket.onopen = () => {
                updateConnectionStatus('connected');
                isConnected = true;
                appendToWsResponse("Connection established. Sending authentication...");
                
                // Enable process button if file is selected
                if (selectedWsFile) {
                    wsProcessBtn.disabled = false;
                }
                
                // Send authentication token
                sendAuthToken(token);
            };
            
            socket.onmessage = (event) => {
                // Process the received HTML data
                if (event.data.includes('Ready to receive PDF file.') && selectedWsFile) {
                    appendHTMLResponse(event.data);
                    sendPdfFile();
                } else {
                    appendHTMLResponse(event.data);
                }
            };
            
            socket.onclose = (event) => {
                updateConnectionStatus('disconnected');
                isConnected = false;
                wsProcessBtn.disabled = true;
                appendToWsResponse(`Connection closed. ${event.reason ? "Reason: " + event.reason : ""}`, "system-message");
            };
            
            socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                updateConnectionStatus('disconnected');
                isConnected = false;
                wsProcessBtn.disabled = true;
                appendToWsResponse(`Error: Connection failed. Check console for details.`, "system-message");
            };
        } catch (error) {
            appendToWsResponse(`Failed to connect: ${error.message}`, "system-message");
            updateConnectionStatus('disconnected');
        }
    }
    
    // Send authentication token
    function sendAuthToken(token) {
        try {
            const authData = JSON.stringify({ token: token });
            socket.send(authData);
            appendToWsResponse("Authentication token sent", "system-message");
            console.log("Auth data sent:", { token: "***" });
        } catch (error) {
            appendToWsResponse(`Failed to send authentication: ${error.message}`, "system-message");
            console.error("Auth send error:", error);
        }
    }
    
    // Send PDF file after authentication
    function sendPdfFile() {
        appendToWsResponse("Preparing to send PDF file...", "system-message");
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const arrayBuffer = e.target.result;
                socket.send(arrayBuffer);
                appendToWsResponse(`PDF file sent (${formatBytes(arrayBuffer.byteLength)})`, "system-message");
            } catch (error) {
                appendToWsResponse(`Failed to send PDF: ${error.message}`, "system-message");
                console.error("File send error:", error);
            }
        };
        
        reader.onerror = (error) => {
            appendToWsResponse(`Failed to read PDF: ${error.message || 'Unknown error'}`, "system-message");
        };
        
        reader.readAsArrayBuffer(selectedWsFile);
    }
    
    // Helper function to format bytes
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    // Update connection status UI
    function updateConnectionStatus(status) {
        connectionStatus.className = 'status ' + status;
        connectionStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
    
    // Append regular response to the WebSocket container
    function appendToWsResponse(message, className = "") {
        console.log("Received:", message);
        
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        if (className) {
            messageElement.className = className;
        }
        wsResponseContainer.appendChild(messageElement);
        
        // Auto-scroll to bottom
        wsResponseContainer.scrollTop = wsResponseContainer.scrollHeight;
    }
    
    // Append HTML content directly
    function appendHTMLResponse(html) {
        console.log("HTML content received:", html);
        
        try {
            // For the first message, create a container for streaming content
            if (!document.getElementById('streaming-container')) {
                wsResponseContainer.innerHTML = '';
                const streamingContainer = document.createElement('div');
                streamingContainer.id = 'streaming-container';
                wsResponseContainer.appendChild(streamingContainer);
            }
            
            const streamingContainer = document.getElementById('streaming-container');
            
            // Check if content might be HTML
            const isHTML = /<[a-z][\s\S]*>/i.test(html);
            
            if (isHTML) {
                // For HTML content, create a document fragment to append
                // This avoids issues with partial HTML tags
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                // Move each node to the streaming container
                while (tempDiv.firstChild) {
                    streamingContainer.appendChild(tempDiv.firstChild);
                }
            } else {
                // For plain text, handle as a text node
                const textNode = document.createTextNode(html);
                streamingContainer.appendChild(textNode);
            }
            
            // Auto-scroll to bottom
            wsResponseContainer.scrollTop = wsResponseContainer.scrollHeight;
        } catch (error) {
            console.error("Error appending HTML:", error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = `Error displaying response: ${error.message}`;
            wsResponseContainer.appendChild(errorDiv);
        }
    }
}); 