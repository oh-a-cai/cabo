/* eslint-disable n/no-process-env */

import path from 'path';
import dotenv from 'dotenv';
import moduleAlias from 'module-alias';


// Check the env
const NODE_ENV = (process.env.NODE_ENV ?? 'development');

/*
// Configure "dotenv"
const result2 = dotenv.config({
  path: path.join(__dirname, `./config/.env.${NODE_ENV}`),
});
if (result2.error) {
  throw result2.error;
}
*/

dotenv.config({ path: `./config/.env.${process.env.NODE_ENV}` }); // no error throw

// Configure moduleAlias
if (__filename.endsWith('js')) {
  moduleAlias.addAlias('@src', path.join(__dirname, 'dist'));
}
