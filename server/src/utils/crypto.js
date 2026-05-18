const CryptoJS = require('crypto-js');

const SECRET_KEY = process.env.JWT_SECRET || 'default-secret-key';

exports.encryptIdCard = (idCard) => {
  return CryptoJS.AES.encrypt(idCard, SECRET_KEY).toString();
};

exports.decryptIdCard = (encrypted) => {
  const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};