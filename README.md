# 身份证风险查询微信小程序

一个轻量化的微信小程序，实现身份证风险信息查询和Excel批量导入功能。

## 项目结构

```
my-miniprogram/
├── miniprogram/                 # 小程序前端
│   ├── pages/                    # 页面
│   │   ├── login/               # 授权登录页
│   │   ├── query/               # 普通用户查询页
│   │   └── admin/               # 管理员页
│   ├── utils/                    # 工具函数
│   │   ├── request.js           # 请求封装
│   │   └── validator.js         # 验证工具
│   ├── app.js                    # 小程序入口
│   ├── app.json                  # 小程序配置
│   └── app.wxss                  # 全局样式
├── server/                       # 后端服务
│   ├── src/
│   │   ├── config/              # 配置
│   │   ├── controllers/         # 控制器
│   │   ├── routes/              # 路由
│   │   ├── middleware/          # 中间件
│   │   ├── utils/               # 工具
│   │   └── app.js               # Express入口
│   ├── package.json
│   └── .env                     # 环境变量
└── database/
    └── schema.sql               # 数据库建表SQL
```

## 功能特性

### 普通用户
- 微信授权登录
- 输入身份证号查询风险信息
- 查看查询结果和当日查询次数

### 管理员
- 所有普通用户功能
- Excel批量导入风险数据
- 查看导入结果和失败详情
- 下载失败数据

## 快速开始

### 1. 数据库初始化

```bash
mysql -u root -p < database/schema.sql
```

### 2. 后端服务启动

```bash
cd server
npm install
npm start
```

修改 `server/.env` 配置数据库连接信息：
```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=id_card_risk
JWT_SECRET=your-secret-key
```

### 3. 小程序开发

1. 使用微信开发者工具打开 `miniprogram` 目录
2. 修改 `miniprogram/utils/request.js` 中的 `baseUrl` 为实际后端地址
3. 在开发者工具中点击编译预览

## API文档

### 认证接口

#### 登录
```
POST /api/auth/login
Body: { "phone": "手机号" }
Response: { "success": true, "data": { "token": "...", "role": "admin|user", "phone": "..." } }
```

### 查询接口

#### 查询风险
```
POST /api/query/risk
Headers: { "Authorization": "Bearer <token>" }
Body: { "idCard": "身份证号" }
Response: { "success": true, "data": { "queryTime": "...", "queryCount": 0, "riskLevel": "...", "remark": "..." } }
```

#### 导入Excel
```
POST /api/admin/import
Headers: { "Authorization": "Bearer <token>" }
Body: multipart/form-data with file
Response: { "success": true, "data": { "total": 100, "success": 98, "failed": 2, "errors": [...] } }
```

## Excel导入格式

| 身份证号 | 风险等级 | 备注 |
|---------|---------|------|
| 360322200407133511 | 高风险 | 失信人员 |

## 测试账号

测试管理员手机号：13800138000

## 技术栈

- 前端：微信小程序（原生WXML/WXSS/JS）
- 后端：Node.js + Express + MySQL
- 数据库：MySQL 8.0+
- 其他：crypto-js（加密）、xlsx（Excel处理）、jsonwebtoken（认证）

## 注意事项

- 身份证号使用AES加密存储
- 所有接口需要JWT认证
- 登录状态有效期7天
- 单次导入最大支持1000条数据

## License

ISC

