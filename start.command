#!/bin/bash
cd "$(dirname "$0")"
(sleep 1; open "http://localhost:8799") &
python3 -m http.server 8799 --bind 127.0.0.1
