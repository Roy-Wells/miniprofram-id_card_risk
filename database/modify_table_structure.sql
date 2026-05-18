-- 修改 risk_id_card 表结构，所有字段改为 VARCHAR(100)

USE id_card_risk;

-- 删除表重建（更简单的方式）
DROP TABLE IF EXISTS risk_id_card;

CREATE TABLE risk_id_card (
    id_card VARCHAR(100) NOT NULL COMMENT '身份证号码（AES加密）',
    risk_level VARCHAR(100) NOT NULL COMMENT '风险等级',
    remark VARCHAR(100) COMMENT '风险备注信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id_card)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='身份证风险查询表';

-- 查看修改结果
DESCRIBE risk_id_card;