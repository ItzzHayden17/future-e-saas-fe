import './Home.css'
import React, { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { serverUrl } from '../../serverUrl'
import axios from 'axios'
import Navbar from '../../Components/Navbar/Navbar'
import FolderContainer from '../../Components/FolderContainer/FolderContainer'
import FileEditor from '../../Components/FileEditor/FileEditor'

function Home() {
    const [user, setUser] = useState({});
    const [selectedFile, setSelectedFile] = useState(null);

    // ...

    function openFile(fileData) {
        setSelectedFile(fileData);
    }

    function closeEditor() {
        setSelectedFile(null);
    }

    const getDocType = (ext) => {
        switch (ext) {
            case "docx":
            case "doc":
                return "word";

            case "xlsx":
            case "xls":
                return "cell";

            case "pptx":
            case "ppt":
                return "slide";

            default:
                return "word";
        }
    };

    return (
        <div className="Home">
            <Navbar />

            <div className="home-container">

                <div
                    className="folder-page"
                    id="folder-page"
                    style={{
                        width: selectedFile ? "50%" : "100%",
                        borderRight: selectedFile
                            ? "solid 2px #000000"
                            : "none"
                    }}
                >
                    <FolderContainer
                        onFileSelect={openFile}
                    />
                </div>

                {selectedFile && (
                    <div
                        className="content"
                        id="file-editor-home"
                        style={{
                            width: "50%",
                            height: "100%"
                        }}
                    >
                        <FileEditor
                            onClose={closeEditor}
                            documentId={selectedFile.id}
                            name={selectedFile.name}
                            fileType={selectedFile.ext}
                            docType={getDocType(selectedFile.ext)}
                            updatedAt={selectedFile.updatedAt}
                        />
                    </div>
                )}

            </div>
        </div>
    );
}

export default Home

