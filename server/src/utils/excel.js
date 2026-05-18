const XLSX = require('xlsx');
const { encryptIdCard } = require('./crypto');

exports.parseExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  return data;
};

exports.validateExcelFormat = (data) => {
  if (!data || data.length < 2) {
    return { valid: false, error: 'Excel文件格式错误：缺少表头或数据' };
  }

  const header = data[0];
  const requiredColumns = ['身份证号', '风险等级', '备注'];
  const headerText = header.map(h => String(h).trim());

  for (const col of requiredColumns) {
    if (!headerText.includes(col)) {
      return { valid: false, error: `Excel文件格式错误：缺少"${col}"列` };
    }
  }

  return { valid: true };
};

exports.extractDataFromExcel = (data) => {
  const header = data[0];
  const idCardIndex = header.indexOf('身份证号');
  const riskLevelIndex = header.indexOf('风险等级');
  const remarkIndex = header.indexOf('备注');

  const result = [];
  const errors = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const idCard = row[idCardIndex];
    const riskLevel = row[riskLevelIndex];
    const remark = row[remarkIndex];

    const error = validateRow(idCard, riskLevel, i + 1);
    if (error) {
      errors.push(error);
      continue;
    }

    result.push({
      idCard: String(idCard).trim(),
      riskLevel: String(riskLevel).trim(),
      remark: remark ? String(remark).trim() : null,
      encryptedIdCard: encryptIdCard(String(idCard).trim())
    });
  }

  return { data: result, errors };
};

exports.exportErrorsToExcel = (errors) => {
  if (!errors || errors.length === 0) {
    return null;
  }

  const workbook = XLSX.utils.book_new();
  const data = [['行号', '身份证号', '错误原因']];

  errors.forEach(error => {
    data.push([error.row, error.idCard || '', error.reason]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, '失败数据');

  try {
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  } catch (error) {
    console.error('Excel write error:', error);
    throw new Error('生成Excel文件失败');
  }
};

function validateRow(idCard, riskLevel, rowNumber) {
  if (!idCard || String(idCard).trim() === '') {
    return { row: rowNumber, idCard: '', reason: '身份证号不能为空' };
  }

  const idCardStr = String(idCard).trim();
  if (!/^\d{17}[\dXx]$/.test(idCardStr)) {
    return { row: rowNumber, idCard: idCardStr, reason: '身份证号格式错误' };
  }

  if (!riskLevel || String(riskLevel).trim() === '') {
    return { row: rowNumber, idCard: idCardStr, reason: '风险等级不能为空' };
  }

  return null;
}