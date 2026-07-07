import Cookies from "js-cookie";
import { Navigate } from "react-router-dom";
import axios from "axios";

function ProtectedRoute({ children }) {

    const userData = Cookies.get("userData");

    if (!userData) {
        return <Navigate to="/" />;
    }

    try {

        const parsed =
            JSON.parse(userData);

        axios.defaults.headers.common[
            "Authorization"
        ] = `Bearer ${parsed.token}`;

        return children;

    } catch (err) {

        console.error(err);

        return <Navigate to="/" />;
    }
}

export default ProtectedRoute;