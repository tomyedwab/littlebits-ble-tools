FROM python:3

COPY . /usr/src/
WORKDIR /usr/src

CMD ["python", "-m", "http.server", "80", "--bind", "0.0.0.0"]
