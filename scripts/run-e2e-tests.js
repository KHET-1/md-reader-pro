#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${colors.cyan}Running: ${description}${colors.reset}`);
  log(`${colors.yellow}Command: ${command}${colors.reset}\n`);
  
  try {
    const startTime = Date.now();
    execSync(command, { stdio: 'inherit' });
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log(`${colors.green}✅ ${description} completed in ${duration}s${colors.reset}`);
    return true;
  } catch (error) {
    log(`${colors.red}❌ ${description} failed${colors.reset}`);
    log(`${colors.red}Error: ${error.message}${colors.reset}`);
    return false;
  }
}

function checkServerRunning() {
  try {
    execSync('curl -s http://localhost:3017 > /dev/null', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function startServer() {
  log(`${colors.yellow}Starting development server...${colors.reset}`);
  
  // Kill any existing server
  try {
    execSync('pkill -f "http-server.*3017"', { stdio: 'ignore' });
  } catch {
    // Ignore if no process to kill
  }
  
  // Start server in background
  const serverProcess = execSync('npx http-server dist -p 3017 -o', { 
    stdio: 'pipe',
    detached: true 
  });
  
  // Wait for server to start
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    if (checkServerRunning()) {
      log(`${colors.green}✅ Server is running on http://localhost:3017${colors.reset}`);
      return true;
    }
    
    log(`${colors.yellow}Waiting for server to start... (${attempts + 1}/${maxAttempts})${colors.reset}`);
    execSync('sleep 1', { stdio: 'ignore' });
    attempts++;
  }
  
  log(`${colors.red}❌ Server failed to start within 30 seconds${colors.reset}`);
  return false;
}

function main() {
  log(`${colors.bright}${colors.blue}🚀 MD Reader Pro - Comprehensive E2E Testing${colors.reset}`);
  log(`${colors.blue}================================================${colors.reset}\n`);
  
  // Check if we're in the right directory
  if (!fs.existsSync('package.json')) {
    log(`${colors.red}❌ Error: package.json not found. Please run from project root.${colors.reset}`);
    process.exit(1);
  }
  
  // Check if dist directory exists
  if (!fs.existsSync('dist')) {
    log(`${colors.yellow}⚠️  dist directory not found. Building project...${colors.reset}`);
    if (!runCommand('npm run build', 'Building project')) {
      log(`${colors.red}❌ Build failed. Cannot run E2E tests.${colors.reset}`);
      process.exit(1);
    }
  }
  
  // Check if server is running
  if (!checkServerRunning()) {
    if (!startServer()) {
      log(`${colors.red}❌ Failed to start server. Cannot run E2E tests.${colors.reset}`);
      process.exit(1);
    }
  } else {
    log(`${colors.green}✅ Server is already running${colors.reset}`);
  }
  
  // Run E2E tests
  const testSuites = [
    {
      command: 'npm run test:e2e:comprehensive',
      description: 'Comprehensive E2E Tests (Phase 1, 2, 3)',
      critical: true
    },
    {
      command: 'npm run test:e2e:performance',
      description: 'Performance E2E Tests',
      critical: false
    }
  ];
  
  const results = [];
  
  for (const suite of testSuites) {
    const success = runCommand(suite.command, suite.description);
    results.push({ ...suite, success });
    
    if (suite.critical && !success) {
      log(`${colors.red}❌ Critical test suite failed. Stopping execution.${colors.reset}`);
      process.exit(1);
    }
  }
  
  // Summary
  log(`\n${colors.blue}📊 Test Results Summary${colors.reset}`);
  log(`${colors.blue}======================${colors.reset}`);
  
  let allPassed = true;
  for (const result of results) {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    const color = result.success ? 'green' : 'red';
    log(`${colors[color]}${status}${colors.reset} - ${result.description}`);
    
    if (!result.success) {
      allPassed = false;
    }
  }
  
  if (allPassed) {
    log(`\n${colors.green}🎉 All E2E tests passed successfully!${colors.reset}`);
    log(`${colors.green}The application is ready for production.${colors.reset}`);
  } else {
    log(`\n${colors.red}❌ Some E2E tests failed. Please review the results above.${colors.reset}`);
    process.exit(1);
  }
  
  // Cleanup
  log(`\n${colors.yellow}🧹 Cleaning up...${colors.reset}`);
  try {
    execSync('pkill -f "http-server.*3017"', { stdio: 'ignore' });
    log(`${colors.green}✅ Cleanup completed${colors.reset}`);
  } catch {
    // Ignore cleanup errors
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log(`\n${colors.yellow}⚠️  Test execution interrupted by user${colors.reset}`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  log(`\n${colors.yellow}⚠️  Test execution terminated${colors.reset}`);
  process.exit(1);
});

// Run main function
main();
