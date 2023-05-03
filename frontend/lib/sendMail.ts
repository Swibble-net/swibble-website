import axios from "axios";

const sendEmail = async (email: string, number: string, message: string) => {
  return axios({
    method: "post",
    url: "/api/send-mail",
    data: {
      email: email,
      number: number,
      message: message,
    },
  });
};

export default sendEmail;
