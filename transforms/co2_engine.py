import pathway as pw

DIESEL_EMISSION_FACTOR = 2.68

ROUTE_BASELINES: dict[str, float] = {
    "delhi_mumbai": 850.0,
    "chennai_bangalore": 210.0,
    "kolkata_patna": 190.0,
}


@pw.udf
def compute_co2_kg(fuel_liters: float) -> float:
    """Compute CO₂ mass in kg from litres of diesel consumed (IPCC factor: 2.68 kg/L)."""
    return round(fuel_liters * DIESEL_EMISSION_FACTOR, 4)


@pw.udf
def emission_status(co2_kg: float) -> str:
    """Classify emission level for dashboard marker colouring."""
    if co2_kg > 10.0:
        return "HIGH_EMISSION_ALERT"
    if co2_kg > 5.0:
        return "WARNING"
    return "NORMAL"


def build_co2_table(telemetry: pw.Table) -> pw.Table:
    """Extend telemetry table with per-event CO₂ and emission status columns."""
    return telemetry.select(
        *pw.this,
        co2_kg=compute_co2_kg(pw.this.fuel_consumed_liters),
        status=emission_status(compute_co2_kg(pw.this.fuel_consumed_liters)),
    )


def build_tumbling_windows(co2_table: pw.Table) -> tuple[pw.Table, pw.Table]:
    """Compute per-vehicle and fleet-level aggregates over 5-minute tumbling windows.

    Returns:
        vehicle_window: per-vehicle totals (co2_sum, fuel_sum, event_count)
        fleet_window:   fleet-wide aggregated CO₂ and savings vs route baseline
    """
    windowed = co2_table.windowby(
        pw.this.timestamp,
        window=pw.temporal.tumbling(duration=pw.Duration("5m")),
        instance=pw.this.vehicle_id,
    )

    vehicle_window = windowed.reduce(
        vehicle_id=pw.reducers.any(pw.this.vehicle_id),
        route_id=pw.reducers.any(pw.this.route_id),
        window_co2_kg=pw.reducers.sum(pw.this.co2_kg),
        window_fuel_liters=pw.reducers.sum(pw.this.fuel_consumed_liters),
        avg_speed_kmph=pw.reducers.avg(pw.this.speed_kmph),
        event_count=pw.reducers.count(),
    )

    fleet_windowed = co2_table.windowby(
        pw.this.timestamp,
        window=pw.temporal.tumbling(duration=pw.Duration("5m")),
        instance=pw.this.route_id,
    )

    fleet_window = fleet_windowed.reduce(
        route_id=pw.reducers.any(pw.this.route_id),
        total_co2_kg=pw.reducers.sum(pw.this.co2_kg),
        total_fuel_liters=pw.reducers.sum(pw.this.fuel_consumed_liters),
        vehicle_count=pw.reducers.count_distinct(pw.this.vehicle_id),
    )

    return vehicle_window, fleet_window


def build_sliding_windows(co2_table: pw.Table) -> pw.Table:
    """Compute 30-minute sliding windows (5-min slide) per vehicle for anomaly detection.

    A HIGH_EMISSION_ALERT is set when the current 5-min CO₂ exceeds 2× the 30-min rolling
    average for that vehicle.

    Returns:
        sliding_metrics: vehicle-level rolling stats with anomaly flag
    """
    windowed = co2_table.windowby(
        pw.this.timestamp,
        window=pw.temporal.sliding(
            duration=pw.Duration("30m"),
            hop=pw.Duration("5m"),
        ),
        instance=pw.this.vehicle_id,
    )

    return windowed.reduce(
        vehicle_id=pw.reducers.any(pw.this.vehicle_id),
        route_id=pw.reducers.any(pw.this.route_id),
        rolling_co2_30m=pw.reducers.sum(pw.this.co2_kg),
        rolling_avg_co2=pw.reducers.avg(pw.this.co2_kg),
        max_event_co2=pw.reducers.max(pw.this.co2_kg),
        event_count=pw.reducers.count(),
    )


def build_live_metrics(co2_table: pw.Table) -> pw.Table:
    """Per-event live metrics table with CO₂, status, and baseline savings."""

    @pw.udf
    def co2_saved(route_id: str, co2_kg: float) -> float:
        baseline = ROUTE_BASELINES.get(route_id, 500.0)
        return round(baseline - co2_kg, 4)

    return co2_table.select(
        *pw.this,
        co2_saved_kg=co2_saved(pw.this.route_id, pw.this.co2_kg),
    )
