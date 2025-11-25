"""
sim_stream_test_simulator.py
Harmless simulator of a large-scale streaming load test (no network activity).
Outputs a JSON-like report and a short human summary.

Usage:
    python sim_stream_test_simulator.py
"""

import random
import math
import statistics
import json
from datetime import datetime

# ---------- CONFIG ----------
SIM_CONNECTIONS = 1_000_000         # number of simulated simultaneous connections
TEST_DURATION_SEC = 3600            # test duration in seconds (1 hour)
AVG_BITRATE_KBPS = 50               # average per-connection bitrate in kbps (adjustable)
BITRATE_STDDEV_KBPS = 10            # variation in bitrate
SUCCESS_RATE = 0.995                # fraction of connections that "play" successfully
AVG_LATENCY_MS = 120                # average initial connection latency in ms
LATENCY_STDDEV_MS = 60              # latency spread
# Cost assumptions (set to your provider numbers)
EGRESS_COST_PER_GB_USD = 0.09       # e.g., $0.09 per GB typical egress
GENERATOR_INSTANCE_COST_USD_PER_HOUR = 1.50  # cost per hour per load-generator instance
GENERATOR_NIC_GBPS = 10             # each generator instance max network capacity in Gbps

# ---------- SIMULATION ----------
def simulate_connection_metrics(n):
    """Return aggregated metrics simulated for n connections."""
    successes = int(n * SUCCESS_RATE)
    failures = n - successes

    # sample bitrates and latencies for a representative sample (not per-connection to save memory)
    sample_size = min(200_000, n)  # representative sample
    bitrates = [max(1, random.gauss(AVG_BITRATE_KBPS, BITRATE_STDDEV_KBPS)) for _ in range(sample_size)]
    latencies = [max(1, random.gauss(AVG_LATENCY_MS, LATENCY_STDDEV_MS)) for _ in range(sample_size)]

    median_bitrate = statistics.median(bitrates)
    p95_latency = sorted(latencies)[int(0.95 * sample_size) - 1]
    mean_bitrate = statistics.mean(bitrates)

    # aggregate throughput in Gbps
    total_kbps = n * mean_bitrate
    total_mbps = total_kbps / 1000
    total_gbps = total_mbps / 1000

    # total data transferred during test duration (GB)
    total_bits = total_kbps * 1000 * TEST_DURATION_SEC
    total_bytes = total_bits / 8
    total_gb = total_bytes / (10**9)  # decimal GB

    return {
        "connections_requested": n,
        "successful_streams": successes,
        "failed_streams": failures,
        "mean_bitrate_kbps_per_connection": round(mean_bitrate,2),
        "median_bitrate_kbps_per_connection": round(median_bitrate,2),
        "total_gbps": round(total_gbps,3),
        "total_data_gb": round(total_gb,2),
        "p95_latency_ms": round(p95_latency,1),
    }

# ---------- COST ESTIMATOR ----------
def estimate_costs(total_data_gb, total_gbps):
    # egress cost
    egress_cost = total_data_gb * EGRESS_COST_PER_GB_USD

    # estimate number of generator instances needed by NIC capacity
    # each instance provides GENERATOR_NIC_GBPS Gbps
    generators_needed = max(1, math.ceil(total_gbps / GENERATOR_NIC_GBPS))
    generator_cost = generators_needed * GENERATOR_INSTANCE_COST_USD_PER_HOUR * (TEST_DURATION_SEC / 3600)

    return {
        "egress_cost_usd": round(egress_cost,2),
        "generators_needed": generators_needed,
        "generator_compute_cost_usd": round(generator_cost,2),
        "estimated_total_cost_usd": round(egress_cost + generator_cost, 2)
    }

# ---------- RUN SIM ----------
if __name__ == "__main__":
    start = datetime.utcnow().isoformat() + "Z"
    metrics = simulate_connection_metrics(SIM_CONNECTIONS)
    costs = estimate_costs(metrics["total_data_gb"], metrics["total_gbps"])
    report = {
        "test_start": start,
        "test_duration_seconds": TEST_DURATION_SEC,
        "config": {
            "simulated_connections": SIM_CONNECTIONS,
            "avg_bitrate_kbps": AVG_BITRATE_KBPS,
            "success_rate": SUCCESS_RATE
        },
        "metrics": metrics,
        "cost_estimate_assumptions": {
            "egress_cost_per_gb_usd": EGRESS_COST_PER_GB_USD,
            "generator_instance_cost_usd_per_hour": GENERATOR_INSTANCE_COST_USD_PER_HOUR,
            "generator_nic_gbps": GENERATOR_NIC_GBPS
        },
        "costs": costs
    }

    print(json.dumps(report, indent=2))
    # Also a short human summary:
    print("\nSUMMARY:")
    print(f"- Simulated {SIM_CONNECTIONS:,} connections for {TEST_DURATION_SEC//60} minutes")
    print(f"- Estimated total egress: {metrics['total_data_gb']:,} GB")
    print(f"- Estimated egress cost: ${costs['egress_cost_usd']}")
    print(f"- Estimated generator instances needed: {costs['generators_needed']}")
    print(f"- Estimated generator compute cost: ${costs['generator_compute_cost_usd']}")
    print(f"- Estimated total cost: ${costs['estimated_total_cost_usd']}")
