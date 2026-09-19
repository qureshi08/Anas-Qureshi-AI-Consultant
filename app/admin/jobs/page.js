import JobsQueue from './JobsQueue';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default function JobsToday() {
  return <JobsQueue />;
}
