const express = require('express');
const router = express.Router();
const { getFarms, createFarm, getSatelliteImagery, getCropHealth } = require('../controllers/mapController');

router.get('/farms', getFarms);
router.post('/farms', createFarm);
router.get('/satellite', getSatelliteImagery);
router.get('/crop-health', getCropHealth);

module.exports = router;
