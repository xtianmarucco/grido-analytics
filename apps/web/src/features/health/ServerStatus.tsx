import { ServerStatusView, type ServerStatusState } from './ServerStatusView';
import { useHealth } from './useHealth';

/** Container: maps the health query onto the presentational view. */
export function ServerStatus() {
  const health = useHealth();

  let state: ServerStatusState;
  if (health.isSuccess) {
    state = { kind: 'connected', checkedAt: new Date(health.dataUpdatedAt) };
  } else if (health.isError) {
    state = { kind: 'error', retrying: health.isFetching };
  } else {
    state = { kind: 'loading' };
  }

  return <ServerStatusView state={state} onRetry={() => void health.refetch()} />;
}
