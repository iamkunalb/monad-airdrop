# Use the official Playwright image
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

# Install dependencies for Chrome
RUN apt-get update && apt-get install -y wget unzip

# Install Google Chrome (needed for MetaMask)
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /usr/share/keyrings/google-chrome-keyring.gpg
RUN echo 'deb [signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main' | tee /etc/apt/sources.list.d/google.list
RUN apt-get update && apt-get install -y google-chrome-stable

# Set Chrome executable path
ENV CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set up MetaMask extension directory
WORKDIR /app

# Download and install MetaMask extension
RUN mkdir -p /app/metamask \
    && curl -L -o metamask.zip "https://github.com/MetaMask/metamask-extension/releases/download/v12.13.1/metamask-chrome-12.13.1.zip" \
    && unzip metamask.zip -d /app/metamask

# Copy Playwright script
COPY . /app

# Install dependencies
RUN npm install

# Set entrypoint
CMD ["node", "script.js"]
