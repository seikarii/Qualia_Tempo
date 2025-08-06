import unittest
from engine_backend import config


class TestConfig(unittest.TestCase):

    def test_variables_exist(self):
        self.assertTrue(hasattr(config, "VP_WIDTH"))
        self.assertTrue(hasattr(config, "VP_HEIGHT"))
        self.assertTrue(hasattr(config, "VP_MAX_NEW_PARTICLES"))
        self.assertTrue(hasattr(config, "VP_SIMULATION_TICK_MULTIPLIER"))
        self.assertTrue(hasattr(config, "VP_DELAY"))
        self.assertTrue(hasattr(config, "VP_INT_VALUE_10"))


if __name__ == "__main__":
    unittest.main()
