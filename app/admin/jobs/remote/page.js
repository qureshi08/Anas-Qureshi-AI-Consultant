import JobsQueue from '../JobsQueue';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Remote worldwide AI automation roles, added by Anas 2026-11-16 alongside the Saudi jobs and
 * startup roles. Same one job at a time flow; rows come from the daily fetch (lane 'Remote',
 * gate in lib/jobs/fetcher.js remoteOk, titles in lib/jobs/targets.js REMOTE_TITLE_RX).
 */
export default function RemoteQueue() {
  return <JobsQueue lane="Remote" />;
}
