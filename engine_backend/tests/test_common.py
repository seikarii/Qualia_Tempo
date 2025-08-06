import unittest
from engine_backend.reality_engine import common


class TestCommon(unittest.TestCase):

    def test_living_entity_dtype(self):
        self.assertEqual(common.LIVING_ENTITY_DTYPE.itemsize, 84)
        self.assertIn("position_x", common.LIVING_ENTITY_DTYPE.names)
        self.assertIn("entity_id", common.LIVING_ENTITY_DTYPE.names)

    def test_lattice_point_dtype(self):
        self.assertEqual(common.LATTICE_POINT_DTYPE.itemsize, 64)
        self.assertIn("position_x", common.LATTICE_POINT_DTYPE.names)
        self.assertIn("lattice_type", common.LATTICE_POINT_DTYPE.names)

    def test_particle_dtype(self):
        self.assertEqual(common.PARTICLE_DTYPE.itemsize, 64)
        self.assertIn("position_x", common.PARTICLE_DTYPE.names)
        self.assertIn("type", common.PARTICLE_DTYPE.names)


if __name__ == "__main__":
    unittest.main()
