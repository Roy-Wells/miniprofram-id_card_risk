const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

router.post('/auto-login', authController.autoLogin);
router.post('/login', authController.login);

module.exports = router;
