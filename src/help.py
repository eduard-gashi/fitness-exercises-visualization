import pandas as pd
import numpy as np

df = pd.read_csv(r"public/fitness_exercises.csv")

# Fill missing user ratings with a random value between 8 and 9
df["User_Rating"] = pd.to_numeric(df["User_Rating"], errors="coerce")
df["User_Rating"] = df["User_Rating"].fillna(pd.Series(
    [round(x, 1) for x in np.random.uniform(8.0, 9.0, len(df))],
    index=df.index
))

# ✅ Update specific value correctly
df.loc[df["Exercise_Name"] == "Dumbbell Shoulder Press", "Stretch_Bonus"] = 1
df.loc[df["Exercise_Name"] == "Lateral Raise", "Stretch_Bonus"] = 1

print(df[df["Exercise_Name"] == "Dumbbell Shoulder Press"])

# Optionally save the cleaned file
df.to_csv(r"public/fitness_exercises.csv", index=False)
