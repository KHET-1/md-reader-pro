#!/usr/bin/env node

// Clean Output Utility - Removes ANSI escape sequences from terminal output
import { execSync } from 'child_process';

/**
 * Strip ANSI escape sequences from text
 * @param {string} text - Text containing ANSI sequences
 * @returns {string} Clean text without ANSI codes
 */
function stripAnsi(text) {
    // Regex to match ANSI escape sequences
    const ansiRegex = /\x1b\[[0-9;]*[a-zA-Z]/g;
    return text.replace(ansiRegex, '');
}

/**
 * Execute command with clean output
 * @param {string} command - Command to execute
 * @returns {string} Clean output
 */
function executeClean(command) {
    try {
        const output = execSync(command, {
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return stripAnsi(output);
    } catch (error) {
        const cleanError = stripAnsi(error.message);
        const cleanOutput = error.stdout ? stripAnsi(error.stdout) : '';
        const cleanStderr = error.stderr ? stripAnsi(error.stderr) : '';

        throw new Error(`${cleanError}\nSTDOUT: ${cleanOutput}\nSTDERR: ${cleanStderr}`);
    }
}

// Export for use in other scripts
export { stripAnsi, executeClean };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv.slice(2).join(' ');

    if (!command) {
        console.log('Usage: node clean-output.js <command>');
        console.log('Example: node clean-output.js "npm run build"');
        process.exit(1);
    }

    try {
        const cleanOutput = executeClean(command);
        console.log(cleanOutput);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}