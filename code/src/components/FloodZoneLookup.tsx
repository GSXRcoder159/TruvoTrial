'use client';

import { useState } from 'react';

export default function FloodZoneLookup() {
  const [address, setAddress] = useState('');
  const [floodZone, setFloodZone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFloodZone(null);

    try {
      const response = await fetch('/api/flood-zone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred.');
      } else {
        setFloodZone(data.floodZone);
      }
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold mb-4">Single-Address Flood Zone Lookup</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter a property address"
          className="w-full p-2 border border-gray-300 rounded mb-4"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {loading && <p className="mt-4">Loading...</p>}
      {error && <p className="mt-4 text-red-500">Error: {error}</p>}
      {floodZone && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Flood Zone Designation:</h3>
          <p className="text-xl">{floodZone}</p>
        </div>
      )}
    </div>
  );
}
