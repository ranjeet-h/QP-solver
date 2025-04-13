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
    const rawDebugOutput = document.getElementById('raw-debug-output');
    
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
    let accumulatedMarkdown = ''; // Store incoming Markdown
    let showdownConverter = null; // To store Showdown instance
    
    // Default values
    const DEFAULT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTUwOTg4OTYsInN1YiI6InVzZXJAZXhhbXBsZS5jb20ifQ.QX9N0HxZcVQJJbKKnPDVt0K2mNeEQyACsOf04iBCcFo";
    const DEFAULT_WS_URL = "ws://localhost:8000/api/v1/pdf/ws/process";
    const DEFAULT_API_URL = "http://localhost:8000/api/v1/pdf/process";
    
    // Initialize Showdown converter
    if (window.showdown) {
        showdownConverter = new showdown.Converter({
            ghCompatibleHeaderId: true,
            parseImgDimensions: true,
            strikethrough: true,
            tables: true,
            tasklists: true,
            smoothLivePreview: true, // Good for live updates
            simpleLineBreaks: true, // GFM-style line breaks
            openLinksInNewWindow: true,
            // Add extensions here if needed later
        });
        showdownConverter.setFlavor('github'); // Use GFM flavor
        console.log("Showdown converter initialized.");
    } else {
        console.log("Showdown library not loaded!");
    }
    
    // Load MathJax for rendering math expressions
    loadMathJax();
    
    // Load Prism.js for syntax highlighting
    loadPrism();
    
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
    
    // WebSocket - Handle process button click (Clear accumulatedMarkdown)
    wsProcessBtn.addEventListener('click', () => {
        if (!isConnected) {
            appendToWsResponse("Not connected. Please connect first.", "system-message");
            return;
        }
        
        if (selectedWsFile && selectedWsFile.type === 'application/pdf') {
            wsResponseContainer.innerHTML = '';
            if (rawDebugOutput) rawDebugOutput.innerText = '';
            accumulatedMarkdown = ''; // Reset markdown buffer
            
            uploadPDF(selectedWsFile);
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
            
            // Apply syntax highlighting to code blocks
            applyCodeHighlighting(restResponseContainer);
            
            // Render math expressions
            renderMathInElement(restResponseContainer);
            
            // Display metrics
            restMetrics.innerHTML = `
                <h3>Metrics:</h3>
                <ul>
                    <li>Request Time: ${requestTime} seconds</li>
                    <li>Upload Time: ${result.metrics.upload_time?.toFixed(2) || 'N/A'} seconds</li>
                    <li>Generation Time: ${result.metrics.generation_time.toFixed(2)} seconds</li>
                    <li>Tokens Used: ${result.metrics.token_count}</li>
                </ul>
            `;
            
        } catch (error) {
            restResponseContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            console.log('API error:', error);
        }
    }
    
    // Connect to WebSocket (Clear accumulatedMarkdown)
    function connectWebSocket(url, token) {
        // Close existing connection if any
        if (socket) {
            socket.close();
        }
        
        wsResponseContainer.innerHTML = '';
        if (rawDebugOutput) rawDebugOutput.innerText = '';
        accumulatedMarkdown = ''; // Reset markdown buffer
        appendToWsResponse(`Connecting to ${url}...`, "system-message", true);
        
        // Update status
        updateConnectionStatus('connecting');
        
        // Create new WebSocket connection
        try {
            socket = new WebSocket(url);
            
            // --- START: Replaced WebSocket Handlers ---
            socket.addEventListener('open', (event) => {
                console.log('WebSocket connection established');
                updateConnectionStatus('connected');
                isConnected = true;
                appendToWsResponse("Connection established. Sending authentication...");

                // Enable process button if file is selected
                if (selectedWsFile) {
                    wsProcessBtn.disabled = false;
                }

                // Send authentication token (use existing token variable)
                const userToken = tokenInput.value.trim();
                if (userToken) {
                     try {
                        const authMessage = JSON.stringify({ token: userToken });
                        socket.send(authMessage);
                        appendToWsResponse("Authentication token sent", "system-message");
                        console.log("Auth data sent:", { token: "***" });
                    } catch (error) {
                        appendToWsResponse(`Failed to send authentication: ${error.message}`, "system-message");
                        console.log("Auth send error:", error);
                    }
                }
            });

            // Handle incoming messages
            socket.addEventListener('message', (event) => {
                const messageData = event.data;
                console.log('Message from server:', messageData);

                // --- START: Separate Status/Debug Messages from Markdown --- 
                const statusPrefixes = ['[INFO]', '[DEBUG]', '[WARNING]', '[ERROR]'];
                let isStatusMessage = false;
                for (const prefix of statusPrefixes) {
                    if (messageData.startsWith(prefix)) {
                        isStatusMessage = true;
                        break;
                    }
                }

                // Append to raw debug output (ALL messages for full log)
                if (rawDebugOutput) {
                    rawDebugOutput.innerText += messageData + '\n'; // Add newline for readability
                    // rawDebugOutput.scrollTop = rawDebugOutput.scrollHeight;
                }

                // If it's NOT a status message, treat it as Markdown content
                if (!isStatusMessage) {
                    // Accumulate ONLY Markdown message content
                    accumulatedMarkdown += messageData;
                    
                    // Render incrementally (keeps the streaming appearance)
                    renderMarkdownToHtml(accumulatedMarkdown);
                } else {
                    // Optionally, display status messages elsewhere if needed, 
                    // but for now, they are just in the raw debug output.
                    console.log("Status/Debug message handled: ", messageData); 
                }
                // --- END: Separate Status/Debug Messages from Markdown ---
            });

            // Handle errors
            socket.addEventListener('error', (event) => {
                console.log('WebSocket error:', event);
                updateConnectionStatus('disconnected');
                isConnected = false;
                wsProcessBtn.disabled = true;
                appendToWsResponse(`<div class='error'><p>WebSocket connection error</p></div>`);
            });

            // Handle connection close (This is where final rendering and formatting should happen)
            socket.addEventListener('close', (event) => {
                updateConnectionStatus('disconnected');
                isConnected = false;
                wsProcessBtn.disabled = true;
                const reason = event.reason ? `: ${event.reason}` : '';
                console.log(`WebSocket connection closed with code ${event.code}${reason}`);

                console.log("Connection closed. Rendering final Markdown one last time..."); // DEBUG
                // Ensure the very last state of markdown is rendered using the full accumulated content
                renderMarkdownToHtml(accumulatedMarkdown);

                // Append the close message distinctly AFTER final render
                appendSystemHtml(`<div class='info'><p>Connection closed${reason}</p></div>`);

                console.log("Calling triggerFinalRendering after close..."); // DEBUG
                // Apply final highlighting and MathJax to the fully rendered content
                triggerFinalRendering(); // Re-enable this call
            });
            // --- END: Replaced WebSocket Handlers ---

        } catch (error) {
            appendToWsResponse(`Failed to connect: ${error.message}`, "system-message");
            updateConnectionStatus('disconnected');
        }
    }
    
    // Function to upload a PDF file (adapted from user input)
    function uploadPDF(file) { 
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.log('WebSocket not connected');
            appendToWsResponse("<div class='error'><p>WebSocket not connected. Please connect first.</p></div>");
            return;
        }
        
        // Backend expects auth first, then binary data directly (based on previous logic)
        // We already sent auth in onopen. Now send binary.
        appendToWsResponse("Preparing to send PDF file...", "system-message");

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Send the binary data
                socket.send(e.target.result);
                appendToWsResponse(`PDF file sent (${formatBytes(e.target.result.byteLength)})`, "system-message");
            } catch (error) {
                 appendToWsResponse(`Failed to send PDF: ${error.message}`, "system-message");
                 console.log("File send error:", error);
            }
        };
        reader.onerror = (error) => {
            console.log('Error reading file:', error);
            appendToWsResponse(`<div class='error'><p>Error reading file: ${error}</p></div>`);
        };
        
        // Read file as ArrayBuffer for binary transmission
        reader.readAsArrayBuffer(file);
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
    function appendToWsResponse(message, className = "", clearFirst = false) { 
        // If clearFirst is true, ensure the container is empty
        if (clearFirst) {
             wsResponseContainer.innerHTML = '';
        }
        
        // Don't log system messages here if appendHTMLResponse also logs
        // console.log("Received (System):", message); 
        
        const messageElement = document.createElement('div');
        // Use textContent for system messages to avoid HTML injection if message somehow contains tags
        messageElement.textContent = message; 
        if (className) {
            messageElement.className = className;
        }
        wsResponseContainer.appendChild(messageElement);
        
        // Auto-scroll to bottom
        // wsResponseContainer.scrollTop = wsResponseContainer.scrollHeight;
    }
    
    // Load MathJax for rendering mathematical expressions
    function loadMathJax() {
        if (window.MathJax) {
            return; // Already loaded
        }
        
        // Add MathJax configuration
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$']], // Use $ for inline
                displayMath: [['$$', '$$']], // Use $$ for display
                processEscapes: true
            },
            options: {
                enableMenu: false,
                renderActions: {
                    addMenu: [0, '', '']
                }
            },
            startup: {
                pageReady: () => {
                    console.log('MathJax is ready');
                }
            }
        };
        
        // Load MathJax script
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        script.async = true;
        document.head.appendChild(script);
    }
    
    // Load Prism.js for syntax highlighting
    function loadPrism() {
        // Add CSS
        const prismCSS = document.createElement('link');
        prismCSS.rel = 'stylesheet';
        prismCSS.href = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css';
        document.head.appendChild(prismCSS);
        
        // Add JS
        const prismScript = document.createElement('script');
        prismScript.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js';
        document.head.appendChild(prismScript);
        
        // Add common language components
        const languages = ['javascript', 'python', 'java', 'cpp', 'csharp', 'markup', 'css', 'sql'];
        languages.forEach(lang => {
            const langScript = document.createElement('script');
            langScript.src = `https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-${lang}.min.js`;
            document.head.appendChild(langScript);
        });
    }
    
    // Apply syntax highlighting (Adjust selector)
    function applyCodeHighlighting(container) {
        // This is called AFTER Showdown creates HTML from Markdown
        setTimeout(() => {
            if (window.Prism) {
                // Showdown generates <pre><code class="language-..."> tags
                const codeBlocks = container.querySelectorAll('pre code[class*="language-"]');
                console.log(`Found ${codeBlocks.length} code blocks to highlight.`);
                
                codeBlocks.forEach(block => {
                    // Check if already highlighted by Prism
                    if (!block.classList.contains('language-none') && !block.closest('.prism-highlighted')) {
                         // --- DEBUG: Add try...catch for Prism --- 
                         try {
                             console.log("Highlighting block:", block); // DEBUG
                             Prism.highlightElement(block);
                             console.log("Highlighting successful for block."); // DEBUG
                             // Mark parent <pre> as highlighted
                             if(block.parentNode.tagName === 'PRE') {
                                 block.parentNode.classList.add('prism-highlighted');
                             }
                         } catch (e) {
                             console.log("Prism highlighting error:", e, block); // Log Prism specific error
                         }
                         // -------------------------------------
                    } else if (block.classList.contains('language-none')) {
                         console.log("Skipping Prism for language-none block.");
                    }
                });
            } else {
                console.warn("Prism not loaded when attempting to highlight.");
            }
        }, 100); 
    }
    
    // Render math expressions (Called by triggerFinalRendering)
    function renderMathInElement(container) {
        if (window.MathJax && window.MathJax.typesetPromise) {
            try {
                console.log("Starting MathJax typesetting...");
                window.MathJax.typesetPromise([container]).then(() => {
                    console.log("MathJax typesetting finished.");
                }).catch(err => {
                    console.log('MathJax typesetting error:', err);
                });
            } catch (e) {
                console.log('Error calling MathJax:', e);
            }
        } else {
             console.warn("MathJax not ready for rendering.");
        }
    }
    
    // Trigger final rendering (Calls the processing functions)
    function triggerFinalRendering() {
        const streamingContainer = document.getElementById('streaming-container');
        if (streamingContainer) {
            console.log("Triggering final rendering (Code Highlighting & MathJax)...", streamingContainer);
            // Run sequentially: first process code tags, then render math
            applyCodeHighlighting(streamingContainer); 
            // Add a slight delay before MathJax to ensure DOM is updated after code replacement
            setTimeout(() => {
                 renderMathInElement(streamingContainer);
            }, 50); 
        } else {
             console.log("Final rendering trigger: streaming container not found.");
        }
    }

    // --- NEW Function to render Markdown to HTML --- 
    function renderMarkdownToHtml(markdownText) {
        if (!showdownConverter) {
            console.log("Showdown converter not ready.");
            wsResponseContainer.innerHTML = '<p style="color: red;">Error: Markdown converter failed to load.</p>';
            return;
        }
        // --- DEBUG: Log accumulated markdown --- 
        console.log("--- Accumulated Markdown START ---");
        console.log(markdownText); 
        console.log("--- Accumulated Markdown END ---");
        // ---------------------------------------
        try {
            console.log("Converting Markdown to HTML..."); // DEBUG
            const html = showdownConverter.makeHtml(markdownText);
            console.log("Markdown conversion successful. Setting innerHTML..."); // DEBUG
            
            // Ensure the container exists (needed if called before appendHTMLResponse)
            let streamingContainer = document.getElementById('streaming-container');
            if (!streamingContainer) {
                wsResponseContainer.innerHTML = ''; 
                streamingContainer = document.createElement('div');
                streamingContainer.id = 'streaming-container';
                streamingContainer.classList.add('markdown-content'); // Use a specific class
                wsResponseContainer.appendChild(streamingContainer);
            }
            // Update the container with the fully parsed HTML
            streamingContainer.innerHTML = html;
            console.log("innerHTML set successfully."); // DEBUG
            // wsResponseContainer.scrollTop = wsResponseContainer.scrollHeight;

        } catch (error) {
            console.log("Error converting Markdown:", error);
            wsResponseContainer.innerHTML = `<p style="color: red;">Error rendering Markdown: ${error.message}</p>`;
        }
    }

    // --- NEW Function to append final non-Markdown message ---
    function appendFinalMessage(html) {
         let streamingContainer = document.getElementById('streaming-container');
         if (streamingContainer) {
             const tempDiv = document.createElement('div');
             tempDiv.innerHTML = html;
             while(tempDiv.firstChild){
                 streamingContainer.appendChild(tempDiv.firstChild);
             }
            //  wsResponseContainer.scrollTop = wsResponseContainer.scrollHeight;
         } else {
             // Fallback if container doesn't exist somehow
             wsResponseContainer.innerHTML += html;
         }
    }

    // --- RENAME appendFinalMessage to appendSystemHtml for clarity ---
    // This function is for adding HTML content that is NOT part of the markdown stream
    function appendSystemHtml(html) {
         let container = wsResponseContainer; // Append directly to the main container
         if (container) {
             const tempDiv = document.createElement('div');
             tempDiv.innerHTML = html;
             while(tempDiv.firstChild){
                 container.appendChild(tempDiv.firstChild);
             }
            //  container.scrollTop = container.scrollHeight;
         } else {
             console.log("Cannot append system HTML: wsResponseContainer not found.");
         }
    }
}); 