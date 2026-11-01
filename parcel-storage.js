const demoParcelTrackingIds = new Set([
    'SPX-261029001',
    'SPX-261029002',
    'SPX-261029003',
    'SPX-261028004',
    'SPX-261027005',
]);

window.loadSavedParcelBookings = function loadSavedParcelBookings() {
    const savedParcels = JSON.parse(localStorage.getItem('speedx-parcel-bookings') || '[]');
    if (!Array.isArray(savedParcels)) {
        throw new Error('Saved parcel list is invalid.');
    }

    const actualParcels = savedParcels.filter((parcel) =>
        !parcel ||
        typeof parcel.trackingId !== 'string' ||
        !demoParcelTrackingIds.has(parcel.trackingId.toUpperCase())
    );

    if (actualParcels.length !== savedParcels.length) {
        localStorage.setItem('speedx-parcel-bookings', JSON.stringify(actualParcels));
    }

    return actualParcels;
};

try {
    window.loadSavedParcelBookings();
} catch (error) {
    console.error('Could not clean up locally saved demo parcels.', error);
}
