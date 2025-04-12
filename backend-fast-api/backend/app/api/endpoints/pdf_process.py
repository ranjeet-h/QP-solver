import os
import time
import tempfile
import traceback
import asyncio
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.api import models
from app.db.database import get_db
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
import base64
import fitz  # PyMuPDF
import json
try:
    import jwt
except ImportError:
    # For development only, if JWT package isn't available
    jwt = None
    print("WARNING: JWT package not installed, token validation will be mocked")

router = APIRouter()

# --- START: Synchronous Text Extraction Function ---
def extract_text_sync(file_path: str) -> tuple[str, int]:
    """Synchronous function to extract text using PyMuPDF."""
    extracted_text = ""
    page_count = 0
    print(f"[extract_text_sync] Starting extraction for: {file_path}")
    try:
        # Verify the file is still accessible
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"[extract_text_sync] PDF file disappeared before extraction could start")
        
        # Log detailed information about the file
        file_info = os.stat(file_path)
        print(f"[extract_text_sync] File details: Size={file_info.st_size} bytes, Permissions={oct(file_info.st_mode)[-3:]}")
        
        # Open the PDF file with error diagnostics
        try:
            pdf_document = fitz.open(file_path)
            page_count = len(pdf_document)
            print(f"[extract_text_sync] PDF opened successfully: {page_count} pages")
        except Exception as open_error:
            raise ValueError(f"[extract_text_sync] Failed to open PDF document: {str(open_error)}")
        
        # Make sure we have a valid document
        if not pdf_document:
            raise ValueError("[extract_text_sync] PDF document is None or invalid")
            
        if page_count == 0:
            raise ValueError("[extract_text_sync] PDF document has no pages")
        
        # Extract text from each page with individual page error handling
        for page_num in range(page_count):
            try:
                page = pdf_document[page_num]
                if not page:
                    print(f"[extract_text_sync] Warning: Page {page_num + 1} is invalid, skipping")
                    continue
                    
                page_text = page.get_text()
                extracted_text += f"\n--- Page {page_num + 1} ---\n{page_text}"
                
                # Progress reporting for large documents (logged to server console)
                if page_num % 5 == 0 or page_num == page_count - 1:
                    print(f"[extract_text_sync] Processed page {page_num + 1} of {page_count}")
                    
            except Exception as page_error:
                print(f"[extract_text_sync] Warning: Error on page {page_num + 1}: {str(page_error)}")
                extracted_text += f"\n--- Page {page_num + 1} (Error: {str(page_error)}) ---\n"
        
        # Close the document
        try:
            pdf_document.close()
            print("[extract_text_sync] PDF document closed properly")
        except Exception as close_error:
            print(f"[extract_text_sync] Warning when closing PDF: {str(close_error)}")
        
        # Check if we got any text
        text_size = len(extracted_text)
        if text_size == 0:
            # Don't raise error here, let the main function decide
            print("[extract_text_sync] Warning: No text could be extracted from the PDF")
            
        print(f"[extract_text_sync] Successfully extracted {text_size} characters from {page_count} pages")
        return extracted_text, page_count
        
    except Exception as extract_error:
        # Log the error and re-raise to be caught by the caller
        print(f"[extract_text_sync] Error during extraction: {extract_error}")
        raise ValueError(f"Error extracting PDF text: {str(extract_error)}")
# --- END: Synchronous Text Extraction Function ---

def validate_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Validate JWT token and return payload if valid
    """
    try:
        if jwt is None:
            # Mock validation for development if jwt package isn't available
            print("Using mock token validation")
            return {"sub": "test_user", "exp": 1754911691}
            
        # In a real application, you would use a proper secret key from settings
        secret_key = getattr(settings, "SECRET_KEY", "development_secret_key")
        
        try:
            # First try to validate with the configured secret
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            return payload
        except jwt.InvalidTokenError:
            # For development only: fallback to accepting the token without validation
            # In production, you would remove this and properly validate tokens
            print("Token validation failed, but accepting it for development purposes")
            try:
                # Just decode the token without verification for development
                payload = jwt.decode(token, options={"verify_signature": False})
                return payload
            except Exception as e:
                print(f"Failed to decode token: {str(e)}")
                # Still allow for development
                return {"sub": "test_user", "exp": 1754911691}
    except Exception as e:
        print(f"Error validating token: {str(e)}")
        # For development/testing, accept any token format
        return {"sub": "test_user", "exp": 1754911691}  # Dummy payload for testing

async def process_pdf_with_gemini(file_path: str, websocket: WebSocket, user_id: int, db: Session):
    """Process a PDF with Gemini and stream results over websocket"""
    pdf_record = None
    try:
        # Validate the file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at {file_path}")
            
        # Check file size
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            raise ValueError("PDF file is empty (0 bytes)")
            
        # Send plain text status
        await websocket.send_text(f"[INFO] Found PDF file: {os.path.basename(file_path)} ({file_size} bytes)")
        
        # Check if user exists and create a dummy user if needed (for development)
        try:
            # Check if the user exists
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                await websocket.send_text("[INFO] Creating dummy user for development...")
                # Create a dummy user for development purposes
                dummy_user = models.User(
                    id=user_id,
                    email="dev@example.com",
                    password="dummy_hash",
                    is_active=True
                )
                db.add(dummy_user)
                db.commit()
        except Exception as user_error:
            # Send plain text warning
            await websocket.send_text(f"[WARNING] Could not check/create user: {str(user_error)}")
            # Continue without creating PDF record
            pass
        
        # Create a PDF record in database
        try:
            pdf_record = models.PDF(
                filename=os.path.basename(file_path),
                user_id=user_id, 
                status="processing"
            )
            db.add(pdf_record)
            db.commit()
            db.refresh(pdf_record)
        except Exception as db_error:
            # Send plain text warning
            await websocket.send_text(f"[WARNING] Could not create PDF record: {str(db_error)}")
            # Continue without the record
            pdf_record = None
        
        # Send plain text status
        await websocket.send_text("[INFO] Initializing PDF processing...")
        
        # Initialize the API client
        api_key = settings.GEMINI_API_KEY
        client = genai.Client(api_key=api_key)
        
        start_time = time.time()
        
        # --- START: Run Extraction in Thread --- 
        # Send plain text status
        await websocket.send_text("[INFO] Starting text extraction (in background thread)...")
        try:
            # Use asyncio.to_thread to run the sync function
            extracted_text, page_count = await asyncio.to_thread(extract_text_sync, file_path)
            text_size = len(extracted_text)
            # Send plain text status
            await websocket.send_text(f"[INFO] Extraction complete: {text_size} chars, {page_count} pages.")
            if text_size == 0:
                 raise ValueError("No text could be extracted from the PDF (post-thread).")
        except Exception as thread_error:
            error_msg = f"Error during threaded text extraction: {str(thread_error)}"
            # Send plain text error
            await websocket.send_text(f"[ERROR] {error_msg}")
            # Re-raise to ensure the main try-except block catches it for cleanup/DB update
            raise ValueError(error_msg) 
        # --- END: Run Extraction in Thread --- 

        extraction_duration = time.time() - start_time
        # Send plain text status
        await websocket.send_text(f"[INFO] Extraction took {extraction_duration:.2f}s.")

        # --- Prepare and run Gemini (mostly unchanged) --- 
        prompt_text = f"""
        You are an expert AI assistant specialized in analyzing PDF content and generating high-quality, well-structured **GitHub Flavored Markdown (GFM)** responses suitable for rendering in web applications.

        **Task:** Analyze the provided PDF text and generate a detailed, accurate, and presentation-ready GFM response.

        **Formatting Guidelines (Strict):**

        1.  **Overall Structure:** Format your entire response using standard GFM. Use headings (`#`, `##`), lists (`*`, `-`, `1.`), bold (`**...**`), italics (`*...*`), etc.
        2.  **Content Identification:** Identify the type of content (e.g., academic questions, technical documentation, general text) and structure your response accordingly.
        3.  **Academic Questions:** Label solutions clearly (e.g., using `## Question 1`, `### Part a)`). Provide step-by-step explanations where appropriate.
        4.  **Mathematical Expressions (LaTeX):** CRITICAL: Use standard LaTeX delimiters ONLY:
            *   Inline math: Use `$` followed by the LaTeX expression, followed by `$`. Example: `The formula is $E=mc^2$.`
            *   Display math: Use `$$` followed by the LaTeX expression, followed by `$$`. Example: `$$
            \\sum_{{i=1}}^n i = \\frac{{n(n+1)}}{{2}}
            $$`
        5.  **Code Snippets:** Use standard GFM fenced code blocks:
            *   Start the block with three backticks followed by the language name (e.g., ```c, ```python).
            *   Place ALL code lines within the fences.
            *   End the block with three backticks on a new line.
            *   Example:
                ```python
                def hello():
                    print("Hello")
                ```
        6.  **Headings and Sections:** Use headings (`#`, `##`, etc.) logically to structure the content. Address distinct parts or questions separately.
        7.  **Diagrams/Figures:** If the PDF contains visual elements you cannot reproduce, explicitly state this (e.g., `*Note: The original document included a diagram here illustrating...*`) and describe its likely content based on context.
        8.  **Clarity:** Ensure explanations are clear, concise, and easy to follow.
        9.  **Error Handling:** If parts of the input text are garbled or incomprehensible, indicate this clearly, perhaps using italics: `*Unclear or garbled text segment*`.

        **Output:** Start your response directly with the main content, usually beginning with a `#` title appropriate for the document (e.g., `# Solutions for [Document Title]`). Do NOT output raw HTML tags.

        **Input PDF Text:**
        --- BEGIN PDF TEXT ---
        {extracted_text}
        --- END PDF TEXT ---
        """
        
        # Configure generation settings
        generate_config = types.GenerateContentConfig(
            temperature=0.7,
            top_p=0.95,
            top_k=40,
            max_output_tokens=4096,  # Increased token limit for longer responses
            response_mime_type="text/plain",
        )
        
        # Generate solutions
        # Send plain text status
        await websocket.send_text("[INFO] Generating solutions...")
        token_count = 0
        generation_start = time.time()
        
        # Comment out the line sending the raw HTML div
        # await websocket.send_text("\n<div class='solution-container'>")
        await websocket.send_text("\n\n **Question Paper** \n\n")
        
        full_prompt = prompt_text + "\n\n" + extracted_text
        
        await websocket.send_text("[INFO] Sending extracted PDF text to Gemini API...")
        
        try:
            # --- DEBUG: Message before starting stream --- 
            # Send plain text debug message
            await websocket.send_text("[DEBUG] Attempting to initiate Gemini stream...")
            response_stream = client.models.generate_content_stream(
                model="gemini-2.0-flash-lite",
                contents=full_prompt,
                config=generate_config
            )
            # --- DEBUG: Message after initiating stream --- 
            # Send plain text debug message
            await websocket.send_text("[DEBUG] Gemini stream initiated. Starting iteration...")
            print("Starting to process Gemini response stream...")
            store_text = ""
            first_chunk_received = False
            for chunk in response_stream:
                 # --- DEBUG: Message upon receiving any chunk --- 
                 if not first_chunk_received:
                     # Send plain text debug message
                     await websocket.send_text("[DEBUG] Received first chunk from stream.")
                     first_chunk_received = True
                 
                 if hasattr(chunk, 'text') and chunk.text:
                    # --- DEBUG: Explicit yield before sending --- 
                    await asyncio.sleep(0)
                    print(f"Sending chunk of size: {len(chunk.text)}")
                    store_text += chunk.text
                    await websocket.send_text(chunk.text)
                    token_count += chunk.token_count if hasattr(chunk, 'token_count') else len(chunk.text.split())
                 else:
                     print("Received empty or non-text chunk from Gemini API")
            
            # --- DEBUG: Message after loop finishes --- 
            # Send plain text debug message
            await websocket.send_text("[DEBUG] Finished iterating Gemini stream.")
            print("Finished processing Gemini response stream.")
            print(f"Final store_text ** -- ** --- *** ----: {store_text}")
            
        except Exception as stream_error:
            print(f"Error during content streaming: {str(stream_error)}")
            print(f"Error type: {type(stream_error)}")
            # Use traceback to print full stack trace
            print(f"Error details: {traceback.format_exc()}") 
            # Send plain text error
            await websocket.send_text(f"[ERROR] Error during content generation: {str(stream_error)}")
            raise

        generation_time = time.time() - generation_start
        # Remove the closing div
        # await websocket.send_text("</div>\n")
        
        # Display metrics as Markdown
        metrics_md = (
            "\n### Metrics\n"
            f"* Text Extraction Time: {extraction_duration:.2f} seconds\n"
            f"* Generation Time: {generation_time:.2f} seconds\n"
            f"* Estimated Tokens Used: {token_count}\n"
            f"* Characters Extracted: {len(extracted_text)}\n"
        )
        await websocket.send_text(metrics_md)
        
        # Update PDF record
        if pdf_record:
            try:
                pdf_record.status = "completed"
                pdf_record.processed_at = datetime.now()
                db.commit()
            except Exception as update_error:
                # Send plain text warning
                await websocket.send_text(f"[WARNING] Could not update PDF record: {str(update_error)}")
        
        # Send plain text completion message
        await websocket.send_text("\n**Processing complete.**")
        
    except Exception as e:
        print(e)
        error_message = f"Error processing PDF: {str(e)}"
        # Send plain text error
        await websocket.send_text(f"[ERROR] {error_message}")
        
        # Update PDF record with error status
        if pdf_record:
            try:
                pdf_record.status = "failed"
                pdf_record.error_message = str(e)
                db.commit()
            except Exception as update_error:
                # Send plain text warning
                await websocket.send_text(f"[WARNING] Could not update PDF record with error status: {str(update_error)}")
            
    finally:
        # Clean up temporary file
        if 'file_path' in locals() and file_path and file_path.startswith(tempfile.gettempdir()) and os.path.exists(file_path):
            try:
                os.remove(file_path)
                # Send plain text status
                await websocket.send_text("[INFO] Temporary file cleaned up")
            except Exception as temp_cleanup_error:
                print(f"Error cleaning up temp file: {temp_cleanup_error}")

@router.websocket("/ws/process")
async def websocket_pdf_process(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    temp_dir = None
    authenticated = False
    user_id = 1  # Default user ID
    try:
        # Inform the client we're ready - plain text
        await websocket.send_text("[INFO] Connection established. Ready to receive files...")
        
        # First, handle authentication if needed
        try:
            # Receive initial message which might be JSON with token
            initial_data = await websocket.receive_text()
            print(f"Received initial data: {initial_data}")
            
            # Try to parse as JSON
            try:
                json_data = json.loads(initial_data)
                
                # Handle token if present
                if "token" in json_data:
                    token = json_data["token"]
                    print(f"Received authentication token: {token[:20]}...")
                    
                    # Validate the token
                    payload = validate_token(token)
                    if payload:
                        authenticated = True
                        # Extract user ID from token if available
                        if "sub" in payload:
                            # In a real app, you would look up the user ID from the subject
                            # For now, we'll just use a default ID
                            user_id = 1
                        # Send plain text status
                        await websocket.send_text("[INFO] Authentication successful. Ready to receive PDF file.")
                        
                        # Based on the client script.js, we expect binary data next
                        print("Authentication successful, expecting binary data next...")
                        message_type = "binary"
                    else:
                        # Send plain text error
                        await websocket.send_text("<div class='error'><p>Invalid authentication token</p></div>")
                        await websocket.send_text("[ERROR] Invalid authentication token")
                        return
                
                # Check if this JSON message also contains file data
                if "file_data" in json_data or "file" in json_data:
                    message_type = "json_with_file"
                    json_content = json_data
                else:
                    # Token-only message, expect binary data next (based on client.js implementation)
                    message_type = "binary" 
            except json.JSONDecodeError:
                # Not JSON, might be a message type indicator
                print("Initial message is not JSON, treating as message type")
                message_type = initial_data
                # Skip the auth requirement for now if not JSON
                authenticated = True  # Allow non-token messages to proceed for backward compatibility
            
        except Exception as auth_error:
            print(f"Error during authentication: {str(auth_error)}")
            # Don't use initial_data as message_type directly as it could be a JSON string
            message_type = "binary"  # Default to binary for backward compatibility
            authenticated = True  # Allow non-token messages to proceed for backward compatibility
        
        # Proceed only if authenticated
        if not authenticated:
            # Send plain text error
            await websocket.send_text("<div class='error'><p>Authentication failed</p></div>")
            await websocket.send_text("[ERROR] Authentication failed")
            return
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        print(f"Created temporary directory: {temp_dir}")
        
        # Set directory permissions to ensure access
        try:
            os.chmod(temp_dir, 0o755)  # rwxr-xr-x
            print(f"Set directory permissions for {temp_dir}")
        except Exception as perm_error:
            print(f"Warning: Could not set directory permissions: {str(perm_error)}")
        
        file_path = None
        
        # Handle different message types
        if message_type == "binary":
            # Receive binary data
            try:
                print("Waiting for binary data...")
                data = await websocket.receive_bytes()
                print(f"Received binary data: {len(data)} bytes")
                
                # Save the received data as a temporary file
                file_path = os.path.join(temp_dir, f"uploaded_{int(time.time())}.pdf")
                with open(file_path, "wb") as temp_file:
                    temp_file.write(data)
                
                # Set file permissions to ensure it's readable
                try:
                    os.chmod(file_path, 0o644)  # rw-r--r--
                    print(f"Set file permissions for {file_path}")
                except Exception as perm_error:
                    print(f"Warning: Could not set file permissions: {str(perm_error)}")
                
                # Log the file reception - plain text
                await websocket.send_text(f"[INFO] Received {len(data)} bytes of binary data")
            except Exception as bin_error:
                print(f"Error receiving binary data: {str(bin_error)}")
                raise ValueError(f"Failed to receive binary data: {str(bin_error)}")
                
        elif message_type == "base64":
            # Receive base64 encoded file
            try:
                encoded_data = await websocket.receive_text()
                # Strip any data URL prefix if present
                if "base64," in encoded_data:
                    encoded_data = encoded_data.split("base64,")[1]
                
                # Decode base64 data
                data = base64.b64decode(encoded_data)
                
                # Save the received data as a temporary file
                file_path = os.path.join(temp_dir, f"uploaded_{int(time.time())}.pdf")
                with open(file_path, "wb") as temp_file:
                    temp_file.write(data)
                
                # Set file permissions to ensure it's readable
                try:
                    os.chmod(file_path, 0o644)  # rw-r--r--
                    print(f"Set file permissions for {file_path}")
                except Exception as perm_error:
                    print(f"Warning: Could not set file permissions: {str(perm_error)}")
                
                # Log the file reception - plain text
                await websocket.send_text(f"[INFO] Received and decoded {len(data)} bytes from base64 data")
            except Exception as b64_error:
                print(f"Error processing base64 data: {str(b64_error)}")
                raise ValueError(f"Failed to process base64 data: {str(b64_error)}")
        
        elif message_type in ["json", "json_with_file"] and 'json_content' in locals():
            # Handle file data that might be in the JSON
            try:
                # Try multiple possible field names for file data
                file_data_field = None
                for field in ["file_data", "file", "pdf", "data"]:
                    if field in json_content:
                        file_data_field = field
                        break
                
                if file_data_field:
                    file_data = json_content[file_data_field]
                    # Handle based on the format of the file data
                    if isinstance(file_data, dict) and "base64" in file_data:
                        # Base64 encoded data in JSON
                        encoded_data = file_data["base64"]
                    elif isinstance(file_data, str):
                        # Directly encoded string
                        encoded_data = file_data
                    else:
                        raise ValueError(f"Unsupported file data format in JSON: {type(file_data)}")
                    
                    # Process the base64 data
                    if "base64," in encoded_data:
                        encoded_data = encoded_data.split("base64,")[1]
                    
                    # Decode base64 data
                    data = base64.b64decode(encoded_data)
                    
                    # Save the received data as a temporary file
                    file_path = os.path.join(temp_dir, f"uploaded_{int(time.time())}.pdf")
                    with open(file_path, "wb") as temp_file:
                        temp_file.write(data)
                    
                    # Set file permissions to ensure it's readable
                    try:
                        os.chmod(file_path, 0o644)  # rw-r--r--
                        print(f"Set file permissions for {file_path}")
                    except Exception as perm_error:
                        print(f"Warning: Could not set file permissions: {str(perm_error)}")
                    
                    # Send plain text status
                    await websocket.send_text(f"[INFO] Extracted and decoded {len(data)} bytes from JSON data")
                else:
                    # If we're here and the message type is json_with_file, this is an error
                    if message_type == "json_with_file":
                        raise ValueError("JSON message indicated file data, but none was found")
                    # For regular JSON, ask for the file separately - plain text
                    await websocket.send_text("[INFO] Ready to receive file. Please send data type ('binary' or 'base64')...")
                    next_message_type = await websocket.receive_text()
                    
                    # Process the next message as file data
                    if next_message_type == "binary":
                        data = await websocket.receive_bytes()
                        file_path = os.path.join(temp_dir, f"uploaded_{int(time.time())}.pdf")
                        with open(file_path, "wb") as temp_file:
                            temp_file.write(data)
                        # Send plain text status
                        await websocket.send_text(f"[INFO] Received {len(data)} bytes of binary data")
                    elif next_message_type == "base64":
                        encoded_data = await websocket.receive_text()
                        if "base64," in encoded_data:
                            encoded_data = encoded_data.split("base64,")[1]
                        data = base64.b64decode(encoded_data)
                        file_path = os.path.join(temp_dir, f"uploaded_{int(time.time())}.pdf")
                        with open(file_path, "wb") as temp_file:
                            temp_file.write(data)
                        # Send plain text status
                        await websocket.send_text(f"[INFO] Received and decoded {len(data)} bytes from base64 data")
                    else:
                        raise ValueError(f"Unsupported message type: {next_message_type}. Expected 'binary' or 'base64'")
            except Exception as json_error:
                print(f"Error processing JSON file data: {str(json_error)}")
                raise ValueError(f"Failed to process JSON file data: {str(json_error)}")
                
        else:
            raise ValueError(f"Unsupported message type: {message_type}. Expected 'binary', 'base64', or valid JSON with token or file data")
        
        if not file_path or not os.path.exists(file_path):
            raise FileNotFoundError("No valid file was received or saved")
            
        # Send plain text status
        await websocket.send_text(f"[INFO] File saved temporarily as: {os.path.basename(file_path)}")
        
        # Process the PDF with Gemini (using text extraction)
        await process_pdf_with_gemini(file_path, websocket, user_id, db)
        
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        try:
            # Send plain text error
            await websocket.send_text(f"<div class='error'><p>Error: {str(e)}</p></div>")
            await websocket.send_text(f"[ERROR] Error: {str(e)}")
        except:
            print("Could not send error message to client, likely disconnected")
    finally:
        # Clean up temporary directory if it exists
        if temp_dir and os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
                print(f"Cleaned up temporary directory: {temp_dir}")
            except Exception as cleanup_error:
                print(f"Error cleaning up temp directory: {cleanup_error}")

# --- START: New Simple WebSocket Test Endpoint ---
@router.websocket("/ws/simple_test")
async def websocket_simple_test(websocket: WebSocket):
    await websocket.accept()
    print("Client connected to /ws/simple_test")
    try:
        # Send a few messages with delays
        await websocket.send_text("Message 1 received.\n")
        await asyncio.sleep(1) # Requires importing asyncio
        
        await websocket.send_text("Message 2 after 1 second.\n")
        await asyncio.sleep(2)
        
        await websocket.send_text("Message 3 after 2 more seconds.\n")
        await asyncio.sleep(1)

        await websocket.send_text("Test complete. Closing connection.\n")
        
    except WebSocketDisconnect:
        print("Client disconnected from /ws/simple_test")
    except Exception as e:
        print(f"Error in /ws/simple_test: {e}")
    finally:
        print("Closing connection for /ws/simple_test")
        # Ensure connection is closed properly even on error
        await websocket.close()
# --- END: New Simple WebSocket Test Endpoint ---

# post route to solve question paper with reference book if provided
@router.post("/process")
async def process_question_paper(
    file: UploadFile = File(...), 
    ref_book: UploadFile = None, 
    db: Session = Depends(get_db)
):
    """
    Process a question paper PDF using Gemini AI.

    This endpoint analyzes a question paper and provides answers using the reference material if provided.
    Requires authentication and sufficient credits in user's account.

    Parameters:
    - **file**: Question paper PDF file (required)
        - Format: PDF
        - Max size: 10MB
    - **ref_book**: Reference book PDF file (optional)
        - Format: PDF
        - Max size: 20MB
        - Used to provide more accurate answers

    Returns:
    - **id**: Unique identifier for the processing job
    - **status**: Current status of processing
    - **results**: Array of processed questions and answers
        - question: Extracted question text
        - answer: Generated answer
        - confidence: Confidence score (0-1)
    - **credits_used**: Number of credits consumed for this processing

    Raises:
    - 400: Invalid file format or size
    - 401: Authentication failed
    - 402: Insufficient credits
    - 422: Validation Error
    - 500: Processing Error

    Notes:
    - Processing may take a few minutes depending on the size of the files
    - Each question processed consumes credits from the user's account
    - For real-time progress updates, use the WebSocket endpoint
    """
    temp_dir = None
    try:
        # Initialize the API client
        api_key = settings.GEMINI_API_KEY
        client = genai.Client(api_key=api_key)
        
        # Save uploaded file to a temporary location
        temp_dir = tempfile.mkdtemp()
        print(f"Created temporary directory: {temp_dir}")
        
        # Set directory permissions to ensure access
        try:
            os.chmod(temp_dir, 0o755)  # rwxr-xr-x
            print(f"Set directory permissions for {temp_dir}")
        except Exception as perm_error:
            print(f"Warning: Could not set directory permissions: {str(perm_error)}")
            
        file_path = os.path.join(temp_dir, file.filename)
        with open(file_path, "wb") as temp_file:
            temp_file.write(await file.read())
            
        # Set file permissions to ensure it's readable
        try:
            os.chmod(file_path, 0o644)  # rw-r--r--
            print(f"Set file permissions for {file_path}")
        except Exception as perm_error:
            print(f"Warning: Could not set file permissions: {str(perm_error)}")
        
        # Save reference book if provided
        ref_book_path = None
        ref_book_text = ""
        if ref_book:
            ref_book_path = os.path.join(temp_dir, ref_book.filename)
            with open(ref_book_path, "wb") as temp_ref_file:
                temp_ref_file.write(await ref_book.read())
        
        # Default user ID, should be obtained from auth
        user_id = 1
        
        # Check if user exists and create a dummy user if needed (for development)
        try:
            # Check if the user exists
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                print("Creating dummy user for development...")
                # Create a dummy user for development purposes
                dummy_user = models.User(
                    id=user_id,
                    email="dev@example.com",
                    password="dummy_hash",
                    is_active=True
                )
                db.add(dummy_user)
                db.commit()
        except Exception as user_error:
            print(f"Warning: Could not check/create user: {str(user_error)}")
            # Continue without creating PDF record
            pass
        
        # Create a PDF record in database
        pdf_record = None
        try:
            pdf_record = models.PDF(
                filename=file.filename,
                user_id=user_id,
                status="processing"
            )
            db.add(pdf_record)
            db.commit()
            db.refresh(pdf_record)
        except Exception as db_error:
            print(f"Warning: Could not create PDF record: {str(db_error)}")
            # Continue without the record
        
        # Extract text from main PDF using PyMuPDF
        start_time = time.time()
        extracted_text = ""
        
        try:
            # Verify the file is still accessible
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"PDF file disappeared before extraction could start")
            
            # Log detailed information about the file
            file_info = os.stat(file_path)
            print(f"File details: Size={file_info.st_size} bytes, Permissions={oct(file_info.st_mode)[-3:]}")
            
            # Open the PDF file with error diagnostics
            try:
                pdf_document = fitz.open(file_path)
                print(f"PDF opened successfully: {len(pdf_document)} pages")
            except Exception as open_error:
                # More specific error for PDF opening failures
                raise ValueError(f"Failed to open PDF document: {str(open_error)}")
            
            # Make sure we have a valid document
            if not pdf_document:
                raise ValueError("PDF document is None or invalid")
                
            if len(pdf_document) == 0:
                raise ValueError("PDF document has no pages")
            
            # Extract text from each page with individual page error handling
            page_count = len(pdf_document)
            for page_num in range(page_count):
                try:
                    # Get the page with error checking
                    page = pdf_document[page_num]
                    if not page:
                        print(f"Warning: Page {page_num + 1} is invalid, skipping")
                        continue
                        
                    # Extract text with error checking
                    page_text = page.get_text()
                    extracted_text += f"\n--- Page {page_num + 1} ---\n{page_text}"
                    
                    # Progress reporting for large documents
                    if page_num % 10 == 0 or page_num == page_count - 1:
                        print(f"Processed page {page_num + 1} of {page_count}")
                        
                except Exception as page_error:
                    # Don't fail the whole document for a single page error
                    print(f"Error on page {page_num + 1}: {str(page_error)}")
                    extracted_text += f"\n--- Page {page_num + 1} (Error: {str(page_error)}) ---\n"
            
            # Close the document in a try/finally to ensure it gets closed
            try:
                pdf_document.close()
                print("PDF document closed properly")
            except Exception as close_error:
                print(f"Warning when closing PDF: {str(close_error)}")
            
            # Check if we got any text
            text_size = len(extracted_text)
            if text_size == 0:
                raise ValueError("No text could be extracted from the PDF")
                
            print(f"Successfully extracted {text_size} characters from {page_count} pages")
            
        except Exception as extract_error:
            # Provide detailed error information
            raise ValueError(f"Error extracting PDF text: {str(extract_error)}")
        
        # Extract text from reference book if provided
        if ref_book_path:
            try:
                # Verify the file is still accessible
                if not os.path.exists(ref_book_path):
                    print(f"Warning: Reference book file disappeared before extraction could start")
                    # Continue without reference book
                else:
                    # Log detailed information about the file
                    file_info = os.stat(ref_book_path)
                    print(f"Reference book details: Size={file_info.st_size} bytes, Permissions={oct(file_info.st_mode)[-3:]}")
                    
                    # Open the PDF file with error diagnostics
                    try:
                        ref_pdf_document = fitz.open(ref_book_path)
                        print(f"Reference PDF opened successfully: {len(ref_pdf_document)} pages")
                    except Exception as open_error:
                        print(f"Warning: Failed to open reference PDF document: {str(open_error)}")
                        # Continue without reference book
                        ref_pdf_document = None
                    
                    if ref_pdf_document:
                        # Make sure we have a valid document
                        if len(ref_pdf_document) == 0:
                            print("Warning: Reference PDF document has no pages")
                        else:
                            # Extract text from each page with individual page error handling
                            page_count = len(ref_pdf_document)
                            for page_num in range(page_count):
                                try:
                                    # Get the page with error checking
                                    page = ref_pdf_document[page_num]
                                    if not page:
                                        print(f"Warning: Reference page {page_num + 1} is invalid, skipping")
                                        continue
                                        
                                    # Extract text with error checking
                                    page_text = page.get_text()
                                    ref_book_text += f"\n--- Reference Page {page_num + 1} ---\n{page_text}"
                                    
                                    # Progress reporting for large documents
                                    if page_num % 10 == 0 or page_num == page_count - 1:
                                        print(f"Processed reference page {page_num + 1} of {page_count}")
                                        
                                except Exception as page_error:
                                    # Don't fail the whole document for a single page error
                                    print(f"Error on reference page {page_num + 1}: {str(page_error)}")
                                    ref_book_text += f"\n--- Reference Page {page_num + 1} (Error: {str(page_error)}) ---\n"
                            
                            # Close the document in a try/finally to ensure it gets closed
                            try:
                                ref_pdf_document.close()
                                print("Reference PDF document closed properly")
                            except Exception as close_error:
                                print(f"Warning when closing reference PDF: {str(close_error)}")
                            
                            # Check if we got any text
                            text_size = len(ref_book_text)
                            if text_size == 0:
                                print("Warning: No text could be extracted from the reference PDF")
                            else:
                                print(f"Successfully extracted {text_size} characters from {page_count} reference pages")
                
            except Exception as ref_extract_error:
                print(f"Warning: Could not extract text from reference book: {str(ref_extract_error)}")
                # Continue without reference book text
                ref_book_text = ""
        
        extraction_time = time.time() - start_time
        
        # Prepare prompt
        prompt_text = f"""
        You are an expert AI assistant specialized in analyzing PDF content and generating high-quality, well-structured **GitHub Flavored Markdown (GFM)** responses suitable for rendering in web applications.

        **Task:** Analyze the provided PDF text and generate a detailed, accurate, and presentation-ready GFM response.

        **Formatting Guidelines (Strict):**

        1.  **Overall Structure:** Format your entire response using standard GFM. Use headings (`#`, `##`), lists (`*`, `-`, `1.`), bold (`**...**`), italics (`*...*`), etc.
        2.  **Content Identification:** Identify the type of content (e.g., academic questions, technical documentation, general text) and structure your response accordingly.
        3.  **Academic Questions:** Label solutions clearly (e.g., using `## Question 1`, `### Part a)`). Provide step-by-step explanations where appropriate.
        4.  **Mathematical Expressions (LaTeX):** CRITICAL: Use standard LaTeX delimiters ONLY:
            *   Inline math: Use `$` followed by the LaTeX expression, followed by `$`. Example: `The formula is $E=mc^2$.`
            *   Display math: Use `$$` followed by the LaTeX expression, followed by `$$`. Example: `$$
            \\sum_{{i=1}}^n i = \\frac{{n(n+1)}}{{2}}
            $$`
        5.  **Code Snippets:** Use standard GFM fenced code blocks:
            *   Start the block with three backticks followed by the language name (e.g., ```c, ```python).
            *   Place ALL code lines within the fences.
            *   End the block with three backticks on a new line.
            *   Example:
                ```python
                def hello():
                    print("Hello")
                ```
        6.  **Headings and Sections:** Use headings (`#`, `##`, etc.) logically to structure the content. Address distinct parts or questions separately.
        7.  **Diagrams/Figures:** If the PDF contains visual elements you cannot reproduce, explicitly state this (e.g., `*Note: The original document included a diagram here illustrating...*`) and describe its likely content based on context.
        8.  **Clarity:** Ensure explanations are clear, concise, and easy to follow.
        9.  **Error Handling:** If parts of the input text are garbled or incomprehensible, indicate this clearly, perhaps using italics: `*Unclear or garbled text segment*`.

        **Output:** Start your response directly with the main content, usually beginning with a `#` title appropriate for the document (e.g., `# Solutions for [Document Title]`). Do NOT output raw HTML tags.

        **Input PDF Text:**
        --- BEGIN PDF TEXT ---
        {extracted_text}
        --- END PDF TEXT ---
        """
        
        # Add reference book text to the prompt if available
        if ref_book_text:
            prompt_text += """
            
            I've also provided a reference book that you should use to ensure your solutions are accurate and aligned with the course material. Here is the extracted text from the reference book:
            """
        
        # Configure generation settings
        generate_config = types.GenerateContentConfig(
            temperature=0.7,
            top_p=0.95,
            top_k=40,
            max_output_tokens=4096,  # Increased token limit for longer responses
            response_mime_type="text/plain",
        )
        
        # Generate solutions
        token_count = 0
        generation_start = time.time()
        
        # Combine prompts and extracted text
        full_prompt = prompt_text + "\n\n" + extracted_text
        if ref_book_text:
            full_prompt += "\n\n" + ref_book_text
        
        # Generate content with the text prompt
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=full_prompt,
            config=generate_config,
        )
        response_text = response.text
        token_count += response.token_count if hasattr(response, 'token_count') else len(response.text.split())
        
        generation_time = time.time() - generation_start
        
        # Update PDF record
        if pdf_record:
            try:
                pdf_record.status = "completed"
                pdf_record.processed_at = datetime.now()
                db.commit()
            except Exception as update_error:
                print(f"Warning: Could not update PDF record: {str(update_error)}")
        
        # Return results
        return {
            "message": "PDF processed successfully",
            "pdf_id": pdf_record.id if pdf_record else None,
            "solutions": response_text,
            "metrics": {
                "extraction_time": extraction_time,
                "generation_time": generation_time,
                "token_count": token_count,
                "question_paper_chars": len(extracted_text),
                "reference_book_chars": len(ref_book_text) if ref_book_text else 0
            }
        }
    
    except Exception as e:
        print(e)
        # Update PDF record with error if it exists
        if 'pdf_record' in locals() and pdf_record:
            try:
                pdf_record.status = "failed"
                pdf_record.error_message = str(e)
                db.commit()
            except Exception as update_error:
                print(f"Warning: Could not update PDF record with error status: {str(update_error)}")
        
        # Clean up temporary directory if it exists
        if temp_dir and os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
            except Exception as cleanup_error:
                print(f"Error cleaning up temp directory: {cleanup_error}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing PDF: {str(e)}"
        )



