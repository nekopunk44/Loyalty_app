import sys
from pathlib import Path

# Делаем server/ml/ корнем для импортов в тестах
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
