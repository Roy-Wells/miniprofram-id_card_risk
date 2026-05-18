-- 身份证风险查询数据库建表脚本
-- 数据库名：id_card_risk

-- 创建数据库
CREATE DATABASE IF NOT EXISTS id_card_risk DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE id_card_risk;

-- 身份证风险查询表
CREATE TABLE IF NOT EXISTS risk_id_card (
    id_card VARCHAR(18) PRIMARY KEY COMMENT '身份证号码（唯一索引）',
    risk_level VARCHAR(20) NOT NULL COMMENT '风险等级（高风险/中风险/低风险）',
    remark VARCHAR(500) COMMENT '风险备注信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_risk_level (risk_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='身份证风险查询表';

-- 管理员角色表
CREATE TABLE IF NOT EXISTS admin_role (
    phone VARCHAR(11) PRIMARY KEY COMMENT '管理员手机号（唯一索引）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员角色表';

-- 查询日志表（用于统计查询次数）
CREATE TABLE IF NOT EXISTS query_log (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
    id_card VARCHAR(18) NOT NULL COMMENT '身份证号码',
    query_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '查询时间',
    query_date DATE DEFAULT (CURRENT_DATE) COMMENT '查询日期',
    INDEX idx_id_card (id_card),
    INDEX idx_query_date (query_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='查询日志表';

-- 插入测试管理员
INSERT IGNORE INTO admin_role (phone) VALUES ('13800138000');