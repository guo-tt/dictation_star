FROM node:20-alpine

WORKDIR /srv

# Install deps from package.json if node_modules is empty/missing at startup
# (node_modules is mounted as a named volume so it persists between runs)
EXPOSE 5173

CMD ["sh", "-c", "npm install && npm run dev"]
