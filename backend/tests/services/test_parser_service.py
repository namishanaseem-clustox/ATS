import pytest
from unittest.mock import MagicMock
from app.services.parser_service import parser_service
import json

def test_extract_text_from_pdf(mocker):
    # Mock pymupdf.open and its returned document/pages
    mock_doc = MagicMock()
    mock_page = MagicMock()
    mock_page.get_text.return_value = "Mocked PDF Resume Text"
    
    # Setup the document to act as an iterable of pages
    mock_doc.__iter__.return_value = [mock_page]
    
    # Patch the actual call in the service
    mocker.patch("app.services.parser_service.pymupdf.open", return_value=mock_doc)
    
    # Execute
    extracted = parser_service.extract_text_from_pdf(b"fake pdf bytes")
    
    # Assert
    assert extracted == "Mocked PDF Resume Text"
    
def test_extract_text_from_pdf_exception(mocker):
    mocker.patch("app.services.parser_service.pymupdf.open", side_effect=Exception("Corrupted PDF"))
    extracted = parser_service.extract_text_from_pdf(b"fake pdf bytes")
    assert extracted == ""

def test_extract_text_from_docx(mocker):
    # Mock python-docx Document
    mock_doc = MagicMock()
    mock_para = MagicMock()
    mock_para.text = "Mocked DOCX Resume Text"
    mock_doc.paragraphs = [mock_para]
    
    mocker.patch("app.services.parser_service.Document", return_value=mock_doc)
    
    extracted = parser_service.extract_text_from_docx(b"fake docx bytes")
    assert extracted == "Mocked DOCX Resume Text"

def test_extract_text_from_docx_exception(mocker):
    mocker.patch("app.services.parser_service.Document", side_effect=Exception("Corrupted DOCX"))
    extracted = parser_service.extract_text_from_docx(b"fake docx bytes")
    assert extracted == ""

def test_parse_with_llm_success(mocker):
    # Create the fake API response structure
    mock_response = MagicMock()
    expected_data = {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane@example.com",
        "experience_years": 4.5,
        "skills": ["Python", "FastAPI"],
        "education": [{"school": "MIT", "degree": "BS", "year": "2020"}],
        "experience_history": []
    }
    
    # .choices[0].message.content
    mock_response.choices[0].message.content = json.dumps(expected_data)
    
    # Mock the client
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response
    
    # Interject the mocked client into the service singleton
    parser_service.client = mock_client
    
    result = parser_service.parse_with_llm("Resume content goes here")
    
    # Verify the mocked client was called correctly
    mock_client.chat.completions.create.assert_called_once()
    call_args = mock_client.chat.completions.create.call_args[1]
    assert call_args["model"] == "gpt-4o-mini"
    assert call_args["response_format"] == {"type": "json_object"}
    assert "Resume content goes here" in call_args["messages"][1]["content"]
    
    # Verify the resulting Pydantic model
    assert result is not None
    assert result.first_name == "Jane"
    assert result.email == "jane@example.com"
    assert result.experience_years == 4.5
    assert "FastAPI" in result.skills

def test_parse_with_llm_no_client():
    # Simulate missing OPENAI_API_KEY
    parser_service.client = None
    result = parser_service.parse_with_llm("Resume content")
    assert result is None

def test_parse_with_llm_api_error(mocker):
    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = Exception("OpenAI API unreachable")
    
    parser_service.client = mock_client
    result = parser_service.parse_with_llm("Resume content")
    
    assert result is None
