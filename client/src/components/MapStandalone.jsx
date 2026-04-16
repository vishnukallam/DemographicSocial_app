import React from 'react';
import MapComponent from './Map';

const MapStandalone = () => {
    return (
        <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] w-[98%] max-w-[1400px] mx-auto relative transition-colors duration-300">
            <div className="w-full h-full relative overflow-hidden md:rounded-b-2xl md:rounded-t-sm shadow-inner">
                <MapComponent />
            </div>
        </div>
    );
};

export default MapStandalone;
