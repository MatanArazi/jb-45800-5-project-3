#!/bin/bash

# Docker Helper Script for Vacation Website
# Usage: ./docker-helper.sh [command]

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Display menu
display_menu() {
    echo -e "${BLUE}=== Vacation Website Docker Helper ===${NC}"
    echo ""
    echo "Commands:"
    echo "  1) start    - Start the database"
    echo "  2) stop     - Stop the database"
    echo "  3) restart  - Restart the database"
    echo "  4) logs     - View database logs"
    echo "  5) status   - Check container status"
    echo "  6) connect  - Connect to MySQL CLI"
    echo "  7) clean    - Remove containers and volumes"
    echo "  8) help     - Show this menu"
    echo ""
}

# Parse command
case "$1" in
    start)
        echo -e "${GREEN}Starting database...${NC}"
        docker-compose up -d
        sleep 2
        echo -e "${GREEN}✓ Database started${NC}"
        docker-compose ps
        ;;
    stop)
        echo -e "${GREEN}Stopping database...${NC}"
        docker-compose down
        echo -e "${GREEN}✓ Database stopped${NC}"
        ;;
    restart)
        echo -e "${GREEN}Restarting database...${NC}"
        docker-compose restart mysql
        sleep 2
        echo -e "${GREEN}✓ Database restarted${NC}"
        ;;
    logs)
        echo -e "${BLUE}Database logs:${NC}"
        docker-compose logs -f mysql
        ;;
    status)
        echo -e "${BLUE}Container status:${NC}"
        docker-compose ps
        echo ""
        echo -e "${BLUE}Database health:${NC}"
        docker-compose exec mysql mysqladmin ping -u vacation_user -p vacation_db
        ;;
    connect)
        echo -e "${BLUE}Connecting to MySQL...${NC}"
        docker exec -it vacation_db mysql -u vacation_user -p vacation_db
        ;;
    clean)
        echo -e "${RED}Warning: This will delete all data!${NC}"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}Removing containers and volumes...${NC}"
            docker-compose down -v
            echo -e "${GREEN}✓ Cleanup complete${NC}"
        else
            echo "Cancelled."
        fi
        ;;
    help|--help|-h|"")
        display_menu
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        display_menu
        exit 1
        ;;
esac
