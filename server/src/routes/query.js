const express = require('express');
const router = express.Router();
const queryController = require('../controllers/query');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// 查询接口路径：/api/query/risk
router.post('/risk', authMiddleware, queryController.queryRisk);

// 管理员导入接口路径：/api/admin/import
router.post('/import', authMiddleware, adminMiddleware, upload.single('file'), queryController.importExcel);

// 管理员导出接口路径：/api/admin/export-failures
router.post('/export-failures', authMiddleware, adminMiddleware, queryController.exportFailures);

module.exports = router;