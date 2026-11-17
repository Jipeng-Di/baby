import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Feedbook · Support / 帮助与支持'};

const ISSUES = 'https://github.com/Jipeng-Di/baby/issues';
const h2 = 'pt-2 text-lg font-semibold';
const q = 'font-semibold';
const link = 'font-semibold text-(--brand) underline underline-offset-2';

/** Public support page, used as the App Store support URL. */
export default function SupportPage() {
  return (
    <main className="mx-auto max-w-lg space-y-10 px-5 py-10 text-(--ink)">
      <section className="space-y-4 text-[15px] leading-relaxed">
        <h1 className="text-2xl font-semibold">Feedbook Support</h1>
        <p>
          Feedbook is a simple feeding and growth log that a whole family can share. If something isn’t
          working or you have an idea, we’d love to hear from you.
        </p>
        <h2 className={h2}>Contact</h2>
        <p>
          Open an issue at{' '}
          <a className={link} href={ISSUES}>
            github.com/Jipeng-Di/baby/issues
          </a>
          . Please don’t include your baby’s personal details in a public issue. We usually reply within a few
          days.
        </p>
        <h2 className={h2}>Common questions</h2>
        <p className={q}>How do I share the log with my partner or a grandparent?</p>
        <p>
          Open Family, expand Family code and send them the 10-character code. After they sign up, they enter
          it on the welcome screen and see the same babies and records in real time.
        </p>
        <p className={q}>Does it work without a connection?</p>
        <p>
          Yes. Feeds you log offline are kept on the device and sync automatically when you’re back online.
        </p>
        <p className={q}>Can I switch to ounces, pounds and inches, or Chinese?</p>
        <p>Family → Settings → Preferences: language, volume unit (ml or oz), measurements (kg, cm and °C, or lb, oz, in and °F) and the vaccine guide region.</p>
        <p className={q}>How do I export my data?</p>
        <p>Family → Settings → Export data. Feedings, growth records and moments download as CSV files.</p>
        <p className={q}>How do I delete my account?</p>
        <p>
          Family → Settings → Delete account. This permanently removes your account. A family where you’re the
          only member is deleted with all its records and photos. See the{' '}
          <a className={link} href="/privacy">
            privacy policy
          </a>{' '}
          for details.
        </p>
        <p className={q}>Is the growth chart medical advice?</p>
        <p>
          No. Percentiles use the WHO child growth standards for reference only. Talk to your pediatrician
          about your baby’s growth.
        </p>
      </section>

      <section className="space-y-4 border-t border-(--line) pt-10 text-[15px] leading-relaxed">
        <h1 className="text-2xl font-semibold">Feedbook 帮助与支持</h1>
        <p>Feedbook 是一款全家共用的喂养与成长记录应用。遇到问题或有建议，欢迎告诉我们。</p>
        <h2 className={h2}>联系我们</h2>
        <p>
          请在{' '}
          <a className={link} href={ISSUES}>
            github.com/Jipeng-Di/baby/issues
          </a>{' '}
          提交问题。请勿在公开的问题里填写宝宝的个人信息。我们通常会在几天内回复。
        </p>
        <h2 className={h2}>常见问题</h2>
        <p className={q}>怎样和家人共享记录？</p>
        <p>
          打开“家庭”，展开“唯一家庭编码”，把 10
          位编码发给家人。对方注册后在欢迎页输入编码，就能实时看到同样的宝宝和记录。
        </p>
        <p className={q}>没有网络能用吗？</p>
        <p>可以。离线时记录的喂奶会保存在本机，联网后自动同步。</p>
        <p className={q}>怎样切换盎司、磅、英寸或中文？</p>
        <p>家庭 → 设置 → 偏好：可设置语言、奶量单位（ml 或 oz）、测量单位（kg、cm 和 °C，或 lb、oz、in 和 °F）和疫苗指南地区。</p>
        <p className={q}>怎样导出数据？</p>
        <p>家庭 → 设置 → 导出数据，喂奶、生长和成长时刻记录会下载为 CSV 文件。</p>
        <p className={q}>怎样删除账号？</p>
        <p>
          家庭 → 设置 → 删除账号。账号会被永久删除；你作为唯一成员的家庭及其全部记录和照片也会一并删除。详见
          <a className={link} href="/privacy">
            隐私政策
          </a>
          。
        </p>
        <p className={q}>生长曲线是医疗建议吗？</p>
        <p>不是。百分位基于世界卫生组织儿童生长标准，仅供参考。宝宝的生长情况请咨询儿科医生。</p>
      </section>
    </main>
  );
}
