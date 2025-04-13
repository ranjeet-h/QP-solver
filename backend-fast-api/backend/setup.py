import os
from setuptools import setup, find_packages

# Core dependencies
CORE_DEPENDENCIES = [
    "fastapi==0.109.0",
    "uvicorn==0.23.2",
    "SQLAlchemy==2.0.23",
    "alembic==1.12.1",
    "pydantic==2.7.0",
    "pydantic-core==2.18.1",
    "pydantic-settings==2.3.4",
    "annotated-types==0.7.0",
]

# Authentication and security
AUTH_DEPENDENCIES = [
    "python-jose==3.3.0",
    "passlib==1.7.4",
    "bcrypt==4.3.0",
    "python-multipart==0.0.6",
    "ecdsa==0.19.1",
]

# Database and validation
DB_DEPENDENCIES = [
    "PyMySQL==1.1.0",
    "email_validator==2.2.0",
    "dnspython==2.7.0",
]

# PDF and document processing
DOC_DEPENDENCIES = [
    "PyMuPDF==1.25.4",
]

# Google AI and related
AI_DEPENDENCIES = [
    "google-auth==2.38.0",
    "google-genai==1.5.0",
    "cachetools==5.5.2",
]

# Server and networking
SERVER_DEPENDENCIES = [
    "uvloop==0.21.0",
    "httpx==0.28.1",
    "httpcore==1.0.7",
    "httptools==0.6.4",
    "h11==0.14.0",
    "websockets==14.2",
    "watchfiles==1.0.4",
    "requests==2.32.3",
]

# Utility packages
UTIL_DEPENDENCIES = [
    "python-dotenv==1.0.0",
    "PyYAML==6.0.2",
    "six==1.17.0",
    "typing_extensions==4.13.0",
]

setup(
    name="qp-solver-backend",
    version="0.1.0",
    packages=find_packages(),
    install_requires=(
        CORE_DEPENDENCIES +
        AUTH_DEPENDENCIES +
        DB_DEPENDENCIES +
        DOC_DEPENDENCIES +
        AI_DEPENDENCIES +
        SERVER_DEPENDENCIES +
        UTIL_DEPENDENCIES
    ),
    author="Your Name",
    author_email="your.email@example.com",
    description="Question Paper Solver Backend",
    long_description=open("README.md").read() if os.path.exists("README.md") else "",
    long_description_content_type="text/markdown",
    keywords="fastapi, solver, backend, question paper",
    python_requires=">=3.8"
)