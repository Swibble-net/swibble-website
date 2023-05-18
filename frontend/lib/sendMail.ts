import axios from "axios";

//Setting a function to send post method on /api/send-mail, definig which data should send to api
const sendEmail = async (email: string, number: string, message: string) => {
  return axios({
    method: "post",
    url: "/api/send-mail",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
    },
    data: {
      email: email,
      number: number,
      message: message,
    },
  });
};

export default sendEmail;
