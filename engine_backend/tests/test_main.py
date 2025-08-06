import unittest
from unittest.mock import patch, MagicMock
from engine_backend import main
import os
import time


class TestMain(unittest.TestCase):

    @patch("subprocess.Popen")
    @patch("os.environ.copy")
    @patch("time.sleep")
    @patch("os.path.exists", return_value=True)
    @patch("builtins.open", unittest.mock.mock_open(read_data="log content"))
    def test_start_backend_success(self, mock_open, mock_exists, mock_sleep, mock_environ_copy, mock_popen):
        mock_env = {"DISPLAY": ":0"}
        mock_environ_copy.return_value = mock_env

        mock_visualizer_process = MagicMock()
        mock_visualizer_process.pid = 1234
        mock_visualizer_process.poll.side_effect = [None, 0]  # Run once, then terminate
        
        mock_fastapi_process = MagicMock()
        mock_fastapi_process.pid = 5678
        mock_fastapi_process.poll.side_effect = [None, 0] # Run once, then terminate

        mock_popen.side_effect = [mock_visualizer_process, mock_fastapi_process]

        main.start_backend()

        mock_popen.assert_any_call(
            [main.PYTHON_VENV, main.VISUALIZER_SCRIPT], env=mock_env
        )
        mock_popen.assert_any_call(
            [main.PYTHON_VENV, main.FASTAPI_SCRIPT],
            stdout=unittest.mock.ANY,
            stderr=unittest.mock.ANY,
            text=True,
        )
        self.assertEqual(mock_popen.call_count, 2)
        mock_visualizer_process.terminate.assert_called_once()
        mock_fastapi_process.terminate.assert_called_once()

    @patch("subprocess.Popen", side_effect=Exception("Visualizer error"))
    @patch("os.environ.copy", return_value={})
    @patch("logging.Logger.error")
    def test_start_backend_visualizer_fail(self, mock_logger_error, mock_environ_copy, mock_popen):
        main.start_backend()
        mock_logger_error.assert_called_with("Failed to start visualizer process: Visualizer error")
        mock_popen.assert_called_once()

    @patch("subprocess.Popen")
    @patch("os.environ.copy", return_value={})
    @patch("time.sleep")
    @patch("logging.Logger.error")
    def test_start_backend_fastapi_fail(self, mock_logger_error, mock_sleep, mock_environ_copy, mock_popen):
        mock_visualizer_process = MagicMock()
        mock_visualizer_process.pid = 1234
        mock_visualizer_process.poll.return_value = None
        mock_popen.side_effect = [mock_visualizer_process, Exception("FastAPI error")]

        main.start_backend()
        mock_logger_error.assert_called_with("Failed to start FastAPI server process: FastAPI error")
        mock_visualizer_process.terminate.assert_called_once()
        mock_visualizer_process.wait.assert_called_once()

    @patch("subprocess.Popen")
    @patch("os.environ.copy", return_value={})
    @patch("time.sleep")
    @patch("os.path.exists", return_value=True)
    @patch("builtins.open", unittest.mock.mock_open(read_data="visualizer log"))
    @patch("logging.Logger.error")
    def test_start_backend_visualizer_unexpected_termination(self, mock_logger_error, mock_open, mock_exists, mock_sleep, mock_environ_copy, mock_popen):
        mock_visualizer_process = MagicMock()
        mock_visualizer_process.pid = 1234
        mock_visualizer_process.poll.side_effect = [None, 1]  # Terminate unexpectedly
        mock_visualizer_process.returncode = 1

        mock_fastapi_process = MagicMock()
        mock_fastapi_process.pid = 5678
        mock_fastapi_process.poll.return_value = None

        mock_popen.side_effect = [mock_visualizer_process, mock_fastapi_process]

        main.start_backend()
        mock_logger_error.assert_any_call("Visualizer process terminated unexpectedly. Exit code: 1")
        mock_logger_error.assert_any_call("Visualizer log content:\nvisualizer log")
        mock_fastapi_process.terminate.assert_called_once()

    @patch("subprocess.Popen")
    @patch("os.environ.copy", return_value={})
    @patch("time.sleep")
    @patch("os.path.exists", return_value=True)
    @patch("builtins.open", unittest.mock.mock_open(read_data="fastapi log"))
    @patch("logging.Logger.error")
    def test_start_backend_fastapi_unexpected_termination(self, mock_logger_error, mock_open, mock_exists, mock_sleep, mock_environ_copy, mock_popen):
        mock_visualizer_process = MagicMock()
        mock_visualizer_process.pid = 1234
        mock_visualizer_process.poll.return_value = None

        mock_fastapi_process = MagicMock()
        mock_fastapi_process.pid = 5678
        mock_fastapi_process.poll.side_effect = [None, 1]  # Terminate unexpectedly
        mock_fastapi_process.returncode = 1

        mock_popen.side_effect = [mock_visualizer_process, mock_fastapi_process]

        main.start_backend()
        mock_logger_error.assert_any_call("FastAPI process terminated unexpectedly. Exit code: 1")
        mock_logger_error.assert_any_call("FastAPI log content:\nfastapi log")
        mock_visualizer_process.terminate.assert_called_once()

    @patch("subprocess.Popen")
    @patch("os.environ.copy", return_value={})
    @patch("time.sleep", side_effect=KeyboardInterrupt)
    @patch("logging.Logger.info")
    def test_start_backend_keyboard_interrupt(self, mock_logger_info, mock_sleep, mock_environ_copy, mock_popen):
        mock_visualizer_process = MagicMock()
        mock_visualizer_process.pid = 1234
        mock_visualizer_process.poll.return_value = None

        mock_fastapi_process = MagicMock()
        mock_fastapi_process.pid = 5678
        mock_fastapi_process.poll.return_value = None

        mock_popen.side_effect = [mock_visualizer_process, mock_fastapi_process]

        main.start_backend()
        mock_logger_info.assert_any_call("Stopping backend processes...")
        mock_visualizer_process.terminate.assert_called_once()
        mock_fastapi_process.terminate.assert_called_once()


if __name__ == "__main__":
    unittest.main()