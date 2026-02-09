

FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install google-genai
RUN pip install paramiko
RUN pip install fastapi
RUN pip install uvicorn
RUN apt-get update && apt-get install -y openssh-server 
EXPOSE 2223
CMD ["service", "ssh", "start", "-D"]
