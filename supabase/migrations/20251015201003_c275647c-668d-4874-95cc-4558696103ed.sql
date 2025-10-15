-- Insert tasks for category 'פרטים' (details)
INSERT INTO public.tasks (category_id, name, description, order_index, is_required)
SELECT 
  c.id,
  task_name,
  task_description,
  task_order,
  task_required
FROM public.categories c,
(VALUES
  ('שם הפרויקט', 'הזנת שם הפרויקט', 1, true),
  ('כתובת', 'הזנת כתובת הנכס', 2, true),
  ('גוש', 'מספר גוש', 3, true),
  ('חלקה', 'מספר חלקה', 4, true),
  ('מגרש', 'מספר מגרש', 5, true),
  ('שם לקוח', 'שם הלקוח', 6, true),
  ('טלפון', 'מספר טלפון ליצירת קשר', 7, true),
  ('אימייל', 'כתובת אימייל', 8, false),
  ('מייל נוסף', 'כתובת אימייל נוספת', 9, false)
) AS t(task_name, task_description, task_order, task_required)
WHERE c.name = 'details';

-- Insert tasks for category 'תיק מידע' (info_file)
INSERT INTO public.tasks (category_id, name, description, order_index, is_required)
SELECT 
  c.id,
  task_name,
  task_description,
  task_order,
  task_required
FROM public.categories c,
(VALUES
  ('מסמכי בעלות', 'תעודת בעלות ומסמכים נלווים', 1, true),
  ('תב״ע', 'תכנית בנין עיר', 2, true),
  ('היסטוריית הנכס', 'מידע היסטורי על הנכס', 3, false),
  ('סקר', 'סקר מודד מוסמך', 4, true),
  ('תנאי פריסה', 'תנאים להיתר', 5, true),
  ('הערות לקוח', 'הערות והעדפות הלקוח', 6, false),
  ('בדיקת זכויות', 'בדיקת זכויות בנייה', 7, true),
  ('תצ״ר', 'תכנית צמודת קרקע', 8, false),
  ('מפה', 'מפות רלוונטיות', 9, false)
) AS t(task_name, task_description, task_order, task_required)
WHERE c.name = 'info_file';

-- Insert tasks for category 'תוכניות' (plans)
INSERT INTO public.tasks (category_id, name, description, order_index, is_required)
SELECT 
  c.id,
  task_name,
  task_description,
  task_order,
  task_required
FROM public.categories c,
(VALUES
  ('הצעת תכנון', 'הצגת הצעת תכנון ללקוח', 1, true),
  ('אישור לקוח', 'קבלת אישור לקוח על התכנון', 2, true),
  ('תכנית אדריכלית', 'הכנת תכנית אדריכלית מפורטת', 3, true),
  ('תכנית קונסטרוקציה', 'תכנון קונסטרוקטיבי', 4, true),
  ('תכנית חשמל', 'תכנון מערכת חשמל', 5, true),
  ('תכנית אינסטלציה', 'תכנון מערכת אינסטלציה', 6, true),
  ('תכנית ניקוז', 'תכנון מערכת ניקוז', 7, true),
  ('תכנית תיאום', 'תיאום בין כל המערכות', 8, true),
  ('חתכים', 'חתכים אדריכליים', 9, true),
  ('חזיתות', 'תכנון חזיתות', 10, true),
  ('פרטים', 'פרטים אדריכליים', 11, false),
  ('תלת מימד', 'תכנון תלת מימדי', 12, false),
  ('רנדרים', 'הדמיות ויזואליות', 13, false),
  ('סרטון', 'סרטון הדמיה', 14, false)
) AS t(task_name, task_description, task_order, task_required)
WHERE c.name = 'plans';

-- Insert tasks for category 'בקשת היתר' (permit_request)
INSERT INTO public.tasks (category_id, name, description, order_index, is_required)
SELECT 
  c.id,
  task_name,
  task_description,
  task_order,
  task_required
FROM public.categories c,
(VALUES
  ('הכנת מסמכים', 'הכנת כל המסמכים לבקשה', 1, true),
  ('טופס 4', 'מילוי טופס 4', 2, true),
  ('הצהרות', 'הצהרות נדרשות', 3, true),
  ('חתימות', 'איסוף חתימות', 4, true),
  ('תשלום אגרות', 'תשלום אגרות עירייה', 5, true),
  ('הגשה', 'הגשת הבקשה', 6, true),
  ('קבלת אישור עקרוני', 'קבלת אישור עקרוני מהעירייה', 7, true),
  ('טיפול בהערות', 'מענה להערות הועדה', 8, false),
  ('אישור ועדה', 'קבלת אישור ועדת תכנון', 9, true),
  ('היתר בנייה', 'קבלת היתר בנייה סופי', 10, true),
  ('העתק היתר ללקוח', 'העברת העתק היתר ללקוח', 11, true),
  ('סיום פרויקט', 'סגירת תיק הפרויקט', 12, true),
  ('מעקב ביצוע', 'מעקב אחר ביצוע בפועל', 13, false),
  ('תיקונים', 'תיקונים במידת הצורך', 14, false),
  ('אחריות', 'אחריות לתקופה מוגדרת', 15, false),
  ('ארכיון', 'העברה לארכיון', 16, false)
) AS t(task_name, task_description, task_order, task_required)
WHERE c.name = 'permit_request';