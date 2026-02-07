from http.server import BaseHTTPRequestHandler
import json
import base64
import tempfile
import os
from PyPDF2 import PdfReader

def _normalize_text(raw: str) -> str:
    return raw.replace("\u00ad", "").replace("\r", "\n")

def _build_line_frequencies(pages: list[str]) -> dict[str, int]:
    freqs: dict[str, int] = {}
    for page_text in pages:
        seen = set()
        for line in page_text.split("\n"):
            clean = " ".join(line.strip().split())
            if clean:
                seen.add(clean)
        for line in seen:
            freqs[line] = freqs.get(line, 0) + 1
    return freqs

def _extract_paragraphs(raw: str, line_freq: dict[str, int], page_count: int) -> list[str]:
    lines = [" ".join(l.strip().split()) for l in raw.split("\n")]
    filtered: list[str] = []
    for line in lines:
        if not line:
            filtered.append("")
            continue
        # Drop frequent short lines (likely headers/footers/page numbers)
        if line_freq.get(line, 0) >= 2 and len(line) <= 80 and page_count > 1:
            continue
        if len(line) <= 2 and line.isdigit():
            continue
        filtered.append(line)

    paragraphs: list[str] = []
    buffer: list[str] = []
    for line in filtered:
        if not line:
            if buffer:
                paragraphs.append(" ".join(buffer).strip())
                buffer = []
            continue
        if line.endswith("-") and not line.endswith(" -"):
            buffer.append(line[:-1])
        else:
            buffer.append(line)
    if buffer:
        paragraphs.append(" ".join(buffer).strip())

    return [p for p in paragraphs if p]

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
                page_texts: list[str] = []
                for page in reader.pages:
                    text = page.extract_text()
                    page_texts.append(_normalize_text(text) if text else "")

                line_freq = _build_line_frequencies(page_texts)

                for page_num, page_text in enumerate(page_texts, start=1):
                    if not page_text:
                        continue
                    paragraphs = _extract_paragraphs(page_text, line_freq, len(page_texts))
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

