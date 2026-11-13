import { ArrowUpLeft, Check, Code2, Layers3, PenTool, Sparkles } from "lucide-react";

export function StoryPanel() {
  return (
    <aside className="story-panel" aria-labelledby="story-title">
      <div className="story-topline"><span className="story-dot" />جایی برای ساختن، کنار هم<span className="story-edition" dir="ltr">THE NEXT CHAPTER</span></div>
      <div className="story-copy">
        <p className="story-kicker">از یک ایده، تا یک همکاری</p>
        <h2 id="story-title">استعداد شما.<br />فرصت‌های <span>پیشِ رو.</span></h2>
        <p className="story-description">پیوند، نقطهٔ تلاقی ایده‌های تازه و مهارت‌های مستقل؛<br className="story-line-break" /> برای شروعِ چیزی که ارزش ساختن دارد.</p>
      </div>
      <figure className="collaboration-scene" aria-label="تصویر مفهومی ارتباط یک پروژه با مهارت‌های طراحی و توسعه؛ تمام موارد نمونه‌اند">
        <div className="scene-orbit scene-orbit--one" aria-hidden="true" />
        <div className="scene-orbit scene-orbit--two" aria-hidden="true" />
        <svg className="scene-connectors" viewBox="0 0 500 340" fill="none" aria-hidden="true"><path d="M250 150V209M250 209H111V254M250 209H389V254" stroke="#A78BFA" strokeOpacity=".6" strokeWidth="1.5" strokeDasharray="5 5" /><circle cx="250" cy="209" r="5" fill="#2DD4BF" /></svg>
        <div className="scene-spark scene-spark--one" aria-hidden="true"><Sparkles size={19} /></div>
        <div className="scene-spark scene-spark--two" aria-hidden="true">+</div>
        <div className="project-preview">
          <div className="project-preview-top"><span className="project-symbol"><Layers3 size={22} strokeWidth={1.6} /></span><span className="example-pill">پروژهٔ نمونه</span><ArrowUpLeft size={18} className="project-arrow" aria-hidden="true" /></div>
          <h3>یک ایده، یک هویت تازه</h3>
          <p>طراحی وب‌سایت برای یک برند خلاق</p>
          <div className="preview-tags"><span>طراحی رابط کاربری</span><span>توسعه وب</span></div>
          <div className="project-preview-bottom"><span className="mini-avatars" aria-hidden="true"><span>م</span><span>ن</span></span><span>مهارت‌های متفاوت، یک مسیر مشترک</span></div>
        </div>
        <div className="talent-preview talent-preview--design"><span className="talent-icon talent-icon--design"><PenTool size={19} /></span><div><strong>نگاه خلاق</strong><span>طراحی و تجربهٔ کاربری</span></div><span className="talent-check"><Check size={12} /></span></div>
        <div className="talent-preview talent-preview--code"><span className="talent-icon talent-icon--code"><Code2 size={21} /></span><div><strong>اجرای دقیق</strong><span>توسعه و برنامه‌نویسی</span></div><span className="talent-check"><Check size={12} /></span></div>
        <figcaption>تصویری از یک همکاری ممکن · اطلاعات نمایشی</figcaption>
      </figure>
      <div className="story-footer"><span className="story-footer-symbol" aria-hidden="true">↗</span><p>کار خوب،<br /><strong>با یک پیوند شروع می‌شود.</strong></p><span className="story-footer-line" aria-hidden="true" /></div>
    </aside>
  );
}
