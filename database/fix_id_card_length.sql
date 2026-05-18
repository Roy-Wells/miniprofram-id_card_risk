-- 修复加密后的身份证号存储问题
-- AES 加密后字符串约 60 字符，需要将 id_card 字段改为 TEXT

USE id_card_risk;

-- 修改 id_card 字段类型为 TEXT
ALTER TABLE risk_id_card MODIFY COLUMN id_card TEXT NOT NULL COMMENT '身份证号码（AES加密）';

-- 查看修改结果
DESCRIBE risk_id_card;