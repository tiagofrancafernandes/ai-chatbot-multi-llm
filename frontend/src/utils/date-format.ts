/**
 * Date and time formatting utility supporting relative human-readable times
 * and full ISO 8601 timestamps with local timezone offset.
 */

/**
 * Returns an ISO 8601 formatted string with explicit local timezone offset (e.g. 2026-10-25T11:42:15-03:00).
 *
 * @param timestamp - Unix timestamp, Date instance or date string
 * @returns ISO 8601 string with timezone offset
 */
export function formatIsoWithTimezone(timestamp: number | string | Date | undefined): string {
    if (!timestamp) {
        return '';
    }

    const date = new Date(timestamp);

    if (isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absOffsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
    const absOffsetMinutes = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${absOffsetHours}:${absOffsetMinutes}`;
}

/**
 * Formats a timestamp into human-readable relative time ('just now', '1 minute ago', '2 hours ago', 'yesterday at HH:mm')
 * or formatted calendar date/time if older than yesterday.
 *
 * @param timestamp - Unix timestamp, Date instance or date string
 * @param referenceNow - Optional reference timestamp (defaults to Date.now()) to enable Vue reactivity
 * @returns Human-readable relative or formatted date
 */
export function formatRelativeTime(
    timestamp: number | string | Date | undefined,
    referenceNow: number = Date.now()
): string {
    if (!timestamp) {
        return '';
    }

    const date = new Date(timestamp);

    if (isNaN(date.getTime())) {
        return '';
    }

    const now = referenceNow || Date.now();
    const diffMs = now - date.getTime();

    if (diffMs < 45_000 && diffMs >= 0) {
        return 'just now';
    }

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    if (date.getTime() >= startOfToday.getTime()) {
        const diffMinutes = Math.floor(diffMs / 60_000);

        if (diffMinutes < 2) {
            return '1 minute ago';
        }

        if (diffMinutes < 60) {
            return `${diffMinutes} minutes ago`;
        }

        const diffHours = Math.floor(diffMs / 3_600_000);

        if (diffHours < 2) {
            return '1 hour ago';
        }

        return `${diffHours} hours ago`;
    }

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    if (date.getTime() >= startOfYesterday.getTime()) {
        const timePart = date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
        return `yesterday at ${timePart}`;
    }

    // Older than yesterday: calendar format
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const timePart = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    return `${day}/${month}/${year} ${timePart}`;
}
