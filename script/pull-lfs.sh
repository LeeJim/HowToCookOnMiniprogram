#!/bin/bash
# Pull all Git LFS image files by category, then checkout
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOWTOCOOK="$SCRIPT_DIR/../HowToCook"

cd "$HOWTOCOOK"

CATEGORIES=(
  aquatic breakfast condiment dessert drink
  meat_dish semi-finished soup staple vegetable_dish
)

echo "📦 Fetching LFS objects by category..."
for cat in "${CATEGORIES[@]}"; do
  echo "   dishes/$cat/*"
  git lfs fetch --include="dishes/$cat/*" 2>&1
done

echo ""
echo "📥 Checking out LFS files..."
git lfs checkout 2>&1

echo ""
echo "✅ Done! Checking results..."
total=0
real=0
for cat in "${CATEGORIES[@]}"; do
  for f in "dishes/$cat"/**/*; do
    [ -f "$f" ] || continue
    ext="${f##*.}"
    case "$ext" in
      jpg|jpeg|png|webp|gif)
        total=$((total + 1))
        size=$(wc -c < "$f")
        if [ "$size" -gt 500 ]; then
          real=$((real + 1))
        fi
        ;;
    esac
  done
done

echo "Total image files: $total"
echo "Real images (>500B): $real"
echo "Still LFS pointers: $((total - real))"
