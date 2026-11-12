#!/bin/zsh
cd "${0:A:h}"
echo '土木設計室: http://127.0.0.1:4173 をブラウザで開いてください。'
echo '終了: Ctrl+C'
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
