# محرك الكاش باك — منسوخ من منصة البطاقات

**لا يُعدَّل هنا.** منسوخ حرفيًّا من `cards-platform/web/lib` حتى يُنشر حزمةً
مثبَّتة النسخة — الطلب `qintar-backend/docs/requests/0001`.

- القرار `0003` عند المنصة: **أي تغيير يغيّر ناتج حساب تغييرٌ كاسر ولو كان
  إصلاح خطأ.** فالنسخة هنا تتبع المصدر ولا تتفرّع عنه.
- `ENGINE_SOURCE.json` يحمل بصمة كل ملف والتزام المصدر. اختبار
  `engine-vendor.test.ts` يفشل لو تغيّر ملف هنا، **ولو تباعد عن المصدر** حين
  يكون مستودع المنصة مجاورًا.

## المزامنة

```bash
SRC=../../cards-platform/web/lib
cp $SRC/cashback-engine/{engine,ranking,types,index}.ts src/vendor/cashback-engine/
cp $SRC/card-adapter.ts src/vendor/card-adapter.ts
```

ثم حدّث `ENGINE_SOURCE.json` بالتزام المصدر وبصمات الملفات، وشغّل الاختبارات.
