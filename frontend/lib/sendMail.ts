import axios from "axios";

// const sendEmail = async (email: string, number: string, message: string) => {
//   return axios({
//     method: "post",
//     url: "/api/send-mail",
//     headers: {
//       Accept: "application/json, text/plain, */*",
//       "Content-Type": "application/json",
//     },
//     data: {
//       email: email,
//       number: number,
//       message: message,
//     },
//   });
// };

const sendEmail = async (data: any) =>
  fetch("/api/send-mail", {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  }).then((res) => {
    if (!res.ok) throw new Error("Versuchen Sie noch Mal!");
    return res.json();
  });

export default sendEmail;
