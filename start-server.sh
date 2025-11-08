#!/bin/bash

echo "========================================"
echo "Starting MindCare Server"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Checking Node.js version..."
node --version
echo ""

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "ERROR: server.js not found!"
    echo "Please make sure you're in the mental-health-platform folder"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "WARNING: node_modules folder not found!"
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "WARNING: .env file not found!"
    echo "Please create a .env file with your configuration"
    echo "See .env.example for reference"
    echo ""
fi

echo "Starting server on port 3000..."
echo ""
echo "========================================"
echo "Server will be available at:"
echo "http://localhost:3000"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

node server.js

