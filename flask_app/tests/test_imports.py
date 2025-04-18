import json
import io
import pytest
from flask_app.app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test_secret_key"
    with app.test_client() as client:
        with app.app_context():
            yield client


def test_submit_file_success(client, monkeypatch):
    # Mock the convert_file_to_dicts function to return valid data
    def mock_convert_file_to_dicts(file):
        return {"key": "value"}

    monkeypatch.setattr("flask_app.utils.convert_file_to_dicts.convert_file_to_dicts", mock_convert_file_to_dicts)

    # Create a mock file to upload
    data = {
        "userFiles[]": (io.BytesIO(b"field_a,field_b\n1,2"), "test_file.csv"),
    }

    response = client.post("/api/submit_file", data=data, content_type="multipart/form-data")

    assert response.status_code == 200
    assert response.json["message"] == "success"
    with client.session_transaction() as sess:
        assert "test_file.csv" in sess["input_data"]


def test_submit_file_duplicate_filename(client, monkeypatch):
    # Mock the convert_file_to_dicts function to return valid data
    def mock_convert_file_to_dicts(file):
        return {"key": "value"}

    monkeypatch.setattr("flask_app.utils.convert_file_to_dicts.convert_file_to_dicts", mock_convert_file_to_dicts)

    # Add a file to the session
    with client.session_transaction() as sess:
        sess["input_data"] = {"test_file.csv": {"key": "value"}}

    # Create a mock file with the same name
    data = {
        "userFiles[]": (io.BytesIO(b"mock file content"), "test_file.csv"),
    }

    response = client.post("/api/submit_file", data=data, content_type="multipart/form-data")

    assert response.status_code == 400
    assert response.json["message"] == "Uploaded two files with the same filename. Please upload non-duplicate files."


def test_submit_file_invalid_format(client, monkeypatch):
    # Mock the convert_file_to_dicts function to return invalid data
    def mock_convert_file_to_dicts(file):
        return None

    monkeypatch.setattr("flask_app.utils.convert_file_to_dicts.convert_file_to_dicts", mock_convert_file_to_dicts)

    # Create a mock file to upload
    data = {
        "userFiles[]": (io.BytesIO(b"mock file content"), "test_file.csv"),
    }

    response = client.post("/api/submit_file", data=data, content_type="multipart/form-data")

    assert response.status_code == 400
    assert response.json["message"] == "Uploaded a file in the wrong format. Please upload different format"