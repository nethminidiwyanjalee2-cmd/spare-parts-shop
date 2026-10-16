"""Step 1 of migrating from the old Python app: dump shop.db to scripts/data.json
Usage:  python scripts/export_sqlite.py path/to/shop.db
"""
import json, sqlite3, sys, os

db_path = sys.argv[1] if len(sys.argv) > 1 else 'shop.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
rows = lambda q: [dict(r) for r in conn.execute(q)]

data = {
    'categories': rows('SELECT * FROM categories'),
    'sales': rows('SELECT * FROM sales ORDER BY id'),
    'sale_items': rows('SELECT * FROM sale_items'),
    'stock_adjustments': rows('SELECT * FROM stock_adjustments'),
}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')
with open(out, 'w') as f:
    json.dump(data, f, indent=1)
print({k: len(v) for k, v in data.items()}, '->', out)
