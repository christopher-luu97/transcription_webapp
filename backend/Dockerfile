FROM python:3.10.11

ENV PYTHONBUFFERED=1

WORKDIR /backend

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000