import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point, LineString, Circle as GeomCircle, Polygon } from 'ol/geom';
import { Style, Circle as StyleCircle, Fill, Stroke, Text, Icon } from 'ol/style';

const SVG_PATHS = {
    person_pin: "M480-40 360-160H200q-33 0-56.5-23.5T120-240v-560q0-33 23.5-56.5T200-880h560q33 0 56.5 23.5T840-800v560q0 33-23.5 56.5T760-160H600L480-40ZM200-286q54-53 125.5-83.5T480-400q83 0 154.5 30.5T760-286v-514H200v514Zm379-235q41-41 41-99t-41-99q-41-41-99-41t-99 41q-41 41-41 99t41 99q41 41 99 41t99-41ZM280-240h400v-10q-42-35-93-52.5T480-320q-56 0-107 17.5T280-250v10Zm157.5-337.5Q420-595 420-620t17.5-42.5Q455-680 480-680t42.5 17.5Q540-645 540-620t-17.5 42.5Q505-560 480-560t-42.5-17.5ZM480-543Z",
    person_pin_circle: "M581-387.5q45-27.5 71-72.5-35-29-79-44.5T480-520q-49 0-93 15.5T308-460q26 45 71 72.5T480-360q56 0 101-27.5ZM480-560q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0 374q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z",
    pin_drop: "M480-301q99-80 149.5-154T680-594q0-90-56-148t-144-58q-88 0-144 58t-56 148q0 65 50.5 139T480-301Zm0 101Q339-304 269.5-402T200-594q0-125 78-205.5T480-880q124 0 202 80.5T760-594q0 94-69.5 192T480-200Zm0-320q33 0 56.5-23.5T560-600q0-33-23.5-56.5T480-680q-33 0-56.5 23.5T400-600q0 33 23.5 56.5T480-520ZM200-80v-80h560v80H200Zm280-520Z",
    place: "M536.5-503.5Q560-527 560-560t-23.5-56.5Q513-640 480-640t-56.5 23.5Q400-593 400-560t23.5 56.5Q447-480 480-480t56.5-23.5ZM480-186q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z"
};

const createSvgIcon = (pathName, color) => {
    const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48"><path fill="${color}" d="${SVG_PATHS[pathName]}"/></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(rawSvg);
};
import { fromLonLat, toLonLat } from 'ol/proj';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import M3SearchBar from './M3SearchBar';
import M3FAB from './M3FAB';
import M3Chip from './M3Chip';
import M3Switch from './M3Switch';
import M3Snackbar from './M3Snackbar';
import M3Dialog from './M3Dialog';
import { useTheme } from '@mui/material';
import { getDistance } from 'ol/sphere';
import { sendNotification } from '../utils/notifications';

const TIPS = [
    { icon: 'person', text: 'Click on user pins to see details' },
    { icon: 'push_pin', text: 'Right click anywhere to drop a pin' },
    { icon: 'navigation', text: 'Get real-time directions to users' },
    { icon: 'person_add', text: 'Send friend requests to connect' },
    { icon: 'group', text: 'Friends can see each other\'s online status' },
];

const MapComponent = () => {
    const { user, userLocation: storedLocation, updateInterests, socket } = useAuth();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const mapRef = useRef();
    const navigate = useNavigate();
    const [map, setMap] = useState(null);

    // Sources
    const [userSource] = useState(new VectorSource());
    const [routeSource] = useState(new VectorSource());
    const [radiusSource] = useState(new VectorSource());
    const [destinationSource] = useState(new VectorSource()); // For Dropped Pins
    const [clusterSource] = useState(new VectorSource()); // For Easter Egg

    // State
    const [userLocation, setUserLocation] = useState(null); // Init as null, fetch via geolocation
    const [nearbyUsersList, setNearbyUsersList] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    // Navigation State
    const [routeInstructions, setRouteInstructions] = useState([]);
    const [isNavigating, setIsNavigating] = useState(false);
    const [destinationPin, setDestinationPin] = useState(null); // { coords: [lng, lat] }
    const [navDistanceMeters, setNavDistanceMeters] = useState(0);

    const [chatTarget, setChatTarget] = useState(null);
    const [socketReady, setSocketReady] = useState(false);
    const [isGlobalMode, setIsGlobalMode] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Tips Carousel State
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const [isTipVisible, setIsTipVisible] = useState(true);

    const [dialogConfig, setDialogConfig] = useState({ open: false, title: '', message: '', icon: '', onConfirm: null });

    // -------------------------------------------------------------------------
    // 0. Tips Carousel Effect (Smooth Transition)
    // -------------------------------------------------------------------------
    useEffect(() => {
        const interval = setInterval(() => {
            setIsTipVisible(false);
            setTimeout(() => {
                setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
                setIsTipVisible(true);
            }, 500); // Wait for fade out
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // -------------------------------------------------------------------------
    // 1. Initial Map Setup & Geolocation
    // -------------------------------------------------------------------------
    useEffect(() => {
        const initialMap = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({ source: new OSM(), className: 'map-tile-layer' }),
                new VectorLayer({ source: clusterSource, zIndex: 4 }), // Easter Egg layer
                new VectorLayer({ source: radiusSource, zIndex: 5 }),
                new VectorLayer({ source: routeSource, zIndex: 7 }),
                new VectorLayer({ source: destinationSource, zIndex: 8 }),
                new VectorLayer({ source: userSource, zIndex: 10 })
            ],
            view: new View({
                center: fromLonLat([80.6480, 16.5062]), // Default fallback
                zoom: 12
            }),
            controls: []
        });

        setMap(initialMap);

        // Center map using stored location from AuthContext (no re-fetch)
        if (storedLocation) {
            const center = fromLonLat([storedLocation.lng, storedLocation.lat]);
            setUserLocation(center);
            initialMap.getView().animate({ center, zoom: 14, duration: 300 });
            if (socket) {
                socket.emit('update_location', { lat: storedLocation.lat, lng: storedLocation.lng });
            }
        }

        let watchId = null;
        if (navigator.geolocation) {
            let isFirstFix = true;
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const center = fromLonLat([longitude, latitude]);

                    if (isFirstFix && !storedLocation) {
                        initialMap.getView().animate({ center, zoom: 14 });
                    }
                    isFirstFix = false;

                    setUserLocation(center);
                    if (socket) {
                        socket.emit('update_location', { lat: latitude, lng: longitude });
                    }
                },
                (error) => console.error("Geolocation error:", error),
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
        }

        // Click Listener for Users
        initialMap.on('click', (e) => {
            const feature = initialMap.forEachFeatureAtPixel(e.pixel, f => f);
            if (feature) {
                if (feature.get('type') === 'user') {
                    const userData = feature.get('data');
                    setSelectedUser(userData);
                    setDestinationPin(null); // Clear manual pin if user selected
                    // Move map
                    initialMap.getView().animate({ center: feature.getGeometry().getCoordinates(), zoom: 16, duration: 800 });
                }
            } else {
                // Deselect if clicking empty space (unless we are just dropping a pin context menu)
                setSelectedUser(null);
            }
        });

        // Context Menu (Right Click) for Pin Drop
        initialMap.getViewport().addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            const pixel = initialMap.getEventPixel(e);
            const coord = initialMap.getCoordinateFromPixel(pixel); // Web Mercator
            const lonLat = toLonLat(coord);

            try {
                // Reverse geocode to get the place name
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lonLat[1]}&lon=${lonLat[0]}`);
                const data = await res.json();
                const placeName = data.display_name ? data.display_name.split(',')[0] : 'Dropped Pin';

                destinationSource.clear();
                const pinFeature = new Feature({
                    geometry: new Point(coord),
                    type: 'destination',
                    placeName: placeName
                });
                // Using document class check or theme check via hack to avoid map re-init
                const dark = document.documentElement.classList.contains('dark');

                pinFeature.setStyle(new Style({
                    image: new Icon({
                        src: createSvgIcon('pin_drop', '#3b82f6'),
                        scale: 0.85,
                        anchor: [0.5, 1]
                    }),
                    text: new Text({
                        text: placeName,
                        offsetY: 10,
                        fill: new Fill({ color: dark ? '#fff' : '#000' }),
                        font: 'bold 12px Outfit',
                        stroke: new Stroke({ color: dark ? '#000' : '#fff', width: 3 })
                    })
                }));
                destinationSource.addFeature(pinFeature);
                setDestinationPin({ coordinates: lonLat, name: placeName });
                setSelectedUser(null);
                setIsNavigating(false);
                setRouteInstructions([]);
                routeSource.clear();
            } catch (err) {
                // Ignore
            }
        });

        return () => {
            if (watchId !== null && navigator.geolocation) {
                navigator.geolocation.clearWatch(watchId);
            }
            initialMap.setTarget(null);
        };
    }, []);

    // -------------------------------------------------------------------------
    // 2. Fetch Users & Polling
    // -------------------------------------------------------------------------
    const fetchNearbyUsers = useCallback(async () => {
        if (!user || !map || !userLocation) return;
        try {
            if (isGlobalMode) {
                const res = await api.get('/api/users/global');
                setNearbyUsersList(res.data || []);
            } else {
                const center = toLonLat(userLocation);
                const [lng, lat] = center;
                const res = await api.get('/api/users/nearby', {
                    params: { lat, lng }
                });
                setNearbyUsersList(res.data || []);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        }
    }, [user, map, isGlobalMode, userLocation]);

    useEffect(() => {
        if (!map) return;
        const listener = () => fetchNearbyUsers();
        map.on('moveend', listener);
        fetchNearbyUsers();
        return () => map.un('moveend', listener);
    }, [map, fetchNearbyUsers]);

    // Listen for live online/offline status updates and block/delete removals globally
    useEffect(() => {
        if (!socket) return;
        const handleStatusChange = (data) => {
            setNearbyUsersList(prev => prev.map(u =>
                u._id === data.userId ? { ...u, isOnline: data.isActive } : u
            ));
            setSelectedUser(prev => prev && prev._id === data.userId ? { ...prev, isOnline: data.isActive } : prev);
        };
        const handleUserRemoved = (data) => {
            setNearbyUsersList(prev => prev.filter(u => u._id !== data.userId));
            setSelectedUser(prev => prev && prev._id === data.userId ? null : prev);
        };

        socket.on('user_status_change', handleStatusChange);
        socket.on('user_removed', handleUserRemoved);
        return () => {
            socket.off('user_status_change', handleStatusChange);
            socket.off('user_removed', handleUserRemoved);
        };
    }, [socket]);

    // -------------------------------------------------------------------------
    // 3. Render Users on Map (Marker Branding)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!map) return;
        userSource.clear();

        // A. Add "Me" Marker (White, Top Z)
        if (userLocation) {
            const meFeature = new Feature({ geometry: new Point(userLocation), type: 'me' });
            meFeature.setStyle(new Style({
                image: new StyleCircle({
                    radius: 14,
                    fill: new Fill({ color: '#ffffff' }),
                    stroke: new Stroke({ color: '#000000', width: 3 }),
                }),
                text: new Text({
                    text: 'You',
                    offsetY: -24,
                    fill: new Fill({ color: isDark ? '#fff' : '#000' }),
                    font: 'bold 13px Outfit',
                    stroke: new Stroke({ color: isDark ? '#000' : '#fff', width: 3 })
                }),
                zIndex: 999
            }));
            userSource.addFeature(meFeature);
        }

        // B. Add Other Users — color-coded by relationship
        nearbyUsersList.forEach(u => {
            if (!u.location?.coordinates) return;
            if (u.location.coordinates[0] === 0 && u.location.coordinates[1] === 0) return;

            const feature = new Feature({
                geometry: new Point(fromLonLat(u.location.coordinates)),
                type: 'user',
                data: u
            });

            const isFriend = u.isFriend;
            const hasSharedInterests = (u.sharedInterests?.length || 0) > 0;

            // Marker color logic:
            // Friends: Red (light) / Purple (dark) — with online glow if online
            // Matched interests: Green
            // No match: Gray
            let markerColor;
            if (isFriend) {
                markerColor = isDark ? '#D0BCFF' : '#be3627'; // Purple (dark) / Red (light)
            } else if (hasSharedInterests) {
                markerColor = '#22c55e'; // Green
            } else {
                markerColor = '#9ca3af'; // Gray
            }

            let styles = [];

            // Base Marker Style
            const isSelected = selectedUser?._id === u._id;
            styles.push(new Style({
                image: new Icon({
                    src: createSvgIcon(isSelected ? 'person_pin_circle' : 'person_pin', markerColor),
                    scale: isSelected ? 0.95 : 0.8,
                    anchor: [0.5, 1]
                }),
                text: isSelected ? new Text({
                    text: u.displayName,
                    offsetY: 10, // Name below marker
                    fill: new Fill({ color: isDark ? '#fff' : '#000' }),
                    font: 'bold 12px Outfit',
                    stroke: new Stroke({ color: isDark ? '#000' : '#fff', width: 3 }),
                    padding: [2, 4, 2, 4],
                    backgroundFill: new Fill({ color: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }), // Legibility background
                }) : null,
                zIndex: isFriend ? 50 : 10
            }));

            // Badge: Friend online/offline, or match count
            if (isFriend) {
                styles.push(new Style({
                    text: new Text({
                        text: u.isOnline ? '● Online' : '○ Offline',
                        offsetY: -45, // Status above
                        font: 'bold 10px Outfit',
                        fill: new Fill({ color: u.isOnline ? (isDark ? '#D0BCFF' : '#be3627') : '#9ca3af' }),
                        backgroundFill: new Fill({ color: isDark ? '#1D1B20' : '#fff' }),
                        padding: [3, 6, 3, 6],
                    }),
                    zIndex: 51
                }));
            } else if (hasSharedInterests) {
                styles.push(new Style({
                    text: new Text({
                        text: `★ ${u.matchScore || u.sharedInterests.length}`,
                        offsetY: -45, // Star above
                        font: 'bold 10px Outfit',
                        fill: new Fill({ color: isDark ? '#86EFAC' : '#166534' }),
                        backgroundFill: new Fill({ color: isDark ? '#14532D' : '#DCFCE7' }),
                        padding: [3, 6, 3, 6],
                    }),
                    zIndex: 11
                }));
            }

            feature.setStyle(styles);
            userSource.addFeature(feature);
        });

        // C. Radius circle removed (server handles 20km filtering)
        radiusSource.clear();

    }, [nearbyUsersList, selectedUser, isDark, isGlobalMode, map, userLocation, theme, user]);

    // -------------------------------------------------------------------------
    // 4. Routing & Navigation
    // -------------------------------------------------------------------------
    const getDirections = async (targetCoords, isUser = false) => {
        if (!map || !targetCoords) return;

        let startCoords;
        if (userLocation) {
            startCoords = toLonLat(userLocation);
        } else {
            startCoords = toLonLat(map.getView().getCenter());
        }

        const [myLng, myLat] = startCoords;
        const [targetLng, targetLat] = targetCoords;
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${myLng},${myLat};${targetLng},${targetLat}?overview=full&geometries=geojson&steps=true`;

        try {
            const response = await fetch(osrmUrl);
            const data = await response.json();

            if (data.code === 'NoRoute') {
                setAlertMessage("SORRY, WE CAN'T ROUTE OUTSIDE YOUR CURRENT LOCATION.");
                return;
            }

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates;

                // Validate if the route actually reached near the target (prevent intercontinental OSRM snap bugs)
                const routeEnd = coordinates[coordinates.length - 1];
                const toRad = x => x * Math.PI / 180;
                const dLat = toRad(routeEnd[1] - targetLat);
                const dLon = toRad(routeEnd[0] - targetLng);
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(targetLat)) * Math.cos(toRad(routeEnd[1])) * Math.sin(dLon / 2) ** 2;
                const distanceGapKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                if (distanceGapKm > 100) {
                    setAlertMessage("You can go as far as the road shows. Consider nearest flight/ferry for the rest of the journey!");
                }

                const instructions = route.legs[0].steps.map(step => step.maneuver.instruction);

                // Pivot UI State
                setRouteInstructions(instructions);
                setIsNavigating(true);
                setSelectedUser(null);
                setDestinationPin(null);

                routeSource.clear();
                const routeFeature = new Feature({
                    geometry: new LineString(coordinates.map(coord => fromLonLat(coord))),
                    isUserRoute: isUser
                });

                const dark = document.documentElement.classList.contains('dark');
                let routeColor = isUser ? (dark ? '#D0BCFF' : '#ef4444') : '#3b82f6';

                routeFeature.setStyle(new Style({
                    stroke: new Stroke({ color: routeColor, width: 6 })
                }));
                routeSource.addFeature(routeFeature);

                // Fly To Route Bounds (with padding for side sheet)
                map.getView().fit(routeFeature.getGeometry().getExtent(), {
                    padding: [100, 100, 100, 400],
                    duration: 1500
                });
            } else {
                setAlertMessage("Failed to calculate route.");
            }
        } catch (err) {
            console.error("Routing error:", err);
            setAlertMessage("Failed to calculate route.");
        }
    };

    const clearRoute = () => {
        setRouteInstructions([]);
        setIsNavigating(false);
        routeSource.clear();
        setDestinationPin(null);
        destinationSource.clear();
    };

    const startNavigation = () => {
        if (destinationPin) {
            getDirections(destinationPin.coordinates, false);
        } else if (selectedUser) {
            // Notify via socket
            if (socket) {
                socket.emit('getting_directions', { targetUserId: selectedUser._id });
            }
            getDirections(selectedUser.location.coordinates, true);
        }
    };

    // Dynamic Route Slicing (Shrinks route behind user as they move)
    useEffect(() => {
        if (!isNavigating || !userLocation || routeSource.getFeatures().length === 0) return;

        const feature = routeSource.getFeatures()[0];
        const geom = feature.getGeometry();
        const coords = geom.getCoordinates();

        if (coords.length < 2) return;

        // Check if destination is reached (within 20 meters)
        const lastCoord = coords[coords.length - 1];
        const distanceToTargetMeters = getDistance(toLonLat(userLocation), toLonLat(lastCoord));
        setNavDistanceMeters(distanceToTargetMeters);

        if (distanceToTargetMeters < 20) {
            const notif = sendNotification("Destination Reached", {
                body: "You have arrived at your destination.",
                tag: "destination"
            });

            if (notif?.type === 'app') {
                setAlertMessage("You have arrived at your destination!");
            }
            clearRoute();
            return;
        }

        let minIndex = 0;
        let minDistanceSq = Infinity;

        // Find the closest point in the linestring
        coords.forEach((c, idx) => {
            const dx = c[0] - userLocation[0];
            const dy = c[1] - userLocation[1];
            const distSq = dx * dx + dy * dy;
            if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                minIndex = idx;
            }
        });

        // Always tether the start to the user, and slice off passed waypoints
        if (minIndex >= 0 && minIndex < coords.length - 1) {
            feature.getGeometry().setCoordinates([userLocation, ...coords.slice(minIndex + 1)]);
        }
    }, [userLocation, isNavigating, routeSource]);

    // -------------------------------------------------------------------------
    // 5. Easter Eggs & Clusters
    // -------------------------------------------------------------------------

    // Trigger from Search Bar
    useEffect(() => {
        if (searchQuery === 'SHOW-CLUSTER-CENTERS') {
            window.dispatchEvent(new Event('show_cluster_centers'));
            setSearchQuery(''); // Clear it
        }
    }, [searchQuery]);

    // Listener for Cluster Event (from Logo or Search)
    useEffect(() => {
        const handleShowClusters = () => {
            if (!map || nearbyUsersList.length === 0 || (!userLocation && !storedLocation)) return;

            setAlertMessage('Secret Found: Clusters Activated!');
            clusterSource.clear();

            let center;
            if (userLocation) {
                center = userLocation;
            } else if (storedLocation) {
                center = fromLonLat([storedLocation.lng, storedLocation.lat]);
            } else {
                return;
            }

            // Only use users within 20km radius for clustering (not global users)
            const centerLonLat = toLonLat(center);
            const radiusUsers = nearbyUsersList.filter(u => {
                if (!u.location?.coordinates) return false;
                if (u.location.coordinates[0] === 0 && u.location.coordinates[1] === 0) return false;
                const dist = getDistance(centerLonLat, u.location.coordinates);
                return dist <= 20000;
            });

            // All coordinates for the bounding polygon
            const pointsVec = [center];

            const matchingUsers = radiusUsers.filter(u => {
                if (!u.interests || !user.interests) return false;
                return u.interests.some(i => user.interests.includes(i));
            });

            matchingUsers.forEach(u => {
                const p = fromLonLat(u.location.coordinates);
                pointsVec.push(p);

                // Draw yellow line from user to friend
                const line = new Feature({
                    geometry: new LineString([center, p])
                });
                line.setStyle(new Style({
                    stroke: new Stroke({ color: 'rgba(250, 204, 21, 0.8)', width: 2 })
                }));
                clusterSource.addFeature(line);
            });

            // Convex Hull for encircling outline
            if (pointsVec.length > 2) {
                pointsVec.sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);
                const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
                const lower = [];
                for (let i = 0; i < pointsVec.length; i++) {
                    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pointsVec[i]) <= 0) lower.pop();
                    lower.push(pointsVec[i]);
                }
                const upper = [];
                for (let i = pointsVec.length - 1; i >= 0; i--) {
                    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pointsVec[i]) <= 0) upper.pop();
                    upper.push(pointsVec[i]);
                }
                upper.pop();
                lower.pop();
                const hull = lower.concat(upper);

                // Close the polygon
                if (hull.length > 0) hull.push(hull[0]);

                const hullFeature = new Feature({ geometry: new Polygon([hull]) });
                hullFeature.setStyle(new Style({
                    stroke: new Stroke({ color: '#facc15', width: 2 }),
                    fill: new Fill({ color: 'rgba(250, 204, 21, 0.15)' })
                }));
                clusterSource.addFeature(hullFeature);
            }

            // Auto-clear after 10 seconds
            setTimeout(() => clusterSource.clear(), 10000);

            // Zoom out to see clusters
            map.getView().animate({ zoom: map.getView().getZoom() - 1, duration: 1000 });
        };

        window.addEventListener('show_cluster_centers', handleShowClusters);
        return () => window.removeEventListener('show_cluster_centers', handleShowClusters);
    }, [map, nearbyUsersList, clusterSource, storedLocation, userLocation]);


    // -------------------------------------------------------------------------
    // 6. Socket & Search Helpers
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!socket) return;
        const handleDirectionsAlert = ({ message }) => {
            setAlertMessage(message);
        };
        socket.on('directions_alert', handleDirectionsAlert);
        return () => {
            socket.off('directions_alert', handleDirectionsAlert);
        };
    }, [socket]);

    const handleSearchSelect = (place) => {
        const coords = [parseFloat(place.lon), parseFloat(place.lat)];
        const coord3857 = fromLonLat(coords);
        map.getView().animate({ center: coord3857, zoom: 14, duration: 1500 });

        const placeName = place.display_name.split(',')[0];
        setSearchQuery(placeName);
        setShowSuggestions(false);

        // Drop Destination Pin at search result
        destinationSource.clear();
        const pinFeature = new Feature({
            geometry: new Point(coord3857),
            type: 'destination',
            placeName: placeName
        });
        const dark = document.documentElement.classList.contains('dark');
        pinFeature.setStyle(new Style({
            image: new Icon({
                src: createSvgIcon('place', '#3b82f6'),
                scale: 0.85,
                anchor: [0.5, 1]
            }),
            text: new Text({
                text: placeName,
                offsetY: 10,
                fill: new Fill({ color: dark ? '#fff' : '#000' }),
                font: 'bold 12px Outfit',
                stroke: new Stroke({ color: dark ? '#000' : '#fff', width: 3 })
            })
        }));
        destinationSource.addFeature(pinFeature);
        setDestinationPin({ coordinates: coords, name: placeName });
        setSelectedUser(null);
        setIsNavigating(false);
        setRouteInstructions([]);
        routeSource.clear();
    };

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length > 2 && showSuggestions && searchQuery !== 'SHOW-CLUSTER-CENTERS') {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
                    setSearchResults(await res.json());
                } catch (err) { console.error(err); }
            } else if (searchQuery.length === 0) {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, showSuggestions]);

    // Selection listener from Social
    useEffect(() => {
        const handleSelect = (e) => {
            const u = e.detail;
            setSelectedUser(u);
            setDestinationPin(null);
            if (u.location?.coordinates && map) {
                map.getView().animate({
                    center: fromLonLat(u.location.coordinates),
                    zoom: 16,
                    duration: 1500
                });
            }
        };
        window.addEventListener('select_map_user', handleSelect);
        return () => window.removeEventListener('select_map_user', handleSelect);
    }, [map]);

    // Dynamic Theme Routing Updates
    useEffect(() => {
        if (!map) return;

        // Update route colors
        routeSource.getFeatures().forEach(feature => {
            const isUser = feature.get('isUserRoute');
            if (isUser !== undefined) {
                let routeColor = isUser ? (isDark ? '#D0BCFF' : '#ef4444') : '#3b82f6';
                feature.setStyle(new Style({
                    stroke: new Stroke({ color: routeColor, width: 6 })
                }));
            }
        });

        // Update destination pin text colors
        destinationSource.getFeatures().forEach(feature => {
            const placeName = feature.get('placeName') || 'Dropped Pin';
            feature.setStyle(new Style({
                image: new StyleCircle({
                    radius: 9,
                    fill: new Fill({ color: '#3b82f6' }),
                    stroke: new Stroke({ color: '#fff', width: 3 })
                }),
                text: new Text({
                    text: placeName,
                    offsetY: 20,
                    fill: new Fill({ color: isDark ? '#fff' : '#000' }),
                    font: 'bold 12px Outfit',
                    stroke: new Stroke({ color: isDark ? '#000' : '#fff', width: 3 })
                })
            }));
        });
    }, [isDark, map, routeSource, destinationSource]);

    return (
        <div className="relative h-full w-full bg-transparent p-2 overflow-hidden">
            {/* Map Container */}
            <div
                ref={mapRef}
                className="absolute inset-2 rounded-sq-2xl overflow-hidden shadow-2xl border border-white/20 dark:border-white/5"
                style={{
                    filter: isDark
                        ? 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)'
                        : 'grayscale(10%) contrast(1.1)'
                }}
            />

            {/* A. Tips Carousel (Mobile: Top Left of Search, Desktop: Top Left) */}
            <div className={`absolute left-4 md:top-6 md:left-6 z-20 transition-all duration-500 ease-in-out ${currentTipIndex >= 0 ? 'block' : 'hidden'} top-24`}>
                <div className={`bg-white dark:bg-[#1C1B1F]/10 dark:backdrop-blur-2xl px-4 py-2 rounded-sq-xl shadow-xl border-[0.5px] border-white/30 dark:border-white/10 flex items-center gap-3 transition-opacity duration-500 ${isTipVisible ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="material-symbols-outlined text-primary text-xl animate-bounce">
                        {TIPS[currentTipIndex].icon}
                    </span>
                    <span
                        key={currentTipIndex}
                        className="text-xs font-bold text-[#1a100f] dark:text-white"
                    >
                        {TIPS[currentTipIndex].text}
                    </span>
                </div>
            </div>

            {/* B. Top Search Bar — M3 Search Component */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4 transition-all duration-300">
                <M3SearchBar
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onClear={() => setSearchQuery('')}
                    placeholder={searchQuery === 'SHOW-CLUSTER-CENTERS' ? 'Activating Easter Egg...' : 'Search places'}
                    suggestions={searchResults}
                    showSuggestions={showSuggestions && searchResults.length > 0}
                    onSuggestionSelect={(place) => handleSearchSelect(place)}
                    renderSuggestion={(place, index, onSelect) => (
                        <button
                            key={place.place_id}
                            onClick={onSelect}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-primary/8 dark:hover:bg-[#D0BCFF]/8 transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl text-[#49454F] dark:text-[#CAC4D0]">location_on</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#1a100f] dark:text-[#E6E1E5] truncate">{place.display_name.split(',')[0]}</p>
                                <p className="text-xs text-[#49454F] dark:text-[#CAC4D0] truncate">{place.display_name}</p>
                            </div>
                        </button>
                    )}
                />
            </div>

            {/* C. Top Right Controls (Global View) - Repositioned for mobile */}
            <div className="absolute top-24 right-4 md:top-6 md:right-6 z-20 flex gap-4">
                <div className="bg-white dark:bg-[#1C1B1F]/10 dark:backdrop-blur-2xl px-4 py-3 rounded-sq-xl shadow-xl border-[0.5px] border-white/30 dark:border-white/10 flex items-center gap-3 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all">
                    <M3Switch
                        checked={isGlobalMode}
                        onChange={() => setIsGlobalMode(!isGlobalMode)}
                        showIcons
                        label="Global View"
                    />
                </div>
            </div>

            {/* D. Map Controls (Bottom Right) — M3 FABs */}
            <div className="absolute bottom-5 right-5 z-20 flex flex-col gap-2">
                <M3FAB
                    icon="my_location"
                    size="small"
                    variant="surface"
                    ariaLabel="Locate Me"
                    onClick={() => {
                        if (map) {
                            if (userLocation) {
                                map.getView().animate({ center: userLocation, zoom: 15, duration: 1000 });
                            } else if (storedLocation) {
                                const coords = fromLonLat([storedLocation.lng, storedLocation.lat]);
                                map.getView().animate({ center: coords, zoom: 15, duration: 1000 });
                            }
                        }
                    }}
                />
                <M3FAB
                    icon="add"
                    size="small"
                    variant="surface"
                    ariaLabel="Zoom In"
                    onClick={() => map && map.getView().animate({ zoom: map.getView().getZoom() + 1, duration: 300 })}
                />
                <M3FAB
                    icon="remove"
                    size="small"
                    variant="surface"
                    ariaLabel="Zoom Out"
                    onClick={() => map && map.getView().animate({ zoom: map.getView().getZoom() - 1, duration: 300 })}
                />
            </div>


            {/* Alert Message Snackbar — M3 */}
            <M3Snackbar
                message={alertMessage}
                icon="directions_car"
                show={!!alertMessage}
                variant={alertMessage === "You can go as far as the road shows. Consider nearest flight/ferry for the rest of the journey!" ? "routeError" : "info"}
                duration={6000}
                onDismiss={() => setAlertMessage(null)}
            />

            {/* ----------------------------------------------------------------------- */}
            {/* UI PANELS: Detail View vs Navigation View */}
            {/* Using explicit hidden/pointer-events-none logic to prevent "ghost" elements */}
            {/* ----------------------------------------------------------------------- */}

            {/* E. User / Pin Detail Panel */}
            <div className={`
                absolute z-30 bg-white dark:bg-[#1C1B1F]/10 dark:backdrop-blur-2xl shadow-2xl border-[0.5px] border-white/30 dark:border-white/10 transition-all duration-500 ease-in-out
                ${(selectedUser || destinationPin) && !isNavigating ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-[120%] opacity-0 pointer-events-none'}
                md:top-24 md:left-6 md:w-80 md:rounded-sq-2xl md:h-auto md:max-h-[calc(100%-7rem)]
                bottom-0 left-0 right-0 w-full rounded-t-sq-2xl h-fit max-h-[60vh] pb-24 md:pb-0
                flex flex-col overflow-hidden ring-1 ring-black/5 hover:border-white/50 hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]
            `}>
                {/* Header */}
                <div className="px-5 pt-5 pb-2 shrink-0 flex justify-between items-start">
                    <div className="min-w-0 flex-1 mr-3">
                        <h3 className="text-2xl font-black tracking-tight text-[#1a100f] dark:text-white break-words">
                            {selectedUser ? selectedUser.displayName : (destinationPin ? 'Dropped Pin' : 'Details')}
                        </h3>
                        <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">
                            {selectedUser ? 'User Details' : 'Location'}
                        </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        {selectedUser && (
                            <button
                                onClick={() => {
                                    setDialogConfig({
                                        open: true,
                                        icon: 'block',
                                        title: 'Block User',
                                        message: `Block ${selectedUser.displayName}? They will no longer be able to interact with you.`,
                                        onConfirm: async () => {
                                            setDialogConfig({ ...dialogConfig, open: false });
                                            try {
                                                await api.post('/api/users/block', { targetId: selectedUser._id });
                                                setAlertMessage(`Blocked ${selectedUser.displayName}`);
                                                setSelectedUser(null);
                                                fetchNearbyUsers();
                                            } catch (err) {
                                                setAlertMessage('Failed to block user');
                                            }
                                        }
                                    });
                                }}
                                className="w-8 h-8 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-sq-sm transition-colors"
                                title="Block User"
                            >
                                <span className="material-symbols-outlined text-lg">block</span>
                            </button>
                        )}
                        <button
                            onClick={() => { setSelectedUser(null); setDestinationPin(null); }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-sq-sm transition-colors"
                            title="Close"
                        >
                            <span className="material-symbols-outlined text-lg opacity-60">close</span>
                        </button>
                    </div>
                </div>

                {/* Content (Scrollable) */}
                <div className="px-5 pb-4 overflow-y-auto custom-scrollbar grow">
                    {selectedUser ? (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Status</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {selectedUser.isFriend ? (
                                        <>
                                            <span className={`font-bold uppercase text-xs tracking-wider px-2.5 py-1 rounded-sq-md ${selectedUser.isOnline ? 'text-primary bg-primary/10 dark:text-[#D0BCFF] dark:bg-[#D0BCFF]/10' : 'text-gray-500 bg-gray-100 dark:bg-white/10'}`}>
                                                {selectedUser.isOnline ? '● Online' : '○ Offline'}
                                            </span>
                                            <span className="font-bold uppercase text-xs tracking-wider px-2.5 py-1 rounded-sq-md text-primary bg-primary/10 dark:text-[#D0BCFF] dark:bg-[#D0BCFF]/10">
                                                ★ Friend
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            {selectedUser.sharedInterests && selectedUser.sharedInterests.length > 0 && (
                                                <span className="font-bold uppercase text-xs tracking-wider px-2.5 py-1 rounded-sq-md text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                                                    ★ {selectedUser.matchScore} Match{selectedUser.matchScore !== 1 ? 'es' : ''}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {selectedUser.interests && (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Interests</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedUser.interests.slice(0, 10).map((int, i) => {
                                            const interestStr = typeof int === 'string' ? int : int.name;
                                            const isShared = selectedUser.sharedInterests?.some(si => si.toLowerCase() === interestStr.toLowerCase());
                                            const canAdd = !isShared && (selectedUser.isFriend || selectedUser.friendRequestSent || selectedUser.friendRequestReceived);

                                            // Make chip clickable if canAdd
                                            if (canAdd) {
                                                return (
                                                    <button
                                                        key={`add_${i}`}
                                                        onClick={async () => {
                                                            try {
                                                                const currentArr = user.interests || [];
                                                                if (!currentArr.includes(interestStr)) {
                                                                    await updateInterests([...currentArr, interestStr]);
                                                                    setAlertMessage(`Added ${interestStr} to your interests!`);
                                                                    // Soft update local profile viewer to show as shared
                                                                    setSelectedUser(prev => ({
                                                                        ...prev,
                                                                        sharedInterests: [...(prev.sharedInterests || []), interestStr]
                                                                    }));
                                                                }
                                                            } catch (e) {
                                                                setAlertMessage("Failed to add interest.");
                                                            }
                                                        }}
                                                        className="group h-7 px-2.5 rounded-sq-sm border border-primary/30 inline-flex items-center gap-1 hover:bg-primary/10 transition-colors"
                                                        title={`Add ${interestStr} to your profile`}
                                                    >
                                                        <span className="material-symbols-outlined text-[14px] text-primary group-hover:block hidden">add</span>
                                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{interestStr}</span>
                                                    </button>
                                                );
                                            }

                                            return (
                                                <M3Chip
                                                    key={i}
                                                    label={isShared ? `★ ${interestStr}` : interestStr}
                                                    type="suggestion"
                                                    highlighted={isShared}
                                                    className="!h-7 !text-xs !px-2.5"
                                                />
                                            );
                                        })}
                                        {selectedUser.interests.length > 10 && (
                                            <M3Chip
                                                label={`+${selectedUser.interests.length - 10} more`}
                                                type="suggestion"
                                                className="!h-7 !text-xs !px-2.5 opacity-60"
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedUser.bio && (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Bio</span>
                                    <div className="max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">
                                            {selectedUser.bio}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-2">
                            <p className="text-xs font-medium text-gray-500 text-center leading-relaxed">
                                You dropped a pin here. Tap <strong>Directions</strong> below to navigate.
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="px-4 py-3 bg-white/50 dark:bg-transparent border-t border-gray-100 dark:border-white/5 shrink-0 flex flex-col gap-2">
                    {selectedUser && !selectedUser.isFriend && (
                        selectedUser.friendRequestSent ? (
                            <button
                                onClick={async () => {
                                    try {
                                        await api.post('/api/friend-request/cancel', { toUserId: selectedUser._id });
                                        setSelectedUser(prev => ({ ...prev, friendRequestSent: false }));
                                        setAlertMessage('Request cancelled');
                                        fetchNearbyUsers();
                                    } catch (err) {
                                        setAlertMessage(err.response?.data?.error || 'Failed to cancel request');
                                    }
                                }}
                                className="w-full bg-gray-100 hover:bg-red-50 dark:bg-white/10 dark:hover:bg-red-900/40 text-gray-500 hover:text-red-500 h-9 rounded-sq-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors group"
                            >
                                <span className="material-symbols-outlined text-base group-hover:hidden">schedule_send</span>
                                <span className="material-symbols-outlined text-base hidden group-hover:block">cancel</span>
                                <span className="group-hover:hidden">Request Sent</span>
                                <span className="hidden group-hover:block">Cancel Request</span>
                            </button>
                        ) : selectedUser.friendRequestReceived ? (
                            <button
                                onClick={async () => {
                                    try {
                                        const pendingRes = await api.get('/api/friend-requests/pending');
                                        const match = pendingRes.data.find(r => r.from._id === selectedUser._id || r.from === selectedUser._id);
                                        if (match) {
                                            await api.post('/api/friend-request/accept', { requestId: match._id });
                                            setAlertMessage('Friend request accepted!');
                                            setSelectedUser(prev => ({ ...prev, isFriend: true, friendRequestReceived: false }));
                                            fetchNearbyUsers();
                                        }
                                    } catch (err) {
                                        setAlertMessage(err.response?.data?.error || 'Failed to accept');
                                    }
                                }}
                                className="w-full bg-green-500 hover:bg-green-600 text-white h-9 rounded-sq-lg font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-base">person_add</span>
                                Accept Request
                            </button>
                        ) : (
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await api.post('/api/friend-request/send', { toUserId: selectedUser._id });
                                        setAlertMessage(res.data.message);
                                        // If bot auto-accepted, update card to isFriend
                                        if (res.data.status === 'accepted') {
                                            setSelectedUser(prev => ({ ...prev, friendRequestSent: false, isFriend: true }));
                                        } else {
                                            setSelectedUser(prev => ({ ...prev, friendRequestSent: true }));
                                        }
                                        fetchNearbyUsers();
                                    } catch (err) {
                                        setAlertMessage(err.response?.data?.error || 'Failed to send request');
                                    }
                                }}
                                className="w-full bg-primary hover:brightness-110 text-white h-9 rounded-sq-lg font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-base">person_add</span>
                                Send Friend Request
                            </button>
                        )
                    )}
                    {selectedUser && selectedUser.isFriend && (
                        <div className="flex gap-2 w-full">
                            <div className="flex-1 bg-primary/10 dark:bg-[#D0BCFF]/10 text-primary dark:text-[#D0BCFF] h-9 rounded-sq-lg font-bold text-xs flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-base">group</span>
                                Friends
                            </div>
                            <button
                                onClick={() => {
                                    setDialogConfig({
                                        open: true,
                                        icon: 'person_remove',
                                        title: 'Unfriend',
                                        message: `Are you sure you want to unfriend ${selectedUser.displayName}?`,
                                        onConfirm: async () => {
                                            setDialogConfig({ ...dialogConfig, open: false });
                                            try {
                                                await api.delete(`/api/friends/${selectedUser._id}`);
                                                setSelectedUser(prev => ({ ...prev, isFriend: false }));
                                                setAlertMessage(`Unfriended ${selectedUser.displayName}`);
                                                fetchNearbyUsers();
                                            } catch (e) {
                                                setAlertMessage('Failed to unfriend');
                                            }
                                        }
                                    });
                                }}
                                className="w-9 h-9 shrink-0 flex items-center justify-center bg-gray-100 hover:bg-red-50 dark:bg-white/10 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-500 rounded-sq-lg transition-colors"
                                title="Unfriend"
                            >
                                <span className="material-symbols-outlined text-[18px]">person_remove</span>
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={startNavigation}
                            className="flex-1 bg-primary hover:brightness-110 text-white h-9 rounded-sq-lg font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                            <span className="material-symbols-outlined text-base">directions</span>
                            Directions
                        </button>
                        {selectedUser && selectedUser.isFriend && (
                            <button
                                onClick={() => {
                                    const roomId = [user._id, selectedUser._id].sort().join('_');
                                    navigate(`/chat/${roomId}`, { state: { friend: selectedUser } });
                                }}
                                className="flex-1 bg-white dark:bg-white/10 dark:backdrop-blur-xl text-primary dark:text-[#D0BCFF] h-9 rounded-sq-lg font-bold text-xs border border-primary/20 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-base">chat</span>
                                Chat
                            </button>
                        )}
                    </div>
                </div>
            </div>


            {/* F. Navigation Panel (Replaces Detail Panel when navigating) */}
            {/* F. Navigation Panel (Replaces Detail Panel when navigating) */}
            <div className={`
                absolute z-40 bg-white/90 dark:bg-[#1C1B1F]/20 backdrop-blur-2xl shadow-2xl border border-white/40 dark:border-white/10 transition-all duration-500 ease-in-out
                ${isNavigating ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-[150%] opacity-0 pointer-events-none'}
                bottom-8 left-1/2 -translate-x-1/2
                w-[90%] md:w-auto md:min-w-[400px]
                rounded-sq-2xl h-fit
                flex flex-col ring-1 ring-black/5
            `}>
                {/* Header Only - Directions Removed */}
                <div className="p-4 shrink-0 flex justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sq-lg bg-green-500 text-white flex items-center justify-center animate-pulse shrink-0">
                            <span className="material-symbols-outlined">navigation</span>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-lg font-black text-[#1a100f] dark:text-white leading-none">Navigating</h3>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {navDistanceMeters > 0
                                    ? `${(navDistanceMeters * 0.000621371).toFixed(2)} Mi / ${(navDistanceMeters / 1000).toFixed(2)} KM approx`
                                    : 'Follow route on map'}
                            </p>
                        </div>
                    </div>
                    <button onClick={clearRoute} className="px-4 py-2 bg-red-100/50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-sq-lg font-bold text-xs transition-colors cursor-pointer shrink-0 border border-red-200/50 dark:border-red-500/20">
                        End Trip
                    </button>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <M3Dialog
                open={dialogConfig.open}
                onClose={() => setDialogConfig({ ...dialogConfig, open: false })}
                icon={dialogConfig.icon}
                headline={dialogConfig.title}
                actions={[
                    { label: 'Cancel', onClick: () => setDialogConfig({ ...dialogConfig, open: false }) },
                    { label: 'Confirm', variant: 'filled', onClick: dialogConfig.onConfirm }
                ]}
            >
                <p className="font-medium text-gray-700 dark:text-gray-300">{dialogConfig.message}</p>
            </M3Dialog>
        </div>
    );
};

export default MapComponent;
