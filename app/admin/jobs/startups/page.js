import StartupBoard from '../StartupBoard';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// List board since 2026-10-11 (was the one-at-a-time JobsQueue): every startup role with its
// details, founders, LinkedIn, email and one click send on one screen.
export default function StartupsBoardPage() {
  return <StartupBoard />;
}
