"""امتدادات Flask — تُعرَّف هنا مرة واحدة لتفادي الاستيراد الدائري.

الاستيراد عبر rest of the app:
    from app.extensions import db
"""
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()