# Hilton Reservation System

本项目实现了面试题要求的在线餐厅订位系统，Node.js 后端同时提供静态页面。

## 技术选型
- 后端：Node.js + TypeScript + Express + Apollo Server + MongoDB(Mongoose)
- 测试：Jest（后端）

## 项目结构
- `src/` 后端服务
  - `routes/` REST 路由
  - `graphql/` GraphQL schema 与 resolver
  - `services/` 业务逻辑
  - `repositories/` 数据访问实现
  - `interfaces/` 仓储接口定义
  - `models/` 领域模型
  - `db/` 数据库 schema
  - `middleware/` 中间件
- `public/` 静态页面

## 运行方式（Docker）
```bash
docker compose up --build
```
默认端口：
- `http://localhost:4000`

## 本地运行（不使用 Docker）
```bash
npm install
npm run dev
```

## 认证说明
- `/auth/register` 注册（支持 guest 与 employee）
- `/auth/login` 登录后获取 JWT
- GraphQL 预订创建支持快速预订（无需登录）；更新/取消需要登录
- 员工账号可查询全部预订并更新状态

## 支持功能
- 注册/登录（guest 与 employee）
- 快速预订（无需登录）
- 预订必须选择餐次（Lunch / Dinner）
- 同一电话或邮箱同一天同餐次仅能预订一次
- 预订日期与到店时间分开输入
- 午餐时间 10:30-14:30，晚餐时间 17:00-22:00
- 预订时间不能早于当前时间
- 人数 1-10
- guest 登录后可查看自己的预订列表
- guest 可在列表内更新/取消（取消与完成状态不允许操作）
- update 后状态自动回到 Requested
- employee 可查看全量预订列表（按到店时间由近到远）
- employee 可按日期/状态筛选
- employee 仅可按流程变更状态（Requested→Approved→Completed，随时可 Cancel）

## GraphQL 示例
创建预订：
```graphql
mutation {
  createReservation(input: {
    guestName: "Alice",
    guestPhone: "10086",
    guestEmail: "alice@example.com",
    expectedArrivalTime: "2026-01-28 19:30",
    mealPeriod: Dinner,
    tableSize: 4
  }) {
    id
    status
  }
}
```

## 测试
```bash
npm test
```

## 假设说明
- 预订与用户账号未强制绑定（便于客人快速创建预订）
- 更新/取消需要登录，以便进行权限校验
