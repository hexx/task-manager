import { spawn } from 'node:child_process';

const worker = spawn('npm', ['run', 'dev:worker'], {
  stdio: 'inherit'
});

const waitForWorker = async () => {
  for (;;) {
    try {
      const response = await fetch('http://127.0.0.1:8787/api/tasks');
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until Wrangler is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

let web = null;

const stop = (code = 0) => {
  if (!worker.killed) {
    worker.kill('SIGTERM');
  }
  if (web && !web.killed) {
    web.kill('SIGTERM');
  }
  process.exit(code);
};

worker.on('exit', (code) => {
  if (code && code !== 0) {
    stop(code);
  }
});

process.on('SIGINT', () => stop(130));
process.on('SIGTERM', () => stop(143));

await waitForWorker();

web = spawn('npm', ['run', 'dev:web'], {
  stdio: 'inherit'
});

web.on('exit', (code) => {
  stop(code ?? 0);
});
