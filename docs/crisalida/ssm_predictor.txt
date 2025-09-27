"""
SSMPredictor - State Space Model Predictor for MentalLaby
==========================================================

A production-quality State Space Model predictor designed for seamless integration
with the MentalLaby memory system. Features robust numerical stability, flexible
architecture modes, and comprehensive error handling.

GOLD.CODE v5.0 COMPLIANT IMPLEMENTATION:
- Configuration-First Architecture: All parameters externalized to YAML
- Mixin Architecture: Inherits from CoreArchitectureBundle
- Decorator Application: @time_execution, @eva_benchmark, @log_exceptions
- Strategy Pattern: Clean backend abstraction maintained

Refactored Architecture (Strategy Pattern):
- Abstract SSMBackendStrategy for backend abstraction
- Concrete strategies: NumpyBackend, TorchBackend, PythonBackend
- Clean separation of concerns with backend-agnostic SSMPredictor

Characteristics:
- Numpy acceleration with pure-Python fallback
- Diagonal and low-rank matrix modes for efficiency
- Stable discretization via continuous parameterization
- Compatible API with ARPredictor
- Efficient persistence via .npz format
- Integrated gradient clipping and weight decay

API Compatibility:
- predict(u): advances state and returns output y_t
- predict_no_update(u): returns y_t without mutating state
- update(prev_u, curr_y): performs online gradient step
- compute_PU_and_update(prev_u, curr_y): calculates PU and updates
- train_on_batch(batch): batch training capability
- clone()/restore(state): state management for inference
- save_weights(path)/load_weights(path): persistence
"""

import abc
import logging
import math
import os
from typing import Any, TYPE_CHECKING

# GOLD.CODE v5.0 - Core Architecture Bundle
from crisalida_lib.bundles.core_architecture_bundle import CoreArchitectureBundle

# GOLD.CODE v5.0 - Performance Decorators
from crisalida_lib.HEAVEN.monitoring.performance_decorators import (
    time_execution,
    eva_benchmark,
    log_exceptions
)

# Detect backend
_USE_TORCH = False
try:
    import torch
    _USE_TORCH = True
except Exception:
    _USE_TORCH = False

# Defensive numeric backend
try:
    import numpy as np
    HAS_NUMPY = True
except Exception:
    np = None
    HAS_NUMPY = False

if TYPE_CHECKING:
    import torch

logger = logging.getLogger(__name__)


# Utility functions
def _ensure_np(x):
    """Convert input to numpy array with fallback."""
    if _USE_TORCH and hasattr(x, 'device') and hasattr(x, 'detach'):
        return x.detach().cpu().numpy()
    if HAS_NUMPY and isinstance(x, np.ndarray):
        return x
    if HAS_NUMPY:
        return np.asarray(x, dtype=np.float32)
    return list(x)  # Pure Python fallback


def _to_float32(x):
    """Convert to float32 with fallback."""
    if HAS_NUMPY:
        return np.asarray(x, dtype=np.float32)
    return [float(v) for v in x]


def clamp01(x):
    """Clamp value to [0, 1] range."""
    return max(0.0, min(1.0, float(x)))


class SSMBackendStrategy(abc.ABC):
    """
    Abstract base class for SSM backend strategies.

    This class defines the interface that all backend implementations must follow,
    enabling clean separation between the predictor logic and backend-specific operations.
    """

    @abc.abstractmethod
    def initialize_params(self, predictor: 'SSMPredictor') -> None:
        """Initialize backend-specific parameters for the predictor."""
        pass

    @abc.abstractmethod
    def get_A_discrete(self, predictor: 'SSMPredictor') -> Any:
        """Get discrete A matrix for the predictor."""
        pass

    @abc.abstractmethod
    def apply_A(self, predictor: 'SSMPredictor', x: Any) -> Any:
        """Apply A matrix to state vector x."""
        pass

    @abc.abstractmethod
    def predict_step(self, predictor: 'SSMPredictor', u: Any) -> Any:
        """Perform prediction step with input u."""
        pass

    @abc.abstractmethod
    def update_step(self, predictor: 'SSMPredictor', prev_u: Any, curr_y: Any, steps: int) -> float:
        """Perform update step with gradient descent."""
        pass

    @abc.abstractmethod
    def clone_state(self, predictor: 'SSMPredictor') -> dict[str, Any]:
        """Clone current state for backup/restore."""
        pass

    @abc.abstractmethod
    def restore_state(self, predictor: 'SSMPredictor', state: dict[str, Any]) -> None:
        """Restore state from backup."""
        pass

    @abc.abstractmethod
    def save_weights(self, predictor: 'SSMPredictor', path: str) -> None:
        """Save model weights to file."""
        pass

    @abc.abstractmethod
    def load_weights(self, predictor: 'SSMPredictor', path: str) -> None:
        """Load model weights from file."""
        pass

    @abc.abstractmethod
    def get_state_norm(self, predictor: 'SSMPredictor') -> float:
        """Get norm of current state vector."""
        pass

    @abc.abstractmethod
    def ensure_tensor(self, data: Any) -> Any:
        """Ensure data is in backend-appropriate format."""
        pass


class NumpyBackend(SSMBackendStrategy):
    """NumPy backend implementation for SSM operations."""

    def initialize_params(self, predictor: 'SSMPredictor') -> None:
        """Initialize NumPy-specific parameters."""
        if not HAS_NUMPY:
            raise RuntimeError("NumPy not available for NumpyBackend")

        # Continuous A parameterization for stability
        predictor.omega_diag = np.random.randn(predictor.d) * 0.1

        if not predictor.diagonal and predictor.lowrank_r > 0:
            predictor.U = np.random.randn(predictor.d, predictor.lowrank_r) * 0.1
            predictor.V = np.random.randn(predictor.d, predictor.lowrank_r) * 0.1
        else:
            predictor.U = None
            predictor.V = None

        predictor.B = np.eye(predictor.d, dtype=np.float32) * 0.1
        predictor.C = np.eye(predictor.d, dtype=np.float32) * 0.1
        predictor.D = np.zeros((predictor.d, predictor.d), dtype=np.float32)
        predictor.x = np.zeros(predictor.d, dtype=np.float32)

        # Build optimizer state
        self._build_numpy_optimizer_state(predictor)

    def _build_numpy_optimizer_state(self, predictor: 'SSMPredictor') -> None:
        """Build Adam optimizer state for NumPy."""
        predictor.adam_m = {}
        predictor.adam_v = {}
        predictor.adam_t = 0
        predictor.beta1 = 0.9
        predictor.beta2 = 0.999
        predictor.eps = 1e-8

        param_names = ["omega_diag", "B", "C", "D"]
        if predictor.U is not None:
            param_names.extend(["U", "V"])

        for name in param_names:
            param = getattr(predictor, name)
            predictor.adam_m[name] = np.zeros_like(param)
            predictor.adam_v[name] = np.zeros_like(param)

    def get_A_discrete(self, predictor: 'SSMPredictor') -> Any:
        """Get discrete A matrix."""
        if predictor.diagonal or predictor.U is None:
            return self._A_discrete_diag(predictor)
        else:
            return self._A_mat_dense_approx(predictor)

    def _A_cont_diag(self, predictor: 'SSMPredictor') -> Any:
        """Get continuous diagonal A matrix."""
        return -np.log1p(np.exp(predictor.omega_diag))

    def _A_discrete_diag(self, predictor: 'SSMPredictor') -> Any:
        """Get discrete diagonal A matrix."""
        A_cont = self._A_cont_diag(predictor)
        return np.exp(predictor.dt * A_cont)

    def _A_mat_dense_approx(self, predictor: 'SSMPredictor') -> Any:
        """Get dense A matrix approximation for low-rank case."""
        A_diag = np.diag(self._A_discrete_diag(predictor))
        A_lowrank = predictor.U @ predictor.V.T
        return A_diag + A_lowrank

    def apply_A(self, predictor: 'SSMPredictor', x: Any) -> Any:
        """Apply A matrix to state vector."""
        if predictor.diagonal or predictor.U is None:
            A_diag = self._A_discrete_diag(predictor)
            return A_diag * x
        else:
            A_full = self.get_A_discrete(predictor)
            return A_full @ x

    def predict_step(self, predictor: 'SSMPredictor', u: Any) -> Any:
        """Perform prediction step."""
        u = np.asarray(u, dtype=np.float32)

        # x_{t+1} = A * x_t + B * u_t
        Ax = self.apply_A(predictor, predictor.x)
        Bu = predictor.B @ u
        x_next = Ax + Bu

        # y_t = C * x_{t+1} + D * u_t
        y = (predictor.C @ x_next) + (predictor.D @ u)

        # Update state
        predictor.x = x_next.astype(np.float32)
        return y

    def update_step(self, predictor: 'SSMPredictor', prev_u: Any, curr_y: Any, steps: int) -> float:
        """Perform update step with Adam optimization."""
        prev_u = np.asarray(prev_u, dtype=np.float32)
        curr_y = np.asarray(curr_y, dtype=np.float32)

        final_loss = 0.0
        for _ in range(steps):
            # Forward pass
            x_backup = predictor.x.copy()
            Ax = self.apply_A(predictor, predictor.x)
            Bu = predictor.B @ prev_u
            x_next = Ax + Bu
            y_hat = (predictor.C @ x_next) + (predictor.D @ prev_u)

            # Compute loss and gradients
            e = y_hat - curr_y
            N = float(len(curr_y))
            final_loss = float(np.mean(e * e))

            # Gradients
            grads = {}

            # C and D gradients
            grads["C"] = (2.0 / N) * (
                e.reshape(-1, 1) @ x_next.reshape(1, -1)
            ) + predictor.l2 * predictor.C
            grads["D"] = (2.0 / N) * (
                e.reshape(-1, 1) @ prev_u.reshape(1, -1)
            ) + predictor.l2 * predictor.D

            # Backprop to x_next
            ex = predictor.C.T @ e

            # B gradient
            grads["B"] = (2.0 / N) * (
                ex.reshape(-1, 1) @ prev_u.reshape(1, -1)
            ) + predictor.l2 * predictor.B

            # A gradients (omega_diag for diagonal case)
            if predictor.diagonal:
                grads["omega_diag"] = (
                    2.0 / N
                ) * ex * predictor.x * self._A_discrete_diag(predictor) + predictor.l2 * predictor.omega_diag

            # Apply gradients
            self._numpy_adam_step(predictor, grads)

            # Update state for next iteration
            predictor.x = x_next.astype(np.float32)

        return final_loss

    def _numpy_adam_step(self, predictor: 'SSMPredictor', grads: dict[str, Any]) -> None:
        """Perform Adam optimization step."""
        predictor.adam_t += 1

        for name, grad in grads.items():
            if name not in predictor.adam_m:
                continue

            # Clip gradients
            grad_norm = np.linalg.norm(grad)
            if grad_norm > predictor.clip_grad:
                grad = grad * (predictor.clip_grad / grad_norm)

            # Adam update
            predictor.adam_m[name] = predictor.beta1 * predictor.adam_m[name] + (1 - predictor.beta1) * grad
            predictor.adam_v[name] = predictor.beta2 * predictor.adam_v[name] + (1 - predictor.beta2) * (
                grad**2
            )

            # Bias correction
            m_hat = predictor.adam_m[name] / (1 - predictor.beta1**predictor.adam_t)
            v_hat = predictor.adam_v[name] / (1 - predictor.beta2**predictor.adam_t)

            # Parameter update
            param = getattr(predictor, name)
            update = predictor.lr * m_hat / (np.sqrt(v_hat) + predictor.eps)
            setattr(predictor, name, param - update)

    def clone_state(self, predictor: 'SSMPredictor') -> dict[str, Any]:
        """Clone current state."""
        state = {
            "x": predictor.x.copy(),
            "d": predictor.d,
            "diagonal": predictor.diagonal,
            "lowrank_r": predictor.lowrank_r,
        }

        param_names = ["omega_diag", "B", "C", "D"]
        if predictor.U is not None:
            param_names.extend(["U", "V"])

        for name in param_names:
            param = getattr(predictor, name)
            state[name] = param.copy()

        return state

    def restore_state(self, predictor: 'SSMPredictor', state: dict[str, Any]) -> None:
        """Restore state."""
        predictor.x = state["x"]
        predictor.d = state["d"]
        predictor.diagonal = state["diagonal"]
        predictor.lowrank_r = state["lowrank_r"]

        param_names = ["omega_diag", "B", "C", "D"]
        if "U" in state:
            param_names.extend(["U", "V"])

        for name in param_names:
            if name in state:
                setattr(predictor, name, state[name])

    def save_weights(self, predictor: 'SSMPredictor', path: str) -> None:
        """Save weights to .npz file."""
        data = {
            "omega_diag": predictor.omega_diag,
            "B": predictor.B,
            "C": predictor.C,
            "D": predictor.D,
            "x": predictor.x,
            "d": predictor.d,
            "diagonal": predictor.diagonal,
            "lowrank_r": predictor.lowrank_r,
            "lr": predictor.lr,
            "l2": predictor.l2,
        }

        if predictor.U is not None:
            data["U"] = predictor.U
            data["V"] = predictor.V

        np.savez_compressed(path, **data)

    def load_weights(self, predictor: 'SSMPredictor', path: str) -> None:
        """Load weights from .npz file."""
        data = np.load(path, allow_pickle=True)

        predictor.omega_diag = data["omega_diag"]
        predictor.B = data["B"]
        predictor.C = data["C"]
        predictor.D = data["D"]
        predictor.x = data["x"]
        predictor.d = int(data["d"])
        predictor.diagonal = bool(data["diagonal"])
        predictor.lowrank_r = int(data["lowrank_r"])
        predictor.lr = float(data["lr"])
        predictor.l2 = float(data["l2"])

        if "U" in data and "V" in data:
            predictor.U = data["U"]
            predictor.V = data["V"]
        else:
            predictor.U = None
            predictor.V = None

    def get_state_norm(self, predictor: 'SSMPredictor') -> float:
        """Get state vector norm."""
        return float(np.linalg.norm(predictor.x))

    def ensure_tensor(self, data: Any) -> Any:
        """Ensure data is numpy array."""
        return np.asarray(data, dtype=np.float32)


class TorchBackend(SSMBackendStrategy):
    """PyTorch backend implementation for SSM operations."""

    def initialize_params(self, predictor: 'SSMPredictor') -> None:
        """Initialize PyTorch-specific parameters."""
        if not _USE_TORCH:
            raise RuntimeError("PyTorch not available for TorchBackend")

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        predictor.omega_diag = torch.randn(predictor.d, device=device) * 0.1

        if not predictor.diagonal and predictor.lowrank_r > 0:
            predictor.U = torch.randn(predictor.d, predictor.lowrank_r, device=device) * 0.1
            predictor.V = torch.randn(predictor.d, predictor.lowrank_r, device=device) * 0.1
        else:
            predictor.U = None
            predictor.V = None

        predictor.B = torch.eye(predictor.d, device=device) * 0.1
        predictor.C = torch.eye(predictor.d, device=device) * 0.1
        predictor.D = torch.zeros(predictor.d, predictor.d, device=device)
        predictor.x = torch.zeros(predictor.d, device=device)

        # Make parameters learnable
        params = [predictor.omega_diag, predictor.B, predictor.C, predictor.D]
        if predictor.U is not None:
            params.extend([predictor.U, predictor.V])

        for p in params:
            p.requires_grad_(True)

        predictor.optimizer = torch.optim.Adam(params, lr=predictor.lr, weight_decay=predictor.l2)

    def get_A_discrete(self, predictor: 'SSMPredictor') -> Any:
        """Get discrete A matrix."""
        if predictor.diagonal or predictor.U is None:
            return self._A_discrete_diag(predictor)
        else:
            return self._A_mat_dense_approx(predictor)

    def _A_cont_diag(self, predictor: 'SSMPredictor') -> Any:
        """Get continuous diagonal A matrix."""
        return -torch.log1p(torch.exp(predictor.omega_diag))

    def _A_discrete_diag(self, predictor: 'SSMPredictor') -> Any:
        """Get discrete diagonal A matrix."""
        A_cont = self._A_cont_diag(predictor)
        return torch.exp(predictor.dt * A_cont)

    def _A_mat_dense_approx(self, predictor: 'SSMPredictor') -> Any:
        """Get dense A matrix approximation for low-rank case."""
        A_diag = torch.diag(self._A_discrete_diag(predictor))
        A_lowrank = predictor.U @ predictor.V.T
        return A_diag + A_lowrank

    def apply_A(self, predictor: 'SSMPredictor', x: Any) -> Any:
        """Apply A matrix to state vector."""
        if predictor.diagonal or predictor.U is None:
            A_diag = self._A_discrete_diag(predictor)
            return A_diag * x
        else:
            A_full = self.get_A_discrete(predictor)
            return A_full @ x

    def predict_step(self, predictor: 'SSMPredictor', u: Any) -> Any:
        """Perform prediction step."""
        u = torch.as_tensor(u, dtype=torch.float32)

        # x_{t+1} = A * x_t + B * u_t
        Ax = self.apply_A(predictor, predictor.x)
        Bu = predictor.B @ u
        x_next = Ax + Bu

        # y_t = C * x_{t+1} + D * u_t
        y = (predictor.C @ x_next) + (predictor.D @ u)

        # Update state
        predictor.x = x_next.detach()
        return y.detach()

    def update_step(self, predictor: 'SSMPredictor', prev_u: Any, curr_y: Any, steps: int) -> float:
        """Perform update step with PyTorch autograd."""
        prev_u = torch.as_tensor(prev_u, dtype=torch.float32)
        curr_y = torch.as_tensor(curr_y, dtype=torch.float32)

        final_loss = 0.0
        for _ in range(steps):
            predictor.optimizer.zero_grad()

            # Forward pass
            x_backup = predictor.x.clone()
            Ax = self.apply_A(predictor, predictor.x)
            Bu = predictor.B @ prev_u
            x_next = Ax + Bu
            y_hat = (predictor.C @ x_next) + (predictor.D @ prev_u)

            # Loss
            loss = torch.nn.functional.mse_loss(y_hat, curr_y)

            # L2 regularization
            l2_loss = 0
            for param in [predictor.omega_diag, predictor.B, predictor.C, predictor.D]:
                l2_loss += torch.sum(param**2)
            if predictor.U is not None:
                l2_loss += torch.sum(predictor.U**2) + torch.sum(predictor.V**2)
            loss += predictor.l2 * l2_loss

            # Backward pass
            loss.backward()

            # Gradient clipping
            params = [predictor.omega_diag, predictor.B, predictor.C, predictor.D]
            if predictor.U is not None:
                params.extend([predictor.U, predictor.V])
            torch.nn.utils.clip_grad_norm_(params, predictor.clip_grad)

            # Optimizer step
            predictor.optimizer.step()

            # Update state
            predictor.x = x_next.detach()
            final_loss = float(loss.item())

        return final_loss

    def clone_state(self, predictor: 'SSMPredictor') -> dict[str, Any]:
        """Clone current state."""
        state = {
            "x": predictor.x.detach().cpu().numpy(),
            "d": predictor.d,
            "diagonal": predictor.diagonal,
            "lowrank_r": predictor.lowrank_r,
        }

        param_names = ["omega_diag", "B", "C", "D"]
        if predictor.U is not None:
            param_names.extend(["U", "V"])

        for name in param_names:
            param = getattr(predictor, name)
            state[name] = param.detach().cpu().numpy()

        return state

    def restore_state(self, predictor: 'SSMPredictor', state: dict[str, Any]) -> None:
        """Restore state."""
        predictor.x = torch.from_numpy(state["x"]).to(predictor.x.device)
        predictor.d = state["d"]
        predictor.diagonal = state["diagonal"]
        predictor.lowrank_r = state["lowrank_r"]

        param_names = ["omega_diag", "B", "C", "D"]
        if "U" in state:
            param_names.extend(["U", "V"])

        for name in param_names:
            if name in state:
                tensor = torch.from_numpy(state[name]).to(predictor.x.device)
                tensor.requires_grad_(True)
                setattr(predictor, name, tensor)

    def save_weights(self, predictor: 'SSMPredictor', path: str) -> None:
        """Save weights to .npz file."""
        data = {
            "omega_diag": predictor.omega_diag.detach().cpu().numpy(),
            "B": predictor.B.detach().cpu().numpy(),
            "C": predictor.C.detach().cpu().numpy(),
            "D": predictor.D.detach().cpu().numpy(),
            "x": predictor.x.detach().cpu().numpy(),
            "d": predictor.d,
            "diagonal": predictor.diagonal,
            "lowrank_r": predictor.lowrank_r,
            "lr": predictor.lr,
            "l2": predictor.l2,
        }

        if predictor.U is not None:
            data["U"] = predictor.U.detach().cpu().numpy()
            data["V"] = predictor.V.detach().cpu().numpy()

        np.savez_compressed(path, **data)

    def load_weights(self, predictor: 'SSMPredictor', path: str) -> None:
        """Load weights from .npz file."""
        data = np.load(path, allow_pickle=True)

        device = predictor.x.device if hasattr(predictor.x, 'device') else torch.device('cpu')

        predictor.omega_diag = torch.from_numpy(data["omega_diag"]).to(device)
        predictor.B = torch.from_numpy(data["B"]).to(device)
        predictor.C = torch.from_numpy(data["C"]).to(device)
        predictor.D = torch.from_numpy(data["D"]).to(device)
        predictor.x = torch.from_numpy(data["x"]).to(device)
        predictor.d = int(data["d"])
        predictor.diagonal = bool(data["diagonal"])
        predictor.lowrank_r = int(data["lowrank_r"])
        predictor.lr = float(data["lr"])
        predictor.l2 = float(data["l2"])

        # Make parameters learnable
        params = [predictor.omega_diag, predictor.B, predictor.C, predictor.D]
        if "U" in data and "V" in data:
            predictor.U = torch.from_numpy(data["U"]).to(device)
            predictor.V = torch.from_numpy(data["V"]).to(device)
            params.extend([predictor.U, predictor.V])
        else:
            predictor.U = None
            predictor.V = None

        for p in params:
            p.requires_grad_(True)

        predictor.optimizer = torch.optim.Adam(params, lr=predictor.lr, weight_decay=predictor.l2)

    def get_state_norm(self, predictor: 'SSMPredictor') -> float:
        """Get state vector norm."""
        return float(torch.norm(predictor.x).item())

    def ensure_tensor(self, data: Any) -> Any:
        """Ensure data is torch tensor."""
        return torch.as_tensor(data, dtype=torch.float32)


class PythonBackend(SSMBackendStrategy):
    """Pure Python backend implementation for SSM operations."""

    def initialize_params(self, predictor: 'SSMPredictor') -> None:
        """Initialize Python-specific parameters."""
        predictor.omega_diag = [0.1 * (2 * (i % 2) - 1) for i in range(predictor.d)]
        predictor.U = None
        predictor.V = None
        predictor.B = [
            [0.1 if i == j else 0.0 for j in range(predictor.d)] for i in range(predictor.d)
        ]
        predictor.C = [
            [0.1 if i == j else 0.0 for j in range(predictor.d)] for i in range(predictor.d)
        ]
        predictor.D = [[0.0 for _ in range(predictor.d)] for _ in range(predictor.d)]
        predictor.x = [0.0] * predictor.d

    def get_A_discrete(self, predictor: 'SSMPredictor') -> Any:
        """Get discrete A matrix (diagonal only for Python backend)."""
        return self._A_discrete_diag(predictor)

    def _A_cont_diag(self, predictor: 'SSMPredictor') -> list[float]:
        """Get continuous diagonal A matrix."""
        return [-math.log(1 + math.exp(w)) for w in predictor.omega_diag]

    def _A_discrete_diag(self, predictor: 'SSMPredictor') -> list[float]:
        """Get discrete diagonal A matrix."""
        A_cont = self._A_cont_diag(predictor)
        return [math.exp(predictor.dt * a) for a in A_cont]

    def apply_A(self, predictor: 'SSMPredictor', x: Any) -> Any:
        """Apply A matrix to state vector."""
        A_diag = self._A_discrete_diag(predictor)
        return [A_diag[i] * x[i] for i in range(predictor.d)]

    def predict_step(self, predictor: 'SSMPredictor', u: Any) -> Any:
        """Perform prediction step."""
        u = [float(v) for v in u]

        # A * x_t
        Ax = self.apply_A(predictor, predictor.x)

        # B * u_t
        Bu = []
        for i in range(predictor.d):
            val = sum(predictor.B[i][j] * u[j] for j in range(predictor.d))
            Bu.append(val)

        # x_{t+1} = A * x_t + B * u_t
        x_next = [Ax[i] + Bu[i] for i in range(predictor.d)]

        # C * x_{t+1}
        Cx = []
        for i in range(predictor.d):
            val = sum(predictor.C[i][j] * x_next[j] for j in range(predictor.d))
            Cx.append(val)

        # D * u_t
        Du = []
        for i in range(predictor.d):
            val = sum(predictor.D[i][j] * u[j] for j in range(predictor.d))
            Du.append(val)

        # y_t = C * x_{t+1} + D * u_t
        y = [Cx[i] + Du[i] for i in range(predictor.d)]

        # Update state
        predictor.x = x_next
        return y

    def update_step(self, predictor: 'SSMPredictor', prev_u: Any, curr_y: Any, steps: int) -> float:
        """Perform simple gradient descent update."""
        prev_u = [float(v) for v in prev_u]
        curr_y = [float(v) for v in curr_y]

        final_loss = 0.0
        for _ in range(steps):
            # Forward pass
            y_hat = self.predict_step(predictor, prev_u)

            # Compute loss
            e = [yh - yt for yh, yt in zip(y_hat, curr_y, strict=False)]
            final_loss = sum(ei * ei for ei in e) / max(1, len(e))

            # Simple gradient descent for diagonal case
            for i in range(predictor.d):
                err = y_hat[i] - curr_y[i]
                predictor.omega_diag[i] -= predictor.lr * (
                    2.0 * err * predictor.x[i] + 2.0 * predictor.l2 * predictor.omega_diag[i]
                )

        return final_loss

    def clone_state(self, predictor: 'SSMPredictor') -> dict[str, Any]:
        """Clone current state."""
        state = {
            "x": predictor.x.copy(),
            "d": predictor.d,
            "diagonal": predictor.diagonal,
            "lowrank_r": predictor.lowrank_r,
        }

        param_names = ["omega_diag", "B", "C", "D"]
        if predictor.U is not None:
            param_names.extend(["U", "V"])

        for name in param_names:
            param = getattr(predictor, name)
            state[name] = param.copy()

        return state

    def restore_state(self, predictor: 'SSMPredictor', state: dict[str, Any]) -> None:
        """Restore state."""
        predictor.x = state["x"]
        predictor.d = state["d"]
        predictor.diagonal = state["diagonal"]
        predictor.lowrank_r = state["lowrank_r"]

        param_names = ["omega_diag", "B", "C", "D"]
        if "U" in state:
            param_names.extend(["U", "V"])

        for name in param_names:
            if name in state:
                setattr(predictor, name, state[name])

    def save_weights(self, predictor: 'SSMPredictor', path: str) -> None:
        """Save weights to JSON file."""
        import json

        data = {
            "omega_diag": predictor.omega_diag,
            "B": predictor.B,
            "C": predictor.C,
            "D": predictor.D,
            "x": predictor.x,
            "d": predictor.d,
            "diagonal": predictor.diagonal,
            "lowrank_r": predictor.lowrank_r,
            "lr": predictor.lr,
            "l2": predictor.l2,
        }

        if predictor.U is not None:
            data["U"] = predictor.U
            data["V"] = predictor.V

        json_path = path.replace(".npz", ".json")
        with open(json_path, "w") as f:
            json.dump(data, f)

    def load_weights(self, predictor: 'SSMPredictor', path: str) -> None:
        """Load weights from JSON file."""
        import json

        json_path = path.replace(".npz", ".json")
        with open(json_path) as f:
            data = json.load(f)

        predictor.omega_diag = data["omega_diag"]
        predictor.B = data["B"]
        predictor.C = data["C"]
        predictor.D = data["D"]
        predictor.x = data["x"]
        predictor.d = int(data["d"])
        predictor.diagonal = bool(data["diagonal"])
        predictor.lowrank_r = int(data["lowrank_r"])
        predictor.lr = float(data["lr"])
        predictor.l2 = float(data["l2"])

        if "U" in data and "V" in data:
            predictor.U = data["U"]
            predictor.V = data["V"]
        else:
            predictor.U = None
            predictor.V = None

    def get_state_norm(self, predictor: 'SSMPredictor') -> float:
        """Get state vector norm."""
        return math.sqrt(sum(x * x for x in predictor.x))

    def ensure_tensor(self, data: Any) -> Any:
        """Ensure data is list."""
        return [float(v) for v in data]


class SSMPredictor(CoreArchitectureBundle):
    """
    State Space Model Predictor with production-quality implementation.

    GOLD.CODE v5.0 COMPLIANT:
    - Inherits from CoreArchitectureBundle (all required mixins)
    - Configuration-first architecture with external YAML
    - Performance decorators on critical methods
    - Strategy Pattern for clean backend abstraction

    Refactored with Strategy Pattern for clean backend abstraction:
    - Backend-agnostic predictor logic
    - Pluggable backend strategies (NumPy, PyTorch, Python)
    - Clean separation of concerns

    Maintains state x_t and implements dynamics:
    x_{t+1} = A * x_t + B * u_t
    y_t = C * x_t + D * u_t

    Features:
    - Stable parameterization via continuous A matrix
    - Diagonal and low-rank modes for efficiency
    - Hardware acceleration when available
    - Compatible API with ARPredictor
    """

    def __init__(
        self,
        d: int | None = None,
        lr: float | None = None,
        l2: float | None = None,
        diagonal: bool | None = None,
        lowrank_r: int | None = None,
        dtype: str = "float32",
        device: str | None = None,
        use_torch_if_available: bool | None = None,
        clip_grad: float | None = None,
        discretization_dt: float | None = None,
        seed: int | None = None,
        config_path: str | None = None,
        **kwargs
    ):
        """
        Initialize SSM predictor with GOLD.CODE v5.0 compliance.

        Args:
            d: State dimension (from config if None)
            lr: Learning rate (from config if None)
            l2: L2 regularization (from config if None)
            diagonal: Use diagonal A matrix (from config if None)
            lowrank_r: Low-rank approximation rank (from config if None)
            use_torch_if_available: Whether to use PyTorch if available (from config if None)
            seed: Random seed for reproducibility
            config_path: Path to configuration file
            **kwargs: Additional parameters for CoreArchitectureBundle
        """
        # Initialize CoreArchitectureBundle first (GOLD.CODE requirement)
        super().__init__(config_path=config_path or "ssm_predictor", **kwargs)

        # Load configuration values (GOLD.CODE: Configuration-First)
        self.d = d if d is not None else self.get_config('state_dimension', 256)
        self.lr = lr if lr is not None else self.get_config('learning_rate', 1e-3)
        self.l2 = l2 if l2 is not None else self.get_config('l2_regularization', 1e-5)
        self.diagonal = diagonal if diagonal is not None else self.get_config('diagonal_mode', True)
        self.lowrank_r = lowrank_r if lowrank_r is not None else self.get_config('lowrank_rank', 0)
        self.clip_grad = clip_grad if clip_grad is not None else self.get_config('gradient_clip_norm', 1.0)
        self.dt = discretization_dt if discretization_dt is not None else self.get_config('discretization_dt', 1.0)

        # Backend configuration from config
        use_torch_config = use_torch_if_available
        if use_torch_config is None:
            use_torch_config = self.get_config('use_torch_if_available', True)

        # Random seed handling
        if seed is None:
            seed = self.get_config('random_seed')

        if seed is not None:
            if HAS_NUMPY:
                np.random.seed(seed)
            if _USE_TORCH:
                torch.manual_seed(seed)

        # Initialize backend strategy
        self.backend = self._create_backend(use_torch_config)
        self.backend.initialize_params(self)

        logger.info(f"SSMPredictor initialized with {self.backend.__class__.__name__} backend (GOLD.CODE v5.0 compliant)")

    def _create_backend(self, use_torch_if_available: bool) -> SSMBackendStrategy:
        """Create appropriate backend strategy."""
        if use_torch_if_available and _USE_TORCH:
            return TorchBackend()
        elif HAS_NUMPY:
            return NumpyBackend()
        else:
            return PythonBackend()

    @time_execution
    @eva_benchmark
    @log_exceptions
    def predict(self, u) -> Any:
        """
        Predict next state and output.

        Args:
            u: Input vector

        Returns:
            Output vector y_t
        """
        try:
            u = self.backend.ensure_tensor(u)
            return self.backend.predict_step(self, u)
        except Exception as e:
            logger.warning(f"Prediction failed: {e}")
            # Return zero output as fallback
            if HAS_NUMPY:
                return np.zeros(self.d, dtype=np.float32)
            else:
                return [0.0] * self.d

    def predict_no_update(self, u) -> Any:
        """
        Predict without updating internal state.

        Args:
            u: Input vector

        Returns:
            Output vector y_t
        """
        # Save current state
        state_backup = self.backend.clone_state(self)

        # Make prediction
        y = self.predict(u)

        # Restore state
        self.backend.restore_state(self, state_backup)

        return y

    def loss(self, y_hat, y_true) -> float:
        """
        Compute MSE loss.

        Args:
            y_hat: Predicted output
            y_true: True output

        Returns:
            MSE loss value
        """
        try:
            y_hat = self.backend.ensure_tensor(y_hat)
            y_true = self.backend.ensure_tensor(y_true)

            if HAS_NUMPY:
                y_hat = np.asarray(y_hat, dtype=np.float32)
                y_true = np.asarray(y_true, dtype=np.float32)
                e = y_hat - y_true
                return float(np.mean(e * e))
            else:
                # Pure Python
                y_hat = [float(v) for v in y_hat]
                y_true = [float(v) for v in y_true]
                e = [yh - yt for yh, yt in zip(y_hat, y_true, strict=False)]
                return sum(ei * ei for ei in e) / max(1, len(e))
        except Exception:
            return float("inf")

    @time_execution
    @eva_benchmark
    @log_exceptions
    def update(self, prev_u, curr_y, steps: int = 1) -> float:
        """
        Perform online learning update.

        Args:
            prev_u: Previous input
            curr_y: Current target output
            steps: Number of gradient steps

        Returns:
            Final loss value
        """
        try:
            return self.backend.update_step(self, prev_u, curr_y, steps)
        except Exception as e:
            logger.warning(f"Update failed: {e}")
            return float("inf")

    @time_execution
    @eva_benchmark
    @log_exceptions
    def compute_PU_and_update(self, prev_u, curr_y) -> float:
        """
        Compute Predictive Utility and update.

        Args:
            prev_u: Previous input
            curr_y: Current target output

        Returns:
            Predictive Utility (0-1)
        """
        if prev_u is None:
            return 0.0

        try:
            # Measure loss before update
            y_pred_before = self.predict_no_update(prev_u)
            before = self.loss(y_pred_before, curr_y)

            # Perform update
            after = self.update(prev_u, curr_y, steps=1)

            # Calculate PU
            if before <= 1e-9:
                return 0.0

            pu = (before - after) / before
            return max(0.0, min(1.0, pu))
        except Exception:
            return 0.0

    def clone(self) -> dict[str, Any]:
        """
        Clone current state.

        Returns:
            State dictionary
        """
        return self.backend.clone_state(self)

    def restore(self, state: dict[str, Any]):
        """
        Restore from state dictionary.

        Args:
            state: State dictionary from clone()
        """
        self.backend.restore_state(self, state)

    @time_execution
    @eva_benchmark
    @log_exceptions
    def train_on_batch(self, batch, epochs: int = 1, batch_lr: float | None = None):
        """
        Train on batch of sequences.

        Args:
            batch: List of (u_seq, y_seq) tuples
            epochs: Number of training epochs
            batch_lr: Optional learning rate override
        """
        if not batch:
            return

        original_lr = self.lr
        if batch_lr is not None:
            self.lr = batch_lr

        try:
            for epoch in range(epochs):
                total_loss = 0.0
                for u_seq, y_seq in batch:
                    # Reset state for each sequence
                    if HAS_NUMPY:
                        self.x = np.zeros(self.d, dtype=np.float32)
                    else:
                        self.x = [0.0] * self.d

                    # Train on sequence
                    for u_t, y_t in zip(u_seq, y_seq, strict=False):
                        loss = self.update(u_t, y_t, steps=1)
                        total_loss += loss

                if len(batch) > 0:
                    avg_loss = total_loss / len(batch)
                    logger.debug(
                        f"Batch training epoch {epoch}: avg_loss = {avg_loss:.6f}"
                    )

        finally:
            self.lr = original_lr

    def save_weights(self, path: str):
        """
        Save model weights to file.

        Args:
            path: File path for saving
        """
        self.backend.save_weights(self, path)

    def load_weights(self, path: str):
        """
        Load model weights from file.

        Args:
            path: File path for loading
        """
        self.backend.load_weights(self, path)

    def get_status(self) -> dict[str, Any]:
        """
        Get predictor status information.

        Returns:
            Status dictionary
        """
        return {
            "type": "SSMPredictor",
            "d": self.d,
            "diagonal": self.diagonal,
            "lowrank_r": self.lowrank_r,
            "lr": self.lr,
            "l2": self.l2,
            "backend": self.backend.__class__.__name__,
            "state_norm": self.backend.get_state_norm(self),
        }
