const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

router.post('/phone-login', authController.phoneLogin);
router.post('/login', authController.login);

module.exports = router;
