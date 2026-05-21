#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
cd web
python app.py
