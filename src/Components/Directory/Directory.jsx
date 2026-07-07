import React from "react";
import "./Directory.css";

const Directory = (props) => {
  const pathParts = props.path
    ? props.path.split("/").filter((part) => part !== "")
    : [];

  const buildPath = (index) => {
    return "/" + pathParts.slice(0, index + 1).join("/");
  };

  return (
    <div className="Directory">
      <p>
        {props.path ? (
          pathParts.map((part, index) => (
            <span key={index}>
              <span
                style={{ cursor: "pointer", color: "black" }}
                onClick={() => props.setDirectory(buildPath(index))}
              >
                {part}
              </span>

              {index < pathParts.length - 1 && " / "}
            </span>
          ))
        ) : (
          "Root"
        )}
      </p>
    </div>
  );
};

export default Directory;