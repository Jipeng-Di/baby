import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Feedbook · Privacy Policy / 隐私政策'};

const UPDATED = '2026-11-16';
const h2 = 'pt-2 text-lg font-semibold';
const list = 'list-disc space-y-1 pl-5';

/** Public privacy policy, linked from the App Store listing and the settings sheet. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-lg space-y-10 px-5 py-10 text-(--ink)">
      <section className="space-y-4 text-[15px] leading-relaxed">
        <h1 className="text-2xl font-semibold">Feedbook 隐私政策</h1>
        <p className="text-sm text-(--muted)">更新日期：{UPDATED}</p>
        <p>
          Feedbook
          是一款帮助家庭记录宝宝喂养和成长的应用，由开发者个人运营。本政策说明我们收集哪些信息、如何使用，以及你拥有的权利。
        </p>
        <h2 className={h2}>我们收集的信息</h2>
        <ul className={list}>
          <li>
            <strong>账号信息</strong>：注册时的电子邮箱和密码（密码以加密形式保存，我们无法查看）。
          </li>
          <li>
            <strong>你主动记录的内容</strong>
            ：宝宝姓名、昵称、出生日期、性别、出生孕周、喂奶记录、生长测量、成长时刻及备注、你上传的照片。
          </li>
          <li>
            <strong>家庭成员信息</strong>：同一家庭内成员的显示名称，用于标注“记录人”。
          </li>
          <li>
            <strong>位置信息（可选）</strong>
            ：仅当你在“今天”页点按“显示当地天气”并授权后，应用会把保留两位小数（约 1 公里精度）的坐标发送给
            Open-Meteo 获取天气、发送给 BigDataCloud 获取城市名。位置不会上传到我们的服务器。
          </li>
        </ul>
        <p>我们不收集广告标识符，不使用第三方分析或广告 SDK，不出售任何数据。</p>
        <h2 className={h2}>信息如何使用和存储</h2>
        <p>
          数据只用于向你和你的家庭成员提供记录、同步和导出功能。数据存储在
          Supabase（托管于其云基础设施）并通过行级安全策略隔离：只有同一家庭的成员能读取该家庭的数据。你的记录会在你的设备上缓存，以便离线使用。
        </p>
        <h2 className={h2}>儿童信息</h2>
        <p>应用面向家长和照护者。宝宝信息由家长录入并仅在其家庭内可见。我们不向 13 岁以下儿童提供账号。</p>
        <h2 className={h2}>你的权利</h2>
        <ul className={list}>
          <li>
            <strong>导出</strong>：在设置里可随时把喂奶、生长和成长时刻记录导出为 CSV。
          </li>
          <li>
            <strong>删除</strong>
            ：在设置的“账户”里可以删除账号。删除后你的账号、你作为唯一成员的家庭及其全部记录和照片会被永久删除；若家庭还有其他成员，你创建的记录会保留给他们，但不再与你的账号关联。
          </li>
          <li>
            <strong>退出</strong>：随时可以退出登录，本机缓存的数据会在下次登录时刷新。
          </li>
        </ul>
        <h2 className={h2}>联系方式</h2>
        <p>
          对本政策有任何疑问，请通过 App Store
          页面的“开发者网站”或“支持”链接联系我们。本政策更新时会在本页面公布。
        </p>
      </section>

      <section className="space-y-4 border-t border-(--line) pt-10 text-[15px] leading-relaxed">
        <h1 className="text-2xl font-semibold">Feedbook Privacy Policy</h1>
        <p className="text-sm text-(--muted)">Last updated: {UPDATED}</p>
        <p>
          Feedbook helps families log a baby’s feedings and growth. It is run by an individual developer. This
          policy explains what we collect, how it is used and the choices you have.
        </p>
        <h2 className={h2}>What we collect</h2>
        <ul className={list}>
          <li>
            <strong>Account</strong>: the email address and password you sign up with (passwords are stored
            hashed; we cannot read them).
          </li>
          <li>
            <strong>What you log</strong>: baby name, nickname, date of birth, sex, gestational age, feedings,
            growth measurements, moments and notes, and photos you upload.
          </li>
          <li>
            <strong>Family members</strong>: display names of people in the same family, used to show who
            logged a record.
          </li>
          <li>
            <strong>Location (optional)</strong>: only if you tap “Show local weather” on the Today page and
            allow it. Coordinates rounded to two decimals (about 1 km) are sent to Open-Meteo for the forecast
            and to BigDataCloud for the place name. Location is never sent to our servers.
          </li>
        </ul>
        <p>We do not collect advertising identifiers, use analytics or advertising SDKs, or sell any data.</p>
        <h2 className={h2}>How it is used and stored</h2>
        <p>
          Data is used only to provide logging, syncing and export for you and your family. It is stored with
          Supabase (on its cloud infrastructure) and isolated with row-level security: only members of the
          same family can read that family’s data. Records are cached on your device so the app works offline.
        </p>
        <h2 className={h2}>Children</h2>
        <p>
          The app is for parents and caregivers. Information about babies is entered by parents and visible
          only within their family. We do not offer accounts to children under 13.
        </p>
        <h2 className={h2}>Your choices</h2>
        <ul className={list}>
          <li>
            <strong>Export</strong>: feedings, growth records and moments can be exported as CSV from Settings
            at any time.
          </li>
          <li>
            <strong>Delete</strong>: delete your account under Settings → Account. Your account, any family
            where you are the only member, and all of its records and photos are permanently deleted. If other
            members remain, records you created stay with them but are no longer linked to you.
          </li>
          <li>
            <strong>Sign out</strong>: you can sign out at any time; cached data is refreshed on the next
            sign-in.
          </li>
        </ul>
        <h2 className={h2}>Contact</h2>
        <p>
          Questions about this policy can be sent through the developer website or support link on the App
          Store page. Updates to this policy will be posted on this page.
        </p>
      </section>
    </main>
  );
}
