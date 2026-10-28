from collections import defaultdict


class Metrics:
    def __init__(self):
        self.counters: dict[tuple, float] = defaultdict(float)
        self.histograms: dict[tuple, list] = defaultdict(list)
        self.buckets = (0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10)

    def inc(self, name: str, amount: float = 1, **labels):
        self.counters[(name, tuple(sorted(labels.items())))] += amount

    def observe(self, name: str, value: float, **labels):
        self.histograms[(name, tuple(sorted(labels.items())))].append(value)

    def render(self, active_calls: dict[str, int]) -> str:
        lines = []
        lines.append("# HELP clinic_active_calls Calls by phase")
        lines.append("# TYPE clinic_active_calls gauge")
        for phase, count in sorted(active_calls.items()):
            lines.append(f'clinic_active_calls{{phase="{phase}"}} {count}')

        lines.append("# HELP clinic_tool_calls_total Tool calls")
        lines.append("# TYPE clinic_tool_calls_total counter")
        lines.append("# HELP clinic_data_access_violations_total Cross-patient refusals")
        lines.append("# TYPE clinic_data_access_violations_total counter")
        lines.append("# HELP clinic_trace_publish_failures_total Kafka publish failures")
        lines.append("# TYPE clinic_trace_publish_failures_total counter")
        lines.append("# HELP clinic_verification_attempts_total Verification attempts")
        lines.append("# TYPE clinic_verification_attempts_total counter")
        for (name, labels), value in sorted(self.counters.items(), key=lambda item: item[0][0]):
            lines.append(f"{name}{{{_fmt(labels)}}} {value}")

        for metric in ("clinic_tool_duration_seconds", "clinic_handoff_wait_seconds"):
            lines.append(f"# HELP {metric} Observed seconds")
            lines.append(f"# TYPE {metric} histogram")
            for (name, labels), values in sorted(self.histograms.items(), key=lambda item: item[0][0]):
                if name != metric:
                    continue
                cumulative = 0
                for bound in self.buckets:
                    cumulative += sum(1 for value in values if value <= bound)
                    lines.append(f"{name}_bucket{{{_fmt(labels + (('le', str(bound)),))}}} {cumulative}")
                lines.append(f"{name}_bucket{{{_fmt(labels + (('le', '+Inf'),))}}} {len(values)}")
                lines.append(f"{name}_sum{{{_fmt(labels)}}} {sum(values)}")
                lines.append(f"{name}_count{{{_fmt(labels)}}} {len(values)}")
        return "\n".join(lines) + "\n"


def _fmt(labels: tuple) -> str:
    return ",".join(f'{key}="{value}"' for key, value in labels)


metrics = Metrics()
