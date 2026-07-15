import "./Notification.css";

const earpieceOuter = [
  [3, 1], [4, 1], [5, 1],
  [2, 2], [6, 2],
  [1, 3], [7, 3],
  [1, 4], [7, 4],
  [1, 5],
  [1, 6],
  [2, 7],
  [3, 8]
];

const earpieceInner = [
  [3, 3], [4, 3], [5, 3],
  [2, 4], [6, 4],
  [2, 5], [6, 5],
  [3, 6], [4, 6], [5, 6]
];

const mouthpieceOuter = earpieceOuter.map(([x, y]) => [x + 16, y + 16]);
const mouthpieceInner = earpieceInner.map(([x, y]) => [x + 16, y + 16]);

const handleTop = [
  [7, 5], [8, 6], [9, 7], [10, 8], [11, 9], [12, 10], [13, 11], [14, 12], [15, 13], [16, 14], [17, 15], [18, 16], [19, 17], [20, 18], [21, 19], [22, 20], [23, 21]
];

const handleBottom = [
  [4, 8], [5, 9], [6, 10], [7, 11], [8, 12], [9, 13], [10, 14], [11, 15], [12, 16], [13, 17], [14, 18], [15, 19], [16, 20], [17, 21], [18, 22], [19, 23], [20, 24]
];

const phonePixels = [
  ...earpieceOuter,
  ...earpieceInner,
  ...mouthpieceOuter,
  ...mouthpieceInner,
  ...handleTop,
  ...handleBottom
];

// Deduplicate pixels
const uniquePixelsMap = {};
phonePixels.forEach(([x, y]) => {
  uniquePixelsMap[`${x},${y}`] = [x, y];
});
const uniquePhonePixels = Object.values(uniquePixelsMap);

function Notification({ caller, visible }) {

    return (

        <div className={`notification ${visible ? "show" : ""}`}>

            <div className="left-panel">

                <svg 
                  className="phone-svg" 
                  viewBox="0 0 25 25" 
                  shapeRendering="crispEdges"
                >
                  {uniquePhonePixels.map(([x, y], idx) => (
                    <rect 
                      key={idx} 
                      x={x} 
                      y={y} 
                      width={1} 
                      height={1} 
                      fill="white" 
                    />
                  ))}
                </svg>

            </div>

            <div className="right-panel">

                <h1>

                    {caller?.toUpperCase()}

                </h1>

                <p>

                    IS CALLING YOU

                </p>

            </div>

        </div>

    );

}

export default Notification;