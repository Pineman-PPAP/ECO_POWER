
import sqlite3
import pandas as pd

conn = sqlite3.connect('dashboard.db')
df = pd.read_sql("SELECT * FROM generation_data WHERE plant_id='kpcl_shivanasamudra' ORDER BY timestamp", conn)
print(df.head(20))
print("\nDuplicates count:", df.duplicated(subset=['timestamp']).sum())
print("\nZero values during day (6am-6pm):")
df['timestamp'] = pd.to_datetime(df['timestamp'])
day_zeros = df[(df['timestamp'].dt.hour >= 6) & (df['timestamp'].dt.hour <= 18) & (df['actual_mw'] == 0)]
print(day_zeros)
conn.close()
