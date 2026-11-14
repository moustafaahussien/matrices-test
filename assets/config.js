/* =====================================================================
   config.js — الإعداد الوحيد الذي تحتاج تعديله بعد نشر Apps Script
   ضع رابط تطبيق الويب (ينتهي بـ /exec) بين علامتي التنصيص.
   إذا تُرك فارغاً يعمل النظام في «الوضع التجريبي» وتُحفظ البيانات في المتصفح فقط.
   ===================================================================== */
window.RV_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyrCkf5Of_81OLhdrMFrUpOt4aF1rCGKI4KrRh7CcIp9jnxmAvWlZ4Ro8vSZdIZRCAV/exec',
  SAVE_EVERY_ANSWERS: 5,     // حفظ إجابات الطالب على الخادم كل 5 إجابات
  SAVE_EVERY_SECONDS: 60     // أو كل 60 ثانية أيهما أسبق
};
