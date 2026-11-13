# پیوند — فرانت‌اند ورود بازار فریلنسری

این برنامه فقط بخش ۱ تمرین ۰۳ (ورود، مقصد موقت خوش‌آمدگویی، خروج) را پیاده‌سازی می‌کند. ثبت‌نام، بازیابی رمز، پروفایل، پروژه، پرداخت و داشبورد پیاده‌سازی نشده‌اند. اطلاعات داخل تصویر همکاری صرفاً نمایشی است؛ داده یا آمار واقعی بازار نیست.

## اجرا

پیش‌نیاز: Node.js سازگار با Next.js 16 و npm؛ نسخه‌های مستقیم در package.json ثابت و وابستگی‌ها در package-lock.json قفل شده‌اند.

از پوشه frontend:

    npm ci
    npm run dev

نشانی: http://127.0.0.1:3000/login/

Django را طبق backend/README.md روی 127.0.0.1:8000 اجرا کنید. دیتابیس SQL Server باید از قبل موجود، قابل دسترس و دارای جدول django_session باشد. اجرای migration و تغییر داده‌های واقعی بخشی از این پیاده‌سازی نیست. وجود ODBC Driver سازگار با تنظیمات backend ضروری است.

برای تغییر مقصد، متغیرهای فرایند Next.js را تنظیم کنید؛ ساخت فایل .env لازم نیست:

    DJANGO_API_ORIGIN=http://127.0.0.1:8000
    FRONTEND_ORIGIN=http://127.0.0.1:3000

در PowerShell از $env:DJANGO_API_ORIGIN و $env:FRONTEND_ORIGIN استفاده کنید. FRONTEND_ORIGIN باید دقیقاً مبدأ عمومی مرورگر، شامل پروتکل و پورت و بدون اسلش پایانی باشد. در توسعه از مخلوط‌کردن localhost و 127.0.0.1 پرهیز کنید.

ساخت و اجرای production:

    npm run build
    npm run start

## معماری و قرارداد احراز هویت

- app/login و app/welcome صفحات Server Component هستند؛ هویت با GET /api/auth/me/ در Django و cache: no-store تأیید می‌شود. وجود کوکی به‌تنهایی نشانه ورود نیست.
- Welcome پیش از نمایش نام/ایمیل به تأیید Django نیاز دارد. نبود یا انقضای نشست به /login/?expired=1 هدایت می‌شود. خطای backend با وضعیت مستقل و دکمه تلاش مجدد نمایش داده می‌شود؛ اطلاعات هویت در این حالت رندر نمی‌شود.
- lib/auth/server.ts فقط سرور است. lib/api/auth.ts درخواست‌های مرورگر و خطاهای فارسی را مدیریت می‌کند. lib/auth/schema.ts قرارداد فرم Zod است.
- POST /api/auth/login/ با JSON شامل email و password؛ GET /api/auth/me/ با پاسخ { email, name }؛ POST /api/auth/logout/ بدون تغییر به Django می‌رسند.
- Route Handler در app/api/auth/[action] فقط چهار عمل مشخص login، logout، me و csrf را می‌پذیرد؛ یک پراکسی عمومی یا redirect آزاد نیست.
- GET /api/auth/csrf/ فقط یک سازگارکننده فرانت‌اند است؛ GET صفحه موجود /login/ در Django را اجرا می‌کند تا ensure_csrf_cookie کوکی صادر کند. endpoint یا سیستم احراز هویت جدیدی در Django اضافه نشده است.
- پیش از عملیات نوشتن، مرورگر کوکی CSRF را می‌گیرد و X-CSRFToken می‌فرستد. پراکسی ابتدا Origin عمومی را دقیق بررسی و درخواست cross-site را رد می‌کند؛ سپس Origin/Referer را برای hop داخلی Django نگاشت می‌کند. CsrfViewMiddleware همچنان کوکی و توکن را بررسی می‌کند. هیچ csrf_exempt یا CORS باز وجود ندارد.
- Set-Cookieها جداگانه و بدون حذف HttpOnly، Secure، SameSite، انقضا یا مسیر عبور می‌کنند. کوکی‌ها در تنظیمات فعلی Django host-only و Path=/ هستند. اگر تنظیمات backend تغییر کرد، همین قرارداد دامنه/مسیر باید بازبینی شود؛ برای رفع مشکل cookie flagها را حذف نکنید.
- درخواست‌های مرورگر same-origin هستند؛ نشانی داخلی Django هیچ‌گاه در NEXT_PUBLIC یا باندل مرورگر قرار نمی‌گیرد. پاسخ‌ها private, no-store هستند؛ اعتبارسنجی هویت نیز بدون کش است.
- ورود توکن یا رمز در localStorage/sessionStorage ذخیره نمی‌کند. خروج نشست Django را با endpoint موجود باطل می‌کند. موفقیت ورود/خروج با navigation کامل انجام می‌شود تا کش قبلی کاربر باقی نماند.
- SessionGuard هنگام focus، visibility/pageshow و هر ۶۰ ثانیه در تب فعال، انقضای نشست را بررسی می‌کند. اختلال شبکه به اشتباه به‌عنوان خروج تفسیر نمی‌شود.

## استقرار امن

Next.js را پشت HTTPS با FRONTEND_ORIGIN ثابت و صحیح قرار دهید؛ Host عمومی معتبر باید در reverse proxy محدود شود. Django نباید مستقیماً از اینترنت قابل دسترس باشد. DJANGO_API_ORIGIN باید مبدأ خصوصی و مورد اعتماد باشد؛ برای ارتباط بین میزبان‌ها HTTPS یا شبکه خصوصی کنترل‌شده لازم است.

در production، DJANGO_DEBUG=false و کوکی‌های Secure فعلی Django را حفظ کنید. در توسعه HTTP، فقط تنظیم DEBUG مستند خود backend تعیین می‌کند کوکی Secure صادر شود یا نه؛ فرانت‌اند هرگز آن را ضعیف نمی‌کند. SECRET_KEY و اطلاعات SQL Server فقط در محیط backend قرار می‌گیرند. از ارسال/ثبت رمز عبور در logها و استفاده از سرور fixture در production خودداری کنید.

محدودیت موجود backend: rate limiting تلاش ورود در پیاده‌سازی فعلی دیده نشد؛ پیش از عرضه عمومی در reverse proxy یا backend اضافه و جداگانه بررسی شود. این کار برای حفظ محدوده، در این تغییر انجام نشده است.

## رابط و طراحی

Next.js App Router، TypeScript، Tailwind v4، primitiveهای open-code شادکن Button/Input با Radix Slot، Lucide، Motion، React Hook Form و Zod استفاده شده‌اند. Vazirmatn Variable از پکیج محلی bundle می‌شود و به Google Fonts یا CDN زمان اجرا نیاز ندارد. components.json برای ادامه توسعه shadcn آماده است.

DESIGN.md منبع قواعد ظاهری است. رنگ‌ها و نقش‌های سطح/خطا/تصویر/سایه در :root فایل app/globals.css متمرکزند. RTL در ریشه، زبان fa، ویژگی‌های logical CSS، label و aria-describedby، focus قابل دیدن، skip link، خطای متنی و prefers-reduced-motion رعایت شده‌اند. تصویر داستان در عرض کمتر از ۱۰۲۴ حذف می‌شود تا فرم اولویت داشته باشد.

## بررسی‌ها

    npm test
    npm run typecheck
    npm run lint
    npm run build
    npm audit --omit=dev

تست‌های مرورگری مستقل از SQL Server:

۱. از frontend در ترمینالی با Python و وابستگی‌های requirements.txt اجرا کنید:

    python tests/django_fixture.py

۲. در ترمینال دیگر، پس از build، متغیرهای فرایند را تنظیم کنید:

    DJANGO_API_ORIGIN=http://127.0.0.1:8001
    FRONTEND_ORIGIN=http://127.0.0.1:3001

و اجرا کنید:

    npm run start -- --port 3001

۳. در ترمینال سوم:

    npm run test:browser

Playwright از Chrome نصب‌شده استفاده می‌کند. تست fixture از CSRF واقعی و نشست پایگاه‌داده‌ای واقعی Django استفاده می‌کند، اما provider هویت آن فقط داخل فرایند تست جایگزین شده و SQLite موقت خارج از مخزن دارد. این تست‌ها اثبات اتصال/احراز هویت SQL Server نیستند و production هیچ import یا وابستگی اجرایی به fixture ندارد. پس از تست هر دو فرایند تست را متوقف کنید. حساب fixture فقط در فایل تست تعریف شده است.

برای ذخیره اسکرین‌شات‌ها EVIDENCE_DIR را به مسیر پوشه دلخواه خارج از مخزن تنظیم کنید. مقادیر test به داده‌های واقعی کاربران دسترسی ندارند.

نتایج اجرا و محدودیت‌های واقعی محیط در VERIFICATION.md ثبت شده‌اند. تست‌های موجود backend/accounts/tests.py نیز با SQLite و جایگزینی احراز هویت اجرا می‌شوند و نباید به‌عنوان SQL Server end-to-end گزارش شوند.
