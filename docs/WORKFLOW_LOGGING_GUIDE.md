# GitHub Actions Workflow Logging Guide

## Overview

This guide explains the comprehensive logging and error handling system implemented in the `deploy.yml` workflow. The system captures detailed logs for all critical steps and uploads them as artifacts for easy debugging.

## Key Features

### 1. **Automated Log Capture**
Every critical step in the workflow (lint, test, coverage, build, etc.) automatically captures its output to a dedicated log file.

### 2. **Artifact Uploads**
All logs are uploaded as GitHub Actions artifacts, making them available for download even after workflow runs complete.

### 3. **Failure Resilience**
Logs are captured even when steps fail, thanks to `continue-on-error` and `if: always()` conditions.

### 4. **Summary Reports**
Each job generates a summary log showing the outcome of all steps at a glance.

## How to Access Logs

### From a Workflow Run:

1. **Navigate to Actions Tab**
   - Go to your repository on GitHub
   - Click the "Actions" tab
   - Select the workflow run you want to investigate

2. **Download Artifacts**
   - Scroll to the bottom of the workflow run page
   - Look for the "Artifacts" section
   - Download the logs you need

### Available Artifacts:

#### Quality Gates Job:
- `lint-logs` - ESLint output
- `test-logs` - Test suite output
- `coverage-logs` - Coverage report output
- `performance-logs` - Performance test results
- `benchmark-logs` - Benchmark test results
- `regression-logs` - Regression check results
- `build-test-logs` - Production build test output
- `quality-gates-summary` - Summary of all quality gate steps
- `all-quality-gate-logs` - Combined archive of all logs

#### Deploy Job:
- `production-build-logs` - Production build output
- `deploy-prepare-logs` - Deployment preparation output
- `deployment-summary` - Summary of deployment steps
- `all-deployment-logs` - Combined archive of all deployment logs

#### Performance Monitor Job:
- `performance-monitor-logs` - Performance monitoring output
- `performance-regression-logs` - Regression check output
- `baseline-update-logs` - Baseline update output
- `performance-monitoring-summary` - Summary of monitoring steps
- `all-performance-monitor-logs` - Combined archive of all monitoring logs

## Log File Format

Each log file follows this structure:

```
🔍 Starting [Step Name]...
[Full command output - stdout and stderr]
✅ [Step Name] completed successfully
```

Or on failure:

```
🔍 Starting [Step Name]...
[Full command output - stdout and stderr]
❌ [Step Name] failed with exit code [CODE]
```

## Summary Log Format

Summary logs show step outcomes:

```
=== [Job Name] Summary ===
Generated at: [UTC Timestamp]

Step Results:
- [Step 1]: success
- [Step 2]: failure
- [Step 3]: success
...
```

## Best Practices for Using Logs

### 1. **Quick Diagnosis**
   - Download the summary log first to identify which steps failed
   - Then download specific logs for failed steps

### 2. **Debugging Failures**
   - Check the exit code in the log to understand the type of failure
   - Review the full output for error messages and stack traces
   - Compare with previous successful runs if available

### 3. **Historical Analysis**
   - Logs are retained for 30 days
   - Download and archive important logs for long-term tracking
   - Compare logs across multiple runs to identify patterns

### 4. **Performance Monitoring**
   - Review performance logs regularly to track trends
   - Use benchmark logs to identify performance regressions
   - Check regression logs before deploying to production

## How the Logging System Works

### Step-by-Step Process:

1. **Log Directory Creation**
   ```yaml
   - name: 📁 Create logs directory
     run: mkdir -p logs
   ```

2. **Step Execution with Logging**
   ```yaml
   - name: 🔍 Run ESLint
     id: lint
     continue-on-error: true
     run: |
       echo "🔍 Starting ESLint..." | tee logs/lint.log
       npm run lint 2>&1 | tee -a logs/lint.log
       EXIT_CODE=${PIPESTATUS[0]}
       if [ $EXIT_CODE -ne 0 ]; then
         echo "❌ ESLint failed with exit code $EXIT_CODE" | tee -a logs/lint.log
         exit $EXIT_CODE
       fi
       echo "✅ ESLint completed successfully" | tee -a logs/lint.log
   ```

3. **Artifact Upload**
   ```yaml
   - name: 📤 Upload lint logs
     if: always()
     uses: actions/upload-artifact@v4
     with:
       name: lint-logs
       path: logs/lint.log
       retention-days: 30
   ```

### Key Technical Details:

- **`tee` command**: Writes output to both console and file
- **`2>&1`**: Redirects stderr to stdout for complete capture
- **`${PIPESTATUS[0]}`**: Captures the actual command exit code (not `tee`'s)
- **`-a` flag**: Appends to log file instead of overwriting
- **`continue-on-error: true`**: Allows workflow to continue even if step fails
- **`if: always()`**: Ensures uploads happen regardless of step outcome

## Troubleshooting Common Issues

### Logs Not Available
- Verify the workflow run completed (even if failed)
- Check that you're looking at the correct run
- Ensure artifacts haven't expired (30-day retention)

### Incomplete Logs
- Review the workflow run logs to see if upload step succeeded
- Check for workflow cancellations
- Verify disk space wasn't exceeded

### Missing Information in Logs
- Ensure the command generates output to stdout/stderr
- Check that environment variables are set correctly
- Verify the command is running in the expected directory

## Extending the Logging System

To add logging to a new step:

1. **Give the step an ID**
   ```yaml
   - name: 🎯 My New Step
     id: my-step
   ```

2. **Add continue-on-error and logging**
   ```yaml
   - name: 🎯 My New Step
     id: my-step
     continue-on-error: true
     run: |
       echo "🎯 Starting My New Step..." | tee logs/my-step.log
       my-command 2>&1 | tee -a logs/my-step.log
       EXIT_CODE=${PIPESTATUS[0]}
       if [ $EXIT_CODE -ne 0 ]; then
         echo "❌ My New Step failed with exit code $EXIT_CODE" | tee -a logs/my-step.log
         exit $EXIT_CODE
       fi
       echo "✅ My New Step completed successfully" | tee -a logs/my-step.log
   ```

3. **Add artifact upload**
   ```yaml
   - name: 📤 Upload my step logs
     if: always()
     uses: actions/upload-artifact@v4
     with:
       name: my-step-logs
       path: logs/my-step.log
       retention-days: 30
   ```

4. **Update summary log**
   ```yaml
   echo "- My Step: ${{ steps.my-step.outcome }}" >> logs/summary.log
   ```

## Benefits of This System

1. **Faster Debugging**: No need to re-run workflows to see what failed
2. **Historical Analysis**: Track issues over time with 30-day retention
3. **Selective Downloads**: Get only the logs you need
4. **Better Visibility**: Summary logs provide quick overview
5. **Failure Resilience**: Logs captured even when steps fail
6. **Complete Context**: Full stdout and stderr capture

## Related Documentation

- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Actions Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- [Deployment Guide](../DEPLOYMENT.md)

## Questions?

For issues with the workflow logging system:
1. Check the workflow run logs in GitHub Actions
2. Review this guide for common troubleshooting steps
3. Open an issue in the repository with:
   - Link to the workflow run
   - Description of the problem
   - What logs you've reviewed
