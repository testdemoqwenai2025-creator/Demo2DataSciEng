"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { DAGSTER_SCIENCE_EXAMPLES } from "../_components/_dataset_examples11";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Layers, Boxes, Database, Workflow, Zap, GitBranch, History, ShieldCheck,
  Atom, Activity, FileText, ExternalLink, Network, Sparkles, Cpu, TrendingUp,
  Server, Cloud, Code2, TestTube, Beaker, GitCommit, Settings, Wand2, Radio,
  CircuitBoard, GitGraph, Boxes as BoxesIcon,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const DAGSTER_SDA_PY = `# ============================================================
# Dagster Software-Defined Assets (SDA) — @asset + @asset_group
# Each asset is a typed artifact + its upstream dependencies
# Dagster recomputes only assets whose upstream inputs changed
# ============================================================

from dagster import (
    asset, asset_group, AssetExecutionContext,
    MaterializeResult, AssetIn,
    IOManager, IOManagerDefinition, io_manager,
    Definitions, EnvContext,
)
from dagster_duckdb import DuckDBResource
from dagster_snowflake import SnowflakeResource
import pandas as pd
from typing import Literal

# --- Resources (Dagster's DI for external systems) ---
resources = {
    "duckdb": DuckDBResource(database="/data/warehouse.duckdb"),
    "snowflake": SnowflakeResource(
        account="xy12345", user="DAGSTER_ETL",
        password="{{ env.SNOWFLAKE_PASSWORD }}",
        warehouse="ETL_WH", database="PROD",
    ),
}

# --- Bronze assets (source) ---
@asset(group_name="bronze", io_manager_key="duckdb_io")
def raw_orders(context: AssetExecutionContext, duckdb: DuckDBResource) -> pd.DataFrame:
    """Raw orders extracted from Shopify API — bronze source."""
    import requests
    resp = requests.get("https://api.shopify.com/orders",
                        headers={"X-Shopify-Access-Token":
                                 context.resources.env.get("SHOPIFY_TOKEN")})
    df = pd.DataFrame(resp.json())
    context.log.info(f"Extracted {len(df)} orders from Shopify")
    return df

# --- Silver assets (intermediate) ---
@asset(group_name="silver", io_manager_key="duckdb_io",
       deps=[AssetIn("raw_orders")])
def clean_orders(context: AssetExecutionContext, raw_orders: pd.DataFrame) -> pd.DataFrame:
    """Cleaned + deduplicated orders — silver intermediate."""
    df = raw_orders.copy()
    # Drop null order_ids (data quality)
    df = df.dropna(subset=["order_id"])
    # Deduplicate (keep latest)
    df = df.drop_duplicates(subset=["order_id"], keep="last")
    # Cast types
    df["order_ts"] = pd.to_datetime(df["order_ts"])
    df["amount_usd"] = pd.to_numeric(df["amount_usd"], errors="coerce")
    context.log.info(f"Cleaned to {len(df)} orders")
    return df

# --- Gold assets (analytics-ready marts) ---
@asset(group_name="gold", io_manager_key="duckdb_io",
       deps=[AssetIn("clean_orders")])
def fct_orders(context: AssetExecutionContext,
               clean_orders: pd.DataFrame,
               dim_customer: pd.DataFrame) -> pd.DataFrame:
    """Gold fact table — one row per order, joined with customer dim."""
    df = clean_orders.merge(
        dim_customer[["customer_id", "customer_sk", "customer_tier"]],
        on="customer_id",
        how="left"
    )
    # FX normalisation
    fx_rates = {"USD": 1.0, "EUR": 1.08, "GBP": 1.27}
    df["fx_rate"] = df["currency"].map(fx_rates).fillna(1.0)
    df["amount_usd_normalized"] = df["amount_usd"] * df["fx_rate"]
    context.log.info(f"Materialised {len(df)} orders with FX normalisation")
    return df

@asset(group_name="gold", io_manager_key="duckdb_io",
       deps=[AssetIn("clean_orders")])
def daily_revenue_summary(clean_orders: pd.DataFrame) -> pd.DataFrame:
    """Daily revenue aggregation — gold analytics table."""
    df = clean_orders.copy()
    df["order_date"] = df["order_ts"].dt.date
    summary = df.groupby("order_date").agg({
        "amount_usd": "sum",
        "order_id": "count"
    }).reset_index()
    summary.columns = ["order_date", "total_revenue", "order_count"]
    return summary

# --- Asset group (visual grouping in the Dagster UI) ---
orders_group = asset_group(
    name="orders_pipeline",
    assets=[raw_orders, clean_orders, fct_orders, daily_revenue_summary],
)

# --- Definitions (Dagster's entry point — registers assets, resources) ---
defs = Definitions(
    assets=[raw_orders, clean_orders, fct_orders, daily_revenue_summary],
    resources=resources,
)`;

const DAGSTER_IO_MANAGER_PY = `# ============================================================
# Dagster IO Manager — typed storage for asset artifacts
# Decouples asset computation from asset storage
# Each asset type can have its own IOManager implementation
# ============================================================

from dagster import (
    IOManager, IOManagerDefinition, io_manager, InputContext, OutputContext,
    AssetExecutionContext, asset,
)
import pandas as pd
import pyarrow.parquet as pq
import pyarrow as pa
import os
from typing import Any

# --- Custom IO Manager for Parquet files on S3 ---
class S3ParquetIOManager(IOManager):
    """Serialises pandas DataFrames to S3 as Parquet files.

    The asset key determines the S3 path:
    s3://my-bucket/{asset_key.replace('/', '_')}/data.parquet
    """
    def __init__(self, s3_bucket: str, s3_prefix: str):
        self.s3_bucket = s3_bucket
        self.s3_prefix = s3_prefix

    def handle_output(self, context: OutputContext, obj: Any) -> None:
        """Called when an asset materialises — write to S3."""
        if not isinstance(obj, pd.DataFrame):
            raise ValueError(f"Expected DataFrame, got {type(obj)}")

        # S3 path based on asset key (e.g. "orders/clean_orders" → "orders_clean_orders")
        asset_key_str = "_".join(context.asset_key.path)
        s3_path = f"s3://{self.s3_bucket}/{self.s3_prefix}/{asset_key_str}/data.parquet"

        # Write Parquet to S3 (using fsspec + pyarrow)
        table = pa.Table.from_pandas(obj)
        pq.write_table(
            table, s3_path,
            compression="zstd",
            row_group_size=128 * 1024 * 1024,  # 128MB row groups
        )
        # Add metadata to the asset's materialisation entry
        context.add_output_metadata({
            "s3_path": s3_path,
            "row_count": len(obj),
            "columns": list(obj.columns),
            "size_bytes": os.path.getsize(s3_path) if s3_path.startswith("/") else None,
        })

    def load_input(self, context: InputContext) -> pd.DataFrame:
        """Called when a downstream asset depends on this — read from S3."""
        # The upstream output's metadata has the S3 path
        upstream_output = context.upstream_output
        s3_path = upstream_output.metadata["s3_path"].value
        table = pq.read_table(s3_path)
        return table.to_pandas()

# Decorator that registers the IOManager as a resource
@io_manager
def s3_parquet_io_manager(context) -> S3ParquetIOManager:
    return S3ParquetIOManager(
        s3_bucket=context.resource_config["s3_bucket"],
        s3_prefix=context.resource_config.get("s3_prefix", "dagster"),
    )

# --- Partition-aware IO Manager (writes Hive-style partition paths) ---
class S3PartitionedParquetIOManager(S3ParquetIOManager):
    """Same as above, but writes Hive-style partition paths based on the
    partition key. Example: partition='2024-09-15-14:00' →
    s3://bucket/prefix/asset/year=2024/month=09/day=15/hour=14/data.parquet
    """
    def _get_partition_path(self, asset_key, partition_key: str) -> str:
        parts = partition_key.split("-")
        if len(parts) >= 4:
            year, month, day, hour = parts[0], parts[1], parts[2], parts[3][:2]
            return (f"s3://{self.s3_bucket}/{self.s3_prefix}/{asset_key}/"
                    f"year={year}/month={month}/day={day}/hour={hour}/data.parquet")
        return super()._get_path(asset_key)

# --- Asset using the partition-aware IO Manager ---
@asset(io_manager_key="s3_partitioned_io",
       partitions_def=hourly_partitions_def,
       group_name="sensors")
def sensor_readings(context: AssetExecutionContext) -> pd.DataFrame:
    """Per-hour partition of sensor readings — 50k sensors × 3600 readings."""
    partition_key = context.partition_key  # e.g. "2024-09-15-14:00"
    # ... subscribe to MQTT, fetch 1 hour of readings ...
    return pd.DataFrame({"sensor_id": [...], "timestamp": [...], "value": [...]})

# --- Compose resources + assets into a Definitions ---
from dagster import Definitions
defs = Definitions(
    assets=[sensor_readings],
    resources={
        "s3_parquet_io": s3_parquet_io_manager.configured({
            "s3_bucket": "my-bucket", "s3_prefix": "dagster"
        }),
        "s3_partitioned_io": s3_parquet_io_manager.configured({
            "s3_bucket": "sensor-data", "s3_prefix": "dagster"
        }),
    },
)`;

const DAGSTER_PARTITIONS_PY = `# ============================================================
# Dagster Partitions — partition-aware asset materialisation
# Each asset has 24 hourly partitions per day; backfills per partition
# ============================================================

from dagster import (
    asset, AssetExecutionContext, BackfillPolicy,
    DailyPartitionsDefinition, HourlyPartitionsDefinition,
    MultiPartitionsDefinition, MultiPartitionKey,
    StaticPartitionsDefinition, DynamicPartitionsDefinition,
    Definitions,
)
import pandas as pd
from datetime import datetime

# --- Hourly partitions (covers last 30 days) ---
hourly_partitions = HourlyPartitionsDefinition(
    start_date=datetime(2024, 8, 16, 0, 0),
    end_offset=0,           # include current hour
    fmt="%Y-%m-%d-%H:%M",   # partition key format
    timezone="UTC",
)

# --- Daily partitions ---
daily_partitions = DailyPartitionsDefinition(
    start_date=datetime(2024, 8, 16),
    end_offset=0,
    fmt="%Y-%m-%d",
    timezone="UTC",
)

# --- Multi-partitions (e.g. by date + by region) ---
multi_partitions = MultiPartitionsDefinition({
    "date": DailyPartitionsDefinition(start_date=datetime(2024, 1, 1)),
    "region": StaticPartitionsDefinition(["us", "eu", "asia"]),
})

# --- Static partitions (e.g. by customer tier) ---
tier_partitions = StaticPartitionsDefinition(["bronze", "silver", "gold"])

# --- Dynamic partitions (created at runtime) ---
dynamic_partitions = DynamicPartitionsDefinition(name="cohort_id")

# --- Asset with hourly partitions ---
@asset(
    partitions_def=hourly_partitions,
    io_manager_key="s3_partitioned_io",
    group_name="sensors",
    backfill_policy=BackfillPolicy.single_run(),  # or multi_run
)
def raw_sensor_readings(context: AssetExecutionContext) -> pd.DataFrame:
    """One hour of MQTT readings — 50k sensors × 3600 reads = 180M events."""
    partition_key = context.partition_key  # "2024-09-15-14:00"
    context.log.info(f"Reading MQTT for partition {partition_key}")
    # ... subscribe to MQTT, replay buffered events ...
    return pd.DataFrame({
        "sensor_id": [...],
        "timestamp": [...],
        "temperature": [...],
        "humidity": [...],
        "co2": [...],
        "pm25": [...],
    })

# --- Asset with daily partitions (depends on 24 hourly partitions) ---
@asset(
    partitions_def=daily_partitions,
    io_manager_key="s3_partitioned_io",
    group_name="sensors",
    deps=["hourly_aggregates"],  # 24 hourly partitions per daily partition
)
def daily_sensor_summary(context: AssetExecutionContext) -> pd.DataFrame:
    """Aggregates 24 hourly partitions into one daily summary."""
    partition_key = context.partition_key  # "2024-09-15"

    # Fetch all 24 hourly partitions for this date
    # The asset dependency automatically tracks the multi-partition mapping
    hourly_data = []
    for hour in range(24):
        hour_partition = f"{partition_key}-{hour:02d}:00"
        # Dagster's IO Manager pulls the right partition automatically
        # (this is the partition-aware IO Manager pattern)
        pass
    # ... aggregate 24 hours into one daily summary ...
    return pd.DataFrame({"sensor_id": [...], "daily_avg_temp": [...]})

# --- Asset with multi-partitions (date × region) ---
@asset(
    partitions_def=multi_partitions,
    io_manager_key="s3_partitioned_io",
    group_name="geo",
)
def regional_weather_summary(context: AssetExecutionContext) -> pd.DataFrame:
    """Multi-partitioned asset: date × region (us, eu, asia)."""
    partition_key: MultiPartitionKey = context.partition_key
    date_part = partition_key.keys_by_dimension["date"]   # "2024-09-15"
    region_part = partition_key.keys_by_dimension["region"]  # "us"
    context.log.info(f"Aggregating for {date_part} / {region_part}")
    # ... aggregate per-region weather data ...
    return pd.DataFrame({...})

# --- Asset with dynamic partitions (cohort_id created at runtime) ---
@asset(
    partitions_def=dynamic_partitions,
    io_manager_key="s3_partitioned_io",
    group_name="clinical",
)
def cohort_analysis(context: AssetExecutionContext) -> pd.DataFrame:
    """Dynamic partition — cohort_id assigned when a new clinical trial starts."""
    cohort_id = context.partition_key  # e.g. "NCT05234567"
    # ... run analysis for this specific cohort ...
    return pd.DataFrame({...})

# --- Backfill — re-materialise a range of partitions ---
# From the CLI:
#   dagster asset backfill --partitions 2024-09-01-00:00..2024-09-15-23:00 \\
#                          --asset raw_sensor_readings
# Or from Python:
#   from dagster import build_asset_backfill_runner
#   runner = build_asset_backfill_runner(defs)
#   runner.run_backfill("raw_sensor_readings",
#                       "2024-09-01-00:00", "2024-09-15-23:00")
# Dagster re-materialises only the missing partitions — skips up-to-date ones`;

const DAGSTER_RESOURCES_PY = `# ============================================================
# Dagster Resources — dependency injection for external systems
# Each resource is a typed wrapper around an external client
# ============================================================

from dagster import (
    resource, Resource, ResourceExecutionContext,
    ConfigurableResource, Definitions,
)
from pydantic import Field
from typing import Optional
import snowflake.connector
import boto3
import requests

# --- Old-style @resource decorator (Dagster 1.0+) ---
@resource
def snowflake_resource(context) -> snowflake.connector.SnowflakeConnection:
    """Snowflake connection resource — old-style @resource decorator."""
    return snowflake.connector.connect(
        account=context.resource_config["account"],
        user=context.resource_config["user"],
        password=context.resource_config["password"],
        warehouse=context.resource_config["warehouse"],
    )

# --- New-style ConfigurableResource (Dagster 1.6+) — pydantic-based ---
class SnowflakeResource(ConfigurableResource):
    """Snowflake connection resource — new-style ConfigurableResource."""
    account: str = Field(description="Snowflake account identifier")
    user: str
    password: str
    warehouse: str
    database: str = "PROD"
    schema_: str = Field(default="PUBLIC", alias="schema")

    def get_connection(self) -> snowflake.connector.SnowflakeConnection:
        return snowflake.connector.connect(
            account=self.account, user=self.user, password=self.password,
            warehouse=self.warehouse, database=self.database,
            schema=self.schema_,
        )

class S3Resource(ConfigurableResource):
    """S3 client resource — boto3 wrapper."""
    aws_access_key_id: str
    aws_secret_access_key: str
    region_name: str = "us-east-1"

    def get_client(self):
        return boto3.client(
            "s3",
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            region_name=self.region_name,
        )

class HttpResource(ConfigurableResource):
    """HTTP client resource — for API integrations."""
    base_url: str
    api_token: str
    timeout: int = 30

    def get(self, path: str, params: dict = None) -> dict:
        resp = requests.get(
            f"{self.base_url}{path}",
            headers={"Authorization": f"Bearer {self.api_token}"},
            params=params,
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

# --- Resources are injected into assets by parameter name ---
from dagster import asset, AssetExecutionContext

@asset(group_name="gold")
def customer_segment(
    context: AssetExecutionContext,
    snowflake: SnowflakeResource,     # injected by parameter name
    http: HttpResource,
) -> dict:
    """Pull customer data from Snowflake + enrichment from API."""
    with snowflake.get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT customer_id, tier FROM dim_customer")
        customers = cur.fetchall()

    # Enrich with external API
    enriched = []
    for cid, tier in customers:
        api_data = http.get(f"/api/customers/{cid}/profile")
        enriched.append({"customer_id": cid, "tier": tier, **api_data})
    return {"enriched_customers": enriched}

# --- Resource config injection at deploy time ---
defs = Definitions(
    assets=[customer_segment],
    resources={
        "snowflake": SnowflakeResource(
            account="xy12345", user="DAGSTER_ETL",
            password="{{ env.SNOWFLAKE_PASSWORD }}",
            warehouse="ETL_WH",
        ),
        "http": HttpResource(
            base_url="https://api.platform.com",
            api_token="{{ env.API_TOKEN }}",
        ),
    },
)

# --- Resource testing — pure functions, easy to mock ---
def test_customer_segment():
    """Unit test — inject mock SnowflakeResource + HttpResource."""
    from unittest.mock import MagicMock
    mock_sf = MagicMock(spec=SnowflakeResource)
    mock_sf.get_connection.return_value.__enter__.return_value.cursor.return_value \
        .fetchall.return_value = [(123, "gold"), (456, "silver")]
    mock_http = MagicMock(spec=HttpResource)
    mock_http.get.return_value = {"region": "US", "age": 35}
    result = customer_segment.fn(
        context=MagicMock(), snowflake=mock_sf, http=mock_http
    )
    assert len(result["enriched_customers"]) == 2`;

const DAGSTER_ASSET_VS_DAG_PY = `# ============================================================
# Dagster asset-oriented vs Airflow DAG-oriented — the same pipeline
# Side-by-side comparison: extract → transform → load → test
# ============================================================

# --- Airflow DAG-oriented (task-first) ---
# Each task is the primary entity; assets are an afterthought (XCom)
from airflow.decorators import dag, task

@dag(schedule_interval="@daily", start_date=datetime(2024, 1, 1), catchup=False)
def orders_pipeline_airflow():

    @task
    def extract_orders():
        # Pull from Shopify API, push to S3, return S3 path via XCom
        return {"s3_path": "s3://raw/orders_2024-09-15.json"}

    @task
    def transform_orders(extract_xcom):
        # Read from S3, transform, write to S3
        return {"s3_path": "s3://clean/orders_2024-09-15.parquet"}

    @task
    def load_to_snowflake(transform_xcom):
        # COPY INTO Snowflake from S3
        return {"rows_loaded": 1500}

    @task
    def test_loaded_data(load_xcom):
        # dbt test or GE validation
        return {"passed": True}

    extract_orders() >> transform_orders() >> load_to_snowflake() >> test_loaded_data()

orders_pipeline_airflow()

# --- Dagster asset-oriented (artifact-first) ---
# Each asset is the primary entity; tasks are an afterthought (auto-generated)
from dagster import asset, AssetExecutionContext

@asset(group_name="bronze")
def raw_orders(context: AssetExecutionContext) -> str:
    """S3 path of the raw orders JSON for today."""
    return "s3://raw/orders_2024-09-15.json"

@asset(group_name="silver", deps=["raw_orders"])
def clean_orders(context: AssetExecutionContext, raw_orders: str) -> str:
    """S3 path of the cleaned orders Parquet."""
    # Dagster auto-tracks the dependency: clean_orders depends on raw_orders
    return "s3://clean/orders_2024-09-15.parquet"

@asset(group_name="gold", deps=["clean_orders"])
def fct_orders(context: AssetExecutionContext, clean_orders: str) -> str:
    """Snowflake table fct_orders — canonical revenue grain."""
    return "snowflake://prod.dagster.fct_orders"

@asset(group_name="gold", deps=["fct_orders"])
def orders_data_quality(context: AssetExecutionContext, fct_orders: str) -> bool:
    """Result of dbt test run on fct_orders."""
    return True

# --- Key differences ---

# 1. Airflow schedules TASKS — Dagster schedules ASSETS
#    Airflow's question: "Has the extract_orders task run today?"
#    Dagster's question: "Is the raw_orders asset up-to-date?"

# 2. Airflow recomputes the whole DAG if any task failed
#    Dagster only recomputes stale assets (whose upstream changed)

# 3. Airflow XCom: small data only; large data via S3 path
#    Dagster IOManager: any type — typed storage with auto-serialise/deserialise

# 4. Airflow catches up missed runs (catchup=True) — full backfill
#    Dagster backfills partition-aware — only the missing partitions

# 5. Airflow DAG dependencies are explicit (>>)
#    Dagster asset dependencies are implicit (deps parameter)

# 6. Airflow DAGs are about WHEN to run
#    Dagster assets are about WHAT is up-to-date

# 7. Airflow UI: tree view (tasks per run)
#    Dagster UI: asset graph (latest materialisation per asset)

# 8. Airflow task instance = (dag_id, task_id, run_id, try_number)
#    Dagster asset = (asset_key, partition_key, materialisation_id)

# --- When to use which ---
# Use Airflow when:
#   - The TASK is the primary entity (e.g. send an email, restart a service)
#   - Cross-system orchestration (dbt + Spark + Snowflake + API calls)
#   - Cron-driven schedules (workflows that must run at specific times)
#   - 3,000+ DAGs scale (Airbnb)

# Use Dagster when:
#   - The DATA ARTIFACT is the primary entity (e.g. fct_orders, dim_customer)
#   - You need partition-aware backfills (hourly/daily partitions)
#   - Asset lineage is the primary concern (FDA/CLIA audit)
#   - Python-native orchestration preferred over SQL+Jinja`;

// ============================================================
// Pyodide demo — simulate Dagster asset graph + IO Manager
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Dagster software-defined assets + IO Manager — in-browser simulation
# Build a synthetic asset graph, simulate materialisations, partitions
# ============================================================

import math
import random
from collections import defaultdict, deque

print("=== Dagster software-defined assets + IO Manager simulation ===")
print("Pipeline: raw_orders → clean_orders → fct_orders + daily_summary")
print("Materialisation strategy: only recompute stale assets")
print()

random.seed(42)

# --- Asset graph definition ---
class Asset:
    def __init__(self, key, layer, deps=None, materialised=False):
        self.key = key
        self.layer = layer   # bronze | silver | gold
        self.deps = deps or []
        self.materialised = materialised
        self.last_materialised_ts = None
        self.row_count = 0
        self.io_manager = "s3_parquet"  # default
        self.storage_path = None

    def __repr__(self):
        return f"Asset({self.key}, layer={self.layer}, deps={self.deps})"

class AssetGraph:
    def __init__(self):
        self.assets = {}

    def add(self, asset):
        self.assets[asset.key] = asset

    def topological_order(self):
        # Kahn's algorithm — materialise in dependency order
        in_degree = {k: len(a.deps) for k, a in self.assets.items()}
        queue = deque(k for k, d in in_degree.items() if d == 0)
        order = []
        while queue:
            k = queue.popleft()
            order.append(k)
            for other_k, a in self.assets.items():
                if k in a.deps:
                    in_degree[other_k] -= 1
                    if in_degree[other_k] == 0:
                        queue.append(other_k)
        return order

# --- Build the asset graph ---
graph = AssetGraph()
graph.add(Asset("raw_orders",      "bronze", deps=[]))
graph.add(Asset("clean_orders",    "silver", deps=["raw_orders"]))
graph.add(Asset("dim_customer",     "silver", deps=[]))  # separate source
graph.add(Asset("fct_orders",       "gold",   deps=["clean_orders", "dim_customer"]))
graph.add(Asset("daily_summary",    "gold",   deps=["clean_orders"]))

# --- IO Manager — S3 storage ---
class S3ParquetIOManager:
    """Simulates writing asset artifacts to S3 as Parquet."""
    def __init__(self):
        self.storage = {}

    def write(self, asset_key, partition_key, rows):
        path = f"s3://my-bucket/{asset_key}"
        if partition_key:
            parts = partition_key.split("-")
            if len(parts) >= 4:
                path += f"/year={parts[0]}/month={parts[1]}/day={parts[2]}/hour={parts[3][:2]}"
        path += "/data.parquet"
        self.storage[(asset_key, partition_key)] = {
            "path": path, "rows": rows, "size_mb": rows * 64 / 1e6,
        }
        return path

    def read(self, asset_key, partition_key=None):
        return self.storage.get((asset_key, partition_key))

io_manager = S3ParquetIOManager()

# --- Materialise the asset graph (topological order) ---
print("Asset graph (topological order):")
print(f"{'Asset':<22} | {'Layer':<8} | {'Depends on':<30} | {'IO Manager':<18}")
print("-" * 90)
for k in graph.topological_order():
    a = graph.assets[k]
    deps_str = ", ".join(a.deps) if a.deps else "(source)"
    print(f"{a.key:<22} | {a.layer:<8} | {deps_str:<30} | {a.io_manager:<18}")

# --- Simulate materialisation ---
print()
print("=== Materialisation run (run_id=2024-09-15-001) ===")
total_runtime_s = 0
for k in graph.topological_order():
    a = graph.assets[k]
    # Skip already-up-to-date assets
    if a.materialised:
        print(f"  [skip] {a.key} — already up-to-date")
        continue
    # Simulate compute (random runtime based on layer)
    runtime = random.randint(5, 60) if a.layer == "bronze" else random.randint(3, 30)
    total_runtime_s += runtime
    # Simulate row count
    rows = random.randint(500, 5000) if a.layer == "bronze" else random.randint(100, 3000)
    a.row_count = rows
    a.materialised = True
    a.last_materialised_ts = f"2024-09-15T14:00:{runtime:02d}Z"
    # Write to IO Manager (no partition key for non-partitioned assets)
    path = io_manager.write(a.key, None, rows)
    a.storage_path = path
    print(f"  [done] {a.key} materialised — runtime={runtime}s, rows={rows}, path={path}")

print()
print(f"Total materialisation runtime: {total_runtime_s}s = {total_runtime_s/60:.1f} min")

# --- Simulate a re-run with one changed upstream ---
print()
print("=== Re-run: raw_orders regenerated (e.g. Shopify API re-pull) ===")
# Reset raw_orders' materialisation
graph.assets["raw_orders"].materialised = False
graph.assets["raw_orders"].last_materialised_ts = None

# Dagster recomputes only stale assets (whose upstream changed)
total_runtime_s = 0
for k in graph.topological_order():
    a = graph.assets[k]
    # Check if this asset's upstream is stale
    upstream_stale = any(not graph.assets[d].materialised for d in a.deps)
    if a.materialised and not upstream_stale:
        print(f"  [skip] {a.key} — already up-to-date + upstream stable")
        continue
    # Recompute this asset
    runtime = random.randint(5, 60) if a.layer == "bronze" else random.randint(3, 30)
    total_runtime_s += runtime
    rows = random.randint(500, 5000) if a.layer == "bronze" else random.randint(100, 3000)
    a.row_count = rows
    a.materialised = True
    a.last_materialised_ts = f"2024-09-15T15:00:{runtime:02d}Z"
    path = io_manager.write(a.key, None, rows)
    print(f"  [done] {a.key} re-materialised — runtime={runtime}s, rows={rows}")

print()
print(f"Re-run runtime: {total_runtime_s}s = {total_runtime_s/60:.1f} min")
print("(Only raw_orders + its downstream were recomputed)")

# --- Partition-aware simulation ---
print()
print("=== Partition-aware simulation (hourly partitions) ===")
# Define a partitioned asset (sensor_readings with hourly partitions)
hourly_partitions = [f"2024-09-15-{h:02d}:00" for h in range(24)]
n_partitions = len(hourly_partitions)
print(f"Asset: sensor_readings · partitions: {n_partitions} (hourly)")

# Simulate 50k sensors × 3600 reads/hour = 180M events/partition
events_per_partition = 50_000 * 3600
total_events = 0
total_size_mb = 0
missing_partitions = []

for pkey in hourly_partitions:
    # 5% chance the partition is missing (sensor MQTT downtime)
    if random.random() < 0.05:
        missing_partitions.append(pkey)
        continue
    rows = events_per_partition + random.randint(-1000, 1000)
    total_events += rows
    path = io_manager.write("sensor_readings", pkey, rows)
    total_size_mb += rows * 64 / 1e6

print(f"  Materialised partitions: {n_partitions - len(missing_partitions)} of {n_partitions}")
print(f"  Missing partitions: {len(missing_partitions)} ({100*len(missing_partitions)/n_partitions:.1f}%)")
print(f"  Total events: {total_events:,}")
print(f"  Total storage: {total_size_mb/1024:.1f} GB compressed")

# --- Backfill missing partitions ---
print()
print("=== Backfill: re-materialise missing partitions ===")
backfill_runtime_s = 0
for pkey in missing_partitions:
    runtime = random.randint(30, 60)  # 30-60 sec per hour of replay
    backfill_runtime_s += runtime
    rows = events_per_partition + random.randint(-1000, 1000)
    path = io_manager.write("sensor_readings", pkey, rows)
    print(f"  [done] sensor_readings[{pkey}] backfilled — runtime={runtime}s, rows={rows}")

print(f"  Backfill runtime: {backfill_runtime_s}s = {backfill_runtime_s/60:.1f} min")
print(f"  (Other partitions NOT re-processed — only the {len(missing_partitions)} missing ones)")

# --- Asset lineage (partition-aware) ---
print()
print("=== Asset lineage query (FDA/CLIA audit) ===")
print("  Query: 'Which upstream partitions contributed to daily_summary[2024-09-15]?'")
print("  Answer (Dagster's partition-aware lineage):")
print("    daily_summary[2024-09-15]")
print("      ← clean_orders[2024-09-15]")
print("        ← raw_orders[2024-09-15]")
print("  → 1 chain traced in 1 GraphQL query (no partition fan-out)")
print()
print("  Compare with sensor_readings → daily_sensor_summary:")
print("    daily_sensor_summary[2024-09-15]")
print("      ← hourly_aggregates[2024-09-15-00:00 ... 23:00] (24 partitions)")
print("        ← clean_readings[2024-09-15-00:00 ... 23:00] (24 partitions)")
print("          ← raw_readings[2024-09-15-00:00 ... 23:00] (24 partitions)")
print("  → 24 × 3 = 72 upstream partitions traced in 1 GraphQL query")

print()
print("Key insight: Dagster's SDA shift the orchestration model from")
print("'run this task on this schedule' to 'is this asset up-to-date?'.")
print("Only stale assets get recomputed; partition-aware backfills")
print("re-materialise only the missing partitions, not the entire day.")`;

// ============================================================
// Dagster architecture SVG diagram
// ============================================================

function DagsterArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("dagster_daemon");
  const nodes = {
    "dagit": { label: "Dagit (UI)", desc: "React UI — asset graph, runs, schedules, sensors, partitions. Port 3000 by default", level: 0 },
    "dagster_daemon": { label: "Dagster Daemon", desc: "Background process — runs schedules, sensors, queues + backfills. Heart of Dagster", level: 1 },
    "code_locations": { label: "Code Locations", desc: "Python processes hosting the user code — Definitions (assets, resources, schedules)", level: 2 },
    "asset_graph": { label: "Asset Graph", desc: "All software-defined assets — DAG of typed artifacts. Visualised in Dagit", level: 3 },
    "io_managers": { label: "IO Managers", desc: "Per-asset-type storage adapters (S3, Snowflake, custom). Handle serialise/deserialise", level: 3 },
    "resources": { label: "Resources", desc: "ConfigurableResource — DI for external clients (Snowflake, S3, HTTP)", level: 3 },
    "runs_db": { label: "Runs DB (Postgres/SQLite)", desc: "Materialisation history, run logs, asset events, schedules, sensors", level: 0 },
    "executor": { label: "Executor (in_proc | multiproc | k8s)", desc: "Where asset materialisations run — in-process, multi-process, or k8s pods", level: 2 },
  };
  const edges = [
    ["dagit", "runs_db"],
    ["dagster_daemon", "runs_db"],
    ["dagster_daemon", "code_locations"],
    ["code_locations", "asset_graph"],
    ["code_locations", "io_managers"],
    ["code_locations", "resources"],
    ["code_locations", "executor"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "dagit": { x: 60, y: 30 },
    "runs_db": { x: 60, y: 80 },
    "dagster_daemon": { x: 60, y: 130 },
    "code_locations": { x: 60, y: 180 },
    "asset_graph": { x: 60, y: 230 },
    "io_managers": { x: 200, y: 230 },
    "resources": { x: 220, y: 180 },
    "executor": { x: 200, y: 130 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Workflow className="h-3.5 w-3.5 text-primary" />
          Dagster architecture — Dagit UI + Daemon + Code Locations + Asset Graph + IO Managers
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 320 270" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8"
                markerEnd="url(#arrow-dagster)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color =
              node.level === 0 ? "var(--chart-3)" :
              node.level === 1 ? "var(--chart-2)" :
              node.level === 2 ? "var(--chart-1)" :
              node.level === 3 ? "var(--chart-4)" : "var(--muted-foreground)";
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 55} y={pos.y - 10} width="110" height="22" rx="3"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="7"
                  fill={isActive ? color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>
                  {node.label}
                </text>
              </motion.g>
            );
          })}
          <defs>
            <marker id="arrow-dagster" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
        </svg>
        {activeNode && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <p className="font-semibold text-primary mb-0.5">
              {nodes[activeNode as keyof typeof nodes].label}
            </p>
            <p className="text-muted-foreground">
              {nodes[activeNode as keyof typeof nodes].desc}
            </p>
          </div>
        )}
        {!activeNode && (
          <p className="mt-2 text-[10px] text-muted-foreground text-center">
            Hover any node to see its role — the Dagster Daemon is the heart, the asset graph is the source of truth.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table: Dagster vs Airflow vs dbt vs Prefect
// ============================================================

function AssetVsDagComparisonTable() {
  const rows = [
    { feature: "Origin", dagster: "Dagster Labs (2018, Nick Schrock)", airflow: "Airbnb (2014)", dbt: "Fishtown (2016)", prefect: "Prefect (2018)" },
    { feature: "Primary entity", dagster: "Software-defined asset", airflow: "Task", dbt: "Model (SQL)", prefect: "Flow" },
    { feature: "Question asked", dagster: "Is this asset up-to-date?", airflow: "Has this task run?", dbt: "Is this SQL fresh?", prefect: "Has this flow run?" },
    { feature: "Recomputation", dagster: "Only stale assets", airflow: "Whole DAG", dbt: "Whole model", prefect: "Whole flow" },
    { feature: "Backfill", dagster: "Partition-aware", airflow: "Catchup + manual", dbt: "Manual re-run", prefect: "Auto" },
    { feature: "Storage", dagster: "IO Manager (typed, per-asset)", airflow: "XCom (small only)", dbt: "Warehouse-native", prefect: "Data passing" },
    { feature: "Lineage", dagster: "Asset graph (queryable)", airflow: "Task dependencies", dbt: "manifest.json DAG", prefect: "Flow DAG" },
    { feature: "Partitions", dagster: "First-class (hourly/daily/multi)", airflow: "Manual partition logic", dbt: "Per-model partitions", prefect: "Limited" },
    { feature: "Resources", dagster: "ConfigurableResource (DI)", airflow: "Connections (lower-level)", dbt: "N/A (no DI)", prefect: "Blocks" },
    { feature: "Best fit", dagster: "Asset-graph pipelines", airflow: "Cross-system orchestration", dbt: "Warehouse transforms", prefect: "Python data flows" },
    { feature: "Adopters", dagster: "Ripple, Cradle, Earnin", airflow: "Airbnb, Lyft, Adobe", dbt: "GitLab, JetBlue, Ratheon", prefect: "Toast, Vice, Merge" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Dagster vs Airflow vs dbt vs Prefect — asset vs DAG comparison
        </p>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto custom-scroll">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 sticky top-0">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Dagster</th>
              <th className="text-left px-3 py-2 font-semibold">Airflow</th>
              <th className="text-left px-3 py-2 font-semibold">dbt</th>
              <th className="text-left px-3 py-2 font-semibold">Prefect</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.dagster}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.airflow}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.dbt}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.prefect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Main page component
// ============================================================

const KPIS = [
  { label: "Origin", value: "Dagster Labs 2018 (Nick Schrock)", hint: "Nick Schrock (former Facebook GraphQL author) founded Dagster Labs in 2018 to build a 'data orchestrator for the asset era' — moving from DAG-oriented (Airflow) to asset-oriented (SDA) orchestration", deltaTone: "flat" as const },
  { label: "Adoption", value: "1,000+ companies", hint: "Ripple, Cradle, Earnin, Notion, LastPass — fast-growing in data-mature companies that value asset lineage + partition-aware backfills. Dagster Cloud is the managed service; dagster-core is open-source (Apache 2.0)", deltaTone: "up" as const },
  { label: "Key innovation", value: "Software-Defined Assets (SDA, 2021)", hint: "Replaces Airflow's task-oriented model with asset-oriented: each asset is a typed artifact with upstream deps; Dagster recomputes only stale assets whose inputs changed. Partition-aware + IO Manager baked in", deltaTone: "up" as const },
  { label: "Executors", value: "3 (in-process, multiprocess, k8s)", hint: "in_process (dev/test), multiprocess (production single-node), k8s (production multi-node, per-task pod). Same executor abstraction as Airflow but lighter — Dagster ships without the celery/RabbitMQ dependency", deltaTone: "flat" as const },
];

export function DagsterPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dagster · asset-oriented orchestration · software-defined assets"
        title="Dagster — Asset-Oriented Data Orchestration"
        description="Dagster is the asset-oriented data orchestrator. Founded by Nick Schrock (former Facebook GraphQL author) in 2018 to fix Airflow's task-oriented model: instead of asking 'has this task run today?', Dagster asks 'is this asset up-to-date?'. Software-Defined Assets (SDA, 2021) are the key innovation — each asset is a typed artifact with declared upstream dependencies; Dagster recomputes only stale assets whose inputs changed. The IO Manager handles per-asset storage (S3 Parquet, Snowflake, custom). Partitions are first-class (hourly, daily, multi-partition). Resources are typed DI for external systems (Snowflake, S3, HTTP). The asset graph is queryable for FDA/CLIA regulatory audit. Adopted by Ripple, Cradle, Earnin, Notion, LastPass — fast-growing among data-mature teams that value lineage + partition-aware backfills."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Workflow className="h-3 w-3" /> Dagster 1.7</Badge>
            <Badge variant="outline" className="gap-1.5"><Boxes className="h-3 w-3" /> SDA</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            hint={k.hint}
            deltaTone={k.deltaTone}
          />
        ))}
      </div>

      {/* Architecture diagram */}
      <SectionCard
        title="Dagster architecture — Dagit UI + Daemon + Code Locations + Asset Graph + IO Managers"
        description="Dagster has 5 core components: (1) Dagit (React UI on port 3000 — asset graph, runs, schedules, sensors, partitions), (2) Dagster Daemon (background process — runs schedules, sensors, queues + backfills — heart of Dagster), (3) Code Locations (Python processes hosting user code — Definitions of assets, resources, schedules), (4) Asset Graph (all software-defined assets — DAG of typed artifacts, visualised in Dagit), (5) IO Managers (per-asset-type storage adapters — S3 Parquet, Snowflake, custom). The Runs DB (Postgres or SQLite for dev) stores materialisation history + run logs. Resources are ConfigurableResource instances — typed DI for external clients."
        icon={<Workflow className="h-5 w-5" />}
        badge="architecture"
      >
        <DagsterArchitectureDiagram />
      </SectionCard>

      {/* Software-Defined Assets */}
      <SectionCard
        title="Software-Defined Assets (SDA) — @asset decorator + deps parameter"
        description="The @asset decorator defines a typed artifact + its upstream dependencies. Each asset is a Python function that takes upstream assets as parameters (Dagster auto-injects them via DI) and returns the materialised artifact. The deps parameter declares upstream asset dependencies by asset key; Dagster builds the asset graph from these declarations. The IO Manager handles storage — by default each asset goes to a configurable IO Manager (S3 Parquet, Snowflake, custom). The asset graph is queryable: 'which assets depend on this one?' is one GraphQL query. Materialisations are tracked with timestamps + metadata for audit."
        icon={<Boxes className="h-5 w-5" />}
        badge="SDA"
      >
        <CodeBlock code={DAGSTER_SDA_PY} language="python" filename="assets/orders_pipeline.py" highlight={[24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101]} />
      </SectionCard>

      {/* IO Manager */}
      <SectionCard
        title="IO Manager — typed storage for asset artifacts (S3 Parquet example)"
        description="The IO Manager decouples asset computation from asset storage. Each asset type can have its own IOManager implementation: handle_output() serialises the asset to storage, load_input() deserialises it for downstream assets. The S3ParquetIOManager writes DataFrames to S3 as Parquet; the partition-aware subclass writes Hive-style paths (year=2024/month=09/day=15/hour=14/). Custom IO Managers can target any storage — Snowflake tables, BigQuery, Redis, a custom file format. The IO Manager pattern is what makes Dagster asset-oriented: the asset function only knows about computation; storage is a deployment-time decision."
        icon={<Database className="h-5 w-5" />}
        badge="IO Manager"
      >
        <CodeBlock code={DAGSTER_IO_MANAGER_PY} language="python" filename="io_managers/s3_parquet.py" highlight={[15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113]} />
      </SectionCard>

      {/* Partitions */}
      <SectionCard
        title="Partitions — partition-aware asset materialisation + backfill"
        description="Partitions are first-class in Dagster. Each asset can declare a partitions_def — HourlyPartitionsDefinition (24 partitions/day), DailyPartitionsDefinition (1/day), MultiPartitionsDefinition (date × region), StaticPartitionsDefinition (customer tiers), or DynamicPartitionsDefinition (created at runtime). The partition key is part of the asset identity — sensor_readings[2024-09-15-14:00] is a distinct materialisation from sensor_readings[2024-09-15-15:00]. Backfills re-materialise missing partitions only — no need to re-run the entire asset. Partition-aware asset lineage is queryable: 'which upstream partitions contributed to daily_summary[2024-09-15]?' returns 24×3 = 72 partitions in one GraphQL query."
        icon={<GitBranch className="h-5 w-5" />}
        badge="Partitions"
      >
        <CodeBlock code={DAGSTER_PARTITIONS_PY} language="python" filename="assets/partitioned_sensors.py" highlight={[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128]} />
      </SectionCard>

      {/* Resources */}
      <SectionCard
        title="Resources — ConfigurableResource for typed DI of external clients"
        description="Resources are Dagster's dependency injection for external systems — Snowflake connections, S3 clients, HTTP clients. Each Resource is a typed wrapper (ConfigurableResource with pydantic validation) that gets injected into asset functions by parameter name. Old-style @resource decorator (Dagster 1.0+) and new-style ConfigurableResource (1.6+, pydantic-based) both supported. Resources are configured at deploy time — the same asset code runs in dev (mock resources) and prod (real resources) with different configurations. Resource testing is straightforward — pure functions, easy to mock."
        icon={<Settings className="h-5 w-5" />}
        badge="Resources"
      >
        <CodeBlock code={DAGSTER_RESOURCES_PY} language="python" filename="resources/snowflake.py" highlight={[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143]} />
      </SectionCard>

      {/* Asset vs DAG */}
      <SectionCard
        title="Asset-oriented vs DAG-oriented — the same pipeline in Dagster + Airflow"
        description="Side-by-side comparison: the same extract → transform → load → test pipeline implemented in both Airflow (DAG-oriented, task-first) and Dagster (asset-oriented, artifact-first). Key difference: Airflow asks 'has the extract_orders task run today?'; Dagster asks 'is the raw_orders asset up-to-date?'. Airflow recomputes the whole DAG if any task failed; Dagster only recomputes stale assets. Airflow XCom is small data only (metadata DB 48KB limit); Dagster IOManager is typed storage with any type. Airflow catchup is full backfill; Dagster backfills are partition-aware — only missing partitions."
        icon={<Boxes className="h-5 w-5" />}
        badge="asset vs DAG"
      >
        <CodeBlock code={DAGSTER_ASSET_VS_DAG_PY} language="python" filename="comparison.py" highlight={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: run a Dagster asset graph + IO Manager in your browser (Pyodide)"
        description="Pure-Python simulation of a Dagster asset graph materialisation — no daemon or warehouse needed, runs in-browser. Build a 5-asset graph (raw_orders → clean_orders → fct_orders + dim_customer → daily_summary), simulate topological materialisation, see how Dagster recomputes only stale assets when one upstream changes, then explore the partition-aware simulation with hourly partitions for sensor_readings, and watch a backfill re-materialise only the missing partitions."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run Dagster asset graph simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Dagster vs Airflow vs dbt vs Prefect — asset vs DAG comparison"
        description="Four orchestrators compared on the asset-vs-DAG axis. Dagster is asset-oriented — primary entity is the artifact; recomputation is per-asset. Airflow is DAG-oriented — primary entity is the task; recomputation is per-DAG. dbt is transform-only — owns the SQL layer; same model can be expressed in Dagster as assets. Prefect is flow-oriented — like Airflow but Python-native. Most modern stacks use dbt + Airflow/Dagster together; the asset-oriented model is gaining traction as data teams mature."
        icon={<Boxes className="h-5 w-5" />}
      >
        <AssetVsDagComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Dagster evolved — shortfalls of the DAG-oriented Airflow era (post-2014)"
        description="Dagster filled the gap between Airflow's task-oriented model and the data-artifact-centric workflows that modern data teams needed. Airflow was right for 2014's batch ETL pipelines; Dagster is right for 2020's lakehouse + Bronze→Silver→Gold + partitioned time-series."
        icon={<History className="h-5 w-5" />}
        badge="Why Dagster"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Airflow recomputed the whole DAG even if only one task's upstream changed.</strong> If raw_orders failed, Airflow re-ran extract_orders, transform_orders, load_to_snowflake, test_loaded_data — even though transform_orders only depended on extract_orders' latest materialisation. Dagster recomputes only stale assets — when raw_orders is regenerated, only clean_orders + fct_orders + daily_summary are recomputed (the ones whose upstream actually changed). <strong className="text-foreground/80">Result:</strong> 70%+ reduction in compute for incremental updates.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Airflow XCom was small data only.</strong> XCom has a 48KB limit on the metadata DB — teams hacked around it by pushing S3 paths instead of data. Dagster's IO Manager is typed storage with any type — DataFrame, dict, file path, custom object. The IO Manager handles serialise/deserialise; the asset function only knows about computation. <strong className="text-foreground/80">Result:</strong> no 'XCom tricks' — assets pass typed artifacts naturally.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: Airflow backfills were coarse.</strong> Airflow's catchup=True backfilled the whole DAG for a date range — every task for every missed date. Dagster's partition-aware backfill re-materialises only the missing partitions of an asset — when one hour's MQTT broker was down, you backfill that one hour, not the whole day. <strong className="text-foreground/80">Result:</strong> backfilling 24 hours of data went from re-running 24 full DAGs to re-running 24 single-partition assets.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: Airflow asset lineage was implicit.</strong> Airflow's task dependencies were explicit (<code className="font-mono">&gt;&gt;</code>), but the data artifacts they produced were implicit (XCom keys + S3 paths in bash commands). Dagster's asset graph makes the artifact dependencies explicit — the asset graph is queryable: 'which upstream partitions contributed to this asset?' is one GraphQL query. <strong className="text-foreground/80">Result:</strong> FDA/CLIA audit lineage is now machine-queryable, not human-archaeology.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Dagster features (vs Airflow + dbt + Prefect)"
        description="Dagster has four features that are genuinely unique — not marketing fluff, but structural differentiators that the other orchestrators haven't matched."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Software-Defined Assets (SDA)</p>
            <p className="text-muted-foreground">Asset-oriented model: each asset is a typed artifact + declared upstream deps. <strong>Airflow + Prefect are DAG-oriented (tasks).</strong> Only Dagster asks 'is this asset up-to-date?' — recomputing only stale assets whose inputs changed.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Partition-aware backfills</p>
            <p className="text-muted-foreground">Hourly/daily/multi/static/dynamic partitions are first-class. Backfills re-materialise only missing partitions. <strong>Airflow catchup is full-DAG; dbt has no partition concept.</strong> Critical for time-series data where each hour is independent.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. IO Manager (typed storage)</p>
            <p className="text-muted-foreground">Per-asset-type storage adapters (S3 Parquet, Snowflake, custom). Typed serialise/deserialise. <strong>Airflow XCom is small data only (48KB); dbt has no storage abstraction.</strong> Decouples asset computation from asset storage.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. ConfigurableResource (pydantic DI)</p>
            <p className="text-muted-foreground">Typed DI for external clients (Snowflake, S3, HTTP). Pydantic-validated. <strong>Airflow uses lower-level Connections; dbt has no DI.</strong> Same asset code runs in dev (mock) and prod (real) with different config.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="2 large-dataset examples — cards with 5-language code popups"
        description="Two production-style scientific Dagster examples. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. The examples show how Dagster's SDA model orchestrates scientific workflows with partition-aware backfills + IO Manager."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={DAGSTER_SCIENCE_EXAMPLES}
          intro="Genomics asset graph (8 SDA for GATK variant calling — fastq_reads → aligned_bam → dedup_bam → recalibrated_bam → raw_vcf → filtered_vcf → annotated_vcf → allele_freq_table) + Sensor data partitions (hourly partitions for 50k IoT sensors via IO Manager — 4.3B events/day). Each card has Scala/Rust/Go/Elixir/Zig code that interacts with the Dagster GraphQL API + a Pyodide simulation."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Dagster ecosystem"
        description="Dagster's ecosystem is newer than Airflow's but growing fast. The Dagster project has 50+ library integrations covering common data tools. The Software-Defined Assets (SDA) pattern is the modern orchestration API. Dagster Cloud is the managed service; dagster-core is open-source."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Executors (3)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>in_process</strong> — dev/test (single Python process)</li>
              <li>• <strong>multiprocess</strong> — production single-node (fork)</li>
              <li>• <strong>k8s</strong> — production multi-node (per-task pod)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Library integrations (50+)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>dagster-aws</strong> — S3, EMR, Redshift, ECS</li>
              <li>• <strong>dagster-snowflake</strong> — Snowflake SQL + Snowpark</li>
              <li>• <strong>dagster-dbt</strong> — run dbt models as assets</li>
              <li>• <strong>dagster-databricks</strong> — notebook + job runs</li>
              <li>• <strong>dagster-spark</strong> — PySpark + Spark-submit</li>
              <li>• <strong>dagster-pandas</strong> — typed DataFrame assets</li>
              <li>• <strong>dagster-duckdb</strong> — local DuckDB analytics</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Code2 className="h-3.5 w-3.5 text-primary" /> Modern APIs (4)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Software-Defined Assets (SDA, 2021)</strong> — @asset decorator</li>
              <li>• <strong>ConfigurableResource (1.6+)</strong> — pydantic-based DI</li>
              <li>• <strong>MultiPartitionsDefinition</strong> — date × region partitions</li>
              <li>• <strong>Schedules + Sensors + AssetSensors</strong> — event-driven</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Network className="h-3.5 w-3.5 text-primary" /> Managed services (3)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Dagster Cloud</strong> — SaaS-managed (Hybrid + Full + Enterprise)</li>
              <li>• <strong>Dagster Plus</strong> — managed + per-task isolation</li>
              <li>• <strong>Astronomer Aster</strong> — Dagster + Airflow hybrid</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers, blog posts, and production case studies that defined Dagster + the asset-oriented orchestration movement. The 2018 founding + 2021 SDA release are the key milestones. Ripple, Cradle, Earnin, and Notion have published detailed production case studies."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Nick Schrock (Dagster Labs, 2018):</strong> "Dagster: A new approach to data orchestration." Schrock (former Facebook engineer, author of GraphQL) argued that Airflow's task-oriented model was a step backward from the data-artifact-centric workflows that modern data teams needed. The thesis: data teams care about the artifact (the fct_orders table, the daily_summary file), not the task that produced it. Dagster introduced software-defined assets + typed IO Managers + partition-aware backfills — making the artifact the primary entity.
          </p>
          <p>
            <strong className="text-foreground/80">Software-Defined Assets release (Dagster 0.13, 2021):</strong> The @asset decorator was released in 2021 — the biggest API change since Dagster's founding. Instead of @solid + @pipeline (the original 0.x API), users could declare assets with their upstream deps directly. This unlocked the asset graph UI (Dagit), partition-aware backfills, and the question 'is this asset up-to-date?' as the primary scheduling decision.
          </p>
          <p>
            <strong className="text-foreground/80">Ripple Production Case (2022):</strong> Ripple (cross-border payments) migrated 800+ Airflow DAGs to Dagster SDA over 12 months. Result: 40% reduction in compute (only stale assets recompute), partition-aware backfills replaced full-DAG catchup (75% faster backfill for the 6-month rolling partition set), asset graph lineage enabled real-time audit (vs Confluence archaeology). The migration is the reference case study for Airflow→Dagster.
          </p>
          <p>
            <strong className="text-foreground/80">Cradle Bioinformatics (2023):</strong> Cradle (protein engineering platform) runs Dagster SDA for their protein-design pipeline — 14 assets from sequence input → AlphaFold structure → binding predictions → candidate ranking. The asset graph is queryable for FDA audit (which candidate was designed when, from what inputs). IO Manager handles BAM/PDB file storage on S3 with versioned paths.
          </p>
          <p>
            <strong className="text-foreground/80">Notion Case Study (2024):</strong> Notion (notes + workspace) uses Dagster for their product analytics lake — 200+ assets covering user activity, document edits, sharing patterns. The asset graph gives the data team a single source of truth for 'what data do we have, and what produced it?' — critical for a company with 100M+ users generating telemetry at high volume.
          </p>
          <p>
            <strong className="text-foreground/80">Earnin Production (2023):</strong> Earnin (financial services) uses Dagster SDA + partition-aware hourly partitions for their transaction fraud-detection pipeline. Each hour's transactions are a separate partition; backfills re-materialise only missing hours when fraud rules change. The IO Manager writes per-partition Parquet to S3 — Trino/Athena query the same paths without separate ETL.
          </p>
          <p>
            <strong className="text-foreground/80">dagster-core Open Source (Apache 2.0):</strong> The dagster-core project has 10,000+ GitHub stars, 400+ contributors, 50+ library integrations. The open-source license means any team can self-host dagster-core on a single EC2 instance for free; Dagster Cloud adds the managed service (schedules, sensors, asset graph UI, code locations) for a per-seat subscription.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: Dagster's asset graph IS the data lineage graph (literally)"
        description="The unifying view: Dagster's asset graph is structurally identical to a data lineage graph — every node is an artifact, every edge is a derivation. This is why asset-oriented orchestration wins for data-mature teams."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Dagster's asset graph IS the data lineage graph (literally).</strong> A lineage graph is 'artifact A is derived from artifact B'. Dagster's asset graph encodes exactly this — each asset declares its deps parameter, which lists the upstream assets it derives from. The Dagit UI renders this as a lineage graph; the GraphQL API lets you query it ('which assets depend on raw_orders?'). This is structurally identical to OpenLineage + Marquez — except in Dagster, the lineage is the orchestration, not a side-channel.
          </p>
          <p>
            <strong className="text-foreground/80">SDA is the dependency-inversion principle applied to data pipelines.</strong> Traditional orchestration (Airflow, cron) has tasks that produce artifacts as side-effects. Dagster inverts this: artifacts are the primary entities; tasks are auto-generated from the asset declarations. This is exactly the dependency-inversion principle from software engineering — depend on the artifact (interface), not the task (implementation). When you swap out a task implementation, the asset stays the same.
          </p>
          <p>
            <strong className="text-foreground/80">IO Manager IS the typed storage abstraction (DAO pattern).</strong> Each IOManager subclass is a Data Access Object for a specific storage type — S3ParquetIOManager for Parquet on S3, SnowflakeIOManager for Snowflake tables, etc. This is the same pattern as Hibernate for SQL databases, PyTorch Dataset for ML data, or React Server Components for the network boundary. The asset function doesn't know where its output goes — that's a deployment-time decision via IO Manager config.
          </p>
          <p>
            <strong className="text-foreground/80">Partitions ARE versioned rows in a logical table.</strong> A partitioned asset sensor_readings[2024-09-15-14:00] is structurally a row in a logical table 'sensor_readings' with partition key '2024-09-15-14:00' as the version. This is the same pattern as Apache Iceberg snapshots (each snapshot is a version of the logical table), git commits (each commit is a version of the logical tree), or PostgreSQL MVCC tuples (each version is a snapshot of the logical row). Dagster's partition-aware backfill is git-revert for data.
          </p>
          <p>
            <strong className="text-foreground/80">Dagster IS to data orchestration what React was to UI.</strong> Before React (2013), UI was imperative — manually update the DOM when state changes. React introduced declarative UI: describe the desired UI as a function of state, let React diff + update. Dagster did the same for data: before Dagster, orchestration was imperative (run this task on this schedule); Dagster introduced declarative orchestration (describe the desired asset graph, let Dagster diff + update only stale assets). The pattern is isomorphic — both win by making the desired state declarative and letting the runtime figure out the minimal update.
          </p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "orchestration" as const, reason: "Anchor concept page — orchestration layer overview" },
        { id: "airflow" as const, reason: "DAG-oriented predecessor — same pipeline in Airflow" },
        { id: "dbt-deep-dive" as const, reason: "dbt — Dagster runs dbt models as software-defined assets" },
        { id: "dbt" as const, reason: "dbt concept page — Dimensional Modelling + SCD2" },
        { id: "lineage" as const, reason: "Asset graph IS the data lineage graph" },
        { id: "cicd" as const, reason: "Dagster asset definitions version-controlled in git + CI-validated" },
        { id: "iceberg" as const, reason: "Iceberg snapshots + Dagster partitions are both versioning models" },
        { id: "data-mesh" as const, reason: "Dagster's asset graph enables data-mesh domain ownership" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("orchestration")} className="text-sm text-primary hover:underline">
          &rarr; Orchestration concept page
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("airflow")} className="text-sm text-primary hover:underline">
          &rarr; Apache Airflow (DAG-oriented predecessor)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("dbt-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; dbt Deep Dive (transform layer)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("lineage")} className="text-sm text-primary hover:underline">
          &rarr; Lineage (asset graph IS the lineage graph)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("cicd")} className="text-sm text-primary hover:underline">
          &rarr; CI/CD for asset definitions
        </Link>
      </div>
    </div>
  );
}
