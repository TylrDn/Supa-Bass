from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import base64
import tempfile
import os

try:
    from docling.document_converter import DocumentConverter
    from docling_core.types.doc.doc import DoclingDocument
except ImportError:
    # Fallback for development
    DocumentConverter = None
    DoclingDocument = None

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ParseRequest(BaseModel):
    pdf_base64: str

@app.get("/")
def root():
    return {"status": "Docling PDF Parser API", "version": "1.0.0"}

@app.post("/api/parse")
async def parse_pdf(request: ParseRequest):
    """
    Parse a base64-encoded PDF using Docling
    """
    try:
        if not DocumentConverter:
            raise HTTPException(
                status_code=500, 
                detail="Docling library not installed. Install with: pip install docling docling-core"
            )

        # Decode base64 PDF
        pdf_bytes = base64.b64decode(request.pdf_base64)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_pdf:
            temp_pdf.write(pdf_bytes)
            temp_path = temp_pdf.name

        try:
            # Convert PDF using Docling
            converter = DocumentConverter()
            result = converter.convert(temp_path)
            
            # Extract structured data
            doc_dict = result.document.export_to_dict()
            
            return JSONResponse(content=doc_dict)
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except base64.binascii.Error:
        raise HTTPException(status_code=400, detail="Invalid base64 encoding")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
