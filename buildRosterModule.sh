#!/bin/bash

# setup-roster-complete.sh
# Complete setup script for the roster module
# Creates directories, placeholders, and optionally copies files
# 
# Usage:
#   ./setup-roster-complete.sh                    # Create structure only
#   ./setup-roster-complete.sh --copy-from <dir>  # Create structure and copy files
#   ./setup-roster-complete.sh --dry-run          # Preview without changes
#   ./setup-roster-complete.sh --help             # Show help

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BASE_DIR="src/modules/roster"
SHARED_DIR="src/shared/presentation/middleware"
DRY_RUN=false
COPY_FILES=false
SOURCE_DIR=""

# File mapping: source_file -> destination_path
declare -A FILE_MAP=(
    ["rosterPlayer.entity.ts"]="${BASE_DIR}/domain/entities/rosterPlayer.entity.ts"
    ["IRosterPlayerRepository.ts"]="${BASE_DIR}/domain/repositories/IRosterPlayerRepository.ts"
    ["rosterPlayer.dto.ts"]="${BASE_DIR}/application/dto/rosterPlayer.dto.ts"
    ["CreateRosterPlayer.usecase.ts"]="${BASE_DIR}/application/use-cases/CreateRosterPlayer.usecase.ts"
    ["UpdateRosterPlayer.usecase.ts"]="${BASE_DIR}/application/use-cases/UpdateRosterPlayer.usecase.ts"
    ["GetRosterPlayer.usecase.ts"]="${BASE_DIR}/application/use-cases/GetRosterPlayer.usecase.ts"
    ["GetTeamRoster.usecase.ts"]="${BASE_DIR}/application/use-cases/GetTeamRoster.usecase.ts"
    ["GetTeamStarters.usecase.ts"]="${BASE_DIR}/application/use-cases/GetTeamStarters.usecase.ts"
    ["GetRosterByPositionGroup.usecase.ts"]="${BASE_DIR}/application/use-cases/GetRosterByPositionGroup.usecase.ts"
    ["DeleteRosterPlayer.usecase.ts"]="${BASE_DIR}/application/use-cases/DeleteRosterPlayer.usecase.ts"
    ["GetAllRosterPlayers.usecase.ts"]="${BASE_DIR}/application/use-cases/GetAllRosterPlayers.usecase.ts"
    ["PrismaRosterPlayerRepository.ts"]="${BASE_DIR}/infrastructure/repositories/PrismaRosterPlayerRepository.ts"
    ["RosterPlayerMapper.ts"]="${BASE_DIR}/infrastructure/mappers/RosterPlayerMapper.ts"
    ["roster.container.ts"]="${BASE_DIR}/infrastructure/container/roster.container.ts"
    ["rosterPlayer.controller.ts"]="${BASE_DIR}/presentation/controllers/rosterPlayer.controller.ts"
    ["rosterPlayer.validator.ts"]="${BASE_DIR}/presentation/validators/rosterPlayer.validator.ts"
    ["rosterPlayer.routes.ts"]="${BASE_DIR}/presentation/routes/rosterPlayer.routes.ts"
    ["validation.middleware.ts"]="${SHARED_DIR}/validation.middleware.ts"
)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --copy-from)
            COPY_FILES=true
            SOURCE_DIR="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run              Preview changes without creating files"
            echo "  --copy-from <dir>      Copy files from specified directory"
            echo "  --help, -h             Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Create structure only"
            echo "  $0 --dry-run                          # Preview changes"
            echo "  $0 --copy-from ./downloaded-files     # Create and copy files"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validation
if [ "$COPY_FILES" = true ] && [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}Error: Source directory '$SOURCE_DIR' not found!${NC}"
    exit 1
fi

if [ ! -d "src" ]; then
    echo -e "${RED}Error: 'src' directory not found!${NC}"
    echo "Please run this script from your project root directory."
    exit 1
fi

# Functions
create_dir() {
    local dir=$1
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY-RUN]${NC} Would create: $dir"
    else
        mkdir -p "$dir"
        echo -e "${GREEN}✓${NC} $dir"
    fi
}

create_file() {
    local file=$1
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY-RUN]${NC} Would create: $file"
    else
        touch "$file"
        echo -e "${GREEN}✓${NC} $file"
    fi
}

copy_file() {
    local src=$1
    local dest=$2
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY-RUN]${NC} Would copy: $src → $dest"
    else
        if [ -f "$src" ]; then
            cp "$src" "$dest"
            echo -e "${GREEN}✓${NC} Copied: $(basename $src)"
        else
            echo -e "${YELLOW}⚠${NC}  Not found: $(basename $src)"
        fi
    fi
}

# Header
clear
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Roster Module Complete Setup         ║${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}║  ${YELLOW}MODE: DRY RUN (Preview)${BLUE}              ║${NC}"
fi
if [ "$COPY_FILES" = true ]; then
    echo -e "${BLUE}║  ${CYAN}Copy files from: $(printf '%-17s' "$SOURCE_DIR")${BLUE} ║${NC}"
fi
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}\n"

# Confirm if directory exists
if [ -d "$BASE_DIR" ] && [ "$DRY_RUN" = false ]; then
    echo -e "${YELLOW}⚠  Warning: ${BASE_DIR} already exists${NC}"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    echo ""
fi

# Step 1: Create directories
echo -e "${BLUE}━━━ Step 1: Creating Directories ━━━${NC}\n"

create_dir "${BASE_DIR}/domain/entities"
create_dir "${BASE_DIR}/domain/value-objects"
create_dir "${BASE_DIR}/domain/services"
create_dir "${BASE_DIR}/domain/repositories"
create_dir "${BASE_DIR}/application/dto"
create_dir "${BASE_DIR}/application/use-cases"
create_dir "${BASE_DIR}/application/services"
create_dir "${BASE_DIR}/infrastructure/repositories"
create_dir "${BASE_DIR}/infrastructure/mappers"
create_dir "${BASE_DIR}/infrastructure/external"
create_dir "${BASE_DIR}/infrastructure/container"
create_dir "${BASE_DIR}/presentation/controllers"
create_dir "${BASE_DIR}/presentation/validators"
create_dir "${BASE_DIR}/presentation/routes"
create_dir "$SHARED_DIR"

# Step 2: Create files or copy
if [ "$COPY_FILES" = true ]; then
    echo -e "\n${BLUE}━━━ Step 2: Copying Files ━━━${NC}\n"
    
    COPIED=0
    MISSING=0
    
    for src_file in "${!FILE_MAP[@]}"; do
        src_path="${SOURCE_DIR}/${src_file}"
        dest_path="${FILE_MAP[$src_file]}"
        
        if [ "$DRY_RUN" = false ]; then
            # Ensure destination directory exists
            mkdir -p "$(dirname "$dest_path")"
        fi
        
        if [ -f "$src_path" ] || [ "$DRY_RUN" = true ]; then
            copy_file "$src_path" "$dest_path"
            ((COPIED++))
        else
            echo -e "${YELLOW}⚠${NC}  Missing: $src_file"
            ((MISSING++))
            # Create empty placeholder if file doesn't exist
            if [ "$DRY_RUN" = false ]; then
                touch "$dest_path"
            fi
        fi
    done
    
    echo -e "\n${GREEN}Copied: $COPIED files${NC}"
    if [ $MISSING -gt 0 ]; then
        echo -e "${YELLOW}Missing: $MISSING files (created empty placeholders)${NC}"
    fi
else
    echo -e "\n${BLUE}━━━ Step 2: Creating File Placeholders ━━━${NC}\n"
    
    for dest_path in "${FILE_MAP[@]}"; do
        create_file "$dest_path"
    done
fi

# Step 3: Display results
echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "${GREEN}║  ${YELLOW}DRY RUN COMPLETE${GREEN}                    ║${NC}"
else
    echo -e "${GREEN}║  ✓ Setup Complete!                    ║${NC}"
fi
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}\n"

# Show tree
if [ "$DRY_RUN" = false ]; then
    echo -e "${BLUE}Directory Structure:${NC}\n"
    if command -v tree &> /dev/null; then
        tree -L 4 -I 'node_modules' "$BASE_DIR"
    else
        find "$BASE_DIR" -print | sed -e 's;[^/]*/;│   ;g;s;│   │;│   ├;g' | head -50
    fi
    
    FILE_COUNT=$(find "$BASE_DIR" -type f 2>/dev/null | wc -l)
    DIR_COUNT=$(find "$BASE_DIR" -type d 2>/dev/null | wc -l)
    echo -e "\n${CYAN}Statistics:${NC}"
    echo "  • Directories: $DIR_COUNT"
    echo "  • Files: $FILE_COUNT"
fi

# Next steps
echo -e "\n${YELLOW}╔════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Next Steps                            ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}\n"

if [ "$COPY_FILES" = false ]; then
    echo -e "${CYAN}1. Copy your generated files:${NC}"
    echo "   Run: ./setup-roster-complete.sh --copy-from <source-directory>"
    echo ""
fi

echo -e "${CYAN}$(if [ "$COPY_FILES" = false ]; then echo "2"; else echo "1"; fi). Install dependencies:${NC}"
echo "   npm install tsyringe reflect-metadata uuid express-validator"
echo "   npm install --save-dev @types/uuid"
echo ""

echo -e "${CYAN}$(if [ "$COPY_FILES" = false ]; then echo "3"; else echo "2"; fi). Update tsconfig.json:${NC}"
cat << 'EOF'
   {
     "compilerOptions": {
       "experimentalDecorators": true,
       "emitDecoratorMetadata": true,
       "strictPropertyInitialization": false
     }
   }
EOF
echo ""

echo -e "${CYAN}$(if [ "$COPY_FILES" = false ]; then echo "4"; else echo "3"; fi). Update src/app.ts:${NC}"
cat << 'EOF'
   import 'reflect-metadata'
   import { registerRosterModule } from './modules/roster/infrastructure/container/roster.container'
   import rosterPlayerRoutes from './modules/roster/presentation/routes/rosterPlayer.routes'
   
   registerRosterModule(prisma)
   app.use('/api/roster-players', rosterPlayerRoutes)
EOF
echo ""

echo -e "${CYAN}$(if [ "$COPY_FILES" = false ]; then echo "5"; else echo "4"; fi). Build and run:${NC}"
echo "   npm run build"
echo "   npm run dev"
echo ""

echo -e "${GREEN}Happy coding! 🚀${NC}\n"
