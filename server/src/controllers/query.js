const pool = require('../config/database');
const { encryptIdCard, decryptIdCard } = require('../utils/crypto');
const { parseExcel, validateExcelFormat, extractDataFromExcel, exportErrorsToExcel } = require('../utils/excel');

function generateID(idCard) {
  let chars = idCard.split('').map(d => {
    if (/[\dXx]/.test(d)) {
      const num = d.toUpperCase() === 'X' ? 10 : parseInt(d);
      return String((num * 2) % 10);
    }
    return d;
  });
  const hexChars = ['A', 'B', 'C', 'D', 'E', 'F'];
  const insertCount = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < insertCount; i++) {
    const pos = Math.floor(Math.random() * (chars.length + 1));
    const letter = hexChars[Math.floor(Math.random() * hexChars.length)];
    chars.splice(pos, 0, letter);
  }
  return chars.join('');
}

function idCardToDoubled(idCard) {
  return idCard.split('').map(d => {
    if (d.toUpperCase() === 'X') return '0';
    return String((parseInt(d) * 2) % 10);
  }).join('');
}

function matchID(idValue, doubledStr) {
  const digits = idValue.replace(/[A-F]/g, '');
  return digits === doubledStr;
}

exports.queryRisk = async (req, res) => {
  try {
    const { idCard } = req.body;

    if (!idCard) {
      return res.status(400).json({
        success: false,
        message: '身份证号不能为空'
      });
    }

    const idCardStr = String(idCard).trim();
    if (!/^\d{17}[\dXx]$/.test(idCardStr)) {
      return res.status(400).json({
        success: false,
        message: '请输入18位有效身份证号码'
      });
    }

    const doubledStr = idCardToDoubled(idCardStr);

    const [allRecords] = await pool.query(
      'SELECT ID, risk_level, remark FROM risk_id_card'
    );

    let matchedRecord = null;
    for (const record of allRecords) {
      if (record.ID && matchID(record.ID, doubledStr)) {
        matchedRecord = record;
        break;
      }
    }

    if (matchedRecord) {
      res.json({
        success: true,
        data: {
          riskLevel: matchedRecord.risk_level,
          remark: matchedRecord.remark || '',
          hasRisk: true
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          riskLevel: '无风险',
          remark: '未查询到该身份证号的风险信息',
          hasRisk: false
        }
      });
    }
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({
      success: false,
      message: '查询失败，请稍后重试'
    });
  }
};

exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择文件'
      });
    }

    const excelData = parseExcel(req.file.buffer);
    const formatValidation = validateExcelFormat(excelData);

    if (!formatValidation.valid) {
      return res.status(400).json({
        success: false,
        message: formatValidation.error
      });
    }

    const { data: validData, errors } = extractDataFromExcel(excelData);

    console.log(`Import: ${validData.length} valid records, ${errors.length} validation errors`);

    let successCount = 0;
    const importErrors = [...errors];

    for (const item of validData) {
      try {
        const generatedID = generateID(item.idCard);
        await pool.query(
          `INSERT INTO risk_id_card (id_card, risk_level, remark, ID)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           risk_level = VALUES(risk_level),
           remark = VALUES(remark),
           ID = VALUES(ID),
           updated_at = CURRENT_TIMESTAMP`,
          [item.encryptedIdCard, item.riskLevel, item.remark, generatedID]
        );
        successCount++;
        console.log(`Success: ${item.idCard} -> ${item.riskLevel}`);
      } catch (error) {
        console.error(`Database error for ${item.idCard}:`, error.message);
        importErrors.push({
          row: excelData.findIndex(row => row[0] === item.idCard) + 2,
          idCard: item.idCard,
          reason: `数据库保存失败: ${error.message}`
        });
      }
    }

    console.log(`Import summary: ${successCount} success, ${importErrors.length} failed`);

    res.json({
      success: true,
      data: {
        total: validData.length + errors.length,
        success: successCount,
        failed: importErrors.length,
        errors: importErrors
      }
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      message: '导入失败，请稍后重试'
    });
  }
};

exports.importPhones = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择文件'
      });
    }

    const excelData = parseExcel(req.file.buffer);

    if (!excelData || excelData.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Excel文件格式错误：缺少表头或数据'
      });
    }

    const header = excelData[0];
    const phoneIndex = header.findIndex(h => String(h).trim().includes('手机号'));

    if (phoneIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Excel文件格式错误：缺少"手机号"列'
      });
    }

    let successCount = 0;
    const errors = [];

    for (let i = 1; i < excelData.length; i++) {
      const row = excelData[i];
      const phone = row[phoneIndex];
      const phoneStr = phone ? String(phone).trim() : '';

      if (!/^1[3-9]\d{9}$/.test(phoneStr)) {
        errors.push({
          row: i + 1,
          phone: phoneStr,
          reason: '手机号格式错误'
        });
        continue;
      }

      try {
        await pool.query(
          `INSERT INTO user_roles (phone, role)
           VALUES (?, 'user')
           ON DUPLICATE KEY UPDATE
           role = role`,
          [phoneStr]
        );
        successCount++;
      } catch (error) {
        console.error(`Database error for ${phoneStr}:`, error.message);
        errors.push({
          row: i + 1,
          phone: phoneStr,
          reason: `数据库保存失败: ${error.message}`
        });
      }
    }

    console.log(`Phone import summary: ${successCount} success, ${errors.length} failed`);

    res.json({
      success: true,
      data: {
        total: excelData.length - 1,
        success: successCount,
        failed: errors.length,
        errors: errors
      }
    });
  } catch (error) {
    console.error('Phone import error:', error);
    res.status(500).json({
      success: false,
      message: '导入失败，请稍后重试'
    });
  }
};

exports.updateRoles = async (req, res) => {
  try {
    const { phones, role } = req.body;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要修改的用户'
      });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '角色值无效'
      });
    }

    let successCount = 0;
    const errors = [];

    for (const phone of phones) {
      try {
        const [result] = await pool.query(
          'UPDATE user_roles SET role = ? WHERE phone = ?',
          [role, phone]
        );
        if (result.affectedRows > 0) {
          successCount++;
        } else {
          errors.push({ phone, reason: '用户不存在' });
        }
      } catch (error) {
        errors.push({ phone, reason: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        total: phones.length,
        success: successCount,
        failed: errors.length,
        errors
      }
    });
  } catch (error) {
    console.error('Update roles error:', error);
    res.status(500).json({
      success: false,
      message: '修改失败，请稍后重试'
    });
  }
};

exports.getUserList = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT phone, role, created_at FROM user_roles ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get user list error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
};

exports.exportFailures = (req, res) => {
  try {
    const { errors } = req.body;

    if (!errors || !Array.isArray(errors) || errors.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有失败数据'
      });
    }

    const buffer = exportErrorsToExcel(errors);

    if (!buffer) {
      return res.status(500).json({
        success: false,
        message: '生成Excel文件失败'
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=failed_data.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: '导出失败，请稍后重试'
    });
  }
};
