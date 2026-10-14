// ================================================================ ARABIC FOR THE AGENTS: their own page, forms to sign, objections and Today
// An agent can read their page in Arabic (right to left) or English; the choice is kept for their account in this browser.
// The numbers, names and what the supervisor wrote stay as they are; the PDF forms stay in English (the signed record).
Object.assign(state, { lang: '' });
const AR_MON = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const AR_DAY = { Sun: 'الأحد', Mon: 'الاثنين', Tue: 'الثلاثاء', Wed: 'الأربعاء', Thu: 'الخميس', Fri: 'الجمعة', Sat: 'السبت' };
AR_DAY.Sunday = AR_DAY.Sun; AR_DAY.Monday = AR_DAY.Mon; AR_DAY.Tuesday = AR_DAY.Tue; AR_DAY.Wednesday = AR_DAY.Wed; AR_DAY.Thursday = AR_DAY.Thu; AR_DAY.Friday = AR_DAY.Fri; AR_DAY.Saturday = AR_DAY.Sat;
const AR = {
  // the page
  'My page': 'صفحتي', "{first}'s page": 'صفحة {first}', 'Month': 'الشهر', ' · final': ' · نهائي', 'My KPI card (PDF)': 'بطاقة مؤشراتي (PDF)', 'Your name': 'اسمك',
  'National ID': 'رقم الهوية', 'Brand': 'العلامة التجارية', 'Team': 'الفريق', 'Supervisor': 'المشرف', 'Agent': 'الموظف',
  'Nothing here yet': 'لا يوجد شيء بعد', 'Your results show here once your supervisor or the WFM team shares the month with you.': 'ستظهر نتائجك هنا عندما يشارك مشرفك أو فريق إدارة القوى العاملة الشهر معك.',
  'Loading your page…': 'جارٍ تحميل صفحتك…', 'Almost there': 'اقتربنا', 'Your account is not linked to your name yet. Ask your supervisor.': 'لم يُربط حسابك باسمك بعد. تواصل مع مشرفك.',
  'Final': 'نهائي', 'Draft': 'مسودة', '{m} is final.': 'تم اعتماد {m} نهائيًا.', '{m}: the numbers can still change until the month is final.': '{m}: قد تتغير الأرقام حتى يُعتمد الشهر نهائيًا.',
  'Updated {when}': 'آخر تحديث {when}', ' by {who}': ' بواسطة {who}', 'just now': 'الآن', 'yesterday': 'أمس', '{n} min ago': 'قبل {n} دقيقة', '{n} h ago': 'قبل {n} ساعة', '{n} days ago': 'قبل {n} أيام',
  'adherence': 'الالتزام بالجدول', 'target {t}': 'المستهدف {t}', 'final % (KPI)': 'النسبة النهائية (المؤشرات)', 'incentive': 'الحافز', 'not eligible: {why}': 'غير مستحق: {why}',
  'eligible': 'مستحق', 'not eligible': 'غير مستحق', 'eligibility': 'الاستحقاق', 'Yes': 'نعم', 'Not yet': 'ليس بعد', 'shown in full when the month is final': 'يظهر كاملًا عند اعتماد الشهر',
  'AHT': 'متوسط مدة المكالمة', 'absent days': 'أيام الغياب', 'tardy minutes': 'دقائق التأخير', 'SR': 'ريال',
  'KPI results': 'نتائج المؤشرات', 'KPI': 'المؤشر', 'Weight': 'الوزن', 'Target': 'المستهدف', 'Result': 'النتيجة', 'Ranking': 'التصنيف', 'Days attended {a} of {s} scheduled.': 'أيام الحضور {a} من {s} يومًا مجدولًا.',
  'Object': 'اعتراض', 'Performance': 'الأداء', 'Answered': 'المكالمات المُجابة', 'Replied': 'تم الرد', 'Handled': 'المكالمات المُعالجة', 'Avg handle': 'متوسط المعالجة', 'Avg talk': 'متوسط المحادثة', 'Avg hold': 'متوسط الانتظار', 'Avg ACW': 'متوسط ما بعد المكالمة',
  'Hold rate': 'نسبة الانتظار', 'Transfer rate': 'نسبة التحويل', 'Outbound': 'المكالمات الصادرة', 'Answered calls': 'المكالمات المُجابة',
  'Shifts and exceptions': 'الورديات والاستثناءات', 'Shifts': 'الورديات', 'Worked': 'أيام العمل', 'No sign-on': 'بدون تسجيل دخول', 'Late sign-ons': 'تسجيل دخول متأخر', 'Short of shift': 'نقص في الوردية', 'Break changes': 'تغييرات الاستراحة', 'Signed on': 'مدة تسجيل الدخول', 'Exceptions': 'الاستثناءات',
  'Quality': 'الجودة', 'Quality Observations': 'ملاحظات الجودة', 'Call QA': 'جودة المكالمات', 'Ticket QA': 'جودة التذاكر', 'CR': 'CR', 'Critical errors: {list}': 'الأخطاء الجسيمة: {list}', 'No critical errors.': 'لا توجد أخطاء جسيمة.', "From the quality team's evaluation of {m}.": 'من تقييم فريق الجودة لشهر {m}.',
  'Calls': 'المكالمات', 'Handled calls': 'المكالمات المُعالجة', 'Average duration': 'متوسط المدة', 'Calls under 10 seconds': 'مكالمات أقل من 10 ثوانٍ', 'You hung up': 'أنهيتَ المكالمة', 'Call drops (connection)': 'انقطاع المكالمات (الاتصال)', 'Transferred': 'المحوّلة', 'Customer called again within 3 days': 'اتصل العميل مجددًا خلال 3 أيام',
  'Daily adherence': 'الالتزام اليومي بالجدول', 'Attendance': 'الحضور', 'Counted from your schedule and sign-ons, corrected by your supervisor where needed. Questions? Ask {spv}.': 'محسوب من جدولك وتسجيلات دخولك، ويصححه مشرفك عند الحاجة. لديك سؤال؟ تواصل مع {spv}.',
  'Select a day to object to it.': 'اختر يومًا للاعتراض عليه.', 'your supervisor': 'مشرفك',
  'One-to-ones · {m}': 'الاجتماعات الفردية · {m}', 'One-to-one form': 'نموذج الاجتماع الفردي', 'Final form': 'النموذج النهائي', 'Form': 'النموذج', 'Arranged for {d}': 'محدد في {d}', 'Signed {when}': 'تم التوقيع {when}',
  'Changed since you signed: please sign again': 'عُدّل بعد توقيعك: يُرجى التوقيع مجددًا', 'Waiting for your signature': 'بانتظار توقيعك', ' · with {spv}': ' · مع {spv}', 'Open': 'فتح', 'Read and sign': 'اقرأ ووقّع', 'No one-to-one for this month yet.': 'لا يوجد اجتماع فردي لهذا الشهر بعد.',
  // signing
  'With {spv} on {d}': 'مع {spv} في {d}', 'With {spv}': 'مع {spv}', 'Making the PDF…': 'جارٍ إنشاء ملف PDF…', 'Open the form as a PDF': 'افتح النموذج كملف PDF', ', exactly as it is printed and signed.': '، تمامًا كما يُطبع ويُوقَّع.',
  'You signed this form': 'لقد وقّعت هذا النموذج', ' · typed name: {n}': ' · الاسم المكتوب: {n}', 'Your signature': 'توقيعك', 'Your comment: {c}': 'تعليقك: {c}', 'The form changed after you signed it': 'تغيّر النموذج بعد توقيعك', 'Sign the form': 'وقّع النموذج',
  'Your supervisor changed it after you signed. Read it again and sign the new version.': 'عدّله مشرفك بعد توقيعك. اقرأه مرة أخرى ووقّع النسخة الجديدة.', 'Your comment (optional)': 'تعليقك (اختياري)', 'Anything you want to add to the form': 'أي شيء تريد إضافته إلى النموذج',
  'Clear': 'مسح', 'Draw it with the mouse or your finger, or type your full name instead:': 'ارسمه بالفأرة أو بإصبعك، أو اكتب اسمك الكامل بدلًا من ذلك:', 'Your full name': 'اسمك الكامل',
  'I have read this one-to-one form. My signature confirms that the discussion took place and that I received a copy; it does not necessarily mean that I agree.': 'لقد قرأت نموذج الاجتماع الفردي هذا. يؤكد توقيعي أن النقاش قد تم وأنني استلمت نسخة منه، ولا يعني ذلك بالضرورة أنني موافق.',
  'I confirm that the one-to-one discussion took place and that the outcome above was explained to me. I have received a copy of this form. My signature confirms receipt, not necessarily agreement.': 'أؤكد أن نقاش الاجتماع الفردي قد تم وأن القرار أعلاه شُرح لي. لقد استلمت نسخة من هذا النموذج. يؤكد توقيعي الاستلام، ولا يعني بالضرورة الموافقة.',
  'Download the signed PDF': 'تنزيل ملف PDF الموقّع', 'Email it to me and my supervisor': 'أرسله بالبريد لي ولمشرفي', 'Sign': 'توقيع', 'Draw your signature, or type your full name.': 'ارسم توقيعك أو اكتب اسمك الكامل.',
  'Tick the box to confirm you read the form.': 'ضع علامة في المربع لتأكيد أنك قرأت النموذج.', 'Type your name in English letters (the PDF font cannot show this one), or draw your signature.': 'اكتب اسمك بالأحرف الإنجليزية (خط ملف PDF لا يعرض هذه الأحرف)، أو ارسم توقيعك.',
  'Signed. You can now download it or email it.': 'تم التوقيع. يمكنك الآن تنزيله أو إرساله بالبريد.', 'Could not save your signature ({e}). Try again.': 'تعذّر حفظ توقيعك ({e}). حاول مرة أخرى.',
  // the form, read on screen
  'Date of this form': 'تاريخ هذا النموذج', 'Date of the one-to-one': 'تاريخ الاجتماع الفردي', 'Period reviewed': 'الفترة المراجَعة', 'One-to-one held on': 'تاريخ عقد الاجتماع الفردي', 'Reference': 'المرجع', 'Topics: {list}': 'المواضيع: {list}',
  'Adherence / conformance': 'الالتزام بالجدول / المطابقة', 'Results – {p}': 'النتائج – {p}', 'Metric': 'المقياس', 'Status': 'الحالة', 'None.': 'لا يوجد.', 'Summary of findings': 'ملخص النتائج', "Agent's explanation": 'توضيح الموظف',
  'Outcome': 'القرار', 'Action plan': 'خطة العمل', 'Review date': 'تاريخ المراجعة', 'What was discussed': 'ما تمت مناقشته', 'Root cause': 'السبب الجذري', "Agent's comments": 'تعليقات الموظف', 'Agreed actions': 'الإجراءات المتفق عليها',
  'Action': 'الإجراء', 'Owner': 'المسؤول', 'Due date': 'تاريخ الاستحقاق', 'Next review date': 'تاريخ المراجعة القادمة', 'Coaching only (no warning)': 'توجيه فقط (دون إنذار)', 'Verbal warning': 'إنذار شفهي', 'Written warning': 'إنذار كتابي', 'Final warning': 'إنذار نهائي',
  'Follow-up from {m}': 'متابعة {m}', "Last month's actions": 'إجراءات الشهر الماضي', 'Done': 'تم', 'Partly': 'جزئيًا', 'Not done': 'لم يتم', 'Not checked': 'لم تُراجع', 'KPIs then and now': 'المؤشرات بين الشهرين', 'Before': 'قبل', 'Now': 'الآن', 'Better': 'تحسّن', 'Worse': 'تراجع', 'Same': 'دون تغيير',
  // this month so far
  'This month so far': 'هذا الشهر حتى الآن', 'Projected final': 'النسبة النهائية المتوقعة', 'Projected incentive': 'الحافز المتوقع', 'if it stays like this': 'إذا استمر الأداء هكذا', 'Weakest KPI': 'أضعف مؤشر',
  'Based on {n} days up to {d}.': 'بناءً على {n} يومًا حتى {d}.', 'Based on 1 day up to {d}.': 'بناءً على يوم واحد حتى {d}.', '{n} of your objections were answered': 'تم الرد على {n} من اعتراضاتك', "Last month's {list} until this month's arrive.": 'تُستخدم قيم الشهر الماضي لـ {list} حتى تصل قيم هذا الشهر.', 'At risk: {why}': 'قد لا تستحق الحافز: {why}',
  'Work on {kpi} first: ranked {r} of 5 (target {t}).': 'ابدأ بتحسين {kpi}: تصنيفه {r} من 5 (المستهدف {t}).', 'Every KPI is in the top band so far.': 'كل مؤشراتك في أعلى تصنيف حتى الآن.', 'final {v} is under {t}': 'النسبة النهائية {v} أقل من {t}', 'not eligible (senior manager)': 'غير مستحق (قرار المدير الأول)', '{n} days attended': '{n} أيام حضور', 'attitude critical error': 'خطأ جسيم في السلوك',
  // objections
  'blank': 'فارغ', 'late {n} min': 'تأخير {n} دقيقة', 'Present': 'حاضر', 'Annual leave': 'إجازة سنوية', 'Sick leave': 'إجازة مرضية', 'Day off': 'يوم راحة', 'Absent': 'غائب', 'Another leave': 'إجازة أخرى',
  'Objections for {m} closed on {d}.': 'أُغلق باب الاعتراض على {m} في {d}.', 'Objections are closed for this month.': 'باب الاعتراض مغلق لهذا الشهر.', 'Raise an objection': 'تقديم اعتراض', 'your supervisor answers it': 'يرد عليه مشرفك',
  'What is not right?': 'ما الذي ليس صحيحًا؟', 'A day of my attendance': 'يوم من أيام حضوري', 'A day of my adherence': 'يوم من أيام الالتزام بالجدول', 'A KPI result': 'نتيجة مؤشر أداء', 'My AHT': 'متوسط مدة المكالمة (AHT)', 'My quality result': 'نتيجة الجودة',
  'My incentive or eligibility': 'الحافز أو الاستحقاق', 'Something else': 'شيء آخر', 'Choose…': 'اختر…', 'Which day?': 'أي يوم؟', 'Which KPI?': 'أي مؤشر؟', 'In the tool now': 'المسجّل في الأداة الآن', 'What should it be?': 'ما الصحيح؟',
  'What should it be? (optional)': 'ما الصحيح؟ (اختياري)', 'For example: 95%': 'مثلًا: 95%', 'Why?': 'لماذا؟', 'Anything that helps: the time you signed in, a ticket number, who you spoke to.': 'أي تفاصيل تساعد: وقت تسجيل دخولك، رقم التذكرة، الشخص الذي تحدثت معه.',
  'Your supervisor sees this, and the senior manager if it goes to him.': 'يطّلع عليه مشرفك، والمدير الأول إذا رُفع إليه.', 'Cancel': 'إلغاء', 'Send to my supervisor': 'إرسال إلى مشرفي', 'Choose the day.': 'اختر اليوم.', 'Choose the KPI.': 'اختر المؤشر.',
  'Choose what the day should be.': 'اختر ما يجب أن يكون عليه اليوم.', 'Explain why in a few words.': 'اشرح السبب في كلمات قليلة.', 'Not sent': 'لم يُرسل', 'Sent to {spv}. The answer shows on your page.': 'تم الإرسال إلى {spv}. سيظهر الرد في صفحتك.',
  'Sent to the senior manager.': 'تم الإرسال إلى المدير الأول.', 'Waiting for your supervisor': 'بانتظار رد مشرفك', 'With the senior manager': 'لدى المدير الأول', 'Accepted · being fixed by {who}': 'مقبول · يجري تصحيحه من {who}',
  'the supervisor': 'المشرف', 'the WFM team': 'فريق إدارة القوى العاملة', 'the quality team': 'فريق الجودة', 'the senior manager': 'المدير الأول', 'the team': 'الفريق', 'Accepted and fixed': 'مقبول وتم التصحيح', 'Not accepted': 'غير مقبول', 'Accepted': 'مقبول',
  'My objections': 'اعتراضاتي', 'Something not right? You can object until {d}; your supervisor answers.': 'هل هناك ما ليس صحيحًا؟ يمكنك الاعتراض حتى {d}، ويرد عليك مشرفك.', 'Something not right? Object here; your supervisor answers.': 'هل هناك ما ليس صحيحًا؟ اعترض هنا، ويرد عليك مشرفك.',
  'Ask the senior manager to look': 'اطلب مراجعة المدير الأول', 'None for this month.': 'لا يوجد لهذا الشهر.', 'Adherence': 'الالتزام بالجدول', 'Incentive': 'الحافز', 'Other': 'أخرى', 'Click again to send': 'اضغط مرة أخرى للإرسال', 'Corrected to {v}': 'صُحّح إلى {v}', 'Sent to the senior manager': 'رُفع إلى المدير الأول',
  // today
  'Today': 'اليوم', 'Hide for today': 'إخفاء لليوم', 'Show': 'عرض', '{n} things': '{n} مهام', '1 thing': 'مهمة واحدة', 'Nothing for you today.': 'لا شيء مطلوب منك اليوم.',
  'Sign your one-to-one': 'وقّع نموذج الاجتماع الفردي', 'Your supervisor wrote it; read it and sign it on screen.': 'كتبه مشرفك؛ اقرأه ووقّعه على الشاشة.', 'Your objection was answered': 'تم الرد على اعتراضك', 'Objections for {m} close {when}': 'يُغلق باب الاعتراض على {m} {when}',
  'today': 'اليوم', 'tomorrow': 'غدًا', 'in {n} days': 'بعد {n} أيام', 'Check your numbers and object if something is not right.': 'راجع أرقامك واعترض إذا كان هناك ما ليس صحيحًا.', 'This month so far: final {f}': 'هذا الشهر حتى الآن: النسبة النهائية {f}',
  'weakest: {k}': 'أضعف مؤشر: {k}', 'Open my objections': 'عرض اعتراضاتي', 'Read and sign': 'اقرأ ووقّع',
  // filling in a one-to-one, the supervisor's final, then the signature
  'Final from your supervisor: sign it': 'القرار النهائي من مشرفك: وقّع عليه', 'Sent {when}: waiting for your supervisor': 'أُرسل {when}: بانتظار مشرفك', 'Your part to fill in': 'جزؤك بانتظار التعبئة', 'Fill in': 'تعبئة',
  'Final from your supervisor': 'القرار النهائي من مشرفك', 'Rejected': 'مرفوض', 'Send again': 'إرسال مجددًا', 'your part': 'جزؤك', 'you wrote': 'كتبته أنت', 'Add a row': 'إضافة سطر',
  'You sent your part {when}. You can still change it and send it again until your supervisor sends the final.': 'أرسلت جزأك {when}. ما زال بإمكانك تعديله وإرساله مجددًا حتى يرسل مشرفك القرار النهائي.',
  'Fill in the empty places (your part), then send the form to your supervisor. They read it and send it back with their final comment; you sign it then.': 'املأ الخانات الفارغة (جزؤك)، ثم أرسل النموذج إلى مشرفك. سيقرؤه ويعيده إليك مع تعليقه النهائي، وبعدها توقّع عليه.',
  'Write in English letters: the printed form cannot show Arabic.': 'اكتب بالأحرف الإنجليزية: النموذج المطبوع لا يعرض الحروف العربية.',
  "I have read this one-to-one form and my supervisor's final comment. My signature confirms that I received it; it does not necessarily mean that I agree.": 'لقد قرأت نموذج الاجتماع الفردي هذا والتعليق النهائي لمشرفي. يؤكد توقيعي أنني استلمته، ولا يعني ذلك بالضرورة أنني موافق.',
  "The signature comes after your supervisor's final.": 'يأتي التوقيع بعد القرار النهائي من مشرفك.', 'Fill in at least one place before you send it.': 'املأ خانة واحدة على الأقل قبل الإرسال.',
  'Sent to your supervisor. You sign the form when they send it back with their final comment.': 'تم الإرسال إلى مشرفك. ستوقّع على النموذج عندما يعيده إليك مع تعليقه النهائي.', 'Not sent ({e}). Try again.': 'لم يُرسل ({e}). حاول مرة أخرى.',
  'Fill in your one-to-one': 'املأ نموذج الاجتماع الفردي', 'Fill in your part and send it to your supervisor.': 'املأ جزأك وأرسله إلى مشرفك.', 'Your supervisor sent the final; read it and sign it on screen.': 'أرسل مشرفك القرار النهائي؛ اقرأه ووقّع عليه على الشاشة.',
  // the welcome line
  'Welcome, {first}': 'مرحبًا، {first}', 'Welcome': 'مرحبًا',
};
const langNow = () => (roleNow() === 'agent' && state.lang === 'ar' ? 'ar' : 'en');
/** a number or a target kept left to right inside Arabic (so "≥ 95%" is not turned round) */
const ltr = s => `<bdi dir="ltr">${esc(s)}</bdi>`;
/** the reasons someone is not eligible, in the agent's language */
const whyTr = L => (L || []).map(w => String(w).replace(/^final (\S+) is under (\S+)$/, (m, a, b) => T('final {v} is under {t}', { v: a, t: b })).replace(/^(\d+) days attended$/, (m, n) => T('{n} days attended', { n })).replace(/^attitude critical error$/, () => T('attitude critical error')).replace(/^not eligible \(senior manager\)$/, () => T('not eligible (senior manager)'))).join(', ');
/** the words in the agent's language: T('Updated {when}', { when }) */
function T(en, vars) {
  let s = langNow() === 'ar' && AR[en] != null ? AR[en] : en;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] == null ? '' : String(vars[k])));
  return s;
}
const MONT = m => (langNow() === 'ar' ? AR_MON[m - 1] : MON[m - 1]);
const ymLabelT = k => (langNow() === 'ar' ? `${AR_MON[+k.slice(5) - 1]} ${k.slice(0, 4)}` : ymLabel(k));
const dayNameT = (y, m, d) => { const w = Core.weekday(y, m, d); return langNow() === 'ar' ? AR_DAY[w] || w : String(w).slice(0, 3); };
const fmtDueT = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return langNow() === 'ar' ? `${AR_DAY[Core.weekday(y, m, d)] || ''} ${d} ${AR_MON[m - 1]}` : fmtDue(iso); };
const fmtDateT = iso => { if (!iso) return ''; const [y, m, d] = String(iso).split('-').map(Number); if (!y || !m || !d) return String(iso); return langNow() === 'ar' ? `${d} ${AR_MON[m - 1]} ${y}` : Forms.fmtDate(iso); };
function agoT(iso) {
  if (!iso) return ''; const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return T('just now'); if (s < 3600) return T('{n} min ago', { n: Math.round(s / 60) }); if (s < 86400) return T('{n} h ago', { n: Math.round(s / 3600) });
  const d = Math.round(s / 86400); return d === 1 ? T('yesterday') : T('{n} days ago', { n: d });
}
/** the agent's choice, kept for their account in this browser */
function langLoad() { const u = Auth.user(); state.lang = u ? lsGet('mc-lang:' + u.id) || '' : ''; }
function langSet(l) { const u = Auth.user(); state.lang = l; if (u) lsSet('mc-lang:' + u.id, l); langApply(); renderWs(); }
/** right to left where the agent reads */
function langApply() {
  const ar = langNow() === 'ar';
  for (const id of ['v-me', 'dSign', 'dObj', 'today', 'welcome']) { const el = $(id); if (!el) continue; el.dir = ar ? 'rtl' : 'ltr'; el.lang = ar ? 'ar' : 'en'; el.classList.toggle('ar', ar); }
  renderWelcome();
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-melang]'); if (b) langSet(b.dataset.melang); });
