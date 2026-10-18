"""Regenerate the classic browser build from the two editable ES modules."""
from pathlib import Path
import re
p=Path(__file__).resolve().parents[1]
motion=(p/'src/geeky-motion.mjs').read_text();player=(p/'src/geeky-player.mjs').read_text()
motion=re.sub(r'\nexport \{[^}]+\};?\s*$','',motion)
player=re.sub(r"^import [^\n]+\n",'',player)
player=re.sub(r'^const mix=[^\n]+\n','',player)
player=re.sub(r'\nexport \{[^}]+\};?\s*$','',player)
(p/'dist/geeky-player.js').write_text('/* Generated from src/*.mjs. No dependencies or network requests. */\n(function(root){\n"use strict";\n'+motion+'\n'+player+'\nroot.Geeky={GeekyPlayer,createGeeky,STATE_META,ALIASES,STATE_DURATION,VIEWBOX,characterSVG};\n})(globalThis);\n')
