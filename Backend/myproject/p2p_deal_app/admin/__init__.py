from flask import Blueprint

admin_bp = Blueprint("admin", __name__)

from . import dashboard
from . import authAdmin
from . import transactions
from . import AdminDisputes