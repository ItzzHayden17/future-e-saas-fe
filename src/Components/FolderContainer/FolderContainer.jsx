import "./FolderContainer.css";
import React, { useEffect, useRef, useState } from "react";
import SearchBar from "../SearchBar/SearchBar";
import Directory from "../Directory/Directory";
import axios from "axios";
import Cookies from "js-cookie";
import { serverUrl } from "../../serverUrl";

const FolderContainer = (props) => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");

  const [directory, setDirectory] = useState(() => {
    return Cookies.get("currentDirectory") || "/root";
  });

  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const amendmentOpened = useRef(false);
  const typeBuffer = useRef("");
  const typeTimeout = useRef(null);

  useEffect(() => {
    Cookies.set("currentDirectory", directory, {
      expires: 30,
    });
  }, [directory]);

  useEffect(() => {
    amendmentOpened.current = false;
    typeBuffer.current = "";
    setSelectedItem(null);
  }, [directory]);

  useEffect(() => {
    const cacheKey = `nodes_${directory}`;

    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        setData(JSON.parse(cachedData));
      } catch (err) {
        console.error(err);
      }
    }

    const fetchData = async () => {
      setLoading(true);

      try {
        const res = await axios.get(`${serverUrl}api/files`, {
          params: {
            path: directory,
          },
        });

        setData(res.data);

        localStorage.setItem(
          cacheKey,
          JSON.stringify(res.data)
        );

        console.log(`Updated cache for ${directory}`);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [directory]);

  useEffect(() => {
    if (!data || data.length === 0) {
      return;
    }

    if (amendmentOpened.current) {
      return;
    }

    const amendmentFile = data.find((item) => {
      return (
        item.type === "file" &&
        item.name?.toLowerCase().includes("amendment")
      );
    });

    if (amendmentFile) {
      amendmentOpened.current = true;
      props.onFileSelect(amendmentFile);
      setSelectedItem(amendmentFile.path || amendmentFile.name);
    }
  }, [data, props]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      const target = event.target;

      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const character = event.key.toLowerCase();

      typeBuffer.current += character;

      clearTimeout(typeTimeout.current);

      typeTimeout.current = setTimeout(() => {
        typeBuffer.current = "";
      }, 1000);

      const searchValue = typeBuffer.current;

      const match = data.find((item) => {
        const name = item.name?.toLowerCase() || "";

        return name.startsWith(searchValue);
      });

      if (match) {
        setSelectedItem(match.path || match.name);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(typeTimeout.current);
    };
  }, [data]);

  function onChange(value) {
    setSearch(value.toLowerCase());
  }

  const filteredData = data.filter((item) => {
    const name = item.name?.toLowerCase() || "";
    const user = item.lastEditedBy?.toLowerCase() || "";

    return (
      name.includes(search) ||
      user.includes(search)
    );
  });

  const displayedData = [...filteredData];

  function openFile(fileData) {
    setSelectedItem(fileData.path || fileData.name);
    props.onFileSelect(fileData);
  }

  function handleItemClick(item) {
    if (item.type === "folder") {
      setSelectedItem(item.path || item.name);
      setDirectory(item.path);
      return;
    }

    if (item.type === "file") {
      openFile(item);
    }
  }

  async function createFolder() {
    const name = window.prompt("Enter the new folder name:");
    if (!name || !name.trim()) return;
    try {
      await axios.post(`${serverUrl}api/folders`, { name: name.trim(), parentPath: directory });
      const res = await axios.get(`${serverUrl}api/files`, { params: { path: directory } });
      setData(res.data);
      localStorage.setItem(`nodes_${directory}`, JSON.stringify(res.data));
    } catch (error) {
      console.error(error);
      window.alert(error.response?.data?.error || "Failed to create folder");
    }
  }

  async function uploadFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 35 * 1024 * 1024) {
      window.alert("Files must be 35 MB or smaller.");
      event.target.value = "";
      return;
    }
    try {
      setUploading(true);
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await axios.post(`${serverUrl}api/upload`, {
        name: file.name, parentPath: directory, data, contentType: file.type,
      });
      const res = await axios.get(`${serverUrl}api/files`, { params: { path: directory } });
      setData(res.data);
      localStorage.setItem(`nodes_${directory}`, JSON.stringify(res.data));
    } catch (error) {
      console.error(error);
      window.alert(error.response?.data?.error || "Failed to upload file");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="FolderContainer">

      <Directory
        path={directory}
        setDirectory={setDirectory}
      />

      <div className="directory-actions">
        <button type="button" onClick={createFolder}>New folder</button>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload file"}
        </button>
        <input ref={fileInputRef} type="file" onChange={uploadFile} hidden />
      </div>

      <div className="headers fixed">

        <div className="name jc-sa">
          <span>Name:</span>
          <SearchBar onChange={onChange} />
        </div>

        <div className="dateModified">
          Date Modified:
        </div>

        <div className="user">
          User:
        </div>

      </div>

      {displayedData.map((item, index) => {

        const itemKey = item.path || item.name || index;

        const isSelected =
          selectedItem === itemKey;

        return (
          <div
            className="headers"
            key={itemKey}
            style={{
              border: isSelected
                ? "2px solid black"
                : "2px solid transparent",
              boxSizing: "border-box",
            }}
          >

            <div
              className="name clickable"
              onClick={() => handleItemClick(item)}
            >

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                }}
              >

                {item.type === "folder" ? (

                  <img
                    src="/assets/folder.svg"
                    alt="folder"
                    title="Folder"
                  />

                ) : item.ext === "txt" ? (

                  <img
                    src="/assets/txt.svg"
                    alt="txt"
                    title="Text Document"
                  />

                ) : item.ext === "xlsx" ? (

                  <img
                    src="/assets/exl.svg"
                    alt="excel"
                    title="Excel spreadsheet"
                    style={{
                      filter:
                        "brightness(0) saturate(100%) invert(39%) sepia(32%) saturate(1100%) hue-rotate(100deg) brightness(85%) contrast(90%)",
                    }}
                  />

                ) : item.ext === "docx" ||
                  item.ext === "doc" ? (

                  <img
                    src="/assets/wrd.svg"
                    alt="word"
                    title="Word Document"
                    style={{
                      filter:
                        "brightness(0) saturate(100%) invert(35%) sepia(90%) saturate(1200%) hue-rotate(190deg)",
                    }}
                  />

                ) : item.ext === "pdf" ? (

                  <img
                    src="/assets/pdf.svg"
                    alt="pdf"
                    title="PDF Document"
                  />

                ) : (

                  <img
                    src="/assets/uknown.svg"
                    alt="file"
                    title="Unknown Document"
                  />

                )}

                <p style={{ marginLeft: "10px" }}>
                  {item.name}
                </p>

              </div>

            </div>

            <div className="dateModified">
              <p>{item.createdAt}</p>
            </div>

            <div className="user">
              <p>{item.lastEditedBy}</p>
            </div>

          </div>
        );
      })}

    </div>
  );
};

export default FolderContainer;