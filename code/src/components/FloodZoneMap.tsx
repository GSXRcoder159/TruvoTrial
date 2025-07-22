'use client';

import { useState, useEffect, useRef } from 'react';
import mapboxgl, { MapLayerMouseEvent } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export default function FloodZoneMap() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [lng, setLng] = useState(-98.5795);
    const [lat, setLat] = useState(39.8283);
    const [zoom, setZoom] = useState(3.5);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [lng, lat],
            zoom: zoom,
        });

        map.current.on('load', () => {
            if (!map.current) return;
            map.current.addSource('flood-tiles', {
                type: 'vector',
                tiles: [
                    `https://api.nationalflooddata.com/v3/tiles/flood-vector/{z}/{x}/{y}.mvt?key=${process.env.NEXT_PUBLIC_API_KEY}`
                ],
                minzoom: 6,
                maxzoom: 17
            });

            map.current.addLayer({
                'id': 'flood-zones',
                'type': 'fill',
                'source': 'flood-tiles',
                'source-layer': 's_fld_haz_ar',
                'paint': {
                    'fill-color': [
                        'match',
                        ['get', 'fld_zone'],
                        'A', '#0070f3',
                        'AE', '#0070f3',
                        'AH', '#0070f3',
                        'AO', '#0070f3',
                        'AR', '#0070f3',
                        'A99', '#0070f3',
                        'V', '#e53e3e',
                        'VE', '#e53e3e',
                        'X', '#38a169',
                        'D', '#f6e05e',
                        /* other */ '#ccc'
                    ],
                    'fill-opacity': 0.5
                }
            });

            map.current.on('click', 'flood-zones', (e: MapLayerMouseEvent) => {
                if (e.features && e.features.length > 0) {
                    const feature = e.features[0];
                    const properties = feature.properties;
                    if (properties) {
                        const description = `
                            <strong>Flood Zone:</strong> ${properties.fld_zone}<br>
                            <strong>Type:</strong> ${properties.zone_subty || 'N/A'}
                        `;
                        new mapboxgl.Popup()
                            .setLngLat(e.lngLat)
                            .setHTML(description)
                            .addTo(map.current!);
                    }
                }
            });

            map.current.on('mouseenter', 'flood-zones', () => {
                if (map.current) {
                    map.current.getCanvas().style.cursor = 'pointer';
                }
            });

            map.current.on('mouseleave', 'flood-zones', () => {
                if (map.current) {
                    map.current.getCanvas().style.cursor = '';
                }
            });
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [lng, lat, zoom]);

    return (
        <div className="my-8">
            <h2 className="text-2xl font-bold mb-4">Interactive Flood Zone Map</h2>
            <div ref={mapContainer} className="map-container" style={{ height: '600px', width: '100%' }} />
        </div>
    );
}
