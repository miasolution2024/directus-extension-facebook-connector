import axios from "axios";

const axiosInstance = axios.create({ baseURL: 'https://graph.facebook.com/v23.0' });

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) =>
    Promise.reject(
      (error.response && error.response.data && error.response.data.error) ||
        "Something went wrong!"
    )
);

export default axiosInstance;