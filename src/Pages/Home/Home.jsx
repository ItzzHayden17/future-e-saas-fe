import './Home.css'
import React, { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { serverUrl } from '../../serverUrl'
import axios from 'axios'
import Navbar from '../../Components/Navbar/Navbar'
import FolderContainer from '../../Components/FolderContainer/FolderContainer'
import FileEditor from '../../Components/FileEditor/FileEditor'

function Home() {
    const [user, setUser] = useState({})
    const [selectedFile, setSelectedFile] = useState(null)

    useEffect(() => {
        try {
            const userData = Cookies.get("userData")

            axios.post(`${serverUrl}verify-token`, {
                token: userData ? JSON.parse(userData).token : null
            }).then(res => {
                console.log(res.data.status + " " + res.data.message)

                if (res.data.status !== 'success') {
                    window.location.href = '/'
                } else {
                    setUser(res.data.decoded)
                    console.log(res.data.decoded)
                }
            })
        } catch (error) {
            console.log(error)
            window.location.href = '/'
        }
    }, [])

    function openFile(fileData) {
        setSelectedFile(fileData)
        console.log(fileData);
        
    }

    const getDocType = (ext) => {
    switch (ext) {
        case "docx":
            return "word";
        case "xlsx":
            return "cell";
        case "pptx":
            return "slide";
        default:
            return "word";
    }
};
console.log("selectedFile", selectedFile);
    return (
        <div className='Home'>
            <Navbar />

            <div className='home-container'>
                <div className='folder-page'>
                    <FolderContainer onFileSelect={openFile} />
                </div>

                <div className='content'>
    {selectedFile ? (
        <>
        <FileEditor
    documentId={selectedFile.id}
    name={selectedFile.name}
    fileType={selectedFile.ext}
    docType={getDocType(selectedFile.ext)}
    updatedAt={selectedFile.updatedAt}
/>
        </>
    ) : (
        <>Please select a file</>
    )}
</div>
            </div>
        </div>
    )
}

export default Home

