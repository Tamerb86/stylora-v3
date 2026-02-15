# نظام الدفع الجديد - Stylora

## نظرة عامة

تم إعادة بناء نظام الدفع بالكامل لضمان:
1. **الفصل التام للبيانات** بين الصالونات (Multi-tenancy Isolation)
2. **نظام دفع موثوق** باستخدام Stripe Connect Destination Charges
3. **تجربة إعداد سهلة** للصالونات (One-Click Onboarding)
4. **نظام مراقبة شامل** لتتبع المدفوعات والأخطاء

---

## الملفات الجديدة

### 1. `server/services/tenantIsolation.ts`
**الغرض:** ضمان الفصل التام للبيانات بين الصالونات

**الوظائف الرئيسية:**
- `getPaymentByIdSecure(paymentId, tenantId)` - جلب دفعة مع التحقق من الصالون
- `getOrderByIdSecure(orderId, tenantId)` - جلب طلب مع التحقق من الصالون
- `getPaymentSettingsSecure(tenantId)` - جلب إعدادات الدفع للصالون
- `upsertPaymentSettings(tenantId, data)` - تحديث إعدادات الدفع

**مثال الاستخدام:**
```typescript
import { getPaymentByIdSecure } from "./services/tenantIsolation";

// هذا سيرجع null إذا كانت الدفعة لا تنتمي للصالون
const payment = await getPaymentByIdSecure(paymentId, ctx.tenantId);
if (!payment) {
  throw new Error("Payment not found");
}
```

---

### 2. `server/services/paymentLogger.ts`
**الغرض:** تسجيل جميع عمليات الدفع للمراقبة والتصحيح

**الوظائف الرئيسية:**
- `logPaymentCreated()` - تسجيل إنشاء دفعة
- `logPaymentCompleted()` - تسجيل اكتمال دفعة
- `logPaymentFailed()` - تسجيل فشل دفعة
- `logPaymentRefunded()` - تسجيل استرداد
- `getRecentLogs()` - جلب السجلات الأخيرة
- `getPaymentFailureSummary()` - ملخص الأخطاء
- `getPaymentSuccessRate()` - معدل النجاح

**مثال الاستخدام:**
```typescript
import { logPaymentFailed } from "./services/paymentLogger";

await logPaymentFailed(
  tenantId,
  paymentId,
  amount,
  "stripe",
  "card_declined",
  "Your card was declined"
);
```

---

### 3. `server/services/stripeConnectService.ts`
**الغرض:** إدارة Stripe Connect مع Destination Charges

**الوظائف الرئيسية:**
- `getStripeConnectAuthUrl(tenantId)` - رابط OAuth للربط
- `handleStripeConnectCallback(code, tenantId)` - معالجة callback
- `getStripeConnectStatus(tenantId)` - حالة الحساب
- `canAcceptPayments(tenantId)` - التحقق من جاهزية الدفع
- `createDestinationPaymentIntent(options)` - إنشاء دفعة

**كيف يعمل Destination Charges:**
```
الزبون يدفع 500 NOK
    ↓
Stripe يستلم المبلغ
    ↓
Platform Fee (2.5%) = 12.50 NOK → حساب Stylora
    ↓
الباقي (487.50 NOK) → حساب الصالون مباشرة
```

---

### 4. `server/routers/paymentRouter.ts`
**الغرض:** Router مركزي لجميع عمليات الدفع

**الـ Endpoints:**
| Endpoint | الوصف |
|----------|-------|
| `getConnectAuthUrl` | رابط ربط Stripe |
| `handleConnectCallback` | معالجة OAuth callback |
| `getConnectStatus` | حالة حساب Stripe |
| `canAcceptPayments` | التحقق من الجاهزية |
| `getSettings` | إعدادات الدفع |
| `updateSettings` | تحديث الإعدادات |
| `createPaymentIntent` | إنشاء دفعة |
| `recordPayment` | تسجيل دفعة مكتملة |
| `processSplitPayment` | دفعة مقسمة |
| `processRefund` | استرداد |
| `getHistory` | سجل المدفوعات |
| `getLogs` | سجلات المراقبة |

---

### 5. `server/routers/paymentOnboarding.ts`
**الغرض:** معالج إعداد الدفع للصالونات الجديدة

**الـ Endpoints:**
| Endpoint | الوصف |
|----------|-------|
| `getStatus` | حالة الإعداد الحالية |
| `getConnectUrl` | رابط الربط |
| `quickSetup` | إعداد سريع |
| `getSetupGuide` | دليل الإعداد (نرويجي) |
| `needsSetup` | هل يحتاج إعداد؟ |

**خطوات الإعداد:**
1. ربط حساب Stripe
2. إكمال التحقق من الهوية
3. تفعيل طرق الدفع
4. جاهز للدفع!

---

### 6. `server/routers/paymentMonitoring.ts`
**الغرض:** مراقبة صحة نظام الدفع

**الـ Endpoints:**
| Endpoint | الوصف |
|----------|-------|
| `getHealthStatus` | حالة صحة النظام |
| `getMetrics` | إحصائيات المدفوعات |
| `getLogs` | السجلات |
| `getFailureAnalysis` | تحليل الأخطاء |
| `getAlerts` | التنبيهات |
| `getDashboardSummary` | ملخص لوحة التحكم |

---

## كيفية التكامل

### 1. إضافة الـ Routers إلى `routers.ts`:

```typescript
// في أعلى الملف
import { paymentRouter } from "./routers/paymentRouter";
import { paymentOnboardingRouter } from "./routers/paymentOnboarding";
import { paymentMonitoringRouter } from "./routers/paymentMonitoring";

// داخل appRouter
export const appRouter = router({
  // ... الـ routers الموجودة ...
  
  payment: paymentRouter,
  paymentOnboarding: paymentOnboardingRouter,
  paymentMonitoring: paymentMonitoringRouter,
});
```

### 2. تشغيل Migration:

```sql
-- تشغيل الملف: drizzle/migrations/add_payment_logs.sql
```

### 3. إضافة Schema:

```typescript
// إضافة محتوى drizzle/schema-payment-logs.ts إلى schema.ts
```

---

## متغيرات البيئة المطلوبة

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Frontend URL (for OAuth redirect)
VITE_FRONTEND_URL=https://your-domain.com
```

---

## استخدام Frontend

### التحقق من حالة الإعداد:
```typescript
const { data: status } = trpc.paymentOnboarding.getStatus.useQuery();

if (!status?.isComplete) {
  // عرض wizard الإعداد
}
```

### إنشاء دفعة:
```typescript
const createPayment = trpc.payment.createPaymentIntent.useMutation();

const result = await createPayment.mutateAsync({
  amount: 500, // NOK
  appointmentId: 123,
});

// استخدام result.clientSecret مع Stripe Elements
```

### عرض التنبيهات:
```typescript
const { data: alerts } = trpc.paymentMonitoring.getAlerts.useQuery();

if (alerts?.length > 0) {
  // عرض التنبيهات للمدير
}
```

---

## الأمان

### فصل البيانات:
- جميع الاستعلامات تتضمن `WHERE tenantId = ?`
- لا يمكن لصالون رؤية بيانات صالون آخر
- يتم تسجيل أي محاولة وصول غير مصرح بها

### Stripe Connect:
- الأموال تذهب مباشرة لحساب الصالون
- Platform fee يُخصم تلقائياً
- لا يمكن للمنصة الوصول لأموال الصالونات

---

## تعطيل iZettle

تم تعطيل iZettle لصالح Stripe Connect. الملف `izettle-disabled.ts` يحتوي على:
- جميع الدوال ترجع خطأ مع رسالة توجيه لاستخدام Stripe
- دوال التشفير محفوظة للتوافق مع البيانات القديمة

---

## الدعم الفني

للمساعدة في التكامل أو حل المشاكل:
- راجع السجلات: `trpc.paymentMonitoring.getLogs.useQuery()`
- تحليل الأخطاء: `trpc.paymentMonitoring.getFailureAnalysis.useQuery()`
- حالة الصحة: `trpc.paymentMonitoring.getHealthStatus.useQuery()`
