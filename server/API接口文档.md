# 视频时间限制器 API 接口文档

## 项目概述

本项目是一个视频观看时间限制器的后端服务，提供用户视频观看时间的记录、查询和限制设置功能。

## 基础信息

- **基础URL**: `http://localhost:8080`
- **API版本**: v1
- **数据格式**: JSON
- **字符编码**: UTF-8

## 接口列表

### 1. 获取用户视频数据

**接口描述**: 获取指定用户的视频观看数据，包括限制时间、已观看时间和最后更新时间。

- **URL**: `/api/v1/videos/{userId}`
- **方法**: `GET`
- **路径参数**:
  - `userId` (string, 必需): 用户ID

**响应示例**:
```json
{
  "limitTime": 60000,
  "watchTime": 1500,
  "lastAt": "2025-01-15T10:30:00Z"
}
```

**响应字段说明**:
- `limitTime` (int): 每日观看时间限制，单位：毫秒
- `watchTime` (int): 当日已观看时间，单位：毫秒
- `lastAt` (string): 最后更新时间，ISO 8601格式

**特殊说明**:
- 如果用户首次访问，系统会返回默认限制时间（60000毫秒）
- 如果跨天访问，观看时间会自动重置为0

---

### 2. 提交观看记录

**接口描述**: 提交用户的视频观看记录，累加到当日总观看时间中。

- **URL**: `/api/v1/videos/{userId}`
- **方法**: `POST`
- **路径参数**:
  - `userId` (string, 必需): 用户ID
- **请求头**:
  - `Content-Type: application/json`

**请求体示例**:
```json
{
  "url": "https://example.com/video123",
  "watchTime": 1800,
  "at": "2025-01-15T10:30:00Z"
}
```

**请求字段说明**:
- `url` (string, 必需): 观看的视频URL
- `watchTime` (int, 必需): 本次观看时长，单位：毫秒
- `at` (string, 可选): 观看时间，ISO 8601格式

**响应示例**:
```json
{
  "limitTime": 60000,
  "watchTime": 3300,
  "lastAt": "2025-01-15T10:30:00Z"
}
```

**功能说明**:
- 系统会将本次观看时长累加到用户当日总观看时间
- 更新最后观看时间
- 返回更新后的用户数据

---

### 3. 设置观看时间限制

**接口描述**: 设置用户每日视频观看时间限制。

- **URL**: `/api/v1/videos/{userId}`
- **方法**: `PUT`
- **路径参数**:
  - `userId` (string, 必需): 用户ID
- **请求头**:
  - `Content-Type: application/json`

**请求体示例**:
```json
{
  "limitTime": 120000,
  "customMessage": "您今天的视频观看时间已达到限制！请适当休息。"
}
```

**请求字段说明**:
- `limitTime` (int, 必需): 每日观看时间限制，单位：毫秒
- `customMessage` (string, 可选): 自定义提示内容

**响应示例**:
```json
{
  "limitTime": 120000,
  "watchTime": 1500,
  "lastAt": "2025-01-15T10:30:00Z",
  "customMessage": "您今天的视频观看时间已达到限制！请适当休息。"
}
```

**功能说明**:
- 更新用户的每日观看时间限制
- 不影响当前已观看时间
- 返回更新后的用户数据

---

## 数据模型

### VideoSubmit (提交观看记录)
```json
{
  "url": "string",        // 视频URL
  "watchTime": "int",     // 观看时长（毫秒）
  "at": "string"          // 观看时间（ISO 8601格式）
}
```

### VideoSetting (设置限制时间)
```json
{
  "limitTime": "int",      // 限制时间（毫秒）
  "customMessage": "string" // 自定义提示内容（可选）
}
```

### VideoData (用户视频数据)
```json
{
  "limitTime": "int",       // 限制时间（毫秒）
  "watchTime": "int",       // 已观看时间（毫秒）
  "lastAt": "string",       // 最后更新时间（ISO 8601格式）
  "customMessage": "string"  // 自定义提示内容
}
```

---

## 错误处理

### 通用错误格式
```json
{
  "code": 1001,
  "message": "错误描述",
  "status": 400
}
```

### 常见错误码
- `1001`: 未授权访问
- `1002`: 用户名已被使用
- `1003`: 用户名或密码错误
- `1004`: 用户不存在

---

## 使用示例

### 获取用户数据
```bash
curl -X GET "http://localhost:8080/api/v1/videos/user123"
```

### 提交观看记录
```bash
curl -X POST "http://localhost:8080/api/v1/videos/user123" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/video",
    "watchTime": 1800,
    "at": "2025-01-15T10:30:00Z"
  }'
```

### 设置时间限制
```bash
curl -X PUT "http://localhost:8080/api/v1/videos/user123" \
  -H "Content-Type: application/json" \
  -d '{
    "limitTime": 120000,
    "customMessage": "您今天的视频观看时间已达到限制！请适当休息。"
  }'
```

---

## 技术栈

- **框架**: Go + Gin + Gone框架
- **数据存储**: JSON文件存储
- **部署**: Docker容器化部署
- **端口**: 8080

---

## 注意事项

1. **时间单位**: 所有时间相关字段均以毫秒为单位
2. **跨天重置**: 用户观看时间会在跨天时自动重置为0
3. **并发安全**: 系统使用键级别的互斥锁确保并发安全
4. **默认限制**: 新用户默认每日观看时间限制为60秒（60000毫秒）
5. **数据持久化**: 数据存储在`data/db.json`文件中

---

## 健康检查

系统提供健康检查接口用于监控服务状态：
- **URL**: `/api/health-check`
- **方法**: `GET`
- **用途**: Docker容器健康检查