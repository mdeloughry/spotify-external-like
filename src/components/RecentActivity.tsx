import type { SpotifyTrack } from '../lib/spotify';

interface RecentAction {
  track: SpotifyTrack;
  action: 'liked' | 'added_to_playlist';
  playlistName?: string;
  timestamp: Date;
}

interface RecentActivityProps {
  actions: RecentAction[];
  onClear: () => void;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function RecentActivity({ actions, onClear }: RecentActivityProps) {
  return (
    <div className="w-72 flex-shrink-0">
      <div className="sticky top-4 bg-spotify-gray/20 rounded-lg border border-spotify-gray/30 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-spotify-gray/30">
          <h3 className="font-semibold text-white text-sm">Recent Activity</h3>
          <button
            onClick={onClear}
            className="text-xs text-spotify-lightgray hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {actions.map((action, index) => {
            const albumImage = action.track.album.images[2]?.url || action.track.album.images[0]?.url;

            return (
              <div
                key={`${action.track.id}-${index}`}
                className="flex items-center gap-3 px-4 py-2 hover:bg-spotify-gray/20 transition-colors"
              >
                {albumImage && (
                  <img
                    src={albumImage}
                    alt={action.track.album.name}
                    className="w-10 h-10 rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{action.track.name}</p>
                  <p className="text-xs text-spotify-lightgray flex items-center gap-1">
                    {action.action === 'liked' ? (
                      <>
                        <svg className="w-3 h-3 text-spotify-green" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        Liked
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 text-spotify-green" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        {action.playlistName || 'Added to playlist'}
                      </>
                    )}
                    <span className="text-spotify-lightgray/60 ml-1">{timeAgo(action.timestamp)}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {actions.length === 0 && (
          <div className="px-4 py-8 text-center text-spotify-lightgray text-sm">
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
}
