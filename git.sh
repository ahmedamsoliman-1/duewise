#!/usr/bin/env bash
set -euo pipefail



git config user.name "Ahmed Soliman"
git config user.email "aamsdn@outlook.com"



git add .
git commit -m "Revamp style"
git push origin main


git config user.name "Ahmed Soliman"
git config user.email "ahmed.soliman@avrioc.com"