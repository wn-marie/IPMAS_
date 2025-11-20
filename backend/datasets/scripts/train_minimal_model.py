import os
import joblib
import numpy as np
from sklearn.linear_model import LinearRegression

# hv271, hv009, education_years, water_access, electricity
X = np.array([
    [500, 5,  7,  70, 1],
    [300, 3, 10,  80, 1],
    [800, 7,  4,  50, 0],
    [100, 8,  2,  30, 0],
    [650, 6,  6,  60, 1],
], dtype=float)

y = np.array([40, 35, 65, 80, 55], dtype=float)

m = LinearRegression().fit(X, y)

os.makedirs(r'backend/datasets/processed/models', exist_ok=True)
out_path = r'backend/datasets/processed/models/lightgbm_model.pkl'
joblib.dump(m, out_path)
print(f'Saved: {out_path}')
