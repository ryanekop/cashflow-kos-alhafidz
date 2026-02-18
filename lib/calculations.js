/**
 * Calculate Kas based on month and residency status.
 * Pre-July 2025: Full=25k, Half=12.5k, None=10k
 * Post-July 2025: Full=30k, Half=15k, None=10k
 */
export function calculateKas(monthStr, status) {
    const date = new Date(monthStr + '-01');
    const july2025 = new Date('2025-07-01');
    const isPostJuly = date >= july2025;

    if (status === 'none') return 10000;

    if (isPostJuly) {
        return status === 'full' ? 30000 : 15000;
    } else {
        return status === 'full' ? 25000 : 12500;
    }
}

/**
 * Calculate WiFi share per person.
 * Half users count as 0.75 of a full user.
 */
export function calculateWifi(totalBill, fullUsers, halfUsers) {
    if (totalBill === 0 || (fullUsers === 0 && halfUsers === 0)) {
        return { fullShare: 0, halfShare: 0 };
    }
    const totalUnits = fullUsers + (halfUsers * 0.75);
    const unitCost = totalBill / totalUnits;
    return {
        fullShare: Math.round(unitCost),
        halfShare: Math.round(unitCost * 0.75),
    };
}

/**
 * Format Rupiah
 */
export function formatIDR(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
