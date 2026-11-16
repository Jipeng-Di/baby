# App Store listing: Feedbook 1.0.0

Everything App Store Connect asks for, ready to paste. Demo-account credentials live in `.env.local` (git-ignored), not here.
Re-create them with `scripts/seed-demo-account.mjs`.

## App information

| Field | Value |
|---|---|
| Name | Feedbook: Baby Feeding Log |
| Subtitle (en) | Shared feeding & growth log |
| Subtitle (zh-Hans) | 全家共享的喂奶与成长记录 |
| Bundle ID | com.jipengdi.feedbook |
| SKU | feedbook-ios-1 |
| Primary language | English (U.S.) |
| Primary category | Health & Fitness |
| Secondary category | Lifestyle |
| Content rights | Does not contain, show or access third-party content |
| Age rating | "None" for every content question except Medical or Treatment Information: "Infrequent/Mild" (the growth guide has vaccine schedules and when-to-call-a-doctor tips). No web browsing, gambling, ads, chat or public user content. |
| Price | Free |
| Support URL | https://baby-feeding-three.vercel.app/support |
| Marketing URL | https://baby-feeding-three.vercel.app |
| Privacy policy URL | https://baby-feeding-three.vercel.app/privacy |
| Copyright | 2026 Jipeng Di |

If "Feedbook" is taken as an App Store name, use "Feedbook – Baby Feed Tracker".

## Description (English)

Promotional text (170 chars max):

> Log a feed in one tap, see when your baby last ate, and keep everyone who cares for them on the same page, even offline.

Description:

> Feedbook is a calm, simple log for the busiest months of your life. Tap once to record a bottle, see at a glance how long it has been since the last feed, and share everything with your partner, grandparents or nanny in real time.
>
> LOG IN A SECOND
> • One-tap quick log with amounts that adapt to your baby
> • Formula, breast milk or mixed, in ml or oz
> • Nursing sessions in minutes
> • Works offline and syncs when you're back online
>
> SHARE WITH YOUR FAMILY
> • Invite family with a 10-character code
> • Every record shows who logged it
> • Changes appear on everyone's phone instantly
> • Twins and siblings each get their own card
>
> SEE THE BIGGER PICTURE
> • Calendar of daily totals and every feed
> • 7- and 30-day trends: ml per day, feeds per day, ml per feed
> • WHO growth charts for weight, length and head circumference, with percentiles
> • Corrected age for babies born early
>
> REMEMBER THE MOMENTS
> • A growth timeline with milestones to look out for, vaccine and checkup schedules (US and China)
> • Save firsts, checkups and vaccines with notes
>
> YOUR DATA, YOUR CHOICE
> • No ads, no tracking, no third-party analytics
> • Export everything to CSV
> • Delete your account and data any time, right in the app
>
> Feedbook is for record keeping and general information only. It does not give medical advice. Talk to your pediatrician about your baby's feeding and growth.

Keywords (100 chars max):

> baby,feeding,tracker,newborn,bottle,formula,breastfeeding,growth chart,percentile,log,twins,nursing

## Description (简体中文)

推广文本：

> 一键记录喂奶，随时看到距上次喂奶多久，全家实时同步，离线也能用。

描述：

> Feedbook 是为忙碌的新手家庭准备的简洁喂养记录。轻点一下就能记下一顿奶，一眼看到距离上次喂奶过了多久，并和伴侣、老人或育儿嫂实时共享。
>
> 一秒记录
> • 一键快捷记录，常用奶量自动适配
> • 配方奶、母乳、混合喂养，支持 ml 和 oz
> • 亲喂按分钟记录
> • 离线可用，联网后自动同步
>
> 全家共享
> • 用 10 位家庭编码邀请家人
> • 每条记录都标注记录人
> • 修改会立刻出现在所有家人的手机上
> • 双胞胎、多宝各有独立卡片
>
> 看清趋势
> • 日历查看每天总量和每一顿
> • 7 天、30 天趋势：日奶量、日次数、每顿奶量
> • 世卫组织生长曲线（体重、身长、头围）与百分位
> • 早产宝宝自动使用矫正月龄
>
> 记录成长
> • 成长时间线：里程碑提示、疫苗与体检计划（中国、美国）
> • 记录第一次、体检和疫苗，附带备注
>
> 数据由你掌控
> • 无广告、无追踪、无第三方统计
> • 全部数据可导出为 CSV
> • 可随时在应用内删除账号和数据
>
> Feedbook 仅用于记录和一般参考，不提供医疗建议。宝宝的喂养和生长问题请咨询儿科医生。

关键词：

> 喂奶,喂养记录,宝宝,新生儿,母乳,配方奶,奶量,生长曲线,百分位,育儿,双胞胎,亲喂,成长记录

## Screenshots

Files: `screens/appstore/` (git-ignored). iPhone 6.9" (1320 × 2868), six per language, in this order: Today, Growth chart, History calendar,
Trends, Growth timeline, Family. The 6.9" set is scaled down automatically for smaller iPhones. No
iPad screenshots are needed because the app is iPhone only.

## App Privacy ("nutrition label")

Tracking: **No**, the app does not track users.

Data collected, all **linked to the user**, **not used for tracking**, purpose **App Functionality**:

| Category | Type | Why |
|---|---|---|
| Contact Info | Email Address | Sign-in |
| Contact Info | Name | Display name shown to family members |
| Health & Fitness | Health | Feeding records, growth measurements, gestational age |
| User Content | Photos or Videos | Optional baby photos |
| User Content | Other User Content | Notes, moments, baby name and birthday |
| Identifiers | User ID | Account ID that links records to the family |
| Sensitive Info | Sensitive Info | Gestational age at birth counts as childbirth information |

Also collected, **not linked to the user**, not used for tracking, purpose App Functionality:
**Location → Coarse Location**. Only after the user taps "Show local weather", the device sends
coordinates rounded to about 1 km straight to the weather providers (Open-Meteo, BigDataCloud),
without any account information. It never reaches our server.

Not collected: usage data, diagnostics, purchases, financial info, contacts, phone number, browsing
or search history, device ID.
server, approximate to about 1 km, and only after the user taps "Show local weather"), usage data,
diagnostics, purchases, financial info, contacts, browsing or search history.

## Export compliance

`ITSAppUsesNonExemptEncryption` is already `false` in Info.plist, so no question is asked per build.

## App Review information

Sign-in required: **Yes**. Use the demo account (credentials are in the release hand-off, not in
this repo).

Notes for the reviewer:

> Feedbook is a shared baby feeding and growth log. The demo account belongs to a sample family with a four-month-old (Mia), two parents ("Sam" is you, "Alex" is the partner) and two weeks of data.
>
> Things to try:
> 1. Today: tap a quick-log amount (e.g. +150) and Save. The "Since last feed" timer resets.
> 2. Records: the calendar shows daily totals. Trends shows 7- and 30-day statistics.
> 3. Growth → Growth chart: WHO percentile chart. Pinch to zoom or use the + / − buttons.
> 4. Growth → Timeline: milestones, vaccines and checkups, plus saved moments.
> 5. Family → Settings: language (English / 简体中文), units, CSV export, and Delete account (please don't delete the demo account).
>
> Sharing: a second account can join the same family with the code under Family → Family code. Location is only requested if you tap "Show local weather" on Today; it's optional.
>
> The app contains no ads, no in-app purchases and no third-party tracking. Health content is general reference information from CDC, AAP, WHO and China's National Disease Control and Prevention Administration, and the app states it is not medical advice.
