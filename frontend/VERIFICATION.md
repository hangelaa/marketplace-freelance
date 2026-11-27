# گزارش بررسی پیوند

## Project management — current validation

- Implemented protected employer management, shared create/edit/review, shared project detail, integrated proposal review/accept/reject, freelancer discovery/submission, and sent proposal tracking/withdrawal. Routes and contracts are documented in `PROJECT_MANAGEMENT.md`.
- Reused existing branding, session/CSRF, Button/Input, tokens, font and icons. No dependencies, backend source edits, schema changes, mock data or persistent verification records were added for this feature.
- `npm run lint`, `npm run build` and `npm run typecheck` passed on the integrated module. The production manifest contains all six workspace page routes and the restricted marketplace bridge.
- Anonymous live probes: marketplace project list, owned list and detail returned 401; an unrecognized bridge path returned 404; GET on a POST-only decision path returned 405. Cross-origin POST and same-origin POST without CSRF each returned 403. Protected workspace navigation in the managed browser redirected to login. These checks prove routing/guards, not authorized writes.
- The existing signed-in native Chrome employer empty-state dashboard was visually inspected. The separate managed browser had no marketplace session; login saving was declined, and no authentication bypass was attempted. Authenticated mutation flows and mobile/tablet workspace layouts remain unverified. No success claim for create/edit/publish/submit/accept/reject/withdraw is based solely on compilation.
- No automated tests or test harnesses were created, modified or executed for this feature, per request. Earlier test counts below are historical, not evidence for this module. Existing browser tests that assert a static welcome page will need to reflect its new workspace redirect when test work is authorized.
- Backend limitations remain explicit: no currency field; no cancel/complete/delete endpoints; unpaginated owner/proposal lists; Regular/Admin permissions, not persisted employer/freelancer roles.

## Landing and role-selection implementation — previous validation

- Public `/` now includes navigation, employer/freelancer hero actions, workflow, authenticated catalog states, dedicated audience sections, final CTA and footer. `/role-selection/` provides native keyboard-accessible radio cards, selected/hover/focus states, and a disabled/pending Continue action.
- Reused Brand, StoryPanel, Button, AuthShell, existing auth forms, Vazirmatn, Lucide and semantic CSS tokens. No new dependencies, database schema changes, permission roles or backend endpoints.
- The server action validates employer/freelancer and stores browser-local onboarding intent in a 24-hour HttpOnly cookie. Registration payload remains unchanged. Fixed its success destination to login because the backend returns 201 without creating a session. Login still reaches protected `/welcome/`, which reflects intent and explicitly identifies the missing dashboard UI.
- `npm run lint`, `npm run typecheck`, `npm test` (9 tests), and `npm run build`: passed.
- Production Chrome Playwright run: 25 tests passed. Includes both role preferences surviving fixture login/refresh, authenticated onboarding redirects, keyboard selection and cookie readback, hero/navigation links, registration conflict/loading/success using intercepted responses, existing CSRF/session/logout tests, and layouts at 1440/768/390/320px without horizontal overflow.
- Updated stale pre-existing browser assertions to match the existing login heading, real password-recovery link and current keyboard order; production login markup was not changed to satisfy obsolete expectations.
- Backend: 55 existing accounts/marketplace tests passed inside an isolated disposable SQLite container using the checked-out source. Existing user edits to registration and its tests were preserved, not authored by this task.
- Visually inspected desktop landing and role-selection layouts and mobile role-selection rendering. Verified actual primary-anchor computed foreground/background colors after fixing a global-anchor/Tailwind cascade conflict locally to the marketing CSS.
- Browser authentication used the existing disposable Django identity fixture with real Django CSRF and SQLite sessions on :8001 and production Next on :3001. Registration UI responses were mocked; no persistent SQL Server accounts were created. Catalog failure/retry rendering was exercised against the fixture, which has no catalog tables. Live SQL Server signup and authenticated catalog values were not verified.
- Production build regenerates route types; an initial standalone typecheck encountered stale generated types for the former login location. Build followed by typecheck passed without disabling checks or editing tsconfig.

The original report below is historical and describes the earlier login-only implementation; its feature inventory and environment observations are not the current state.

## نتیجه پیاده‌سازی

فرانت‌اند واقعی در frontend ایجاد شد؛ شامل Next.js App Router، TypeScript سخت‌گیرانه، Tailwind v4، Button/Input مبتنی بر الگوی open-code shadcn، Radix Slot، Lucide، Motion، React Hook Form و Zod. نسخه‌های مستقیم ثابت و lockfile موجود است. فونت Vazirmatn Variable به‌صورت محلی ارائه می‌شود.

صفحات /login/ و /welcome/ فارسی و RTL هستند. هویت «پیوند» شامل نشان اختصاصی، رنگ‌های مرکزی CSS، داستان تصویری نمونه، فرم واکنش‌گرا، اعتبارسنجی، نمایش رمز، loading، خطاهای فارسی و خروج است. ثبت‌نام/بازیابی رمز فقط پیام عدم دسترسی دارند؛ قابلیت خارج از محدوده اضافه نشده است.

هیچ فایل موجود backend، requirements.txt، schema، seed یا README ریشه تغییر نکرد. backend و requirements.txt از پیش untracked بودند و همان‌طور باقی مانده‌اند. هیچ commit، push یا تغییر remote/branch انجام نشده است.

## بررسی‌های واقعاً اجراشده

- npm run build: موفق؛ Next.js 16.4.6، Turbopack؛ /login و /welcome به‌صورت dynamic server-rendered.
- npm run typecheck: موفق، بدون خطا.
- npm run lint: موفق با max-warnings=0.
- npm test: هر ۷ تست موفق. اعتبارسنجی، رد Origin خارجی/مفقود، تفاوت Host واقعی با URL داخلی Next، محدودیت مسیر/متد، عبور CSRF و کوکی با Secure/HttpOnly، bootstrap از صفحه موجود Django و مدیریت خطای اتصال بررسی شدند.
- npm run test:browser: هر ۱۵ تست در Chrome واقعی موفق. اعتبارسنجی فارسی، نمایش/پنهان‌سازی رمز، پیام امکانات خارج از محدوده، خطای عمومی رمز، نشست پس از refresh، هدایت کاربر واردشده، رد Welcome ناشناس، logout، رد بازپخش کوکی نشست قبلی، CSRF بدون توکن، Origin خارجی، انقضای نشست، قطع شبکه، خطای 503، loading، کیبورد/skip link و reduced-motion بررسی شدند.
- رندر ورود در عرض‌های ۱۴۴۰، ۷۶۸، ۳۹۰ و ۳۲۰ پیکسل و Welcome در موبایل بررسی شد؛ overflow افقی مشاهده نشد. بارگذاری فونت محلی نیز با document.fonts بررسی شد.
- اسکرین‌شات‌های نهایی desktop/mobile پس از پایان انیمیشن مشاهده و بازبینی شدند؛ اسکرین‌شات‌های ابتدای انیمیشن به‌عنوان ظاهر نهایی استفاده نشدند.
- تست‌های موجود Django: ۷ تست accounts با SQLite در حافظه و همان mockهای موجود، موفق.
- Django manage.py check با پیکربندی SQLite ایزوله: بدون ایراد.
- node tests/smoke-existing-backend.mjs علیه Next :3000 و کد اصلی Django :8000، بدون جایگزینی provider هویت: صفحه ورود 200، bootstrap CSRF برابر 200، me ناشناس 401، اطلاعات خالی با CSRF صحیح 400 و درخواست بدون توکن 403. این بررسی به جدول Users دسترسی ندارد و اثبات احراز هویت دیتابیس نیست.
- npm audit --omit=dev: صفر آسیب‌پذیری گزارش شد.
- npm audit کامل: ۷ مورد moderate در زنجیره ابزار توسعه typescript-eslint/minimatch باقی ماند. npm audit fix اجرا شد ولی این زنجیره را کامل رفع نکرد؛ برای حذف هشدار، override ناسازگار یا ارتقای اجباری بدون بررسی اعمال نشد. این نتیجه مربوط به زمان اجرای بررسی است و باید پیش از استقرار دوباره اجرا شود.

## مرز دقیق تست نشست

تست مرورگری از tests/django_fixture.py استفاده کرد: viewها، CsrfViewMiddleware، کوکی، چرخه login/logout و ذخیره/حذف نشست همان Django واقعی هستند. فقط authenticate/get_user در فرایند تست با هویت مشخص آزمایشی جایگزین شده‌اند. جدول‌های نشست در SQLite موقت خارج از مخزن قرار داشتند. fixture از کد production import نمی‌شود و production به آن fallback ندارد.

بنابراین موارد زیر تأیید شده‌اند: مسیر کامل Next ↔ Django برای CSRF/نشست/خروج در محیط ایزوله و رفتار رابط کاربری. احراز هویت واقعی dbo.Users، تطابق رمزهای ذخیره‌شده و ارتقای legacy hash در SQL Server تأیید نشده‌اند.

## مانع اتصال واقعی SQL Server

- TCP روی localhost:1433 در دسترس نبود.
- یک instance محلی SQL Server با نام DBLAB مشاهده شد؛ اتصال read-only با Windows Integrated Authentication به FreelanceMarketplaceDB رد شد: login failed / cannot open database (18456 / 4060). این نتیجه به معنای نبودن کل SQL Server نیست؛ دسترسی این حساب به دیتابیس هدف تأیید نشد.
- ODBC Driver 18 پیش‌فرض backend نصب نبود؛ Driver 13 و چند درایور قدیمی موجود بودند. هیچ driver یا تنظیم host/database/password تغییر داده نشد.
- داده یا حساب واقعی ساخته/تغییر داده نشد و migration روی دیتابیس واقعی اجرا نشد.

برای تأیید نهایی واقعی: اتصال معتبر همان backend را فراهم کنید، نصب بودن driver مورد نیاز و جدول django_session را تأیید کنید، سپس با یک حساب موجود و مجاز login → refresh → logout → me=401 را تکرار کنید. رمز یا secret نباید در کد، مستندات یا log قرار گیرد.

## فایل‌های راهنما

- README.md این پوشه: اجرای توسعه/production، تنظیم originها، مرز امنیتی پراکسی و اجرای تست‌ها.
- DESIGN.md: هویت بصری، typography، توکن‌ها، رفتار واکنش‌گرا و دسترس‌پذیری.
- tests/django_fixture.py: فقط harness تست ایزوله، نه backend اجرایی پروژه.
- tests/smoke-existing-backend.mjs: smoke check بدون ورود/نوشتن داده واقعی.

اسکرین‌شات‌های این اجرا خارج از مخزن در C:/Users/ASUS/AppData/Local/hermes/cache/scratch/peyvand-evidence ذخیره شدند. این مسیر موقت است و جایگزین خروجی build یا مستندات پایدار پروژه نیست.
