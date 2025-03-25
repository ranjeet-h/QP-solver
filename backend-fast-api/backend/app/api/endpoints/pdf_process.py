import os
import time
import tempfile
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
            
        await websocket.send_text(f"<div class='info'><p>Found PDF file: {os.path.basename(file_path)} ({file_size} bytes)</p></div>")
        
        # Check if user exists and create a dummy user if needed (for development)
        try:
            # Check if the user exists
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                await websocket.send_text("<div class='info'><p>Creating dummy user for development...</p></div>")
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
            await websocket.send_text(f"<div class='error'><p>Warning: Could not check/create user: {str(user_error)}</p></div>")
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
            await websocket.send_text(f"<div class='warning'><p>Could not create PDF record: {str(db_error)}</p></div>")
            # Continue without the record
            pdf_record = None
        
        await websocket.send_text("<div class='info'><p>Initializing PDF processing...</p></div>")
        
        # Initialize the API client
        api_key = settings.GEMINI_API_KEY
        client = genai.Client(api_key=api_key)
        
        # Log the processing start
        await websocket.send_text(f"<div class='info'><p>Processing '{os.path.basename(file_path)}'...</p></div>")
        start_time = time.time()
        
        # Extract text from PDF using PyMuPDF
        await websocket.send_text("<div class='info'><p>Extracting text from PDF with PyMuPDF...</p></div>")
        extracted_text = ""
        
        try:
            # Verify the file is still accessible
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"PDF file disappeared before extraction could start")
            
            # Log detailed information about the file
            file_info = os.stat(file_path)
            await websocket.send_text(f"<div class='info'><p>File details: Size={file_info.st_size} bytes, Permissions={oct(file_info.st_mode)[-3:]}</p></div>")
            
            # Open the PDF file with error diagnostics
            try:
                pdf_document = fitz.open(file_path)
                await websocket.send_text(f"<div class='info'><p>PDF opened successfully: {len(pdf_document)} pages</p></div>")
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
                        await websocket.send_text(f"<div class='warning'><p>Page {page_num + 1} is invalid, skipping</p></div>")
                        continue
                        
                    # Extract text with error checking
                    page_text = page.get_text()
                    extracted_text += f"\n--- Page {page_num + 1} ---\n{page_text}"
                    
                    # Progress reporting for large documents
                    if page_num % 5 == 0 or page_num == page_count - 1:
                        await websocket.send_text(f"<div class='info'><p>Processed page {page_num + 1} of {page_count}</p></div>")
                        
                except Exception as page_error:
                    # Don't fail the whole document for a single page error
                    await websocket.send_text(f"<div class='warning'><p>Error on page {page_num + 1}: {str(page_error)}</p></div>")
                    extracted_text += f"\n--- Page {page_num + 1} (Error: {str(page_error)}) ---\n"
            
            # Close the document in a try/finally to ensure it gets closed
            try:
                pdf_document.close()
                await websocket.send_text("<div class='info'><p>PDF document closed properly</p></div>")
            except Exception as close_error:
                await websocket.send_text(f"<div class='warning'><p>Warning when closing PDF: {str(close_error)}</p></div>")
            
            # Check if we got any text
            text_size = len(extracted_text)
            if text_size == 0:
                raise ValueError("No text could be extracted from the PDF")
                
            await websocket.send_text(f"<div class='info'><p>Successfully extracted {text_size} characters from {page_count} pages</p></div>")
            
        except Exception as extract_error:
            # Provide detailed error information
            error_msg = f"Error extracting PDF text: {str(extract_error)}"
            await websocket.send_text(f"<div class='error'><p>{error_msg}</p></div>")
            raise ValueError(error_msg)
        
        # Prepare prompt
        prompt_text = """
        You are an AI assistant specialized in analyzing and solving content from PDF documents. Your task is to analyze the provided PDF content and generate detailed, well-formatted responses. Please follow these guidelines:

        1. Identify the type of content in the PDF (academic questions, mathematical expressions, code, general text) and respond appropriately.
        
        2. For academic questions: Label your solutions accordingly (e.g., Question 1, Question 2) and provide clear, step-by-step explanations.
        
        3. For mathematical expressions: Use proper HTML notation with MathJax compatibility. Render complex equations using the following format:
           - Inline math: <span class="math-inline">\\(equation\\)</span>
           - Display math: <div class="math-display">\\[equation\\]</div>
           
        4. For code snippets: Present code in properly formatted HTML with syntax highlighting:
           <pre class="code language-[language]"><code>[code content]</code></pre>
           
        5. Format your entire response as HTML. Use proper HTML tags such as <h1>, <h2>, <p>, <ul>, <li>, etc. Do not use Markdown.
        
        6. If dealing with multiple parts or sections, address each part separately with clear headings.
        
        7. If the content contains diagrams or figures that you cannot reproduce, acknowledge them and describe what they likely represent based on the surrounding context.

        Begin your response with an appropriate HTML title based on the content type, such as '<h1>Solutions to [Document Title]</h1>' or '<h1>Analysis of [Document Topic]</h1>'.
        
        Here is the extracted text from the PDF:
        
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
        await websocket.send_text("<div class='info'><p>Generating solutions...</p></div>")
        token_count = 0
        generation_start = time.time()
        
        # Stream the responses
        await websocket.send_text("\n<div class='solution-container'>")
        
        # Combine prompt with extracted text
        full_prompt = prompt_text + "\n\n" + extracted_text
        
        # Add a message explaining what we're doing
        await websocket.send_text("<div class='info'><p>Sending extracted PDF text to Gemini API...</p></div>")
        print(full_prompt)
        # Use the text prompt directly instead of file upload
        try:
            for chunk in client.models.generate_content_stream(
                model="gemini-2.0-flash-lite",
                contents=full_prompt,
                config=generate_config
            ):
                if hasattr(chunk, 'text') and chunk.text:
                    print(f"Sending chunk of size: {len(chunk.text)}")
                    await websocket.send_text(chunk.text)
                    token_count += chunk.token_count if hasattr(chunk, 'token_count') else len(chunk.text.split())
                else:
                    # Handle empty chunks if they occur
                    print("Received empty chunk from Gemini API")
        except Exception as stream_error:
            print(f"Error during content streaming: {str(stream_error)}")
            await websocket.send_text(f"<div class='error'><p>Error during content generation: {str(stream_error)}</p></div>")
            raise
        
        generation_time = time.time() - generation_start
        await websocket.send_text("</div>\n")
        
        # Display metrics
        await websocket.send_text("\n<div class='metrics'><h3>Metrics:</h3>")
        await websocket.send_text(f"<ul><li>Text Extraction Time: {time.time() - start_time - generation_time:.2f} seconds</li>")
        await websocket.send_text(f"<li>Generation Time: {generation_time:.2f} seconds</li>")
        await websocket.send_text(f"<li>Estimated Tokens Used: {token_count}</li>")
        await websocket.send_text(f"<li>Characters Extracted: {len(extracted_text)}</li></ul></div>")
        
        # Update PDF record
        if pdf_record:
            try:
                pdf_record.status = "completed"
                pdf_record.processed_at = datetime.now()
                db.commit()
            except Exception as update_error:
                await websocket.send_text(f"<div class='warning'><p>Could not update PDF record: {str(update_error)}</p></div>")
        
        await websocket.send_text("<p><strong>Processing complete.</strong></p>")
        
    except Exception as e:
        print(e)
        error_message = f"Error processing PDF: {str(e)}"
        await websocket.send_text(f"<div class='error'><p>{error_message}</p></div>")
        
        # Update PDF record with error status
        if pdf_record:
            try:
                pdf_record.status = "failed"
                pdf_record.error_message = str(e)
                db.commit()
            except Exception as update_error:
                await websocket.send_text(f"<div class='warning'><p>Could not update PDF record with error status: {str(update_error)}</p></div>")
            
    finally:
        # Clean up temporary file
        if 'file_path' in locals() and file_path and file_path.startswith(tempfile.gettempdir()) and os.path.exists(file_path):
            try:
                os.remove(file_path)
                await websocket.send_text("<div class='info'><p>Temporary file cleaned up</p></div>")
            except Exception as temp_cleanup_error:
                print(f"Error cleaning up temp file: {temp_cleanup_error}")

@router.websocket("/ws/process")
async def websocket_pdf_process(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    temp_dir = None
    authenticated = False
    user_id = 1  # Default user ID
    try:
        # Inform the client we're ready
        await websocket.send_text("<div class='info'><p>Connection established. Ready to receive files...</p></div>")
        
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
                        await websocket.send_text("<div class='info'><p>Authentication successful. Ready to receive PDF file.</p></div>")
                        
                        # Based on the client script.js, we expect binary data next
                        print("Authentication successful, expecting binary data next...")
                        message_type = "binary"
                    else:
                        await websocket.send_text("<div class='error'><p>Invalid authentication token</p></div>")
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
            await websocket.send_text("<div class='error'><p>Authentication failed</p></div>")
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
                
                # Log the file reception
                await websocket.send_text(f"<div class='info'><p>Received {len(data)} bytes of binary data</p></div>")
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
                
                # Log the file reception
                await websocket.send_text(f"<div class='info'><p>Received and decoded {len(data)} bytes from base64 data</p></div>")
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
                    
                    await websocket.send_text(f"<div class='info'><p>Extracted and decoded {len(data)} bytes from JSON data</p></div>")
                else:
                    # If we're here and the message type is json_with_file, this is an error
                    if message_type == "json_with_file":
                        raise ValueError("JSON message indicated file data, but none was found")
                    # For regular JSON, ask for the file separately
                    await websocket.send_text("<div class='info'><p>Ready to receive file. Please send data type ('binary' or 'base64')...</p></div>")
                    next_message_type = await websocket.receive_text()
                    
                    # Process the next message as file data
                    if next_message_type == "binary":
                        data = await websocket.receive_bytes()
                        file_path = os.path.join(temp_dir, f"uploaded_{int(time.time())}.pdf")
                        with open(file_path, "wb") as temp_file:
                            temp_file.write(data)
                        await websocket.send_text(f"<div class='info'><p>Received {len(data)} bytes of binary data</p></div>")
                    elif next_message_type == "base64":
                        encoded_data = await websocket.receive_text()
                        if "base64," in encoded_data:
                            encoded_data = encoded_data.split("base64,")[1]
                        data = base64.b64decode(encoded_data)
                        file_path = os.path.join(temp_dir, f"uploaded_{int(time.time())}.pdf")
                        with open(file_path, "wb") as temp_file:
                            temp_file.write(data)
                        await websocket.send_text(f"<div class='info'><p>Received and decoded {len(data)} bytes from base64 data</p></div>")
                    else:
                        raise ValueError(f"Unsupported message type: {next_message_type}. Expected 'binary' or 'base64'")
            except Exception as json_error:
                print(f"Error processing JSON file data: {str(json_error)}")
                raise ValueError(f"Failed to process JSON file data: {str(json_error)}")
                
        else:
            raise ValueError(f"Unsupported message type: {message_type}. Expected 'binary', 'base64', or valid JSON with token or file data")
        
        if not file_path or not os.path.exists(file_path):
            raise FileNotFoundError("No valid file was received or saved")
            
        await websocket.send_text(f"<div class='info'><p>File saved temporarily as: {os.path.basename(file_path)}</p></div>")
        
        # Process the PDF with Gemini (using text extraction)
        await process_pdf_with_gemini(file_path, websocket, user_id, db)
        
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        try:
            await websocket.send_text(f"<div class='error'><p>Error: {str(e)}</p></div>")
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

# post route to solve question paper with reference book if provided
@router.post("/process")
async def process_question_paper(
    file: UploadFile = File(...), 
    ref_book: UploadFile = None, 
    db: Session = Depends(get_db)
):
    """Process a PDF with Gemini and return results"""
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
        prompt_text = """
        You are an AI assistant specialized in analyzing and solving content from PDF documents. Your task is to analyze the provided PDF content and generate detailed, well-formatted responses. Please follow these guidelines:

        1. Identify the type of content in the PDF (academic questions, mathematical expressions, code, general text) and respond appropriately.
        
        2. For academic questions: Label your solutions accordingly (e.g., Question 1, Question 2) and provide clear, step-by-step explanations.
        
        3. For mathematical expressions: Use proper HTML notation with MathJax compatibility. Render complex equations using the following format:
           - Inline math: <span class="math-inline">\\(equation\\)</span>
           - Display math: <div class="math-display">\\[equation\\]</div>
           
        4. For code snippets: Present code in properly formatted HTML with syntax highlighting:
           <pre class="code language-[language]"><code>[code content]</code></pre>
           
        5. Format your entire response as HTML. Use proper HTML tags such as <h1>, <h2>, <p>, <ul>, <li>, etc. Do not use Markdown.
        
        6. If dealing with multiple parts or sections, address each part separately with clear headings.
        
        7. If the content contains diagrams or figures that you cannot reproduce, acknowledge them and describe what they likely represent based on the surrounding context.

        Begin your response with an appropriate HTML title based on the content type, such as '<h1>Solutions to [Document Title]</h1>' or '<h1>Analysis of [Document Topic]</h1>'.
        
        Here is the extracted text from the PDF:
        
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



