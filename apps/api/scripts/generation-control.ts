import 'dotenv/config';
import { generationBudgetRepository } from '../src/repositories/generation-budget.repository.js';
import { pool } from '../src/db/index.js';

const action = process.argv[2];
if (!['enable', 'disable'].includes(action ?? '') || process.argv[3] !== '--apply') {
  console.error(
    'Usage : tsx scripts/generation-control.ts enable|disable --apply. Utiliser uniquement une base explicitement choisie.',
  );
  process.exitCode = 1;
} else {
  try {
    await generationBudgetRepository.setEnabled(action === 'enable');
    console.info(JSON.stringify({ generationEnabled: action === 'enable' }));
  } catch {
    console.error('La modification du controle de generation a echoue');
    process.exitCode = 1;
  }
}
await pool.end();
