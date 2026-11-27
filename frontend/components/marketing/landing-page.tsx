import Link from "next/link";
import { ArrowLeft, ArrowUpLeft, BriefcaseBusiness, Check, Compass, FolderOpen, Layers3, Link2, ListChecks, UserRound, Waypoints } from "lucide-react";
import { Brand } from "@/components/branding/brand";
import { StoryPanel } from "@/components/branding/story-panel";
import { Button } from "@/components/ui/button";
import styles from "./marketing.module.css";

export type CategoryState =
  | { status: "ready"; categories: { id: number; name: string }[] }
  | { status: "anonymous" | "session-unavailable" | "error" };

type LandingPageProps = { authenticated: boolean; categories: CategoryState };

const steps = [
  { number: "۰۱", icon: Compass, title: "از مسیر خودتان شروع کنید", description: "برای انجام یک پروژه آمده‌اید یا می‌خواهید با مهارت‌تان همکاری کنید؟ اول مسیرتان را انتخاب کنید." },
  { number: "۰۲", icon: ListChecks, title: "پروژه یا فرصت را پیدا کنید", description: "کارفرما پروژه را با شرح کار، بودجه و مهارت‌های لازم منتشر می‌کند؛ فریلنسر پروژه‌ها را بررسی و پیشنهادش را ارسال می‌کند." },
  { number: "۰۳", icon: Link2, title: "از پیشنهاد تا انتخاب همکار", description: "کارفرما پیشنهادها را بررسی و همکار مناسب را انتخاب می‌کند؛ فریلنسر هم وضعیت پیشنهادش را پیگیری می‌کند." },
];

function CategoryContent({ state }: { state: CategoryState }) {
  if (state.status === "ready" && state.categories.length > 0) {
    return <ul className={styles.categoryList} aria-label="دسته‌بندی‌های پیوند">{state.categories.map((category) => (
      <li key={category.id}><span className={styles.categoryIcon}><FolderOpen size={20} aria-hidden="true" /></span><span dir="auto">{category.name}</span></li>
    ))}</ul>;
  }

  const copy = state.status === "anonymous"
    ? { title: "دسته‌بندی‌ها را در حساب‌تان ببینید", description: "برای دیدن فهرست دسته‌بندی‌های پیوند، وارد حساب‌تان شوید. هنوز حساب ندارید؟ از انتخاب مسیر شروع کنید." }
    : state.status === "ready"
      ? { title: "هنوز دسته‌بندی‌ای ثبت نشده", description: "وقتی دسته‌بندی‌ها در پیوند ثبت شوند، فهرست آن‌ها اینجا نمایش داده می‌شود." }
      : state.status === "session-unavailable"
        ? { title: "وضعیت ورودتان مشخص نشد", description: "فعلاً ارتباط با سرویس حساب برقرار نیست. می‌توانید صفحه را دوباره بارگیری کنید یا کمی بعد برگردید." }
        : { title: "فهرست دسته‌بندی‌ها در دسترس نیست", description: "این بار دریافت دسته‌بندی‌ها انجام نشد. صفحه را دوباره بارگیری کنید یا کمی بعد تلاش کنید." };

  return <div className={styles.categoryState}>
    <span className={styles.stateIcon}><Layers3 size={26} aria-hidden="true" /></span>
    <div><h3>{copy.title}</h3><p>{copy.description}</p></div>
    {state.status === "anonymous" ? <Button asChild variant="outline" className={`${styles.button} ${styles.outlineButton}`}><Link href="/login/">ورود به حساب<ArrowLeft aria-hidden="true" /></Link></Button>
      : state.status !== "ready" ? <form action="/#categories" method="get"><Button type="submit" variant="outline" className={`${styles.button} ${styles.outlineButton}`}>تلاش دوباره<ArrowLeft size={17} aria-hidden="true" /></Button></form> : null}
  </div>;
}

export function LandingPage({ authenticated, categories }: LandingPageProps) {
  return <div className={styles.landing}>
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.navbar}`}>
        <Brand />
        <nav aria-label="ناوبری اصلی" className={styles.navigation}>
          <a href="#how-it-works">چطور شروع کنیم؟</a><a href="#categories">دسته‌بندی‌ها</a><a href="#employers">برای کارفرما</a><a href="#freelancers">برای فریلنسر</a>
        </nav>
        <div className={styles.navActions}>
          <Link className={styles.accountLink} href={authenticated ? "/welcome/" : "/login/"}><UserRound size={17} aria-hidden="true" />{authenticated ? "حساب من" : "ورود"}</Link>
          <Button asChild className={styles.button}><Link href="/role-selection/">شروع همکاری<ArrowLeft aria-hidden="true" /></Link></Button>
        </div>
      </div>
    </header>

    <main id="main-content" tabIndex={-1}>
      <section className={`${styles.container} ${styles.hero}`} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span aria-hidden="true" />ایده از شما، شروع همکاری با پیوند</p>
          <h1 id="hero-title">کار خوب،<br />با یک <span>پیوند</span><br className={styles.heroBreak} /> شروع می‌شود.</h1>
          <p className={styles.heroDescription}>یک ایده دارید و به مهارت نیاز دارید؟<br />یا مهارتی دارید و دنبال فرصتی برای ساختن هستید؟<br />اینجا نقطهٔ شروع شماست.</p>
          <div className={styles.heroActions}>
            <Button asChild className={styles.button}><Link href="/role-selection/?role=employer">می‌خواهم پروژه بسپارم<ArrowLeft aria-hidden="true" /></Link></Button>
            <Button asChild variant="outline" className={`${styles.button} ${styles.outlineButton}`}><Link href="/role-selection/?role=freelancer">می‌خواهم همکاری کنم<ArrowUpLeft aria-hidden="true" /></Link></Button>
          </div>
          <p className={styles.heroNote}><Waypoints size={17} aria-hidden="true" />دو مسیر متفاوت؛ یک نقطهٔ مشترک: همکاری.</p>
        </div>
        <div className={styles.heroStory}><StoryPanel /></div>
      </section>

      <section id="how-it-works" className={`${styles.container} ${styles.section}`} aria-labelledby="workflow-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>از کجا شروع کنیم؟</p><h2 id="workflow-title">همکاری خوب، از شناخت هم شروع می‌شود.</h2></div><p>قبل از هر پروژه، کمی شفافیت.<br />بعد، قدم بعدی را با خیال روشن‌تری بردارید.</p></div>
        <ol className={styles.steps}>{steps.map(({ number, icon: Icon, title, description }) => <li key={number}>
          <div className={styles.stepTop}><span className={styles.iconTile}><Icon size={23} aria-hidden="true" /></span><span className={styles.stepNumber} aria-hidden="true">{number}</span></div>
          <h3>{title}</h3><p>{description}</p>
        </li>)}</ol>
      </section>

      <section id="categories" className={styles.categorySection} aria-labelledby="categories-title"><div className={`${styles.container} ${styles.section}`}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>هر همکاری، یک تخصص</p><h2 id="categories-title">جای مهارت شما کجاست؟</h2></div><p>فهرست دسته‌بندی‌ها از اطلاعات ثبت‌شده در پیوند می‌آید؛<br />برای دیدن آن، باید وارد حساب‌تان شده باشید.</p></div>
        <CategoryContent state={categories} />
      </div></section>

      <section className={`${styles.container} ${styles.section} ${styles.paths}`} aria-label="مسیرهای همکاری">
        <article id="employers" className={styles.employerCard} aria-labelledby="employer-title">
          <div className={styles.pathTop}><span className={styles.iconTile}><BriefcaseBusiness size={24} aria-hidden="true" /></span><span>برای کارفرما</span></div>
          <h2 id="employer-title">ایده‌تان را<br />یک قدم جلوتر ببرید.</h2>
          <p>برای شروع لازم نیست جواب همه‌چیز را بدانید. کافی است مشخص کنید چه می‌خواهید بسازید و به چه مهارتی نیاز دارید.</p>
          <ul className={styles.checkList}><li><Check size={17} aria-hidden="true" />پروژه را با بودجه و مهارت‌های لازم منتشر کنید.</li><li><Check size={17} aria-hidden="true" />پیشنهادهای دریافتی را بررسی و مقایسه کنید.</li><li><Check size={17} aria-hidden="true" />پیشنهاد همکار مناسب را بپذیرید.</li></ul>
          <Button asChild className={styles.button}><Link href="/role-selection/?role=employer">از ایده‌ام شروع می‌کنم<ArrowLeft aria-hidden="true" /></Link></Button>
        </article>
        <article id="freelancers" className={styles.freelancerCard} aria-labelledby="freelancer-title">
          <div className={styles.pathTop}><span className={styles.iconTile}><Waypoints size={24} aria-hidden="true" /></span><span>برای فریلنسر</span></div>
          <h2 id="freelancer-title">مهارت شما،<br />شروع یک مسیر تازه.</h2>
          <p>هر مهارت، داستانی برای گفتن دارد. از کاری که خوب انجام می‌دهید بگویید و روشن کنید در چه همکاری‌ای می‌توانید مؤثر باشید.</p>
          <ul className={styles.checkList}><li><Check size={17} aria-hidden="true" />پروژه‌های باز را بر اساس تخصص بررسی کنید.</li><li><Check size={17} aria-hidden="true" />مبلغ و زمان پیشنهادی همکاری را ارسال کنید.</li><li><Check size={17} aria-hidden="true" />وضعیت پیشنهادهای خود را پیگیری کنید.</li></ul>
          <Button asChild variant="outline" className={`${styles.button} ${styles.outlineButton}`}><Link href="/role-selection/?role=freelancer">از مهارتم شروع می‌کنم<ArrowLeft aria-hidden="true" /></Link></Button>
        </article>
      </section>

      <section className={`${styles.container} ${styles.finalSection}`} aria-labelledby="start-title">
        <div className={styles.finalCta}><span className={styles.finalMark} aria-hidden="true"><Link2 size={32} /></span><div><p className={styles.eyebrow}>نوبت قدم اول شماست</p><h2 id="start-title">همکاری بعدی، از همین‌جا شروع می‌شود.</h2><p>مسیرتان را انتخاب کنید؛ با یک ایده یا یک مهارت.</p></div><Button asChild className={styles.button}><Link href="/role-selection/">انتخاب مسیر همکاری<ArrowLeft aria-hidden="true" /></Link></Button></div>
      </section>
    </main>

    <footer className={styles.footer}><div className={`${styles.container} ${styles.footerInner}`}>
      <div><Brand /><p>جایی برای ساختن، کنار هم.</p></div>
      <nav aria-label="پیوندهای پایین صفحه"><a href="#how-it-works">راهنمای شروع</a><a href="#categories">دسته‌بندی‌ها</a><Link href={authenticated ? "/welcome/" : "/login/"}>{authenticated ? "حساب من" : "ورود به پیوند"}</Link></nav>
      <p className={styles.footerSignature}>ایده‌های تازه. مهارت‌های مستقل.<br /><span>یک مسیر مشترک.</span></p>
    </div></footer>
  </div>;
}
