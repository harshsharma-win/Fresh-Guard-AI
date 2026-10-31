"""Train and export a small ExtraTrees-style prototype using FreshGuard data."""

from __future__ import annotations

import argparse
import csv
import json
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

NUMERIC_COLUMNS = (
    "Temperature",
    "Humidity",
    "Gas_VOC_CO2ppm",
    "Light_Lux",
    "Storage_Time_Days",
    "Max_Shelf_Life_Days",
)
CLASS_NAMES = ("Bad", "Good")
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "app" / "api" / "predict" / "model.json"
MAX_FEATURES = 3
MIN_SAMPLES_LEAF = 18
MAX_DEPTH = 12
TREES = 50


def encode_rows(rows: list[dict[str, str]], products: list[str]) -> np.ndarray:
    product_index = {name: index for index, name in enumerate(products)}
    encoded = np.zeros((len(rows), len(products) + len(NUMERIC_COLUMNS)), dtype=np.float64)
    for row_index, row in enumerate(rows):
        encoded[row_index, product_index[row["Vegetable"]]] = 1.0
        encoded[row_index, len(products) :] = [float(row[key]) for key in NUMERIC_COLUMNS]
    return encoded


def best_split(
    x: np.ndarray,
    y: np.ndarray,
    indices: np.ndarray,
    features: list[int],
    task: str,
    rng: random.Random,
) -> tuple[int, float, np.ndarray, np.ndarray] | None:
    best_gain = 0.0
    best: tuple[int, float, np.ndarray, np.ndarray] | None = None
    parent_n = len(indices)
    values_at_node = x[indices]
    labels_at_node = y[indices]
    if task == "classification":
        total_positive = int(labels_at_node.sum())
        parent_impurity = 1.0 - (total_positive / parent_n) ** 2 - (
            (parent_n - total_positive) / parent_n
        ) ** 2
    else:
        total = float(labels_at_node.sum())
        parent_impurity = float(np.square(labels_at_node).sum() - total * total / parent_n)

    candidate_features = rng.sample(features, min(MAX_FEATURES, len(features)))
    for feature in candidate_features:
        column = values_at_node[:, feature]
        sorted_column = np.sort(column)
        unique = np.unique(sorted_column)
        if len(unique) < 2:
            continue
        if len(unique) == 2:
            thresholds = [(float(unique[0]) + float(unique[1])) / 2.0]
        else:
            split_positions = np.unique(
                np.linspace(
                    MIN_SAMPLES_LEAF,
                    parent_n - MIN_SAMPLES_LEAF,
                    num=min(12, parent_n - 2 * MIN_SAMPLES_LEAF + 1),
                    dtype=int,
                )
            )
            thresholds = []
            for position in split_positions:
                if position <= 0 or position >= parent_n:
                    continue
                left_value = float(sorted_column[position - 1])
                right_value = float(sorted_column[position])
                if left_value < right_value:
                    thresholds.append((left_value + right_value) / 2.0)
        for threshold in thresholds:
            left_mask = column <= threshold
            left_n = int(left_mask.sum())
            right_n = parent_n - left_n
            if left_n < MIN_SAMPLES_LEAF or right_n < MIN_SAMPLES_LEAF:
                continue
            left_labels = labels_at_node[left_mask]
            right_labels = labels_at_node[~left_mask]
            if task == "classification":
                left_positive = int(left_labels.sum())
                right_positive = int(right_labels.sum())
                impurity = left_n * (
                    1.0 - (left_positive / left_n) ** 2 - ((left_n - left_positive) / left_n) ** 2
                ) + right_n * (
                    1.0 - (right_positive / right_n) ** 2 - ((right_n - right_positive) / right_n) ** 2
                )
                gain = parent_n * parent_impurity - impurity
            else:
                left_sum = float(left_labels.sum())
                right_sum = float(right_labels.sum())
                impurity = float(
                    np.square(left_labels).sum()
                    - left_sum * left_sum / left_n
                    + np.square(right_labels).sum()
                    - right_sum * right_sum / right_n
                )
                gain = parent_impurity - impurity
            if gain > best_gain:
                best_gain = gain
                best = (feature, threshold, indices[left_mask], indices[~left_mask])
    return best


def build_tree(
    x: np.ndarray,
    y: np.ndarray,
    sample_indices: np.ndarray,
    features: list[int],
    task: str,
    rng: random.Random,
) -> dict[str, Any]:
    nodes: list[list[float | int]] = []

    def grow(indices: np.ndarray, depth: int) -> int:
        node_index = len(nodes)
        if task == "classification":
            positive = int(y[indices].sum())
            total = len(indices)
            nodes.append([-1, 0.0, -1, -1, (total - positive) / total, positive / total])
            pure = positive == 0 or positive == total
        else:
            nodes.append([-1, 0.0, -1, -1, float(y[indices].mean())])
            pure = float(np.var(y[indices])) < 1e-10

        if pure or depth >= MAX_DEPTH or len(indices) < 2 * MIN_SAMPLES_LEAF:
            return node_index
        split = best_split(x, y, indices, features, task, rng)
        if split is None:
            return node_index
        feature, threshold, left_indices, right_indices = split
        left_child = grow(left_indices, depth + 1)
        right_child = grow(right_indices, depth + 1)
        nodes[node_index][0] = feature
        nodes[node_index][1] = threshold
        nodes[node_index][2] = left_child
        nodes[node_index][3] = right_child
        return node_index

    grow(sample_indices, 0)
    return {"nodes": nodes}


def predict_classification(model: list[dict[str, Any]], x: np.ndarray) -> np.ndarray:
    probabilities = np.zeros((len(x), 2), dtype=np.float64)
    for tree in model:
        nodes = tree["nodes"]
        for row_index, row in enumerate(x):
            node_index = 0
            while nodes[node_index][0] >= 0:
                feature, threshold, left, right = nodes[node_index][:4]
                node_index = int(left if row[int(feature)] <= threshold else right)
            probabilities[row_index] += nodes[node_index][4:6]
    probabilities /= len(model)
    return probabilities


def predict_regression(model: list[dict[str, Any]], x: np.ndarray) -> np.ndarray:
    predictions = np.zeros(len(x), dtype=np.float64)
    for tree in model:
        nodes = tree["nodes"]
        for row_index, row in enumerate(x):
            node_index = 0
            while nodes[node_index][0] >= 0:
                feature, threshold, left, right = nodes[node_index][:4]
                node_index = int(left if row[int(feature)] <= threshold else right)
            predictions[row_index] += float(nodes[node_index][4])
    return predictions / len(model)


def train_forest(
    x: np.ndarray,
    y: np.ndarray,
    indices: np.ndarray,
    feature_count: int,
    task: str,
    seed: int,
) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    features = list(range(feature_count))
    trees = []
    for _ in range(TREES):
        bootstrap = np.asarray(
            [rng.randrange(len(indices)) for _ in range(len(indices))], dtype=np.int64
        )
        sample_indices = indices[bootstrap]
        trees.append(build_tree(x, y, sample_indices, features, task, rng))
    return trees


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", required=True, type=Path, help="Path to FreshGuard_dataset.csv")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Path for the web model JSON")
    args = parser.parse_args()

    with args.csv.open("r", newline="", encoding="utf-8-sig") as source:
        rows = list(csv.DictReader(source))
    required_columns = {
        "Vegetable",
        *NUMERIC_COLUMNS,
        "Quality",
        "Remaining_Shelf_Life_Days",
        "Source_Time_ShelfLife",
    }
    if not rows or not required_columns.issubset(rows[0]):
        raise ValueError(f"Dataset must contain these columns: {sorted(required_columns)}")

    unique_rows = list({tuple(row.items()): row for row in rows}.values())
    products = sorted({row["Vegetable"] for row in unique_rows})
    if set(row["Quality"] for row in unique_rows) != set(CLASS_NAMES):
        raise ValueError("Quality labels must be exactly 'Bad' and 'Good'.")
    if any(row["Source_Time_ShelfLife"] != "Literature_anchored_simulation" for row in unique_rows):
        raise ValueError("Unexpected shelf-life label source; review dataset before training.")

    x = encode_rows(unique_rows, products)
    y_quality = np.asarray([CLASS_NAMES.index(row["Quality"]) for row in unique_rows], dtype=np.int64)
    y_shelf_life = np.asarray(
        [float(row["Remaining_Shelf_Life_Days"]) for row in unique_rows],
        dtype=np.float64,
    )
    strata: dict[str, list[int]] = {}
    for index, row in enumerate(unique_rows):
        strata.setdefault(f"{row['Vegetable']}|{row['Quality']}", []).append(index)
    rng = random.Random(42)
    train_indices: list[int] = []
    test_indices: list[int] = []
    for indices in strata.values():
        shuffled = indices[:]
        rng.shuffle(shuffled)
        test_count = max(1, round(len(shuffled) * 0.2))
        test_indices.extend(shuffled[:test_count])
        train_indices.extend(shuffled[test_count:])
    train = np.asarray(train_indices, dtype=np.int64)
    test = np.asarray(test_indices, dtype=np.int64)

    quality_model = train_forest(x, y_quality, train, x.shape[1], "classification", 42)
    shelf_life_model = train_forest(x, y_shelf_life, train, x.shape[1], "regression", 43)
    quality_probabilities = predict_classification(quality_model, x[test])
    quality_predictions = (quality_probabilities[:, 1] >= 0.5).astype(np.int64)
    shelf_life_predictions = predict_regression(shelf_life_model, x[test])

    bad_true = y_quality[test] == 0
    bad_predicted = quality_predictions == 0
    true_positive = int(np.logical_and(bad_true, bad_predicted).sum())
    quality_metrics = {
        "accuracy": float((quality_predictions == y_quality[test]).mean()),
        "balanced_accuracy": float(
            0.5
            * (
                true_positive / max(1, int(bad_true.sum()))
                + int(np.logical_and(~bad_true, ~bad_predicted).sum())
                / max(1, int((~bad_true).sum()))
            )
        ),
        "f1_bad": float(
            2
            * true_positive
            / max(1, 2 * true_positive + int((~bad_true & bad_predicted).sum()) + int((bad_true & ~bad_predicted).sum()))
        ),
    }
    errors = shelf_life_predictions - y_shelf_life[test]
    shelf_life_metrics = {
        "mae_days": float(np.abs(errors).mean()),
        "rmse_days": float(np.sqrt(np.square(errors).mean())),
        "r2": float(1.0 - np.square(errors).sum() / np.square(y_shelf_life[test] - y_shelf_life[test].mean()).sum()),
    }

    numeric_feature_ranges = {
        column: [
            min(float(row[column]) for row in unique_rows),
            max(float(row[column]) for row in unique_rows),
        ]
        for column in NUMERIC_COLUMNS
    }
    numeric_feature_defaults = {
        column: float(np.median([float(row[column]) for row in unique_rows]))
        for column in NUMERIC_COLUMNS
    }
    product_max_days = {
        product: max(
            float(row["Max_Shelf_Life_Days"])
            for row in unique_rows
            if row["Vegetable"] == product
        )
        for product in products
    }
    source_counts: dict[str, int] = {}
    for row in unique_rows:
        source = row.get("Source_Env_Quality", "unknown")
        source_counts[source] = source_counts.get(source, 0) + 1
    artifact = {
        "schema_version": 1,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "rows": len(rows),
            "unique_rows": len(unique_rows),
            "duplicate_rows_removed": len(rows) - len(unique_rows),
            "quality_source_counts": source_counts,
            "shelf_life_label_source": "Literature_anchored_simulation",
        },
        "products": products,
        "feature_names": [f"product={product}" for product in products] + list(NUMERIC_COLUMNS),
        "numeric_feature_ranges": numeric_feature_ranges,
        "numeric_feature_defaults": numeric_feature_defaults,
        "product_max_shelf_life_days": product_max_days,
        "quality_classes": ["Bad", "Good"],
        "quality_metrics": quality_metrics,
        "shelf_life_metrics": shelf_life_metrics,
        "validation": {
            "method": "stratified random 80/20 holdout by produce and quality; random_state=42",
            "test_rows": len(test),
            "warning": (
                "Random holdout scores measure agreement with this dataset, not real-world "
                "cold-storage performance. Shelf-life targets are literature-anchored simulations."
            ),
        },
        "model": {
            "quality_trees": quality_model,
            "shelf_life_trees": shelf_life_model,
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, separators=(",", ":")), encoding="utf-8")
    report = {
        key: artifact[key]
        for key in (
            "dataset",
            "products",
            "numeric_feature_ranges",
            "quality_metrics",
            "shelf_life_metrics",
            "validation",
        )
    }
    print(json.dumps(report, indent=2))
    print(f"Model written to {args.output}")


if __name__ == "__main__":
    main()
