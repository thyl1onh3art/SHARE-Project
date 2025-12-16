// Accommodation search controller
// This is a placeholder for future integration with Booking.com API, Google Places API, etc.

exports.searchAccommodations = async (req, res) => {
  try {
    const { location, radius, eventDate } = req.body;

    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }

    // TODO: Integrate with real accommodation API
    // For now, return mock data
    // In production, you would:
    // 1. Use Google Places API to find accommodations
    // 2. Use Booking.com API for prices and availability
    // 3. Filter by distance, price range, ratings, etc.

    const mockAccommodations = [
      {
        name: 'Grand Hotel',
        address: `123 Main Street, ${location}`,
        price: 120,
        rating: 4.5,
        distance: 0.5,
        type: 'hotel',
        bookingLink: 'https://www.booking.com',
        imageUrl: null
      },
      {
        name: 'Cozy B&B',
        address: `456 Oak Avenue, ${location}`,
        price: 80,
        rating: 4.2,
        distance: 1.2,
        type: 'bed and breakfast',
        bookingLink: 'https://www.booking.com',
        imageUrl: null
      },
      {
        name: 'Budget Hostel',
        address: `789 Pine Road, ${location}`,
        price: 35,
        rating: 3.8,
        distance: 2.1,
        type: 'hostel',
        bookingLink: 'https://www.booking.com',
        imageUrl: null
      },
      {
        name: 'Luxury Resort',
        address: `321 Beach Boulevard, ${location}`,
        price: 250,
        rating: 4.8,
        distance: 3.5,
        type: 'resort',
        bookingLink: 'https://www.booking.com',
        imageUrl: null
      },
      {
        name: 'City Center Hotel',
        address: `555 Downtown Plaza, ${location}`,
        price: 95,
        rating: 4.0,
        distance: 0.8,
        type: 'hotel',
        bookingLink: 'https://www.booking.com',
        imageUrl: null
      }
    ];

    // Filter by radius if provided
    const filtered = radius 
      ? mockAccommodations.filter(acc => (acc.distance || 0) <= radius)
      : mockAccommodations;

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

