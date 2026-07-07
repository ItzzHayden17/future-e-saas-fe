import { useEffect, useState } from "react";
import axios from "axios";
import { DocumentEditor } from "@onlyoffice/document-editor-react";
import { serverUrl } from "../../serverUrl";
import "./FileEditor.css";
import { toast } from "react-toastify";
import {dockerServerUrl} from "../../dockerServerUrl";

const FileEditor = (props) => {

    const [documentUrl, setDocumentUrl] = useState(null);
    const [username,setUsername] = useState("");

    useEffect(() => {

        async function loadDocument() {

            try {

                const response =
                    await axios.get(
                        `${serverUrl}api/document/${props.documentId}`
                    );

                setDocumentUrl(response.data.url);

            } catch (err) {

                console.error(err);
            }
        }

        loadDocument();

    }, [props.documentId]);

    useEffect(() => {
    console.log("FileEditor mounted");
    console.log("Document ID:", props.documentId);
    console.log("Document URL:", documentUrl);
}, [documentUrl]);

    if (!documentUrl) {
        return <div>Loading document...</div>;
    }

const safeVersion =
  props.updatedAt
    ? new Date(props.updatedAt).getTime()
    : Date.now();

const config = {
  document: {
    fileType: props.fileType,

    key: `${props.documentId}-${safeVersion}`,

    title: props.name,
    url: documentUrl,

    permissions: {
      edit: true,
      review: true,
      comment: true,
      download: true,
      print: true,
      fillForms: true,
      modifyFilter: true,
      modifyContentControl: true
    }
  },

  documentType: props.docType,

  editorConfig: {
    mode: "edit",
    // callbackUrl: `http://host.docker.internal:8080/save-file`
    callbackUrl: `https://documentserver-latest-523p.onrender.com`
    
  }
};

    console.log(
  "OnlyOffice Key:",
  `${props.documentId}-${safeVersion}`
);

    return (
    <DocumentEditor
      id="docxEditor"
      documentServerUrl={dockerServerUrl}
      config={config}
      width="100%"
      height="100%"
/>
    );
};

export default FileEditor;