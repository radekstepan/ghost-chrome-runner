# Use Node.js Debian-based image (Bookworm has recent deps)
FROM node:22-bookworm

# Install basic utilities and Xvfb
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    xvfb \
    x11-utils \
    procps \
    iproute2 \
    curl \
    unzip \
    ca-certificates \
    --no-install-recommends

# Install Google Chrome Stable
# We use the official .deb to get the real binary (Widevine, codecs, correct headers)
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set up workspace
WORKDIR /app

# Copy dependency definitions
COPY package.json tsconfig.json ./

# Install Node dependencies
RUN npm install

# Copy source code and scripts
COPY src ./src
COPY scripts ./scripts

# Make scripts executable
RUN chmod +x ./scripts/entrypoint.sh

# Environment variables for display
ENV DISPLAY=:99
ENV PORT=3000

# Expose API port and CDP port (for debugging)
EXPOSE 3000 9222

# Start the specialized entrypoint
ENTRYPOINT ["./scripts/entrypoint.sh"]
