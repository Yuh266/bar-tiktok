'use strict';

function pruneFloorPlayers(players, { now = Date.now(), inactiveCleanupAbove = 80,
    playerTtlMs = 600000, maxPlayers = 400 } = {}) {
    const maximum = Math.max(1, Number(maxPlayers) || 400);
    const keep = Math.min(maximum, Math.max(1, Number(inactiveCleanupAbove) || 80));
    if (players.size <= keep) return [];
    const cutoff = now - Math.max(1000, Number(playerTtlMs) || 600000);
    const oldest = [...players.values()].sort((a, b) => (Number(a.lastActive) || 0) - (Number(b.lastActive) || 0));
    const removed = [];
    // Keep the room populated: remove only enough inactive avatars to reach 80.
    for (const player of oldest) {
        if (players.size <= keep) break;
        if ((Number(player.lastActive) || 0) < cutoff) {
            players.delete(player.userId); removed.push(player.userId);
        }
    }
    // Preserve the existing renderer capacity when everyone is still active.
    for (const player of oldest) {
        if (players.size <= maximum) break;
        if (players.delete(player.userId)) removed.push(player.userId);
    }
    return removed;
}

module.exports = { pruneFloorPlayers };
