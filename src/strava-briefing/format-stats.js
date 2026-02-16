function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDistance(meters) {
  const km = meters / 1000;
  if (km >= 10) return `${km.toFixed(1)} km`;
  return `${km.toFixed(2)} km`;
}

function formatSpeed(metersPerSec) {
  const kph = metersPerSec * 3.6;
  return `${kph.toFixed(1)} km/h`;
}

function formatElevation(meters) {
  return `${Math.round(meters)} m`;
}

function getStatsForActivity(activity) {
  const type = activity.sport_type || activity.type;
  const stats = [];

  if (type === "Ride" || type === "VirtualRide" || type === "EBikeRide" || type === "GravelRide" || type === "MountainBikeRide") {
    stats.push({ label: "Distance", value: formatDistance(activity.distance) });
    stats.push({ label: "Moving Time", value: formatDuration(activity.moving_time) });
    if (activity.average_speed) stats.push({ label: "Avg Speed", value: formatSpeed(activity.average_speed) });
    if (activity.max_speed) stats.push({ label: "Max Speed", value: formatSpeed(activity.max_speed) });
    if (activity.average_watts) stats.push({ label: "Avg Power", value: `${Math.round(activity.average_watts)} W` });
    if (activity.weighted_average_watts) stats.push({ label: "NP", value: `${Math.round(activity.weighted_average_watts)} W` });
    if (activity.total_elevation_gain) stats.push({ label: "Elevation", value: formatElevation(activity.total_elevation_gain) });
    if (activity.average_heartrate) stats.push({ label: "Avg HR", value: `${Math.round(activity.average_heartrate)} bpm` });
  } else if (type === "WeightTraining") {
    stats.push({ label: "Moving Time", value: formatDuration(activity.moving_time) });
    if (activity.calories) stats.push({ label: "Calories", value: `${Math.round(activity.calories)} kcal` });
    if (activity.average_heartrate) stats.push({ label: "Avg HR", value: `${Math.round(activity.average_heartrate)} bpm` });
  } else if (type === "Walk" || type === "Hike") {
    stats.push({ label: "Distance", value: formatDistance(activity.distance) });
    stats.push({ label: "Moving Time", value: formatDuration(activity.moving_time) });
    if (activity.total_elevation_gain) stats.push({ label: "Elevation", value: formatElevation(activity.total_elevation_gain) });
    if (activity.average_heartrate) stats.push({ label: "Avg HR", value: `${Math.round(activity.average_heartrate)} bpm` });
  } else if (type === "Run" || type === "TrailRun" || type === "VirtualRun") {
    stats.push({ label: "Distance", value: formatDistance(activity.distance) });
    stats.push({ label: "Moving Time", value: formatDuration(activity.moving_time) });
    if (activity.average_speed) {
      // Show pace (min/km) for runs
      const paceSecPerKm = 1000 / activity.average_speed;
      const paceMin = Math.floor(paceSecPerKm / 60);
      const paceSec = Math.round(paceSecPerKm % 60);
      stats.push({ label: "Avg Pace", value: `${paceMin}:${String(paceSec).padStart(2, "0")} /km` });
    }
    if (activity.total_elevation_gain) stats.push({ label: "Elevation", value: formatElevation(activity.total_elevation_gain) });
    if (activity.average_heartrate) stats.push({ label: "Avg HR", value: `${Math.round(activity.average_heartrate)} bpm` });
  } else {
    // Generic fallback
    if (activity.distance) stats.push({ label: "Distance", value: formatDistance(activity.distance) });
    stats.push({ label: "Moving Time", value: formatDuration(activity.moving_time) });
    if (activity.average_heartrate) stats.push({ label: "Avg HR", value: `${Math.round(activity.average_heartrate)} bpm` });
  }

  return stats;
}

module.exports = { getStatsForActivity, formatDuration, formatDistance, formatSpeed, formatElevation };
