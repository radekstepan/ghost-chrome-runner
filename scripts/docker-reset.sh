# 1. Stop and remove the current stuck container
docker-compose down

# 2. Rebuild cleanly (this ensures the new packages are installed)
docker-compose up -d --build

# 3. Watch the logs to confirm it passes the "Waiting" stage
docker-compose logs -f
