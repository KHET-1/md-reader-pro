# Workflow Logging - Quick Reference

## 📥 Accessing Logs

1. Go to **Actions** tab in GitHub
2. Select your workflow run
3. Scroll to **Artifacts** section at bottom
4. Download the logs you need

## 📦 Available Log Artifacts

### Quality Gates
| Artifact Name | Contents |
|---------------|----------|
| `lint-logs` | ESLint output |
| `test-logs` | Test suite results |
| `coverage-logs` | Coverage report |
| `performance-logs` | Performance tests |
| `benchmark-logs` | Benchmark results |
| `regression-logs` | Regression checks |
| `build-test-logs` | Build test output |
| `quality-gates-summary` | ⭐ All step outcomes |
| `all-quality-gate-logs` | 📦 All logs combined |

### Deployment
| Artifact Name | Contents |
|---------------|----------|
| `production-build-logs` | Production build |
| `deploy-prepare-logs` | Deployment prep |
| `deployment-summary` | ⭐ All step outcomes |
| `all-deployment-logs` | 📦 All logs combined |

### Performance Monitoring
| Artifact Name | Contents |
|---------------|----------|
| `performance-monitor-logs` | Monitoring output |
| `performance-regression-logs` | Regression checks |
| `baseline-update-logs` | Baseline updates |
| `performance-monitoring-summary` | ⭐ All step outcomes |
| `all-performance-monitor-logs` | 📦 All logs combined |

## 🔍 Quick Debugging Steps

1. **Download** `*-summary` artifact first
2. **Identify** which step failed
3. **Download** specific log for that step
4. **Review** error messages and exit codes
5. **Fix** the issue
6. **Commit** and push to re-run

## 📋 Log Format

### Success
```
🔍 Starting [Step]...
[output...]
✅ [Step] completed successfully
```

### Failure
```
🔍 Starting [Step]...
[output...]
❌ [Step] failed with exit code [CODE]
```

## ⏱️ Retention

- All logs retained for **30 days**
- Download important logs for longer retention

## 💡 Tips

- ⭐ Use **summary logs** for quick diagnosis
- 📦 Use **all-*-logs** to download everything
- 🎯 Use **specific logs** for focused debugging
- 📊 Compare logs across runs for patterns

## 🔗 Full Documentation

See [WORKFLOW_LOGGING_GUIDE.md](WORKFLOW_LOGGING_GUIDE.md) for complete details.
