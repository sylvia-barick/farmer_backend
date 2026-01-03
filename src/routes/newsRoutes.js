const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

router.get('/', newsController.getAgriculturalNews);
router.get('/insights', newsController.getFarmInsights);

module.exports = router;
