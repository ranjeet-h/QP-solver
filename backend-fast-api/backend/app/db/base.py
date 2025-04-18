# Import all the models here so that Base has them before creating the tables
from app.db.base_class import Base
from app.models.user import User
from app.models.pdf import PDF, PDFStatus
from app.models.history import History  # Import the new History model

# Import other models here as they are created
# from app.models.other_model import OtherModel 