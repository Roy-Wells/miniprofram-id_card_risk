const pool = require('../config/database');
const { encryptIdCard, decryptIdCard } = require('../utils/crypto');
const { parseExcel, validateExcelFormat, extractDataFromExcel, exportErrorsToExcel } = require('../utils/excel');

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

    const encryptedIdCard = encryptIdCard(idCardStr);

    const [results] = await pool.query(
      'SELECT id_card, risk_level, remark FROM risk_id_card WHERE id_card = ?',
      [encryptedIdCard]
    );

    await pool.query(
      'INSERT INTO query_log (id_card) VALUES (?)',
      [idCardStr]
    );

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as count FROM query_log WHERE id_card = ? AND query_date = CURDATE()',
      [idCardStr]
    );

    const queryCount = countResult[0].count;
    const now = new Date();
    const queryTime = now.toISOString().replace('T', ' ').substring(0, 19);

    if (results.length > 0) {
      const result = results[0];
      res.json({
        success: true,
        data: {
          queryTime,
          queryCount,
          riskLevel: result.risk_level,
          remark: result.remark || '',
          hasRisk: true
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          queryTime,
          queryCount,
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
        await pool.query(
          `INSERT INTO risk_id_card (id_card, risk_level, remark)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
           risk_level = VALUES(risk_level),
           remark = VALUES(remark),
           updated_at = CURRENT_TIMESTAMP`,
          [item.encryptedIdCard, item.riskLevel, item.remark]
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
    res.setHeader('Content-Disposition', 'attachment; filename="失败数据.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: '导出失败，请稍后重试'
    });
  }
};