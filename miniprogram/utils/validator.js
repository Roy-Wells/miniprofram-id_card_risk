function validateIdCard(idCard) {
  if (!idCard || typeof idCard !== 'string') {
    return false;
  }
  const idCardStr = idCard.trim();
  return /^\d{17}[\dXx]$/.test(idCardStr);
}

function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  return /^1[3-9]\d{9}$/.test(phone.trim());
}

module.exports = {
  validateIdCard,
  validatePhone
};