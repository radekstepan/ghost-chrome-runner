# We must use the amd64 image to be compatible with Google Chrome Stable
FROM --platform=linux/amd64 node:22-bookworm

# Install basic utilities
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
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Add Google signing key
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg

# Add Google Chrome repository
RUN echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list

# Install Google Chrome Stable and fonts
# We separate this step to ensure the repo lists are fresh
RUN apt-get update && apt-get install -y \
    google-chrome-stable \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
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

# Environment variables
ENV DISPLAY=:99
ENV PORT=3000

EXPOSE 3000 9222

ENTRYPOINT ["./scripts/entrypoint.sh"]
