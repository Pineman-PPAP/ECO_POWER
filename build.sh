#!/usr/bin/env bash
# Exit on error
set -o errexit

# --- Build Frontend ---
echo "Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# --- Build Backend ---
echo "Installing Backend Dependencies..."
cd backend
pip install -r requirements.txt
cd ..

echo "Build Complete!"
