import React from "react";

const BouncingLoader = ({ minHeight = "500px" }) => {
  return (
    <div 
      className="bouncing-loader-wrapper" 
      style={{ "--loader-min-height": minHeight }}
    >
      <div className="bouncing-loader">
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );
};

export default BouncingLoader;
