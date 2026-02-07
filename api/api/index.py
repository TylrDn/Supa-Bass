from http.server import BaseHTTPRequestHandler
import json
import base64
import tempfile
import os
from PyPDF2 import PdfReader

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        response = {"status": "Lightweight PDF Parser API", "version": "1.0.0"}
        self.wfile.write(json.dumps(response).encode())
        return

    def do_POST(self):
        if self.path not in ['/api/parse', '/']:
            self.send_response(404)
            self.end_headers()
            return
            
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            pdf_base64 = data.get('pdf_base64', '')
            
            if not pdf_base64:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "pdf_base64 is required"}).encode())
                return
            
            pdf_bytes = base64.b64decode(pdf_base64)
            
            max_size = 10 * 1024 * 1024
            if len(pdf_bytes) > max_size:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "PDF too large"}).encode())
                return
            
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_pdf:
                temp_pdf.write(pdf_bytes)
                temp_path = temp_pdf.name
            
            try:
                text_elements = []
                
                reader = PdfReader(temp_path)
                for page_num, page in enumerate(reader.pages, start=1):
                    text = page.extract_text()
                    if text:
                        # Split into paragraphs
                        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
                        for para in paragraphs:
                            text_elements.append({
                                "text": para,
                                "page": page_num,
                                "type": "paragraph"
                            })
                
                doc_dict = {
                    "schema_name": "DoclingDocument",
                    "version": "1.0.0",
                    "name": os.path.basename(temp_path),
                    "body": {"text": "\n\n".join([elem["text"] for elem in text_elements])},
                    "texts": text_elements,
                    "page_count": len(reader.pages)
                }
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(doc_dict).encode())
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Failed to parse PDF: {str(e)}"}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

