import React, { useEffect } from "react";
import "./Directory.css";
import { useInput } from "../../Contexts/InputContext";

const Directory = (props) => {
  const pathParts = props.path
    ? props.path.split("/").filter((part) => part !== "")
    : [];

  const buildPath = (index) => {
    return "/" + pathParts.slice(0, index + 1).join("/");
  };

  const { lastKey, keyPressId } = useInput();

  useEffect(() => {
    if (lastKey !== "Escape") {
      return;
    }

    // Already at root
    if (pathParts.length === 0) {
      return;
    }

    // One level below root
    if (pathParts.length === 1) {
      props.setDirectory("/");
      
    const fileEditor = document.getElementById("FileEditor");

    if (fileEditor) {
        fileEditor.style.display = "none";
    }
      return;
    }

    // Remove the last directory
    const previousPath =
      "/" + pathParts.slice(0, -1).join("/");

    props.setDirectory(previousPath);
  }, [keyPressId]);

  return (
    <div className="Directory">
      <p>
        {props.path ? (
          pathParts.map((part, index) => (
            <span key={index}>
              <span
                style={{
                  cursor: "pointer",
                  color: "black",
                }}
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