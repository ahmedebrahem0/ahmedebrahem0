# هيكل مشروع E-Commerce

## 📊 نظرة عامة
هذا مشروع **React E-Commerce** مبني باستخدام:
- ⚛️ **React** مع **Vite** 
- 🎨 **Tailwind CSS** للتصميم
- 🔧 **ESLint** للcode quality

---

## 🗂️ هيكل المجلدات الرئيسي

```
e-commerce/
├── 📁 public/
│   └── vite.svg                    # Logo اساسي
├── 📁 src/
│   ├── 📁 assets/                  # الملفات الثابتة
│   ├── 📁 components/              # UI Components
│   ├── 📁 context/                 # State Management
│   ├── 📁 hooks/                   # Custom Hooks
│   ├── 📁 layouts/                 # Page Layouts
│   ├── 📁 pages/                   # صفحات التطبيق
│   ├── App.jsx                     # المكون الرئيسي
│   ├── App.css                     # ستايلات التطبيق
│   ├── main.jsx                    # نقطة البداية
│   └── index.css                   # Global Styles
├── package.json                    # Dependencies
├── package-lock.json              # Lock file
├── vite.config.js                 # Vite Configuration
├── tailwind.config.js             # Tailwind Configuration
├── postcss.config.js              # PostCSS Configuration
├── eslint.config.js               # ESLint Configuration
├── index.html                     # HTML الرئيسي
├── .gitignore                     # Git ignore rules
└── README.md                      # توثيق المشروع
```

---

## 🧩 تفاصيل مجلد `src/`

### 📁 `components/` - مكونات UI العامة
```
components/
├── Loading.jsx              # مكون التحميل
├── LoadingAuth.jsx          # تحميل المصادقة
├── Navbar.jsx              # شريط التنقل الرئيسي
├── NotFound.jsx            # صفحة 404
├── OfflineMessage.jsx      # رسالة عدم الاتصال
├── Footer.jsx              # تذييل الصفحة
├── Header.jsx              # رأس الصفحة
├── HomeCategory.jsx        # فئات الصفحة الرئيسية
└── HomeSlider.jsx          # سلايدر الصفحة الرئيسية
```

### 📁 `pages/` - صفحات التطبيق

#### 🔐 `Authentication/` - صفحات المصادقة
```
Authentication/
├── ChangePassword.jsx      # تغيير كلمة المرور
├── ForgetPassword.jsx      # نسيان كلمة المرور
├── Login.jsx              # تسجيل الدخول
├── Register.jsx           # إنشاء حساب جديد
├── ResetPassword.jsx      # إعادة تعيين كلمة المرور
└── VerifyResetCode.jsx    # التحقق من رمز الإعادة
```

#### 🛒 `Cart/` - صفحات السلة والطلبات
```
Cart/
├── AllOrders.jsx          # جميع الطلبات
├── Cart.jsx              # صفحة السلة
└── Payment.jsx           # صفحة الدفع
```

#### 🏠 `main/` - الصفحات الرئيسية
```
main/
├── Brands.jsx            # صفحة العلامات التجارية
├── Categories.jsx        # صفحة الفئات
├── Home.jsx             # الصفحة الرئيسية
├── ProductDetails.jsx    # تفاصيل المنتج
└── Products.jsx         # صفحة المنتجات
```

### 🔧 `context/` - إدارة الحالة
```
context/
├── AuthContext.jsx       # سياق المصادقة
└── CartContext.jsx       # سياق إدارة السلة
```

### 🪝 `hooks/` - Custom Hooks
```
hooks/
├── UseForgetPass.jsx     # hook نسيان كلمة المرور
├── UseLogin.jsx         # hook تسجيل الدخول
├── UseRegister.jsx      # hook التسجيل
├── UseResetCode.jsx     # hook رمز الإعادة
├── UseResetPass.jsx     # hook إعادة تعيين كلمة المرور
├── useCategories.jsx    # hook الفئات
└── useProduct.jsx       # hook المنتجات
```

### 🎨 `layouts/` - تخطيطات الصفحات
```
layouts/
├── Layout.jsx           # التخطيط الأساسي
└── ProtectedRoute.jsx   # حماية الصفحات
```

### 🖼️ `assets/images/` - الصور والوسائط
```
images/
├── slider-1.jpeg        # صور السلايدر
├── slider-2.jpeg
├── slider-image-1.jpeg
├── slider-image-2.jpeg
├── slider-image-3.jpeg
├── blog-img-1.jpeg      # صور المدونة
├── blog-img-2.jpeg
├── banner-4.jpeg        # بانرات إعلانية
├── grocery-banner.png
├── grocery-banner-2.jpeg
├── freshcart-logo.svg   # شعار الموقع
├── light-patten.svg     # أنماط التصميم
├── error.svg           # أيقونة الخطأ
├── master.png          # أيقونات الدفع
├── paypal.png
├── AMERICAN.png
├── amazon.png
├── App_Store_Badge.svg.png           # شارات المتاجر
└── Google_Play_Store_badge_EN.svg.png
```

---

## 🎯 الميزات الرئيسية للمشروع

### 🔐 **نظام المصادقة الكامل**
- تسجيل دخول/إنشاء حساب
- نسيان وإعادة تعيين كلمة المرور
- حماية الصفحات (Protected Routes)

### 🛍️ **إدارة المتجر**
- عرض المنتجات والفئات
- تفاصيل المنتجات
- إدارة السلة
- نظام الطلبات والدفع

### 🎨 **تجربة المستخدم**
- تصميم responsive مع Tailwind
- مكونات Loading للتفاعل
- معالجة حالة عدم الاتصال
- صفحة 404 مخصصة

### 🔧 **الهيكل التقني**
- استخدام Context API لإدارة الحالة
- Custom Hooks للمنطق المشترك
- تنظيم جيد للمكونات والصفحات
- تكامل مع أنظمة الدفع المختلفة

---

## 🚀 التقنيات المستخدمة

| التقنية | الغرض |
|---------|--------|
| **React** | إطار العمل الأساسي |
| **Vite** | أداة البناء والتطوير |
| **Tailwind CSS** | مكتبة التصميم |
| **ESLint** | فحص جودة الكود |
| **Context API** | إدارة الحالة |
| **Custom Hooks** | إعادة استخدام المنطق |

هذا مشروع e-commerce متكامل ومنظم بشكل احترافي! 🎉