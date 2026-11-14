#!/bin/sh
# يجمع ملفات الخادم في ملف واحد Code.gs لِلصقه في Google Apps Script
cd "$(dirname "$0")/.."
{
  printf '%s\n' '/* =====================================================================' \
    '   Code.gs — الخادم (Google Apps Script) لنظام الكشف عن الموهوبين' \
    '   (اختبار المصفوفات + اختبار التفكير الإبداعي)' \
    '   الصق هذا الملف كاملاً في محرر Apps Script المرتبط بجدول Google' \
    '   ثم شغّل الدالة setup مرة واحدة، ثم انشره كتطبيق ويب' \
    '   ملاحظة: هذا الملف مُولَّد تلقائياً من ملفات assets — لا تعدّله يدوياً' \
    '   ===================================================================== */'
  cat assets/tt-items.js; echo
  cat assets/tt-engine.js; echo
  cat assets/core.js; echo
  cat assets/tt-core.js; echo
  cat backend/gas-adapter.js
} > backend/Code.gs
echo "backend/Code.gs: $(wc -c < backend/Code.gs) bytes"
