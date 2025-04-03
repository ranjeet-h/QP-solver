from app.db.database import Base, engine
from sqlalchemy_utils import database_exists, create_database
from app.api.models import User, PDF
import logging

# Set up logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

def init_db():
    # Create database if it doesn't exist
    if not database_exists(engine.url):
        create_database(engine.url)
        print(f"Database created at {engine.url}")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("Initializing database...")
    try:
        init_db()
        print("Database and tables created successfully!")
    except Exception as e:
        print(f"Error during database initialization: {str(e)}")