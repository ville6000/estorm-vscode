/**
 * The bundled language server process. Calls estorm's server directly
 * rather than its command line, whose strict option parsing rejects the
 * --stdio and --clientProcessId arguments the language client adds.
 */
import { serveStdio } from '@villev/estorm/lsp';

serveStdio();
