"""نقطة إقلاع التطبيق — python run.py أو flask --app run.py run."""
import os

# تحميل متغيرات البيئة من `.env` إن وُجد قبل قراءة الإعدادات، حتى يعمل
# `python run.py` بنفس قيم `flask run` (الذي يحمّلها تلقائياً).
try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

from app import create_app

app = create_app()

if __name__ == "__main__":
    # الوضع التصحيحي يكشف console تفاعلياً؛ تفعيله على 0.0.0.0 يمنح أي
    # جهاز على الشبكة تنفيذاً للكود. لذلك يُقرأ من البيئة ولا يُفعَّل
    # افتراضياً، والعنوان الافتراضي محلي.
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=debug,
    )