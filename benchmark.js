// benchmark.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ensure logs directory exists
 * @returns {string} Path to logs directory
 */
function ensureLogsDir() {
  const logsDir = path.resolve(__dirname, 'logs');
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (error) {
    console.error(`Error creating logs directory: ${error.message}`);
  }
  return logsDir;
}

/**
 * Write benchmark results to log file
 * @param {string} results - Benchmark results to write
 * @param {string} logFilePath - Path to log file
 */
function writeToLogFile(results, logFilePath) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${results}\n`;
    
    // Ensure parent directory exists
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Append to log file
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
    console.log(`✅ Benchmark results written to: ${logFilePath}`);
  } catch (error) {
    console.error(`❌ Error writing to log file: ${error.message}`);
    throw error;
  }
}

/**
 * Run benchmarks
 * @returns {string} Benchmark results
 */
function runBenchmarks() {
  try {
    // Example benchmark logic.
    // You should replace this with your actual benchmark/test logic.
    const start = Date.now();
    // Simulate some work
    for (let i = 0; i < 1000000; i++) {}
    const end = Date.now();
    return `Benchmark completed in ${end - start} ms`;
  } catch (error) {
    console.error(`❌ Error running benchmarks: ${error.message}`);
    return null;
  }
}

/**
 * Main execution
 */
function main() {
  try {
    const results = runBenchmarks();
    
    if (results) {
      console.log(results);
      
      // Check if BENCHMARK_LOG_FILE environment variable is set
      const logFilePath = process.env.BENCHMARK_LOG_FILE;
      if (logFilePath) {
        writeToLogFile(results, logFilePath);
      } else {
        console.log('ℹ️  BENCHMARK_LOG_FILE not set - skipping log file write');
      }
    } else {
      console.log('No benchmark results generated.');
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Fatal error in benchmark execution: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run main function
main();