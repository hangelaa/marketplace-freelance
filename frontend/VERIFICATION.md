# گزارش بررسی پیوند

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
