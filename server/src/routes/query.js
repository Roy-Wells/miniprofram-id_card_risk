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

// 管理员导入手机号：/api/admin/import-phones
router.post('/import-phones', authMiddleware, adminMiddleware, upload.single('file'), queryController.importPhones);

// 管理员修改角色：/api/admin/update-roles
router.post('/update-roles', authMiddleware, adminMiddleware, queryController.updateRoles);

// 管理员删除用户：/api/admin/delete-users
router.post('/delete-users', authMiddleware, adminMiddleware, queryController.deleteUsers);

// 管理员重置用户密码：/api/admin/reset-password
router.post('/reset-password', authMiddleware, adminMiddleware, queryController.resetPassword);

// 管理员获取用户列表：/api/admin/users（支持 search 参数）
router.get('/users', authMiddleware, adminMiddleware, queryController.getUserList);

// 管理员导出接口路径：/api/admin/export-failures
router.post('/export-failures', authMiddleware, adminMiddleware, queryController.exportFailures);

module.exports = router;
