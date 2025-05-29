import pandas as pd
import csv


df = pd.read_excel(r"public/DATASET.xlsx")
print(df)
df.to_csv(r"public/fitness_exercises.csv", index=False, quoting=csv.QUOTE_ALL)
print(df.columns)