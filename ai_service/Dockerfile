FROM python:3.11-slim

# System dependencies for scientific libraries and scikit-learn
RUN apt-get update && apt-get install -y \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download NLTK data to avoid race conditions in production
RUN python -m nltk.downloader punkt punkt_tab stopwords

# Copy source code
COPY . .

# Python optimizations
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FLASK_ENV=production

EXPOSE 5000

# Use Gunicorn as the production WSGI server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "--access-logfile", "-", "wsgi:app"]
