<!-- backend=qwen -->
| Config | Recall@5 | Contradiction acc. | Stale leakage | Avg tokens | Avg latency |
| --- | --- | --- | --- | --- | --- |
| A · full-context | 100% | 50% | 100% | 446 | 0.02ms |
| B · naive top-k | 100% | 50% | 100% | 67 | 292.06ms |
| C · Mneme | 100% | 100% | 0% | 69 | 318.29ms |
