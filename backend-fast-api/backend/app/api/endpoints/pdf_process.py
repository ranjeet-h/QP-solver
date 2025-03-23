import os
import time
import tempfile
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.api import models
from app.db.database import get_db
from typing import List
from google import genai
from google.genai import types
import base64

router = APIRouter()

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
        
        # Create a PDF record in database
        pdf_record = models.PDF(
            filename=os.path.basename(file_path),
            user_id=user_id, 
            status="processing"
        )
        db.add(pdf_record)
        db.commit()
        db.refresh(pdf_record)
        
        await websocket.send_text("<div class='info'><p>Initializing PDF processing...</p></div>")
        
        # Initialize the API client
        api_key = settings.GEMINI_API_KEY
        client = genai.Client(api_key=api_key)
        
        # Log the processing start
        await websocket.send_text(f"<div class='info'><p>Processing '{os.path.basename(file_path)}'...</p></div>")
        start_time = time.time()
        
        # Read the PDF file directly
        with open(file_path, "rb") as f:
            file_bytes = f.read()
            
        await websocket.send_text(f"<div class='info'><p>Successfully read {len(file_bytes)} bytes from PDF</p></div>")
        
        # Upload the PDF file to Google Generative AI
        await websocket.send_text("<div class='info'><p>Uploading file to Gemini API...</p></div>")
        
        # Create a temporary file from bytes if we need to pass a file path
        temp_pdf_path = os.path.join(tempfile.gettempdir(), f"temp_gemini_upload_{int(time.time())}.pdf")
        with open(temp_pdf_path, "wb") as temp_file:
            temp_file.write(file_bytes)
        
        # Use the file path for upload
        uploaded_file = client.files.upload(temp_pdf_path)
        
        # Clean up temporary file
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)
        
        upload_time = time.time() - start_time
        await websocket.send_text(f"<div class='info'><p>Upload completed in {upload_time:.2f} seconds. File URI: {uploaded_file.uri}</p></div>")
        
        # Add detailed debug information
        print(f"uploaded_file type: {type(uploaded_file)}")
        print(f"uploaded_file uri: {uploaded_file.uri if hasattr(uploaded_file, 'uri') else 'No URI attribute'}")
        print(f"uploaded_file name: {uploaded_file.name if hasattr(uploaded_file, 'name') else 'No name attribute'}")
        
        # Prepare prompt
        prompt_text = """
        You are an AI assistant specialized in solving academic question papers. Your task is to analyze the provided PDF, which contains a question paper, and generate detailed solutions for each question. Please follow these guidelines:

        1. Identify each question in the paper and label your solutions accordingly (e.g., Question 1, Question 2, etc.).

        2. For each question, provide a clear and concise answer. If the question requires explanation or calculation, include the necessary steps.

        3. Format your entire response as HTML. Use proper HTML tags such as <h1>, <h2>, <p>, <ul>, <li>, etc. Do not use Markdown - use HTML only. For mathematical equations, use standard HTML notation with entities.

        4. If there are multiple parts to a question, address each part separately.

        5. Ensure that your solutions are accurate and complete.

        Begin your response with an HTML title, such as '<h1>Solutions to [Question Paper Title]</h1>', if the title is available. Otherwise, use '<h1>Solutions to the Provided Question Paper</h1>'.
        """
        
        # Configure generation settings
        generate_config = types.GenerateContentConfig(
            temperature=0.7,
            top_p=0.95,
            top_k=40,
            max_output_tokens=192,
            response_mime_type="text/plain",
        )
        
        # Generate solutions
        await websocket.send_text("<div class='info'><p>Generating solutions...</p></div>")
        response_text = ""
        token_count = 0
        generation_start = time.time()
        
        # Stream the responses
        await websocket.send_text("\n<div class='solution-container'>")
        print(uploaded_file)
        # Using the correct parameter name as shown in the documentation
        prompt_str = "Analyze this PDF and provide solutions according to these instructions: " + prompt_text + " Make sure your output is pure HTML that can be directly inserted into a webpage. Use semantic HTML tags to structure your content properly."
        
        # Add a direct text request without the file for testing
        try:
            # First attempt to use directly with inline text prompt
            text_only_response = client.models.generate_content(
                model="gemini-2.0-flash-lite",
                contents=prompt_str
            )
            await websocket.send_text("<div class='test-response'><p>Text-only test response: " + text_only_response.text + "</p></div>")
        except Exception as e:
            await websocket.send_text(f"<div class='error'><p>Text-only test failed: {str(e)}</p></div>")
        
        # Set up the content with the uploaded file
        content = {
            "role": "user",
            "parts": [
                {"text": prompt_str},
                {"file_data": {"file_uri": uploaded_file.uri, "mime_type": "application/pdf"}}
            ]
        }
        
        # Log the content for debugging
        await websocket.send_text(f"<div class='info'><p>Using file URI in request: {uploaded_file.uri}</p></div>")
        
        for chunk in client.models.generate_content_stream(
            model="gemini-2.0-flash-lite",
            contents=[content],
            config=generate_config
        ):
            print("printing chunk")
            print(chunk.text)
            websocket.send_text(chunk.text)
            websocket.send_bytes(b'')
            token_count += chunk.token_count if hasattr(chunk, 'token_count') else len(chunk.text.split())

        
        generation_time = time.time() - generation_start
        await websocket.send_text("</div>\n")
        
        # Display metrics
        await websocket.send_text("\n<div class='metrics'><h3>Metrics:</h3>")
        await websocket.send_text(f"<ul><li>Upload Time: {upload_time:.2f} seconds</li>")
        await websocket.send_text(f"<li>Generation Time: {generation_time:.2f} seconds</li>")
        await websocket.send_text(f"<li>Estimated Tokens Used: {token_count}</li></ul></div>")
        
        # Update PDF record
        if pdf_record:
            pdf_record.status = "completed"
            pdf_record.processed_at = datetime.now()
            db.commit()
        
        await websocket.send_text("<p><strong>Processing complete.</strong></p>")
        
    except Exception as e:
        print(e)
        error_message = f"Error processing PDF: {str(e)}"
        await websocket.send_text(f"<div class='error'><p>{error_message}</p></div>")
        
        # Update PDF record with error status
        if pdf_record:
            pdf_record.status = "failed"
            pdf_record.error_message = str(e)
            db.commit()
            
    finally:
        # Clean up the uploaded file if it exists
        try:
            if 'uploaded_file' in locals() and uploaded_file and hasattr(uploaded_file, 'name'):
                response = client.files.delete(name=uploaded_file.name)
                print(f"File cleanup response: {response}")
                await websocket.send_text(f"<div class='info'><p>File deleted: {uploaded_file.name}</p></div>")
        except Exception as cleanup_error:
            print(f"Error during cleanup: {cleanup_error}")
            await websocket.send_text(f"<div class='warning'><p>Warning: Could not clean up file: {str(cleanup_error)}</p></div>")
            
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
    try:
        # Get file from websocket
        data = await websocket.receive_text()
        # Further implementation of websocket handling
        # ...
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        await websocket.send_text(f"<div class='error'><p>Error: {str(e)}</p></div>")

# post route to solve question paper with reference book if provided
@router.post("/process")
async def process_question_paper(
    file: UploadFile = File(...), 
    ref_book: UploadFile = None, 
    db: Session = Depends(get_db)
):
    """Process a PDF with Gemini and return results"""
    try:
        # Initialize the API client
        api_key = settings.GEMINI_API_KEY
        client = genai.Client(api_key=api_key)
        
        # Save uploaded file to a temporary location
        temp_dir = tempfile.mkdtemp()
        file_path = os.path.join(temp_dir, file.filename)
        with open(file_path, "wb") as temp_file:
            temp_file.write(await file.read())
        
        # Save reference book if provided
        ref_book_path = None
        if ref_book:
            ref_book_path = os.path.join(temp_dir, ref_book.filename)
            with open(ref_book_path, "wb") as temp_ref_file:
                temp_ref_file.write(await ref_book.read())
        
        # Create a PDF record in database
        pdf_record = models.PDF(
            filename=file.filename,
            user_id=1,  # Default user ID, should be obtained from auth
            status="processing"
        )
        db.add(pdf_record)
        db.commit()
        db.refresh(pdf_record)
        
        # Upload the PDF file to Google Generative AI
        start_time = time.time()
        uploaded_file = client.files.upload(file=file_path)
        upload_time = time.time() - start_time
        
        # Upload reference book if provided
        uploaded_ref_book = None
        if ref_book_path:
            uploaded_ref_book = client.files.upload(file=ref_book_path)
        
        # Prepare prompt
        prompt_text = """
        <p>You are an AI assistant specialized in solving academic question papers. Your task is to analyze the provided PDF, which contains a question paper, and generate detailed solutions for each question. Please follow these guidelines:</p>

        <ol>
            <li>Identify each question in the paper and label your solutions accordingly (e.g., <strong>Question 1</strong>, <strong>Question 2</strong>, etc.).</li>

            <li>For each question, provide a clear and concise answer. If the question requires explanation or calculation, include the necessary steps.</li>

            <li>Format your entire response in rich text. Use appropriate headings, lists, and code blocks where necessary (e.g., for mathematical equations or code snippets).</li>

            <li>If there are multiple parts to a question, address each part separately.</li>

            <li>Ensure that your solutions are accurate and complete.</li>
        </ol>

        <p>Begin your response with a title, such as '<strong>Solutions to [Question Paper Title]</strong>', if the title is available. Otherwise, use '<strong>Solutions to the Provided Question Paper</strong>'.</p>
        """
        
        # Add reference to the prompt if a reference book was provided
        if uploaded_ref_book:
            prompt_text += """
            <p>Use the provided reference book to ensure your solutions are accurate and aligned with the course material.</p>
            """
        
        # Configure generation settings
        generate_config = types.GenerateContentConfig(
            temperature=0.7,
            top_p=0.95,
            top_k=40,
            max_output_tokens=192,
            response_mime_type="text/plain",
        )
        
        # Generate solutions
        response_text = ""
        token_count = 0
        generation_start = time.time()
        
        # Prepare content for generation
        contents = [prompt_text, uploaded_file]
        if uploaded_ref_book:
            contents.append(uploaded_ref_book)
        
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=contents,
            config=generate_config,
        )
        response_text += response.text
        token_count += response.token_count if hasattr(response, 'token_count') else len(response.text.split())
        
        generation_time = time.time() - generation_start
        
        # Update PDF record
        pdf_record.status = "completed"
        pdf_record.processed_at = datetime.now()
        db.commit()
        
        # Save the output to a file
        output_file = os.path.join(temp_dir, f"solutions_{file.filename}.md")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(response_text)
        
        # Clean up
        try:
            if uploaded_file and hasattr(uploaded_file, 'name'):
                client.files.delete(name=uploaded_file.name)
            if uploaded_ref_book and hasattr(uploaded_ref_book, 'name'):
                client.files.delete(name=uploaded_ref_book.name)
        except Exception as cleanup_error:
            print(f"Error during cleanup: {cleanup_error}")
        
        # Clean up temporary files
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            if ref_book_path and os.path.exists(ref_book_path):
                os.remove(ref_book_path)
            if os.path.exists(output_file):
                os.remove(output_file)
            os.rmdir(temp_dir)
        except Exception as temp_cleanup_error:
            print(f"Error cleaning up temp files: {temp_cleanup_error}")
        
        # Return results
        return {
            "message": "PDF processed successfully",
            "pdf_id": pdf_record.id,
            "solutions": response_text,
            "metrics": {
                "upload_time": upload_time,
                "generation_time": generation_time,
                "token_count": token_count
            }
        }
    
    except Exception as e:
        print(e)
        # Update PDF record with error if it exists
        if 'pdf_record' in locals() and pdf_record:
            pdf_record.status = "failed"
            pdf_record.error_message = str(e)
            db.commit()
        
        # Clean up temporary directory if it exists
        if 'temp_dir' in locals() and os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
            except Exception as cleanup_error:
                print(f"Error cleaning up temp directory: {cleanup_error}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing PDF: {str(e)}"
        )



