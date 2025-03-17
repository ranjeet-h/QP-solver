import base64
import os
from google import genai
from google.genai import types
from IPython.display import display, Markdown
import time

test = ""



def process_pdf(file_path: str) -> None:
    try:
        # Check if the file exists
        if not os.path.exists(file_path):
            print(f"Error: File '{file_path}' not found.")
            return

        # Initialize the API client (replace with your actual API key)
        api_key = test  # Update this with your actual API key
        client = genai.Client(api_key=api_key)

        # Upload the PDF
        print(f"\nUploading '{file_path}'...")
        start_time = time.time()
        uploaded_file = client.files.upload(file=file_path)
        upload_time = time.time() - start_time
        print(f"Upload completed in {upload_time:.2f} seconds")

        # Define the improved prompt
        prompt_text = """
        You are an AI assistant specialized in solving academic question papers. Your task is to analyze the provided PDF, which contains a question paper, and generate detailed solutions for each question. Please follow these guidelines:

        1. Identify each question in the paper and label your solutions accordingly (e.g., *Question 1, **Question 2*, etc.).

        2. For each question, provide a clear and concise answer. If the question requires explanation or calculation, include the necessary steps.

        3. Format your entire response in Markdown. Use appropriate headings, lists, and code blocks where necessary (e.g., for mathematical equations or code snippets).

        4. If there are multiple parts to a question, address each part separately.

        5. Ensure that your solutions are accurate and complete.

        Begin your response with a title, such as '*Solutions to [Question Paper Title]', if the title is available. Otherwise, use 'Solutions to the Provided Question Paper*'.
        """

        # Configure generation settings
        generate_config = types.GenerateContentConfig(
            temperature=0.7,
            top_p=0.95,
            top_k=40,
            max_output_tokens=8192,
            response_mime_type="text/plain",
        )

        # Generate solutions
        print("\nGenerating solutions...")
        response_text = ""
        token_count = 0
        generation_start = time.time()

        for chunk in client.models.generate_content_stream(
            model="gemini-2.0-flash-lite",
            contents=[prompt_text, uploaded_file],
            config=generate_config,
        ):
            response_text += chunk.text
            token_count += chunk.token_count if hasattr(chunk, 'token_count') else len(chunk.text.split())

        generation_time = time.time() - generation_start
        print("Generation completed!\n")

        # Display the Markdown output in Jupyter Notebook
        display(Markdown(response_text))

        # Save the output to a Markdown file
        output_file = f"solutions_{os.path.basename(file_path)}.md"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(response_text)
        print(f"Solutions saved to '{output_file}'")

        # Display basic metrics
        print(f"\nMetrics:")
        print(f"- Upload Time: {upload_time:.2f} seconds")
        print(f"- Generation Time: {generation_time:.2f} seconds")
        print(f"- Estimated Tokens Used: {token_count}")

    except Exception as e:
        print(f"Error processing PDF: {str(e)}")

# Run the function with your PDF
if __name__ == "_main_":
    pdf_path = "test-aos.pdf"  # Replace with the path to your question paper PDF
    process_pdf(pdf_path)