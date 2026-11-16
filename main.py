import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix, roc_curve, auc
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn import tree

# ==========================================
# 1. KHÁM PHÁ DỮ LIỆU BAN ĐẦU (EDA)
# ==========================================
print("\n" + "="*65)
print(" KHÁM PHÁ DỮ LIỆU TỪ FILE CSV")
print("="*65)
df = pd.read_csv("WA_Fn-UseC_-HR-Employee-Attrition.csv")
print(f"Kích thước dữ liệu: {df.shape[0]} hàng, {df.shape[1]} cột")
print(f"Phân phối nhãn Attrition:\n{df['Attrition'].value_counts().to_string()}\n")

# Loại bỏ cột thừa
cols_to_drop = ['EmployeeCount', 'EmployeeNumber', 'Over18', 'StandardHours']
df_clean = df.drop(columns=cols_to_drop)

X = df_clean.drop('Attrition', axis=1)
y = df_clean['Attrition'].map({'Yes': 1, 'No': 0})

cat_cols = X.select_dtypes(include=['object']).columns.tolist()
num_cols = X.select_dtypes(include=['int64', 'float64']).columns.tolist()

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), num_cols),
        ('cat', OneHotEncoder(drop='first', sparse_output=False), cat_cols)
    ])

X_processed = preprocessor.fit_transform(X)
X_train, X_test, y_train, y_test = train_test_split(
    X_processed, y, test_size=0.2, random_state=42, stratify=y
)
features = preprocessor.get_feature_names_out()

# ==========================================
# 2. PHẦN 1: THỬ NGHIỆM BASELINE & LUỒNG CẢI TIẾN
# ==========================================
print("="*65)
print(" PHẦN 1: THỬ NGHIỆM BASELINE & KHẢO SÁT TÁC ĐỘNG TIỀN XỬ LÝ (LUỒNG A & B)")
print("="*65)

# --- Luồng A: Baseline cơ bản ---
models_a = {
    'Decision Tree (Mặc định)': DecisionTreeClassifier(random_state=42),
    'K-NN (Mặc định)': KNeighborsClassifier()
}

for name, model in models_a.items():
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    print(f"\nMô hình: {name}")
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred))

# --- Luồng B: Luồng cải tiến (Xử lý đặc trưng & Cân bằng lớp) ---
cols_to_drop_b = ['JobLevel', 'YearsInCurrentRole'] 
df_b = df_clean.drop(columns=cols_to_drop_b)
X_b = df_b.drop('Attrition', axis=1)
y_b = df_b['Attrition'].map({'Yes': 1, 'No': 0})

cat_cols_b = X_b.select_dtypes(include=['object']).columns.tolist()
num_cols_b = X_b.select_dtypes(include=['int64', 'float64']).columns.tolist()

preprocessor_b = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), num_cols_b),
        ('cat', OneHotEncoder(drop='first', sparse_output=False), cat_cols_b)
    ])

X_b_processed = preprocessor_b.fit_transform(X_b)
X_train_b, X_test_b, y_train_b, y_test_b = train_test_split(
    X_b_processed, y_b, test_size=0.2, random_state=42, stratify=y_b
)

dt_grid = GridSearchCV(
    DecisionTreeClassifier(random_state=42, class_weight='balanced'), 
    {'max_depth': [3, 5, 7, 10], 'min_samples_split': [2, 5, 10]}, 
    cv=5, scoring='f1'
)
dt_grid.fit(X_train_b, y_train_b)
best_dt_b = dt_grid.best_estimator_
y_pred_dt_b = best_dt_b.predict(X_test_b)

print("\n--- KẾT QUẢ LUỒNG B (CẢI TIẾN) ---")
print(f"Mô hình: Decision Tree (Cải tiến - Balanced & GridSearchCV)")
print(f"Tham số tối ưu tìm được: {dt_grid.best_params_}")
print(f"Accuracy: {accuracy_score(y_test_b, y_pred_dt_b):.4f}")
print(classification_report(y_test_b, y_pred_dt_b))
print("Ma trận nhầm lẫn (Confusion Matrix):")
cm_b = confusion_matrix(y_test_b, y_pred_dt_b)
print(cm_b)

# ==========================================
# 3. PHẦN 2: MỞ RỘNG THỬ NGHIỆM & ĐÁNH GIÁ ĐA MÔ HÌNH
# ==========================================
print("\n" + "="*65)
print(" PHẦN 2: MỞ RỘNG THỬ NGHIỆM & ĐÁNH GIÁ ĐA MÔ HÌNH (ADVANCED MODELS)")
print("="*65)

models_advanced = {
    '1. K-Nearest Neighbors': KNeighborsClassifier(),
    '2. Naive Bayes (Gaussian)': GaussianNB(),
    '3. Decision Tree (Cân bằng)': DecisionTreeClassifier(random_state=42, class_weight='balanced', max_depth=5),
    '4. Random Forest (Cân bằng)': RandomForestClassifier(random_state=42, class_weight='balanced', max_depth=7, n_estimators=100)
}

best_rf_model = None
dt_model_adv = models_advanced['3. Decision Tree (Cân bằng)']

for name, model in models_advanced.items():
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)
    
    print(f"\n--- {name} ---")
    print(f"Độ chính xác tổng thể (Accuracy) : {acc:.4f}")
    print(f"Precision (Lớp Nghỉ việc - Yes)  : {report['1']['precision']:.4f}")
    print(f"Recall (Lớp Nghỉ việc - Yes)     : {report['1']['recall']:.4f}")
    print(f"F1-Score (Lớp Nghỉ việc - Yes)   : {report['1']['f1-score']:.4f}")
    
    if "Random Forest" in name:
        best_rf_model = model

print("="*65 + "\n")

# ==========================================
# 4. ÂM THẦM XUẤT 6 FILE ẢNH SƠ ĐỒ VÀO THƯ MỤC
# ==========================================
print("Đang tự động cập nhật 6 file ảnh sơ đồ chuyên nghiệp vào thư mục...")
sns.set_theme(style="whitegrid")

# Ảnh 1: Ma trận nhầm lẫn
plt.figure(figsize=(7, 5))
y_pred_rf = best_rf_model.predict(X_test)
cm_rf = confusion_matrix(y_test, y_pred_rf)
sns.heatmap(cm_rf, annot=True, fmt='d', cmap='Blues', cbar=False,
            xticklabels=['Ở lại (No)', 'Nghỉ việc (Yes)'], 
            yticklabels=['Ở lại (No)', 'Nghỉ việc (Yes)'])
plt.title('Ma Trận Nhầm Lẫn - Random Forest', fontsize=12, pad=10)
plt.ylabel('Thực tế (Actual)')
plt.xlabel('Dự đoán (Predicted)')
plt.savefig('01_confusion_matrix.png', dpi=300, bbox_inches='tight')
plt.close()

# Ảnh 2: Sơ đồ Cây Quyết Định
plt.figure(figsize=(20, 10)) 
tree.plot_tree(DecisionTreeClassifier(random_state=42, max_depth=3).fit(X_train, y_train), 
               feature_names=features, class_names=['Ở lại', 'Nghỉ việc'], 
               filled=True, rounded=True, fontsize=9)
plt.title('Sơ Đồ Trực Quan Mô Hình Cây Quyết Định (Tầng 1-3)', fontsize=14, pad=15)
plt.savefig('02_decision_tree.png', dpi=300, bbox_inches='tight')
plt.close()

# Ảnh 3: Top 10 Đặc trưng quan trọng
plt.figure(figsize=(9, 6))
importances = best_rf_model.feature_importances_
feat_imp = pd.Series(importances, index=features).sort_values(ascending=False).head(10)
sns.barplot(x=feat_imp.values, y=feat_imp.index, hue=feat_imp.index, palette='mako', legend=False)
plt.title('Top 10 Đặc Trưng Ảnh Hưởng Đến Quyết Định Nghỉ Việc', fontsize=12, pad=10)
plt.xlabel('Mức độ quan trọng (Gini Importance)')
plt.ylabel('Tên đặc trưng')
plt.savefig('03_feature_importance.png', dpi=300, bbox_inches='tight')
plt.close()

# Ảnh 4: Đường cong ROC
plt.figure(figsize=(8, 6))
for name, model in models_advanced.items():
    y_prob = model.predict_proba(X_test)[:, 1]
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    roc_auc = auc(fpr, tpr)
    plt.plot(fpr, tpr, lw=2, label=f'{name} (AUC = {roc_auc:.2f})')

plt.plot([0, 1], [0, 1], color='gray', lw=1.5, linestyle='--')
plt.xlim([0.0, 1.0])
plt.ylim([0.0, 1.05])
plt.title('Đường Cong ROC So Sánh Hiệu Suất Các Mô Hình', fontsize=12, pad=10)
plt.xlabel('Tỷ lệ Dương tính giả (FPR)')
plt.ylabel('Tỷ lệ Dương tính thật (TPR)')
plt.legend(loc="lower right")
plt.savefig('04_roc_curve.png', dpi=300, bbox_inches='tight')
plt.close()

# Ảnh 5: Biểu đồ hộp thu nhập
plt.figure(figsize=(7, 5))
df['Attrition_Label'] = df['Attrition']
sns.boxplot(x='Attrition_Label', y='MonthlyIncome', data=df, hue='Attrition_Label', palette='Set2', legend=False)
plt.title('Phân Bố Thu Nhập Theo Trạng Thái Nhân Viên', fontsize=12, pad=10)
plt.xlabel('Trạng thái nghỉ việc')
plt.ylabel('Thu nhập hàng tháng (Monthly Income)')
plt.savefig('05_income_boxplot.png', dpi=300, bbox_inches='tight')
plt.close()

# Ảnh 6: Ma trận tương quan
plt.figure(figsize=(8, 6))
key_cols = ['Age', 'DailyRate', 'DistanceFromHome', 'MonthlyIncome', 'NumCompaniesWorked', 'TotalWorkingYears', 'YearsAtCompany']
corr_matrix = df[key_cols].corr()
sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', fmt=".2f", vmin=-1, vmax=1, square=True, cbar_kws={'shrink': .8})
plt.title('Ma Trận Tương Quan Giữa Các Biến Số Học', fontsize=12, pad=10)
plt.savefig('06_correlation_heatmap.png', dpi=300, bbox_inches='tight')
plt.close()

print("Hoàn thành! Toàn bộ kết quả đã được trình bày theo cấu trúc khoa học và xuất đủ 6 file ảnh.")