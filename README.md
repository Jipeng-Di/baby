# Feedbook · Baby Feeding Log（宝宝喝奶记录）

移动端优先的 Next.js PWA。支持多宝宝、家庭共享、快速记录、历史修改与删除、7/30 天趋势。数据直接通过 Supabase Auth 和 PostgreSQL RLS 隔离；浏览器只持有公开的 anon/publishable key。

## 已部署环境

正式站点：<https://baby-feeding-blush.vercel.app>。生产数据库使用 Supabase 项目 `baby's app`。Vercel 项目为 `juliev42s-projects/baby-feeding`，已连接 GitHub 仓库 `Jipeng-Di/baby` 的 `main` 分支，推送后自动部署。项目设置和 `vercel.json` 均指定 Next.js 框架。

## 本地运行

需要 Node.js 20.9+。

1. `npm install`
2. 创建 Supabase Project（免费套餐即可）。
3. 在 Supabase Dashboard → SQL Editor 中按文件名顺序运行 `supabase/migrations/` 中的 migration。可先在测试项目运行，再应用到正式项目。
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

注册并登录 → 创建家庭或输入 10 位唯一家庭编码加入已有家庭 → 在“家庭”添加宝宝 → 在“今天”点快捷奶量 → 检查类型和时间 → 保存。每个账号只绑定一个家庭；家庭页可复制永久家庭编码，其他成员注册后输入编码即可共享数据。设备会按宝宝记住上次选择的奶类型。同一个已验证账号可在多台设备同时登录并共享数据；退出登录只结束当前设备会话。家庭成员可查看、添加、编辑和删除该家庭记录。

同一家庭的多台设备通过 Supabase Realtime 实时同步：需运行 `202611130002_realtime.sql`，把 `feedings`、`babies`、`growth_measurements`、`family_members` 加入 `supabase_realtime` publication（Realtime 沿用 RLS，只推送本家庭数据）。App 回到前台或断线重连时会自动补拉一次。首屏只加载最近 60 天的喝奶记录，历史页翻到更早月份时再按需加载。家庭页可导出 CSV 备份。界面跟随系统自动切换深色模式。今天页顶部显示当地天气：首次点按“显示当地天气”后请求定位，坐标保留两位小数（约 1 公里）发送给 Open-Meteo 获取天气、发送给 BigDataCloud 获取城市名，结果在本机缓存 30 分钟；点温度可切换 °C/°F。家庭页“设置”可切换界面语言（默认 English，可选简体中文），保存在本机，每位家人可各自选择；文案集中用 `lib/i18n.ts` 的 `tr('中文','English')` 编写。

生长页支持体重、身长/身高、头围三项（`202611140001_growth_metrics.sql`），均按 WHO 0–5 岁标准计算百分位（数据取自 WHO 官网扩展表，按月龄×30.4375 天取样，24 月龄前为卧位身长）。宝宝资料可填写出生孕周，不满 37 周时 24 月龄前按矫正月龄计算。最近一次测量较过去 6 个月跨过 2 条主要百分位线（P3/P15/P50/P85/P97）时显示提示，仅供参考；出生后前两周的测量不参与判断。

母乳可以按亲喂时长（分钟）记录（`202611150001_feeding_duration.sql`），录入时可在分钟与奶量之间切换。设置里可选奶量单位 ml / oz（只影响本机显示和输入，数据库统一存 ml）。“记录”页合并了历史和趋势。

“成长”页（`202611160001_baby_moments.sql`）分为时间线和生长曲线两部分。时间线显示宝宝当前所处阶段（如哭闹高峰、出牙）和健康提示，按就诊合并显示到期的体检和疫苗（可“记下这次就诊”一次勾选多项），并列出当前月龄值得留意的发育里程碑；家人可以记录里程碑、第一次、疫苗和体检，附一张照片（压缩后存入 `baby-avatars` 存储桶的 `<family_id>/moments/` 下）。指南内容在 `lib/guide.ts`：每条阶段、健康提示和“常见问题怎么办”（胀气、吐奶、感冒、发烧等）都带一篇权威科普文章的链接（主要来自美国儿科学会 HealthyChildren.org，中国地区另有国家卫健委文件），在今天卡片和指南“健康”页签里以“阅读”按钮显示；美国体检节点链接对应月龄的 AAP 体检清单，里程碑节点链接 CDC 清单。里程碑取自 CDC 2022 版清单（按矫正月龄），美国疫苗按 AAP 2026 程序，中国疫苗按《国家免疫规划疫苗儿童免疫程序及说明（2026 年版）》，疫苗和体检按实际月龄；设置里可切换“健康指南地区”（默认美国）。程序更新时只需修改该文件。

没有网络时保存的喝奶记录会先存在本机（`lib/outbox.ts`），首页显示“有 N 条记录还没同步”，联网、回到前台或每 30 秒自动补传；新记录的 id 在客户端生成，重复补传不会产生重复记录。删除需要联网。

宝宝“移出”采用软删除，历史记录保留。今日和趋势基于浏览器本地日期计算；数据库保存 UTC 时间。日期跨夏令时时也按本地日历日归类。趋势是描述性统计，不提供医疗建议。

## 部署到 Vercel

1. 推送到 GitHub 仓库 `Jipeng-Di/baby` 的 `main` 分支，Vercel 会自动部署到现有项目 `juliev42s-projects/baby-feeding`。
2. Vercel Project Settings → Environment Variables 已为 Production、Preview、Development 配置上述两个 `NEXT_PUBLIC_` 变量。
3. 如需手动部署，先确认本地关联的是上述项目，再运行 `vercel deploy --prod --scope juliev42s-projects`。项目设置和仓库的 `vercel.json` 均指定 Next.js 框架预设。
4. Supabase Authentication → URL Configuration 的 Site URL 已设为正式域名，Redirect URLs 已包含该域名的 `/auth`、`/reset-password` 及对应 localhost 地址。如使用 Preview 域名，也加入对应地址。
5. 测试注册、邮件验证、登录、重置密码、家庭邀请与记录。
6. 用 iPhone Safari 打开 HTTPS 网站，点击“分享” →“添加到主屏幕”。桌面图标打开后应为 standalone 窗口。Android Chrome 可通过安装菜单添加。

可将 Vercel 自定义域名设为稳定的访问地址。不要在浏览器使用 Service Role Key。

## 验证

- `npm run check`：类型检查 + ESLint + 单元测试（`tests/unit/`，覆盖月龄、WHO 百分位与偏离提醒、ml/oz 换算、快捷奶量、表单校验、离线队列、CSV）。
- `npm run build`
- `npm run screens`：登录后各页面的浅色/深色截图（需在 `.env.local` 设置 `TEST_EMAIL`、`TEST_PASSWORD`，并先 `npm run dev`）。加 `SCREENS_OFFLINE=1` 会额外验证离线记录在联网后自动同步（会在测试账号的家庭里写入并删除一条记录）。
- `npm run format`：Prettier 格式化。
- `npm run test:anon`：使用 `.env.local` 的公开 key 直接验证六张表和创建家庭 RPC 拒绝匿名访问。
- 在三个**已验证邮箱**的测试账号 A、B、C 和一次性 Supabase 测试项目上运行直接访问数据库的集成测试：设置 `TEST_USER_A_EMAIL`、`TEST_USER_A_PASSWORD`、B/C 对应变量以及上述两个 Supabase 环境变量，然后运行 `npm run test:rls`。测试会创建家庭、宝宝、邀请和喝奶数据，不会自动清理；请使用一次性项目。
- 手工检查 iPhone 尺寸：注册 → 家庭 → Allie/Billie → +90 → 保存 → 修改为 100 → 删除 → 家人通过链接加入 → 家人记录 Billie → 刷新原账号 → 查看趋势、历史与主屏幕安装。

已在生产项目使用事务内的 A/B/C 临时身份直接验证跨家庭读取、写入拒绝、邀请加入和共享更新；测试事务已回滚，复查测试家庭、宝宝和记录数量均为 0。实际邮箱注册、邮件验证和 iPhone 主屏幕安装仍需由真实用户设备完成。

## 结构

`app/` App Router 页面；`components/App.tsx` 数据加载、实时同步、离线队列和页面切换，各页面与弹窗在 `components/` 下独立成文件（`TodayView`、`HistoryCalendar`、`TrendView`、`GrowthView`、`FamilyPage`、`FeedSheet`、`SettingsSheet`、`Onboarding`、`AuthViews`）；`lib/` 纯逻辑（类型、时间、单位、表单校验、离线队列、WHO 生长标准）和 Supabase 客户端；`supabase/migrations/` 数据库迁移；`tests/rls.mjs` 跨家庭权限集成测试；`tests/unit/` 单元测试；`tests/screens.mjs` 登录后截图；`public/` PWA manifest 与图标。
