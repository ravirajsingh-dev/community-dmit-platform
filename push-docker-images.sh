# Usage: ./push-docker-images.sh 1.0.0
echo "Build: $1"
echo "Starting pushing docker images..."

cd "$(dirname "$0")"

REGISTRY="${CONTAINER_REGISTRY:-registry.example.com/community-dmit-platform/}"
HOST="${DEPLOY_HOST:-user@your-server}"

echo "docker save -o ./community-dmit-server.tar ${REGISTRY}server:$1"
docker save -o ./community-dmit-server.tar "${REGISTRY}server:$1"

echo "docker save -o ./community-dmit-client.tar ${REGISTRY}client:$1"
docker save -o ./community-dmit-client.tar "${REGISTRY}client:$1"

echo "docker save -o ./community-dmit-admin.tar ${REGISTRY}admin:$1"
docker save -o ./community-dmit-admin.tar "${REGISTRY}admin:$1"

printf "\n\n"

scp community-dmit-server.tar "${HOST}:~/"
scp community-dmit-client.tar "${HOST}:~/"
scp community-dmit-admin.tar "${HOST}:~/"

rm ./community-dmit-server.tar
rm ./community-dmit-client.tar
rm ./community-dmit-admin.tar
