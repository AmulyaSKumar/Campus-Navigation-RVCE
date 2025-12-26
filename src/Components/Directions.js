import React, { useState } from "react";
import { getDirections } from "../api/ors";
import L from "leaflet";

const Directions = ({ map, start, end }) => {
    const [route, setRoute] = useState(null);

    const fetchDirections = async () => {
        const routeCoordinates = await getDirections(start, end);
        setRoute(routeCoordinates);

        const polyline = L.polyline(routeCoordinates.map(([lng, lat]) => [lat, lng]), {
            color: "blue",
        }).addTo(map);
        map.fitBounds(polyline.getBounds());
    };

    return (
        <div>
            <button onClick={fetchDirections}>Get Directions</button>
        </div>
    );
};

export default Directions;





























// import React, { useState } from "react";
// import { getDirections } from "../api/googleMaps";

// const Directions = ({ origin, destination }) => {
//     const [directions, setDirections] = useState(null);

//     const fetchDirections = async () => {
//         const data = await getDirections(origin, destination);
//         setDirections(data);
//     };

//     return (
//         <div>
//             <button onClick={fetchDirections}>Get Directions</button>
//             {directions && (
//                 <ul>
//                     {directions.steps.map((step, index) => (
//                         <li key={index}>{step.html_instructions}</li>
//                     ))}
//                 </ul>
//             )}
//         </div>
//     );
// };

// export default Directions;
