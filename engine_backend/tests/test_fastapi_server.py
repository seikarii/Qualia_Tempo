import json
import unittest
from fastapi.testclient import TestClient
from engine_backend.fastapi_server import app, QUALIA_STATE_FILE


class TestFastAPIServer(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_update_qualia(self):
        # Sample data to send
        test_data = {
            "intensity": 0.1,
            "precision": 0.2,
            "aggression": 0.3,
            "flow": 0.4,
            "chaos": 0.5,
            "recovery": 0.6,
            "transcendence": 0.7,
        }

        # Make a POST request to the /update_qualia endpoint
        response = self.client.post("/update_qualia", json=test_data)

        # Assert that the request was successful
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

        # Assert that the data was written to the file correctly
        with open(QUALIA_STATE_FILE, "r") as f:
            written_data = json.load(f)
        self.assertEqual(written_data, test_data)

    def test_update_qualia_io_error(self):
        # Sample data to send
        test_data = {
            "intensity": 0.1,
            "precision": 0.2,
            "aggression": 0.3,
            "flow": 0.4,
            "chaos": 0.5,
            "recovery": 0.6,
            "transcendence": 0.7,
        }

        # Mock open to raise an IOError
        with unittest.mock.patch("builtins.open", side_effect=IOError("Test error")):
            response = self.client.post("/update_qualia", json=test_data)

            # Assert that the request failed with a 500 status code
            self.assertEqual(response.status_code, 500)
            self.assertEqual(response.json()["detail"], "Test error")


if __name__ == "__main__":
    unittest.main()
