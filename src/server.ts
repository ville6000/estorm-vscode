/**
 * The bundled language server process. Calls estorm's server directly
 * rather than its command line, whose strict option parsing rejects the
 * --stdio and --clientProcessId arguments the language client adds. The
 * package's exports don't include the server, hence the path.
 */
import { serveStdio } from '../node_modules/@villev/estorm/dist/lsp.js';

serveStdio();
