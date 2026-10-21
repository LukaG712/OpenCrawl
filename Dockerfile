FROM node:20-bookworm-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src/ src/

# Install Playwright browsers
RUN npx playwright install chromium && npx playwright install-deps chromium

# Build
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
