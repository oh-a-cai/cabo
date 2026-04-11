import childProcess from 'child_process';
import logger from 'jet-logger';

(async () => {
  try {
    await exec('npm run build', '../client');
    await exec('tsc --build tsconfig.prod.json', './');
  } catch (err) {
    logger.err(err);
    process.exit(1);
  }
})();

function exec(cmd: string, loc: string): Promise<void> {
  return new Promise((res, rej) => {
    return childProcess.exec(cmd, {cwd: loc}, (err, stdout, stderr) => {
      if (!!stdout) logger.info(stdout);
      if (!!stderr) logger.warn(stderr);
      return (!!err ? rej(err) : res());
    });
  });
}