import "./FolderContainer.css";
import React, { useEffect, useState } from "react";
import SearchBar from "../SearchBar/SearchBar";
import Directory from "../Directory/Directory";
import axios from "axios";
import { serverUrl } from '../../serverUrl'

const FolderContainer = (props) => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [directory, setDirectory] = useState("/root");
  const [loading, setLoading] = useState(false);
  
useEffect(() => {

  const cacheKey = `nodes_${directory}`;

  // Load cache immediately
  const cachedData =
    localStorage.getItem(cacheKey);

  if (cachedData) {

    try {

      setData(JSON.parse(cachedData));

    } catch (err) {

      console.error(err);
    }
  }

  // Always fetch latest
  const fetchData = async () => {

    try {

      const res = await axios.get(
        `${serverUrl}api/files`,
        {
          params: {
            path: directory
          }
        }
      );

      setData(res.data);

      localStorage.setItem(
        cacheKey,
        JSON.stringify(res.data)
      );

      console.log(
        `Updated cache for ${directory}`
      );

    } catch (err) {

      console.error(err);
    }
  };

  fetchData();

}, [directory]);

  // ✅ only store search text
  function onChange(value) {
    setSearch(value.toLowerCase());
  }

  // ✅ derived filtered data (NO state mutation)
  const filteredData = data.filter((item) => {
    return (
      item.name.toLowerCase().includes(search) ||
      item.lastEditedBy.toLowerCase().includes(search)
    );
  });


  function openFile(fileData){
    props.onFileSelect(fileData)
  }


  return (
    <div className="FolderContainer">
        <Directory path={directory} setDirectory={setDirectory} />
      {/* Header */}
      <div className="headers fixed">
        <div className="name jc-sa">
          Name: <SearchBar onChange={onChange} />
        </div>
        <div className="dateModified">Date Modified:</div>
        <div className="user">User:</div>
      </div>

      {/* List */}
      {filteredData.map((item, index) => {
        return (
          <div className="headers" key={index}>
<div
  className="name clickable"
  onClick={item.type === "folder" ? () => setDirectory(item.path) : item.type ==="file" ? ()=>{openFile(item)} : null}
>              <div style={{ display: "flex", alignItems: "center" }}>
                {item.type === "folder" ? (
                  <img src="/assets/folder.svg" alt="folder" />
                ) : item.ext === "txt" ? (
                  <img src="/assets/txt.svg" alt="txt" />
                ) : item.ext === "xlsx" ? (
                  <img src="/assets/exl.svg" alt="excel" />
                ) : item.ext === "docx" ? (
                  <img src="/assets/wrd.svg" alt="word" />
                ) : (
                  <img src="/assets/file.svg" alt="file" />
                )}

                <p style={{ marginLeft: "10px" }}>{item.name}</p>
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