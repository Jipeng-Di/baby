# 奶记 · 宝宝喝奶记录

移动端优先的 Next.js PWA。支持多宝宝、家庭共享、快速记录、历史修改与删除、7/30 天趋势。数据直接通过 Supabase Auth 和 PostgreSQL RLS 隔离；浏览器只持有公开的 anon/publishable key。

## 本地运行

需要 Node.js 20.9+。

1. `npm install`
2. 创建 Supabase Project（免费套餐即可）。
3. 在 Supabase Dashboard → SQL Editor 中运行 `supabase/migrations/202609200001_initial.sql` 的全部内容。可先在测试项目运行，再应用到正式项目。
4. 在 Project Settings → API 获取 Project URL 和 publishable/anon key。复制 `.env.example` 为 `.env.local` 并填写：

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   ```

5. 在 Authentication → URL Configuration 中设置 Site URL 为本地 `http://localhost:3000`，并添加 Redirect URLs：`http://localhost:3000/auth`、`http://localhost:3000/reset-password`。正式部署后也添加对应的 HTTPS URL。
6. 在 Authentication → Providers → Email 中启用 Email。若开启邮件验证，注册后需先点验证邮件中的链接才能登录。Supabase 免费项目的默认邮件服务有速率限制，正式邀请其他用户前请按 Supabase 控制台提示配置 SMTP。
7. `npm run dev`，打开 `http://localhost:3000`。

**不要**将 Service Role Key、数据库密码放入 `NEXT_PUBLIC_` 环境变量、浏览器代码或 Git。此应用不需要 Service Role Key。

## 使用

注册并登录 → 创建家庭 → 在“家庭”添加宝宝 → 在“今天”点 `+60/+90/+120` → 检查类型和时间 → 保存。设备会按宝宝记住上次选择的奶类型。家庭页生成 7 天有效的邀请链接；其他用户注册/登录后打开链接即可加入。加入者可查看、添加、编辑和删除该家庭记录。

宝宝“移出”采用软删除，历史记录保留。今日和趋势基于浏览器本地日期计算；数据库保存 UTC 时间。日期跨夏令时时也按本地日历日归类。趋势是描述性统计，不提供医疗建议。

## 部署到 Vercel

1. 推送仓库到 GitHub，并在 Vercel 导入该仓库。
2. 在 Vercel Project Settings → Environment Variables 中添加上面两个 `NEXT_PUBLIC_` 变量，应用到 Production（以及需要的 Preview）。
3. 部署。Vercel 默认识别 Next.js，无需额外构建配置；免费套餐可运行。
4. 在 Supabase Authentication → URL Configuration 中将 Site URL 设为正式 Vercel 域名，Redirect URLs 加入 `https://YOUR_DOMAIN/auth` 和 `https://YOUR_DOMAIN/reset-password`。如使用 Preview 域名，也加入对应地址。
5. 测试注册、邮件验证、登录、重置密码、家庭邀请与记录。
6. 用 iPhone Safari 打开 HTTPS 网站，点击“分享” →“添加到主屏幕”。桌面图标打开后应为 standalone 窗口。Android Chrome 可通过安装菜单添加。

可将 Vercel 自定义域名设为稳定的邀请链接地址。不要在浏览器使用 Service Role Key。

## 验证

- `npm run typecheck`
- `npm run build`
- 在三个**已验证邮箱**的测试账号 A、B、C 和一次性 Supabase 测试项目上运行直接访问数据库的集成测试：设置 `TEST_USER_A_EMAIL`、`TEST_USER_A_PASSWORD`、B/C 对应变量以及上述两个 Supabase 环境变量，然后运行 `npm run test:rls`。测试会创建家庭、宝宝、邀请和喝奶数据，不会自动清理；请使用一次性项目。
- 手工检查 iPhone 尺寸：注册 → 家庭 → Allie/Billie → +90 → 保存 → 修改为 100 → 删除 → 家人通过链接加入 → 家人记录 Billie → 刷新原账号 → 查看趋势、历史与主屏幕安装。

没有提供 Supabase 项目凭据时，仓库可以完成构建，但线上注册和数据库/RLS 集成测试必须在你的 Supabase 项目配置好后执行。

## 结构

`app/` App Router 页面；`components/App.tsx` 移动端界面和操作；`lib/` 类型、时间和 Supabase 客户端；`supabase/migrations/` 数据库迁移；`tests/rls.mjs` 跨家庭权限集成测试；`public/` PWA manifest 与图标。
