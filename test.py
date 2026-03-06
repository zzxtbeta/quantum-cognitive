import pandas as pd

df = pd.read_parquet(r"D:\code\信息-认知-知识库\google_news_量子计算.parquet")

print("=== 基本信息 ===")
print(f"总行数: {len(df)}")
print(f"列名: {df.columns.tolist()}")
print()

print("=== 前3条数据预览 ===")
print(df.head(3).to_string())
print()

# 自动找文本类列分析长度
text_cols = df.select_dtypes(include="object").columns.tolist()
print(f"=== 文本列长度统计（字符数）===")
for col in text_cols:
    lengths = df[col].dropna().astype(str).str.len()
    print(f"\n[ {col} ]")
    print(f"  最短: {lengths.min()}")
    print(f"  最长: {lengths.max()}")
    print(f"  平均: {lengths.mean():.0f}")
    print(f"  中位: {lengths.median():.0f}")
    print(f"  分布:")
    print(f"    < 200字:   {(lengths < 200).sum()} 条")
    print(f"    200~500字: {((lengths >= 200) & (lengths < 500)).sum()} 条")
    print(f"    500~1000字:{((lengths >= 500) & (lengths < 1000)).sum()} 条")
    print(f"    > 1000字:  {(lengths >= 1000).sum()} 条")